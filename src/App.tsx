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
import { INITIAL_SCHEDULE_EVENTS, INITIAL_NOTIFICATIONS } from './data/sampleSchedules';
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

  // Schedule Events (from official SGGW data)
  const [events, setEvents] = useState<ScheduleEvent[]>(() => {
    const saved = localStorage.getItem('sggw_meb_events_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_SCHEDULE_EVENTS;
  });

  useEffect(() => {
    localStorage.setItem('sggw_meb_events_v4', JSON.stringify(events));
  }, [events]);

  // Notifications / Alerts
  const [alerts, setAlerts] = useState<ScheduleChangeAlert[]>(() => {
    const saved = localStorage.getItem('sggw_meb_alerts_v3');
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
    localStorage.setItem('sggw_meb_alerts_v3', JSON.stringify(alerts));
  }, [alerts]);

  // Modals state
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);

  // Unread alerts count
  const unreadAlertsCount = useMemo(() => {
    return alerts.filter(a => !a.read).length;
  }, [alerts]);

  // Refresh schedule from SGGW
  const handleRefreshSchedule = async () => {
    setIsRefreshing(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setEvents(INITIAL_SCHEDULE_EVENTS);
      const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      setLastRefreshTime(nowStr);
      playNotificationSound();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Simulate Room Change Alert
  const handleSimulateChange = () => {
    const newAlert: ScheduleChangeAlert = {
      id: `alert-${Date.now()}`,
      title: 'Zmiana sali: Maszynoznawstwo',
      message: 'Wykład z Maszynoznawstwa w piątek o 15:30 został przeniesiony do sali s.1-44.',
      courseName: 'Maszynoznawstwo',
      oldValue: 's.A-I',
      newValue: 's.1-44',
      type: 'room_change',
      timestamp: 'Przed chwilą',
      read: false,
      severity: 'warning',
      dateAffected: 'Piątek',
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
          onOpenCalendarSync={() => setIsCalendarModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
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
        onMarkAsRead={(id) => {
          setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
        }}
        onClearAll={() => setAlerts([])}
        onSimulateChange={handleSimulateChange}
      />
    </div>
  );
}
