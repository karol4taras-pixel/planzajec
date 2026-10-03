import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, AlertTriangle, CalendarPlus, CheckCircle, Info } from 'lucide-react';
import { ScheduleEvent, StudentProfile } from '../types/schedule';
import { OFFICIAL_ZJAZDY_CALENDAR } from '../data/sampleSchedules';
import { createGoogleCalendarUrl } from '../utils/calendarSync';

interface CalendarScheduleViewProps {
  events: ScheduleEvent[];
  profile: StudentProfile;
  onOpenCalendarSync: () => void;
  onOpenNotifications: () => void;
}

const MONTH_NAMES_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const DAY_NAMES_SHORT = ['Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
const DAY_NAMES_LONG = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

export const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({
  events,
  profile,
  onOpenCalendarSync,
  onOpenNotifications,
}) => {
  // Current real or selected date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showFullMonth, setShowFullMonth] = useState<boolean>(false);

  // Month & year being navigated in the calendar
  const [viewYear, setViewYear] = useState<number>(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(currentDate.getMonth());

  // Format YYYY-MM-DD
  const formatDateISO = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const selectedDateISO = formatDateISO(currentDate);

  // 1 = Monday, 7 = Sunday
  const selectedDayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

  // Check if selected date falls into a Zaoczne Zjazd
  const zjazdInfo = useMemo(() => {
    return OFFICIAL_ZJAZDY_CALENDAR.find(z => selectedDateISO >= z.startDate && selectedDateISO <= z.endDate);
  }, [selectedDateISO]);

  // Determine if student has classes today based on mode and turnus
  const isClassDayForStudent = useMemo(() => {
    if (profile.mode === 'stacjonarne') {
      return selectedDayOfWeek >= 1 && selectedDayOfWeek <= 5;
    } else {
      // zaoczne
      if (selectedDayOfWeek < 5) return false; // weekend mode only (pt, sob, ndz)
      if (!zjazdInfo) return false;
      return zjazdInfo.turnus === profile.turnus || zjazdInfo.turnus === 'Turnus A i B';
    }
  }, [profile.mode, profile.turnus, selectedDayOfWeek, zjazdInfo]);

  // Get events scheduled for this day
  const dayEvents = useMemo(() => {
    if (!isClassDayForStudent) return [];

    return events.filter(e => {
      if (e.dayOfWeek !== selectedDayOfWeek) return false;
      if (e.mode !== profile.mode) return false;
      if (profile.mode === 'zaoczne') {
        if (e.turnus !== 'Wszystkie' && e.turnus !== profile.turnus) return false;
      }
      return true;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events, isClassDayForStudent, selectedDayOfWeek, profile]);

  // Calculate week days around the selected date (7 days strip)
  const weekStrip = useMemo(() => {
    const strip = [];
    const base = new Date(currentDate);
    // Find monday of current week
    const currentDay = base.getDay() === 0 ? 7 : base.getDay();
    const monday = new Date(base);
    monday.setDate(base.getDate() - (currentDay - 1));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      strip.push(d);
    }
    return strip;
  }, [currentDate]);

  // Generate full calendar grid for viewMonth & viewYear
  const calendarMonthDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    // Day of week for first day (1=Mon ... 7=Sun)
    const startDay = firstDayOfMonth.getDay() === 0 ? 7 : firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const days = [];
    // Padding before first day
    for (let i = 1; i < startDay; i++) {
      days.push({ dayNumber: null, date: null });
    }
    // Month days
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      days.push({ dayNumber: d, date: dateObj });
    }
    return days;
  }, [viewYear, viewMonth]);

  // Quick next/prev day handlers
  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 1);
    setCurrentDate(prev);
    setViewMonth(prev.getMonth());
    setViewYear(prev.getFullYear());
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 1);
    setCurrentDate(next);
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
  };

  const handleSelectDate = (d: Date) => {
    setCurrentDate(d);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  return (
    <div className="space-y-3">
      {/* Top Calendar Navigation Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-3 shadow-xs">
        {/* Month selector & Today button */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear(viewYear - 1);
                } else {
                  setViewMonth(viewMonth - 1);
                }
              }}
              className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 transition"
              title="Poprzedni miesiąc"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-stone-900">
              {MONTH_NAMES_PL[viewMonth]} {viewYear}
            </h3>

            <button
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear(viewYear + 1);
                } else {
                  setViewMonth(viewMonth + 1);
                }
              }}
              className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 transition"
              title="Następny miesiąc"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold transition"
            >
              Dzisiaj
            </button>

            <button
              onClick={() => setShowFullMonth(!showFullMonth)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                showFullMonth
                  ? 'bg-[#1b4332] text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {showFullMonth ? 'Zwiń kalendarz' : 'Miesiąc'}
            </button>
          </div>
        </div>

        {/* 7-Days Horizontal Strip (Visible by default) */}
        {!showFullMonth ? (
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekStrip.map((d) => {
              const isSelected = formatDateISO(d) === selectedDateISO;
              const isToday = formatDateISO(d) === formatDateISO(new Date());
              const dIso = formatDateISO(d);
              
              // Check if zjazd weekend
              const zInfo = OFFICIAL_ZJAZDY_CALENDAR.find(z => dIso >= z.startDate && dIso <= z.endDate);
              const hasZjazd = !!zInfo;
              const isMyZjazd = zInfo && (zInfo.turnus === profile.turnus || zInfo.turnus === 'Turnus A i B');

              return (
                <button
                  key={dIso}
                  onClick={() => handleSelectDate(d)}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center transition relative ${
                    isSelected
                      ? 'bg-[#1b4332] text-white shadow-xs'
                      : 'hover:bg-stone-100 text-stone-800'
                  }`}
                >
                  <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-emerald-200' : 'text-stone-400'}`}>
                    {DAY_NAMES_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                  </span>
                  <span className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-stone-900'}`}>
                    {d.getDate()}
                  </span>

                  {/* Indicator dots */}
                  {profile.mode === 'zaoczne' && hasZjazd && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isMyZjazd ? (isSelected ? 'bg-amber-300' : 'bg-[#2d6a4f]') : 'bg-stone-300'
                    }`} />
                  )}
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-amber-500 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Full Month Grid (When expanded) */
          <div className="pt-1 space-y-1 animate-in fade-in duration-150">
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-stone-400 uppercase py-1 border-b border-stone-100">
              {DAY_NAMES_SHORT.map(name => (
                <div key={name}>{name}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarMonthDays.map((item, idx) => {
                if (!item.date || item.dayNumber === null) {
                  return <div key={`empty-${idx}`} className="p-2" />;
                }

                const dIso = formatDateISO(item.date);
                const isSelected = dIso === selectedDateISO;
                const isToday = dIso === formatDateISO(new Date());

                const zInfo = OFFICIAL_ZJAZDY_CALENDAR.find(z => dIso >= z.startDate && dIso <= z.endDate);
                const hasZjazd = !!zInfo;
                const isMyZjazd = zInfo && (zInfo.turnus === profile.turnus || zInfo.turnus === 'Turnus A i B');

                return (
                  <button
                    key={dIso}
                    onClick={() => handleSelectDate(item.date!)}
                    className={`p-1.5 sm:p-2 rounded-xl flex flex-col items-center justify-center transition text-xs relative ${
                      isSelected
                        ? 'bg-[#1b4332] text-white shadow-xs font-bold'
                        : isToday
                        ? 'border border-[#2d6a4f] text-stone-900 font-bold bg-emerald-50/40'
                        : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <span>{item.dayNumber}</span>
                    {profile.mode === 'zaoczne' && hasZjazd && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isMyZjazd ? (isSelected ? 'bg-amber-300' : 'bg-[#2d6a4f]') : 'bg-stone-300'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Info Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-stone-900">
                {DAY_NAMES_LONG[currentDate.getDay()]}, {currentDate.getDate()} {MONTH_NAMES_PL[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Plan dla: <strong className="text-stone-800">{profile.kierunek} • Rok {profile.rok} • {profile.mode === 'stacjonarne' ? 'Stacjonarne' : `Zaoczne (${profile.turnus})`}</strong>
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Wstecz</span>
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1"
            >
              <span>Dalej</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Callout for this Date */}
        {profile.mode === 'zaoczne' ? (
          <div className="mt-3">
            {zjazdInfo ? (
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                isClassDayForStudent
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                  : 'bg-stone-50 border-stone-200 text-stone-700'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isClassDayForStudent ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'}`} />
                  <div>
                    <span className="font-bold block">
                      {isClassDayForStudent
                        ? `Zjazd Twojego turnusu (${profile.turnus}, Zjazd ${zjazdInfo.number})`
                        : `Weekend wolny dla ${profile.turnus} (Zjazd ma ${zjazdInfo.turnus})`}
                    </span>
                    <span className="text-[11px] opacity-80">{zjazdInfo.description}</span>
                  </div>
                </div>
                <span className="font-bold text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-stone-200">
                  {zjazdInfo.turnus}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500">
                W ten weekend nie ma zaplanowanego zjazdu dydaktycznego na WTD (weekend wolny od zajęć).
              </div>
            )}
          </div>
        ) : (
          /* Stacjonarne weekday status */
          (selectedDayOfWeek >= 6) && (
            <div className="mt-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-stone-400" />
              <span>Weekend wolny od zajęć dla studiów stacjonarnych.</span>
            </div>
          )
        )}
      </div>

      {/* Classes Scheduled for this Day */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-bold text-stone-700 uppercase tracking-wider">
            Zajęcia w tym dniu ({dayEvents.length})
          </span>
          {dayEvents.length > 0 && (
            <button
              onClick={onOpenCalendarSync}
              className="text-[#2d6a4f] hover:underline font-bold flex items-center gap-1"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Dodaj dzień do Kalendarza Google</span>
            </button>
          )}
        </div>

        {dayEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-xs">
            <CalendarIcon className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-stone-800">Brak zajęć w wybranym dniu</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {profile.mode === 'zaoczne'
                ? 'Dla Twojego turnusu w tym terminie nie zaplanowano zajęć. Skorzystaj z kalendarza powyżej, aby sprawdzić najbliższy zjazd.'
                : 'W ten dzień nie ma zaplanowanych zajęć dydaktycznych.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((evt, idx) => {
              const calUrl = createGoogleCalendarUrl(evt, selectedDateISO);

              return (
                <div
                  key={evt.id || idx}
                  className={`p-3.5 rounded-2xl bg-white border transition shadow-xs ${
                    evt.isChanged
                      ? 'border-amber-400 border-l-4 border-l-amber-600 bg-amber-50/40'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {/* Change alert badge */}
                  {evt.isChanged && (
                    <div className="mb-2 p-2 rounded-lg bg-amber-100 text-amber-950 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span>{evt.changeDetails?.message || 'Zmieniono salę na: ' + evt.room}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-900 border border-stone-200">
                        {evt.startTime} - {evt.endTime}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#e8f5e9] text-[#1b4332] border border-emerald-200">
                        {evt.type}
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {evt.group}
                      </span>
                    </div>

                    <a
                      href={calUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-800 transition"
                      title="Dodaj to wydarzenie do Kalendarza Google"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-[#2d6a4f]" />
                      <span className="hidden sm:inline">Kalendarz</span>
                    </a>
                  </div>

                  <h4 className="text-sm font-bold text-stone-900 mt-2">
                    {evt.courseName}
                  </h4>

                  <div className="mt-2 pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                      <MapPin className="w-4 h-4 text-[#2d6a4f]" />
                      <span>Sala: {evt.room}</span>
                      <span className="font-normal text-stone-500 text-[11px]">({evt.building || 'Bud. 34'})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-stone-400" />
                      <span>{evt.instructor}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
