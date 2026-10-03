import React, { useState } from 'react';
import { BellRing, X, AlertTriangle, Check, Volume2, Shield, Clock, Trash2 } from 'lucide-react';
import { ScheduleChangeAlert } from '../types/schedule';
import { requestNotificationPermission, sendBrowserNotification, playNotificationSound } from '../utils/notifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: ScheduleChangeAlert[];
  userRok?: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll: () => void;
  onSimulateChange: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  alerts,
  userRok,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSimulateChange,
}) => {
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermissionState(res);
    if (res === 'granted') {
      sendBrowserNotification('Plan Meblarstwo WTD', {
        body: 'Powiadomienia o zmianach sal WTD są aktywne!',
      });
      playNotificationSound();
    }
  };

  // Filter alerts specifically for student's year or general faculty notices
  const relevantAlerts = alerts.filter(a => a.rok === undefined || a.rok === userRok);
  const unreadCount = relevantAlerts.filter(a => !a.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-[#111608] border border-[#253210] shadow-2xl text-stone-100 my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0d1205] px-6 py-4 border-b border-[#253210] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-[#a2c41f]" />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Centrum powiadomień</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#54650F] text-white font-extrabold text-[10px]">
                    {unreadCount} nowe
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-400">Zmiany sal i harmonogramu WTD</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Permission Card */}
          {permissionState !== 'granted' && (
            <div className="p-3.5 rounded-xl border border-[#54650F]/50 bg-[#161d0b] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#a2c41f] shrink-0" />
                <span className="text-stone-300">Włącz powiadomienia w przeglądarce o zmianach sal</span>
              </div>
              <button
                onClick={handleRequestPermission}
                className="px-3 py-1.5 rounded-lg bg-[#54650F] hover:bg-[#687c14] text-white font-bold shrink-0 transition"
              >
                Włącz
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between text-xs pb-1 border-b border-[#253210]">
            <button
              onClick={onSimulateChange}
              className="text-[#cfe665] hover:text-[#e4f783] font-bold flex items-center gap-1"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Symuluj zmianę sali</span>
            </button>

            {alerts.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-stone-400 hover:text-red-400 transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wyczyść wszystko</span>
              </button>
            )}
          </div>

          {/* Alerts List */}
          <div className="space-y-2.5">
            {relevantAlerts.length === 0 ? (
              <div className="py-8 text-center text-stone-500 text-xs">
                Brak powiadomień dla Twojego roku. Harmonogram jest aktualny!
              </div>
            ) : (
              relevantAlerts.map((a) => (
                <div
                  key={a.id}
                  onClick={() => onMarkAsRead(a.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    !a.read
                      ? 'bg-[#18210d] border-[#54650F] shadow-xs'
                      : 'bg-[#13190a] border-[#253210] opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        !a.read ? 'bg-[#a2c41f] animate-pulse' : 'bg-stone-600'
                      }`} />
                      <h4 className="font-bold text-xs sm:text-sm text-stone-100">
                        {a.title}
                      </h4>
                    </div>

                    <span className="text-[10px] text-stone-500 font-mono shrink-0">
                      {a.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 mt-1.5 leading-relaxed pl-4">
                    {a.message}
                  </p>

                  {a.oldValue && a.newValue && a.oldValue !== '-' && (
                    <div className="mt-2 pl-4 flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-red-400 line-through">{a.oldValue}</span>
                      <span className="text-stone-500">→</span>
                      <span className="text-[#a2c41f] font-bold">{a.newValue}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#0d1205] px-6 py-3 border-t border-[#253210] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#253210] text-stone-300 text-xs font-semibold hover:bg-[#1a230d]"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
