import React, { useState } from 'react';
import { 
  Settings, User, Moon, Sun, RotateCw, Calendar, Bell, 
  Volume2, Shield, Check, ExternalLink, Sparkles, CheckCircle2,
  Download, AlertTriangle, TreePine
} from 'lucide-react';
import { StudentProfile, RokStudiow } from '../types/schedule';
import { playNotificationSound, requestNotificationPermission } from '../utils/notifications';

interface SettingsTabProps {
  profile: StudentProfile;
  onUpdateProfile: (newProfile: StudentProfile) => void;
  isDarkTheme: boolean;
  onToggleTheme: (isDark: boolean) => void;
  onRefreshFromSGGW: () => Promise<void>;
  isRefreshing: boolean;
  lastRefreshTime: string | null;
  onOpenCalendarSync: () => void;
  onSimulateChange: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  profile,
  onUpdateProfile,
  isDarkTheme,
  onToggleTheme,
  onRefreshFromSGGW,
  isRefreshing,
  lastRefreshTime,
  onOpenCalendarSync,
  onSimulateChange,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleYearChange = (rok: RokStudiow) => {
    const autoTurnus = rok % 2 === 1 ? 'Turnus A' : 'Turnus B';
    const updated: StudentProfile = {
      ...profile,
      rok,
      turnus: autoTurnus,
    };
    onUpdateProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleGroupChange = (grupa: string) => {
    onUpdateProfile({ ...profile, grupa });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const testAudio = () => {
    playNotificationSound();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">
      {/* Title */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#a2c41f]" />
          <span>Ustawienia studenta</span>
        </h2>
        {saveSuccess && (
          <span className="text-xs font-bold text-[#a2c41f] flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Zapisano</span>
          </span>
        )}
      </div>

      {/* Card 1: Rok i Turnus */}
      <div className={`rounded-2xl border p-4 transition ${
        isDarkTheme ? 'bg-[#111608] border-[#253210]' : 'bg-white border-[#e0e6cf] shadow-xs'
      }`}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#253210]">
          <TreePine className="w-4 h-4 text-[#a2c41f]" />
          <h3 className="text-xs font-bold text-stone-100 uppercase tracking-wider">
            Rok studiów i Turnus (Meblarstwo Zaoczne)
          </h3>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-300 mb-2">
              Wybierz rok i semestr studiów:
            </label>
            <div className="space-y-2">
              {[
                { r: 1, zimowySem: 1, letniSem: 2, turnus: 'Turnus A' },
                { r: 2, zimowySem: 3, letniSem: 4, turnus: 'Turnus B' },
                { r: 3, zimowySem: 5, letniSem: 6, turnus: 'Turnus A' },
                { r: 4, zimowySem: 7, letniSem: null, turnus: 'Turnus B' },
              ].map(({ r, zimowySem, letniSem, turnus: t }) => {
                const isSelected = profile.rok === r;

                return (
                  <div key={`set-rok-${r}`} className="p-2.5 rounded-xl border border-[#253210] bg-[#141b0b]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-stone-200">
                        Rok {r} • <span className="font-mono text-[#a2c41f] font-semibold">{t}</span>
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-[#a2c41f] bg-[#23310d] px-2 py-0.2 rounded-full border border-[#54650F]/50">
                          Aktywny rok
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Semestr Zimowy: AKTYWNY */}
                      <button
                        type="button"
                        onClick={() => handleYearChange(r as RokStudiow)}
                        className={`py-2 px-3 rounded-lg border text-left text-xs font-bold transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#54650F] text-white border-[#6c8213] shadow-sm'
                            : 'bg-[#18200d] text-stone-300 border-[#253210] hover:border-[#54650F]'
                        }`}
                      >
                        <div>
                          <span>Semestr {zimowySem} (Zimowy)</span>
                          <span className="block text-[10px] font-normal text-stone-400">Plan dostępny</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>

                      {/* Semestr Letni: CIEMNY, NIE DO KLIKNIĘCIA */}
                      {letniSem !== null ? (
                        <button
                          type="button"
                          disabled
                          className="py-2 px-3 rounded-lg border border-stone-800 bg-[#090d04] text-stone-500 cursor-not-allowed opacity-50 text-left text-xs select-none"
                          title="Semestr letni nie został jeszcze opublikowany przez dziekanat"
                        >
                          <div>
                            <span className="line-through text-stone-400">Semestr {letniSem} (Letni)</span>
                            <span className="block text-[10px] text-amber-500/80 font-mono">Brak planu</span>
                          </div>
                        </button>
                      ) : (
                        <div className="py-2 px-3 rounded-lg border border-dashed border-[#253210] text-stone-500 text-center text-xs flex items-center justify-center font-mono">
                          Semestr dyplomowy
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-stone-400 mt-2 font-mono">
              💡 Zgodnie z harmonogramem WTD: Rok I i III to Turnus A, natomiast Rok II i IV to Turnus B.
            </p>
          </div>

          {/* Grupa ćwiczeniowa */}
          <div>
            <label className="block text-xs font-bold text-stone-300 mb-1.5">
              Twoja grupa ćwiczeniowa:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Wszystkie grupy', 'Grupa 1 (M1)', 'Grupa 2 (M2)'].map((g) => {
                const isSelected = profile.grupa === g || (g === 'Wszystkie grupy' && (!profile.grupa || profile.grupa === 'Wszystkie'));
                return (
                  <button
                    key={`set-gr-${g}`}
                    type="button"
                    onClick={() => handleGroupChange(g)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                      isSelected
                        ? 'bg-[#54650F] border-[#6c8213] text-white shadow-xs'
                        : isDarkTheme
                          ? 'bg-[#161d0b] border-[#253210] text-stone-300 hover:bg-[#1f280f]'
                          : 'bg-[#f4f7eb] border-[#e0e6cf] text-[#222906]'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Motyw graficzny */}
      <div className={`rounded-2xl border p-4 transition ${
        isDarkTheme ? 'bg-[#111608] border-[#253210]' : 'bg-white border-[#e0e6cf] shadow-xs'
      }`}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#253210]">
          <Moon className="w-4 h-4 text-[#a2c41f]" />
          <h3 className="text-xs font-bold text-stone-100 uppercase tracking-wider">
            Motyw graficzny
          </h3>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => onToggleTheme(true)}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              isDarkTheme
                ? 'bg-[#161d0b] border-[#54650F] text-white font-bold'
                : 'bg-stone-50 border-stone-200 text-stone-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Moon className="w-4 h-4 text-[#a2c41f]" />
              <div>
                <div className="text-xs font-bold">Ciemny oliwkowy</div>
                <div className="text-[10px] text-stone-400">Głęboka oliwka (#090d04)</div>
              </div>
            </div>
            {isDarkTheme && <Check className="w-4 h-4 text-[#a2c41f]" />}
          </button>

          <button
            onClick={() => onToggleTheme(false)}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              !isDarkTheme
                ? 'bg-[#eef2de] border-[#54650F] text-[#222906] font-bold'
                : 'bg-[#161d0b] border-[#253210] text-stone-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <div>
                <div className="text-xs font-bold">Jasny oliwkowy</div>
                <div className="text-[10px] text-stone-400">Jasny ciepły (#f6f8f0)</div>
              </div>
            </div>
            {!isDarkTheme && <Check className="w-4 h-4 text-[#54650F]" />}
          </button>
        </div>
      </div>

      {/* Card 3: Powiadomienia */}
      <div className={`rounded-2xl border p-4 transition ${
        isDarkTheme ? 'bg-[#111608] border-[#253210]' : 'bg-white border-[#e0e6cf] shadow-xs'
      }`}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#253210]">
          <Bell className="w-4 h-4 text-[#a2c41f]" />
          <h3 className="text-xs font-bold text-stone-100 uppercase tracking-wider">
            Powiadomienia i dźwięki
          </h3>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-stone-400">
            Aplikacja informuje o nagłych zmianach sal (np. przeniesienie z s.A-I do s.1-44) oraz odwołanych zajęciach.
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={testAudio}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                isDarkTheme 
                  ? 'bg-[#161d0b] hover:bg-[#1f280f] text-[#cfe665] border-[#253210]' 
                  : 'bg-[#eef2de] text-[#414f0b] border-[#dfe6cb]'
              }`}
            >
              <Volume2 className="w-4 h-4 text-[#a2c41f]" />
              <span>Przetestuj dźwięk gongu</span>
            </button>

            <button
              onClick={onSimulateChange}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                isDarkTheme 
                  ? 'bg-[#221c08] hover:bg-[#2e260b] text-amber-300 border-amber-900/40' 
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Symuluj zmianę sali</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card 4: Kalendarz Google */}
      <div className={`rounded-2xl border p-4 transition ${
        isDarkTheme ? 'bg-[#111608] border-[#253210]' : 'bg-white border-[#e0e6cf] shadow-xs'
      }`}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#253210]">
          <Calendar className="w-4 h-4 text-[#a2c41f]" />
          <h3 className="text-xs font-bold text-stone-100 uppercase tracking-wider">
            Synchronizacja z Kalendarzem Google
          </h3>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-stone-400">
            Możesz wyeksportować cały semestr zajęć bezpośrednio do swojego prywatnego Kalendarza Google lub pobrać plik `.ics`.
          </p>

          <button
            onClick={onOpenCalendarSync}
            className="w-full py-2.5 px-4 rounded-xl bg-[#54650F] hover:bg-[#687c14] text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Calendar className="w-4 h-4" />
            <span>Otwórz kreator synchronizacji kalendarza</span>
          </button>
        </div>
      </div>
    </div>
  );
};
