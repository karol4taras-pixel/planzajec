import React from 'react';
import { RotateCw, Bell, Sparkles } from 'lucide-react';
import { StudentProfile } from '../types/schedule';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  profile: StudentProfile;
  onOpenSettings: () => void;
  unreadAlertsCount: number;
  onOpenNotifications: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  onOpenSettings,
  unreadAlertsCount,
  onOpenNotifications,
  onRefresh,
  isRefreshing,
}) => {
  const shortMajor = profile.kierunek === 'Technologia Drewna' ? 'Drewno' : 'Meblarstwo';
  const shortMode = profile.mode === 'stacjonarne' ? 'Dzienne' : `Zaoczne (${profile.turnus.replace('Turnus ', '')})`;

  return (
    <header className="sticky top-0 z-40 bg-[#1b4332] text-white border-b border-[#2d6a4f] shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-12 flex items-center justify-between gap-2">
        {/* Left: Brand & Compact Profile Pill */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-800 border border-emerald-600/50 flex items-center justify-center font-black text-xs text-emerald-200 flex-shrink-0">
            WTD
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-left transition min-w-0"
            title="Kliknij, aby zmienić rok lub tryb w Ustawieniach"
          >
            <span className="font-extrabold text-xs tracking-tight text-white truncate">
              Plan SGGW
            </span>
            <span className="text-[10px] text-emerald-300 font-bold px-1 py-0.2 rounded bg-black/20 whitespace-nowrap">
              {shortMajor} • R{profile.rok} • {shortMode}
            </span>
          </button>
        </div>

        {/* Right: Refresh button, Bell, PWA install */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Live Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-200 hover:text-white transition active:scale-95"
            title="Odśwież plan ze strony wnlid.sggw.edu.pl"
            aria-label="Odśwież plan"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-300' : ''}`} />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white transition active:scale-95"
            title="Powiadomienia o zmianach sal"
            aria-label="Powiadomienia"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-stone-950">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* PWA Install */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
