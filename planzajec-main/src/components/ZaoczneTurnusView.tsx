import React, { useState, useMemo } from 'react';
import { CalendarCheck2, Clock, MapPin, CheckCircle, AlertCircle, CalendarPlus, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { ZjazdWeekend, TurnusType, ScheduleEvent } from '../types/schedule';
import { OFFICIAL_ZJAZDY_CALENDAR } from '../data/sampleSchedules';

interface ZaoczneTurnusViewProps {
  currentTurnus: TurnusType;
  onTurnusChange: (t: TurnusType) => void;
  events: ScheduleEvent[];
  onOpenCalendarSync: () => void;
}

export const ZaoczneTurnusView: React.FC<ZaoczneTurnusViewProps> = ({
  currentTurnus,
  onTurnusChange,
  events,
  onOpenCalendarSync,
}) => {
  const [selectedZjazdId, setSelectedZjazdId] = useState<number | null>(null);
  const [testDate, setTestDate] = useState<string>('');

  const effectiveTurnus: 'Turnus A' | 'Turnus B' = currentTurnus === 'Turnus B' ? 'Turnus B' : 'Turnus A';

  const nowStr = new Date().toISOString().split('T')[0];
  const nextZjazd = useMemo(() => {
    return OFFICIAL_ZJAZDY_CALENDAR.find(z => {
      const isMyTurnus = z.turnus === effectiveTurnus || z.turnus === 'Turnus A i B';
      return isMyTurnus && z.endDate >= nowStr;
    }) || OFFICIAL_ZJAZDY_CALENDAR[0];
  }, [effectiveTurnus, nowStr]);

  const daysUntilNext = useMemo(() => {
    if (!nextZjazd) return null;
    const target = new Date(nextZjazd.startDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [nextZjazd]);

  const customDateCheck = useMemo(() => {
    if (!testDate) return null;
    const matched = OFFICIAL_ZJAZDY_CALENDAR.find(z => testDate >= z.startDate && testDate <= z.endDate);
    if (!matched) {
      return {
        hasZjazd: false,
        message: 'W wybranym terminie nie ma zaplanowanego zjazdu dydaktycznego na WTD SGGW (weekend wolny).',
        turnusName: null
      };
    }

    const isMine = matched.turnus === effectiveTurnus || matched.turnus === 'Turnus A i B';
    return {
      hasZjazd: isMine,
      zjazd: matched,
      message: isMine 
        ? `W tym terminie masz zjazd (${matched.turnus}, Zjazd nr ${matched.number})! Wymagana obecność.` 
        : `Dobra wiadomość: W ten weekend zjazd ma ${matched.turnus}. Twój ${effectiveTurnus} ma wolne!`,
      turnusName: matched.turnus
    };
  }, [testDate, effectiveTurnus]);

  const zaoczneEvents = useMemo(() => {
    return events.filter(e => e.mode === 'zaoczne' && (e.turnus === 'Wszystkie' || e.turnus === effectiveTurnus));
  }, [events, effectiveTurnus]);

  return (
    <div className="space-y-4">
      {/* Turnus Header Card */}
      <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#e8f5e9] text-[#1b4332] mb-1.5">
              <CalendarCheck2 className="w-3.5 h-3.5 text-[#2d6a4f]" />
              <span>Studia Niestacjonarne • Turnusy A i B</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              Harmonogram Zjazdów i Dostępność
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Wydział Nauk Leśnych i Technologii Drewna SGGW (Budynek 34)
            </p>
          </div>

          {/* Quick Turnus Switch */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-bold">
            <button
              onClick={() => onTurnusChange('Turnus A')}
              className={`px-3 py-1.5 rounded-lg transition ${
                effectiveTurnus === 'Turnus A'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Turnus A
            </button>
            <button
              onClick={() => onTurnusChange('Turnus B')}
              className={`px-3 py-1.5 rounded-lg transition ${
                effectiveTurnus === 'Turnus B'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Turnus B
            </button>
          </div>
        </div>

        {/* Nearest Zjazd Box */}
        {nextZjazd && (
          <div className="mt-4 pt-3.5 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#e8f5e9] text-[#1b4332]">
                <Clock className="w-5 h-5 text-[#2d6a4f]" />
              </div>
              <div>
                <span className="font-bold uppercase text-[10px] text-stone-500 tracking-wider block">
                  Najbliższy zjazd Twojego turnusu ({effectiveTurnus})
                </span>
                <p className="text-sm font-bold text-stone-900">
                  Zjazd nr {nextZjazd.number}: {nextZjazd.startDate} — {nextZjazd.endDate}
                </p>
                <p className="text-stone-600 text-[11px]">{nextZjazd.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-center">
                <span className="text-base font-black text-[#1b4332]">
                  {daysUntilNext !== null ? (daysUntilNext > 0 ? daysUntilNext : 'DZIŚ') : '-'}
                </span>
                <span className="text-[10px] text-stone-500 block -mt-1">dni</span>
              </div>
              <button
                onClick={onOpenCalendarSync}
                className="px-3 py-2 rounded-xl bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-semibold transition active:scale-95"
              >
                Eksportuj zjazdy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Availability Checker */}
      <div className="rounded-2xl bg-white border border-stone-200 p-4 sm:p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#2d6a4f]" />
          <h3 className="text-sm font-bold text-stone-900">
            Kalkulator dostępności na wybrany weekend
          </h3>
        </div>
        <p className="text-xs text-stone-600">
          Wybierz datę, aby sprawdzić czy Twój turnus ({effectiveTurnus}) ma wtedy zjazd na SGGW:
        </p>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#2d6a4f]"
          />
          {testDate && (
            <button
              onClick={() => setTestDate('')}
              className="text-xs text-stone-500 hover:text-stone-800"
            >
              Wyczyść
            </button>
          )}
        </div>

        {customDateCheck && (
          <div className={`mt-2 p-3 rounded-xl border text-xs flex items-start gap-2 ${
            customDateCheck.hasZjazd
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}>
            {customDateCheck.hasZjazd ? (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block text-xs">
                {customDateCheck.hasZjazd ? 'ZJAZD ZAJĘCIOWY — MASZ ZAJĘCIA' : 'WEEKEND WOLNY OD ZAJĘĆ'}
              </span>
              <p className="text-[11px] mt-0.5">{customDateCheck.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* List of All Zjazdy */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-stone-900 px-1">
          Kalendarz zjazdów na rok akademicki 2026/2027
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {OFFICIAL_ZJAZDY_CALENDAR.map(zjazd => {
            const isMyTurnus = zjazd.turnus === effectiveTurnus || zjazd.turnus === 'Turnus A i B';
            const isExpanded = selectedZjazdId === zjazd.number;

            return (
              <div
                key={zjazd.number}
                className={`p-4 rounded-2xl bg-white border transition shadow-xs ${
                  isMyTurnus
                    ? 'border-[#2d6a4f] border-l-4 border-l-[#1b4332]'
                    : 'border-stone-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-stone-100 text-stone-700">
                        Zjazd {zjazd.number}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        isMyTurnus ? 'bg-[#e8f5e9] text-[#1b4332]' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {zjazd.turnus}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-stone-900">
                      {zjazd.startDate} — {zjazd.endDate}
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">{zjazd.description}</p>
                  </div>

                  <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${
                    isMyTurnus ? 'bg-[#e8f5e9] text-[#1b4332]' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {isMyTurnus ? 'Mój zjazd' : 'Wolne'}
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedZjazdId(isExpanded ? null : zjazd.number)}
                    className="text-[#2d6a4f] hover:underline font-bold flex items-center gap-1"
                  >
                    <span>{isExpanded ? 'Zwiń plan' : 'Pokaż sale i przedmioty'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <span className="text-[11px] text-stone-400">Budynek 34 WTD</span>
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-stone-100 space-y-1.5 text-xs animate-in fade-in">
                    {zaoczneEvents.length === 0 ? (
                      <p className="text-stone-400 text-xs">Brak szczegółowego planu w bazie.</p>
                    ) : (
                      zaoczneEvents.map(e => (
                        <div key={e.id} className="p-2 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-stone-700">
                              {e.dayOfWeek === 6 ? 'Sobota' : 'Niedziela'} {e.startTime}-{e.endTime}
                            </span>
                            <p className="font-bold text-stone-900 text-xs">{e.courseName}</p>
                          </div>
                          <span className="font-mono font-bold text-stone-800 text-[11px] bg-white px-2 py-0.5 rounded border border-stone-300">
                            {e.room}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
