/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LibrusHeader } from './components/LibrusHeader';
import { LibrusPlanner } from './components/LibrusPlanner';
import { GoogleCalendarExportModal } from './components/GoogleCalendarExportModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { SettingsTab } from './components/SettingsTab';
import { ScheduleEvent, StudentProfile, ScheduleChangeAlert, RokStudiow } from './types/schedule';
import { INITIAL_NOTIFICATIONS } from './data/sampleSchedules';
import { fetchPlan, refreshPlan } from './utils/api';
import { playNotificationSound, sendBrowserNotification } from './utils/notifications';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { X } from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // Dark Mode State (default to true for sleek dark theme)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('sggw_theme');
    if (saved) return saved === 'dark';
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sggw_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sggw_theme', 'light');
    }
  }, [isDark]);

  // Student Profile: Focused on Meblarstwo Zaoczne
  // Automatically maps: Rok 1 & 3 = Turnus A, Rok 2 & 4 = Turnus B
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('sggw_meb_profile_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.turnus = parsed.rok % 2 === 1 ? 'Turnus A' : 'Turnus B';
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return {
      kierunek: 'Meblarstwo',
      rok: 2,
      mode: 'zaoczne',
      turnus: 'Turnus B', // Rok 2 is strictly Turnus B!
      grupa: 'Wszystkie',
      isConfigured: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('sggw_meb_profile_v3', JSON.stringify(profile));
  }, [profile]);

  // Schedule Events (parsed LIVE from the official SGGW PDF, cached per year)
  const eventsCacheKey = `sggw_meb_events_live_rok${profile.rok}`;
  const [events, setEvents] = useState<ScheduleEvent[]>(() => {
    const saved = localStorage.getItem(`sggw_meb_events_live_rok${profile.rok}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  useEffect(() => {
    if (events.length > 0) localStorage.setItem(eventsCacheKey, JSON.stringify(events));
  }, [events, eventsCacheKey]);

  // Load cached events whenever the selected year changes, then refresh from server
  useEffect(() => {
    const cached = localStorage.getItem(eventsCacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setEvents(parsed);
      } catch { /* ignore */ }
    } else {
      setEvents([]);
    }
  }, [profile.rok]);

  // Automatically pull the freshest plan from the SGGW server on load / year change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPlan(profile.rok);
        if (!cancelled && data.success && Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events);
          if (data.lastUpdate) setLastOfficialUpdate(data.lastUpdate);
        }
      } catch (e) {
        console.log('Auto plan fetch failed, using cache', e);
      }
    })();
    return () => { cancelled = true; };
  }, [profile.rok]);

  // Notifications / Alerts
  const [alerts, setAlerts] = useState<ScheduleChangeAlert[]>(() => {
    const saved = localStorage.getItem('sggw_meb_alerts_v4');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem('sggw_meb_alerts_v4', JSON.stringify(alerts));
  }, [alerts]);

  // Modals and feedback state
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);
  const [lastOfficialUpdate, setLastOfficialUpdate] = useState<string>('');
  const [refreshToast, setRefreshToast] = useState<{
    message: string;
    changed: boolean;
  } | null>(null);

  // Unread alerts count strictly for student's year or general faculty notices
  const unreadAlertsCount = useMemo(() => {
    return alerts.filter(a => !a.read && (a.rok === undefined || a.rok === profile.rok)).length;
  }, [alerts, profile.rok]);

  // Real schedule verification + LIVE re-parse from SGGW WNLiD
  const handleRefreshSchedule = async () => {
    setIsRefreshing(true);
    try {
      const data = await refreshPlan(profile.rok);
      const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      setLastRefreshTime(nowStr);

      if (data.success && Array.isArray(data.events) && data.events.length > 0) {
        setEvents(data.events);
        if (data.lastUpdate) setLastOfficialUpdate(data.lastUpdate);
      }

      const changed = Boolean(data.changed);
      const updateLabel = data.lastUpdate || 'aktualna wersja';

      if (changed) {
        const newAlert: ScheduleChangeAlert = {
          id: `alert-change-${Date.now()}`,
          title: `Aktualizacja planu dla Roku ${profile.rok}`,
          message: `Dziekanat opublikował nową wersję planu dla Roku ${profile.rok} (${updateLabel}). Plan został odświeżony.`,
          courseName: `Plan Roku ${profile.rok}`,
          oldValue: '-',
          newValue: 'Nowa wersja',
          type: 'general',
          timestamp: 'Przed chwilą',
          read: false,
          severity: 'info',
        };
        setAlerts(prev => [newAlert, ...prev]);
        playNotificationSound();
        sendBrowserNotification(newAlert.title, { body: newAlert.message });
        setRefreshToast({
          message: `Wykryto zmianę! Zaktualizowano plan dla Roku ${profile.rok} (${updateLabel}).`,
          changed: true,
        });
      } else if (data.success) {
        setRefreshToast({
          message: `Plan dla Roku ${profile.rok} jest aktualny (${updateLabel}). Pobrano ${data.events.length} zajęć.`,
          changed: false,
        });
      } else {
        setRefreshToast({
          message: `Nie udało się pobrać planu z serwera SGGW. Wyświetlam ostatnią zapisaną wersję.`,
          changed: false,
        });
      }

      setTimeout(() => setRefreshToast(null), 4500);
    } catch (e) {
      console.error(e);
      setRefreshToast({
        message: `Błąd połączenia z serwerem SGGW. Spróbuj ponownie za chwilę.`,
        changed: false,
      });
      setTimeout(() => setRefreshToast(null), 3500);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Simulate Room Change Alert specifically for student's current year & courses
  const handleSimulateChange = () => {
    // Pick an event strictly from user's current year and courses
    const studentEvents = events.filter(e => e.rok === profile.rok);
    const targetEvent = studentEvents[Math.floor(Math.random() * studentEvents.length)] || studentEvents[0];
    const course = targetEvent ? targetEvent.courseName : 'Maszynoznawstwo';
    const oldRoom = targetEvent ? targetEvent.room : 's.A-I';
    const newRoom = oldRoom === 's.1-44' ? 's.2-20' : 's.1-44';
    const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
    const day = targetEvent ? dayNames[targetEvent.dayOfWeek - 1] : 'Piątek';

    const newAlert: ScheduleChangeAlert = {
      id: `alert-${Date.now()}`,
      title: `Zmiana sali: ${course}`,
      message: `Zajęcia z przedmiotu ${course} (${profile.rok} rok) w ${day} zostały przeniesione do sali ${newRoom}.`,
      courseName: course,
      oldValue: oldRoom,
      newValue: newRoom,
      type: 'room_change',
      timestamp: 'Przed chwilą',
      read: false,
      severity: 'warning',
      dateAffected: day,
      rok: profile.rok,
    };

    setAlerts(prev => [newAlert, ...prev]);
    playNotificationSound();
    sendBrowserNotification(newAlert.title, { body: newAlert.message });
  };

  return (
    <div className={`min-h-screen transition-colors flex flex-col font-sans ${
      isDark ? 'bg-[#090d04] text-stone-100' : 'bg-[#f6f8f0] text-[#222906]'
    }`}>
      {/* 1. Header with Refresh, Notifications, and Settings in top right */}
      <LibrusHeader
        profile={profile}
        isDark={isDark}
        onRefresh={handleRefreshSchedule}
        isRefreshing={isRefreshing}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        unreadCount={unreadAlertsCount}
      />

      {/* 2. Main Timetable / Schedule View (No extra tabs at bottom, pure schedule!) */}
      <main className="flex-1 w-full mx-auto px-2 sm:px-4 py-2">
        <LibrusPlanner
          events={events}
          profile={profile}
          isDark={isDark}
          lastUpdate={lastOfficialUpdate}
          onOpenCalendarSync={() => setIsCalendarModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onUpdateProfile={(p) => setProfile(p)}
        />
      </main>

      {/* 3. Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#111608] border border-[#253210] text-stone-100 shadow-2xl my-8 overflow-hidden">
            <div className="bg-[#0d1205] px-5 py-3.5 border-b border-[#253210] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">Ustawienia</h3>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[75vh] overflow-y-auto">
              <SettingsTab
                profile={profile}
                onUpdateProfile={(p) => setProfile(p)}
                isDarkTheme={isDark}
                onToggleTheme={(dark) => setIsDark(dark)}
                onRefreshFromSGGW={handleRefreshSchedule}
                isRefreshing={isRefreshing}
                lastRefreshTime={lastRefreshTime}
                onOpenCalendarSync={() => {
                  setIsSettingsModalOpen(false);
                  setIsCalendarModalOpen(true);
                }}
                onSimulateChange={handleSimulateChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Google Calendar Sync Modal */}
      <GoogleCalendarExportModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        events={events}
        mode={profile.mode}
        turnus={profile.turnus}
      />

      {/* 5. Notifications Modal */}
      <NotificationCenterModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        alerts={alerts}
        userRok={profile.rok}
        onMarkAsRead={(id) => {
          setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
        }}
        onClearAll={() => setAlerts([])}
        onSimulateChange={handleSimulateChange}
      />

      {/* 6. Live Refresh Status Toast */}
      {refreshToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] transition-all">
          <div className={`p-3 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs ${
            refreshToast.changed
              ? 'bg-[#2d2208] border-amber-600/60 text-amber-200'
              : isDark
              ? 'bg-[#111608] border-[#54650F] text-stone-200'
              : 'bg-white border-[#54650F] text-[#222906]'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              refreshToast.changed ? 'bg-amber-400 animate-ping' : 'bg-[#a2c41f]'
            }`} />
            <span className="flex-1 font-semibold leading-snug">
              {refreshToast.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
