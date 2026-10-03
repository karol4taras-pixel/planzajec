import React, { useState } from 'react';
import { Calendar, Download, Clock, CheckCircle2, AlertCircle, ExternalLink, CalendarPlus, ShieldCheck } from 'lucide-react';
import { OFFICIAL_ZJAZDY_CALENDAR, SGGW_OFFICIAL_LINKS } from '../data/sampleSchedules';
import { ZjazdWeekend } from '../types/schedule';

interface SggwHarmonogramViewProps {
  isDark: boolean;
  userTurnus: 'Turnus A' | 'Turnus B';
  userRok: number;
  onOpenCalendarModal: () => void;
}

export const SggwHarmonogramView: React.FC<SggwHarmonogramViewProps> = ({
  isDark,
  userTurnus,
  userRok,
  onOpenCalendarModal,
}) => {
  const [selectedTurnus, setSelectedTurnus] = useState<'Turnus A' | 'Turnus B'>(userTurnus);

  // Filter zjazdy for the chosen turnus
  const zjazdy = OFFICIAL_ZJAZDY_CALENDAR.filter(
    z => z.turnus === selectedTurnus || z.turnus === 'Turnus A i B'
  );

  const todayISO = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 pb-20">
      {/* Header inspired by Screenshot #2 */}
      <div className={`p-4 rounded-2xl border transition ${
        isDark ? 'bg-[#111913] border-[#1d2d20]' : 'bg-white border-emerald-100'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                WNLiD SGGW • Oficjalny Terminarz
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1">
              Harmonogram zjazdów dla studentów studiów niestacjonarnych w roku akademickim 2026/2027
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Kierunki: Technologia drewna, Meblarstwo • Wydział Nauk Leśnych i Technologii Drewna
            </p>
          </div>

          <a
            href={SGGW_OFFICIAL_LINKS.harmonogramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition border shrink-0 ${
              isDark 
                ? 'bg-[#162319] hover:bg-[#1d3022] text-emerald-400 border-emerald-700/40' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Pobierz PDF z SGGW</span>
          </a>
        </div>

        {/* Turnus Switcher */}
        <div className="mt-4 pt-3 border-t border-[#1f3023]/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Wybierz turnus:</span>
            <button
              onClick={() => setSelectedTurnus('Turnus B')}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                selectedTurnus === 'Turnus B'
                  ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                  : isDark
                    ? 'bg-[#141f17] text-stone-300 hover:bg-[#1b2b1f] border border-[#223626]'
                    : 'bg-stone-100 text-stone-700'
              }`}
            >
              <span>Turnus B (Rok II i IV)</span>
              {userTurnus === 'Turnus B' && (
                <span className="text-[10px] px-1 rounded bg-black/20 text-black">Twój</span>
              )}
            </button>

            <button
              onClick={() => setSelectedTurnus('Turnus A')}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                selectedTurnus === 'Turnus A'
                  ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                  : isDark
                    ? 'bg-[#141f17] text-stone-300 hover:bg-[#1b2b1f] border border-[#223626]'
                    : 'bg-stone-100 text-stone-700'
              }`}
            >
              <span>Turnus A (Rok I i III)</span>
              {userTurnus === 'Turnus A' && (
                <span className="text-[10px] px-1 rounded bg-black/20 text-black">Twój</span>
              )}
            </button>
          </div>

          <button
            onClick={onOpenCalendarModal}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Synchronizuj z Kalendarzem Google</span>
          </button>
        </div>
      </div>

      {/* List of Zjazdy for the chosen Turnus */}
      <div className="space-y-2.5">
        {zjazdy.map((z) => {
          const isPast = z.endDate < todayISO;
          const isSesja = z.type === 'sesja' || z.type === 'poprawkowa';

          return (
            <div
              key={`harm-zjazd-${z.number}`}
              className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                isSesja
                  ? isDark ? 'bg-[#151322] border-purple-900/50' : 'bg-purple-50/60 border-purple-200'
                  : isDark
                    ? 'bg-[#121b14] border-[#1e2f22]'
                    : 'bg-white border-stone-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Number Badge */}
                <div className={`w-10 h-10 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 ${
                  isSesja
                    ? 'bg-purple-900/60 text-purple-200 border border-purple-700/40'
                    : 'bg-[#18271c] text-emerald-400 border border-emerald-600/30'
                }`}>
                  {isSesja ? 'S' : z.number}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-stone-100">
                      {z.description}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                      isSesja
                        ? 'bg-purple-950 text-purple-300 border border-purple-800/40'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                    }`}>
                      {z.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-stone-400 mt-1 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      {z.startDate} do {z.endDate}
                    </span>
                    <span className="hidden sm:inline">• Zjazd weekendowy (pt-ndz)</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="shrink-0 text-right">
                {isPast ? (
                  <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-600" />
                    <span className="hidden sm:inline">Zakończony</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-400 font-bold px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/30">
                    Nadchodzący
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
