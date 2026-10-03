import React from 'react';
import { Home, ListFilter, Calendar, Mail, LayoutGrid } from 'lucide-react';

export type LibrusTab = 'home' | 'zjazdy' | 'plan' | 'wiadomosci' | 'menu';

interface LibrusBottomNavProps {
  activeTab: LibrusTab;
  onTabChange: (tab: LibrusTab) => void;
  unreadCount: number;
  isDark: boolean;
}

export const LibrusBottomNav: React.FC<LibrusBottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount,
  isDark,
}) => {
  const tabs = [
    { id: 'home' as LibrusTab, icon: Home, label: 'Pulpit' },
    { id: 'zjazdy' as LibrusTab, icon: ListFilter, label: 'Terminarz' },
    { id: 'plan' as LibrusTab, icon: Calendar, label: 'Plan lekcji' },
    { id: 'wiadomosci' as LibrusTab, icon: Mail, label: 'Wiadomości', badge: unreadCount },
    { id: 'menu' as LibrusTab, icon: LayoutGrid, label: 'Więcej' },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t pb-safe ${
      isDark ? 'bg-[#18202c] border-stone-800' : 'bg-white border-stone-200'
    } shadow-lg`}>
      <div className="max-w-lg mx-auto grid grid-cols-5 h-12">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center relative active:scale-90 transition"
              title={tab.label}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition ${
                    isActive
                      ? 'text-[#2980b9] stroke-[2.5]'
                      : 'text-stone-400 dark:text-stone-500 stroke-2'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#e74c3c] text-[10px] font-bold text-white shadow-xs">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
