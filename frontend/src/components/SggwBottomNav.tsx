import React from 'react';
import { CalendarDays, CalendarCheck2, FileDown, CalendarPlus, Settings, Bell } from 'lucide-react';

export type SggwTab = 'plan' | 'harmonogram' | 'pliki' | 'google' | 'ustawienia';

interface SggwBottomNavProps {
  activeTab: SggwTab;
  onSelectTab: (tab: SggwTab) => void;
  isDark: boolean;
  unreadAlertsCount?: number;
}

export const SggwBottomNav: React.FC<SggwBottomNavProps> = ({
  activeTab,
  onSelectTab,
  isDark,
  unreadAlertsCount = 0,
}) => {
  const tabs = [
    {
      id: 'plan' as SggwTab,
      label: 'Plan zjazdu',
      icon: CalendarDays,
    },
    {
      id: 'harmonogram' as SggwTab,
      label: 'Zjazdy',
      icon: CalendarCheck2,
    },
    {
      id: 'pliki' as SggwTab,
      label: 'Pliki SGGW',
      icon: FileDown,
    },
    {
      id: 'google' as SggwTab,
      label: 'Google Sync',
      icon: CalendarPlus,
    },
    {
      id: 'ustawienia' as SggwTab,
      label: 'Ustawienia',
      icon: Settings,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
    },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t transition-colors backdrop-blur-lg ${
      isDark 
        ? 'bg-[#0b110d]/95 border-[#1d2d20] text-stone-300' 
        : 'bg-white/95 border-emerald-100 text-stone-700 shadow-md'
    }`}>
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={`bottom-nav-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center relative transition rounded-xl ${
                isActive
                  ? 'text-emerald-400 font-extrabold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] scale-110 text-emerald-400 transition-transform' : ''}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-1 leading-none ${isActive ? 'font-bold text-emerald-400' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
