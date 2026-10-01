import React from 'react';
import { RotateCw, Bell, Settings, TreePine, ChevronDown } from 'lucide-react';
import { StudentProfile } from '../types/schedule';

interface LibrusHeaderProps {
  profile: StudentProfile;
  isDark: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  unreadCount?: number;
}

export const LibrusHeader: React.FC<LibrusHeaderProps> = ({
  profile,
  isDark,
  onRefresh,
  isRefreshing,
  onOpenNotifications,
  onOpenSettings,
  unreadCount = 0,
}) => {
  const semester = profile.rok === 1 ? 1 : profile.rok === 2 ? 3 : profile.rok === 3 ? 5 : 7;

  return (
    <header className={`sticky top-0 z-40 border-b px-3 sm:px-4 h-13 flex items-center justify-between transition-colors ${
      isDark ? 'bg-[#0d1205] border-[#253210] text-stone-100 shadow-xs' : 'bg-white border-[#e0e6cf] text-[#222906] shadow-xs'
    }`}>
      {/* Left: Faculty / Course Brand & Year info */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2 text-left group"
        title="Kliknij, aby zmienić rok lub grupę"
      >
        <div className="w-8 h-8 rounded-xl bg-[#54650F] text-white flex items-center justify-center shadow-xs border border-[#6b8014]/40">
          <TreePine className="w-4 h-4 text-[#e6f2b6]" />
        </div>

        <div>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-stone-100 group-hover:text-[#a2c41f] transition">
              Meblarstwo SGGW
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#a2c41f] transition" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5 leading-none">
            <span className="font-semibold text-[#a2c41f]">Rok {profile.rok} (sem. {semester})</span>
            <span>•</span>
            <span className="font-mono text-[#cfe665] font-bold">{profile.turnus}</span>
          </div>
        </div>
      </button>

      {/* Right: Odświeżanie, Powiadomienia, Ustawienia */}
      <div className="flex items-center gap-1">
        {/* Odświeżanie */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`p-2 rounded-xl transition ${
            isDark ? 'hover:bg-[#19220a] text-stone-300' : 'hover:bg-[#f0f4e4] text-[#414f0b]'
          }`}
          title="Odśwież plan zajęć"
        >
          <RotateCw className={`w-4 h-4 text-[#a2c41f] ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Powiadomienia z licznikiem */}
        <button
          onClick={onOpenNotifications}
          className={`relative p-2 rounded-xl transition ${
            isDark ? 'hover:bg-[#19220a] text-stone-300' : 'hover:bg-[#f0f4e4] text-[#414f0b]'
          }`}
          title="Powiadomienia o zmianach sal"
        >
          <Bell className="w-4 h-4 text-stone-300" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#54650F] text-white border border-[#a2c41f]/60 font-extrabold text-[9px] flex items-center justify-center shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Ustawienia */}
        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-xl transition ${
            isDark ? 'hover:bg-[#19220a] text-stone-300' : 'hover:bg-[#f0f4e4] text-[#414f0b]'
          }`}
          title="Ustawienia (rok, motyw, Kalendarz Google)"
        >
          <Settings className="w-4 h-4 text-stone-300" />
        </button>
      </div>
    </header>
  );
};
