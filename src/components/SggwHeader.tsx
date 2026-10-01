import React from 'react';
import { Calendar, Bell, Download, RefreshCw, Sun, Moon, Settings, ShieldCheck, TreePine, ExternalLink } from 'lucide-react';
import { StudentProfile, RokStudiow } from '../types/schedule';
import { SGGW_OFFICIAL_LINKS } from '../data/sampleSchedules';

interface SggwHeaderProps {
  profile: StudentProfile;
  onChangeYear: (rok: RokStudiow) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenNotifications: () => void;
  onOpenCalendarSync: () => void;
  onOpenSettings: () => void;
  unreadCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const SggwHeader: React.FC<SggwHeaderProps> = ({
  profile,
  onChangeYear,
  isDark,
  onToggleTheme,
  onOpenNotifications,
  onOpenCalendarSync,
  onOpenSettings,
  unreadCount,
  isRefreshing,
  onRefresh,
}) => {
  const getYearFileUrl = () => {
    switch (profile.rok) {
      case 1: return SGGW_OFFICIAL_LINKS.rok1Url;
      case 2: return SGGW_OFFICIAL_LINKS.rok2Url;
      case 3: return SGGW_OFFICIAL_LINKS.rok3Url;
      case 4: return SGGW_OFFICIAL_LINKS.rok4Url;
    }
  };

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
      isDark 
        ? 'bg-[#0b110d]/95 border-[#1d2d20] text-stone-100 shadow-sm' 
        : 'bg-white/95 border-emerald-100 text-stone-900 shadow-xs'
    }`}>
      {/* Top Main Bar */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Faculty Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center shadow-md shadow-emerald-950/20 shrink-0 border border-emerald-500/30">
            <TreePine className="w-5 h-5 text-emerald-100" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base tracking-tight leading-none text-emerald-400">
                SGGW WNLiD
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none ${
                isDark ? 'bg-[#18261c] text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                Meblarstwo Zaoczne
              </span>
            </div>
            <p className="text-[11px] text-stone-400 truncate leading-tight mt-0.5">
              Semestr zimowy 2026/2027 • Budynek 34
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Direct SGGW Official Link / Download */}
          <a
            href={getYearFileUrl()}
            target="_blank"
            rel="noopener noreferrer"
            title="Pobierz oficjalny plik XLS/PDF ze strony SGGW"
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
              isDark 
                ? 'bg-[#131e16] border-[#223827] text-emerald-400 hover:bg-[#1a2b1f] hover:text-emerald-300' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Pobierz PDF</span>
          </a>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Odśwież plan zajęć"
            className={`p-2 rounded-xl transition ${
              isDark ? 'hover:bg-[#18251b] text-stone-300' : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            title="Powiadomienia o zmianach sal"
            className={`relative p-2 rounded-xl transition ${
              isDark ? 'hover:bg-[#18251b] text-stone-300' : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Google Calendar Sync */}
          <button
            onClick={onOpenCalendarSync}
            title="Synchronizuj z Kalendarzem Google"
            className={`p-2 rounded-xl transition ${
              isDark ? 'hover:bg-[#18251b] text-stone-300' : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Włącz tryb jasny' : 'Włącz tryb ciemny'}
            className={`p-2 rounded-xl transition ${
              isDark ? 'hover:bg-[#18251b] text-amber-300' : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-stone-700" />}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title="Ustawienia i zmiana roku"
            className={`p-2 rounded-xl transition ${
              isDark ? 'hover:bg-[#18251b] text-stone-300' : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Year Selector Bar (Super Quick Switching & Clear Turnus Display) */}
      <div className={`border-t px-3 py-1.5 overflow-x-auto ${
        isDark ? 'border-[#1b2a1e] bg-[#090e0a]' : 'border-emerald-50 bg-emerald-50/40'
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Quick Year Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {([1, 2, 3, 4] as RokStudiow[]).map((rok) => {
              const isSelected = profile.rok === rok;
              const rokTurnus = rok % 2 === 1 ? 'Turnus A' : 'Turnus B';
              const semestrNum = rok === 1 ? 1 : rok === 2 ? 3 : rok === 3 ? 5 : 7;
              
              return (
                <button
                  key={`header-rok-${rok}`}
                  onClick={() => onChangeYear(rok)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDark
                        ? 'bg-[#121c15] text-stone-300 hover:bg-[#19271c] hover:text-white border border-[#1e2f22]'
                        : 'bg-white text-stone-700 hover:bg-emerald-100/50 border border-stone-200'
                  }`}
                >
                  <span>Rok {rok} (sem. {semestrNum})</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-emerald-700/60 text-emerald-100' : 'opacity-70'
                  }`}>
                    {rokTurnus === 'Turnus A' ? 'T-A' : 'T-B'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Status Badge */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
              profile.turnus === 'Turnus B'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                : 'bg-teal-950 text-teal-300 border border-teal-600/40'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {profile.turnus} (Zjazdy co 2 tyg.)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
