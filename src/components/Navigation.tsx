import React from 'react';
import { Calendar, LayoutGrid, CalendarCheck2, Settings } from 'lucide-react';

export type ActiveTab = 'calendar' | 'timetable' | 'zjazdy' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  unreadAlertsCount: number;
  isZaoczneMode: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  unreadAlertsCount,
  isZaoczneMode,
}) => {
  const tabs = [
    {
      id: 'calendar' as ActiveTab,
      label: 'Kalendarz',
      icon: Calendar,
      badge: null,
    },
    {
      id: 'timetable' as ActiveTab,
      label: 'Plan (Siatka)',
      icon: LayoutGrid,
      badge: null,
    },
    {
      id: 'zjazdy' as ActiveTab,
      label: isZaoczneMode ? 'Zjazdy (Zaoczne)' : 'Zjazdy WTD',
      icon: CalendarCheck2,
      badge: isZaoczneMode ? 'Zaoczne' : null,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Ustawienia',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Desktop Navigation Tabs */}
      <nav className="hidden md:flex items-center justify-center py-2 bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl w-full mx-auto px-4 flex items-center justify-start gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition relative active:scale-95 ${
                  isActive
                    ? 'bg-[#1b4332] text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-stone-400 dark:text-stone-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-stone-950">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Sticky Bottom Bar (Super clean, 4 buttons, height 52px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-safe shadow-lg">
        <div className="grid grid-cols-4 py-1 px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition relative active:scale-90 ${
                  isActive ? 'text-[#1b4332] dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-700'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-2 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-stone-950">
                      Z
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-black' : 'font-medium'}`}>
                  {tab.id === 'timetable' ? 'Siatka' : tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
