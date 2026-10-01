import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, MapPin, User, Download, ExternalLink, 
  AlertTriangle, ChevronRight, Check, Share2, CalendarPlus, 
  Layers, Info, Sparkles, Filter, Eye
} from 'lucide-react';
import { ScheduleEvent, StudentProfile, ZjazdWeekend, RokStudiow } from '../types/schedule';
import { OFFICIAL_ZJAZDY_CALENDAR, SGGW_OFFICIAL_LINKS } from '../data/sampleSchedules';
import { createGoogleCalendarUrl } from '../utils/calendarSync';

interface SggwScheduleViewProps {
  events: ScheduleEvent[];
  profile: StudentProfile;
  isDark: boolean;
  onSelectYear: (rok: RokStudiow) => void;
  onOpenCalendarModal: () => void;
  onOpenSettings: () => void;
}

export const SggwScheduleView: React.FC<SggwScheduleViewProps> = ({
  events,
  profile,
  isDark,
  onSelectYear,
  onOpenCalendarModal,
  onOpenSettings,
}) => {
  // Filter events strictly for the active year and zaoczne
  // Note: Turnus is strictly bound: Rok 1 & 3 = Turnus A, Rok 2 & 4 = Turnus B
  const yearTurnus = profile.rok % 2 === 1 ? 'Turnus A' : 'Turnus B';
  const semesterNumber = profile.rok === 1 ? 1 : profile.rok === 2 ? 3 : profile.rok === 3 ? 5 : 7;

  // Filter the official zjazdy for this turnus (every 2 weeks)
  const zjazdyForTurnus = useMemo(() => {
    return OFFICIAL_ZJAZDY_CALENDAR.filter(
      z => z.turnus === yearTurnus || z.turnus === 'Turnus A i B'
    );
  }, [yearTurnus]);

  // Selected Zjazd index (defaults to Zjazd 1 or closest upcoming)
  const [selectedZjazdNumber, setSelectedZjazdNumber] = useState<number>(1);

  // Day filter within the weekend: 0 = All days, 5 = Piątek, 6 = Sobota, 7 = Niedziela
  const [selectedDayFilter, setSelectedDayFilter] = useState<number>(0);

  // View style: 'cards' (clear readable cards, no overlaps) or 'timeline' (visual hour ruler)
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');

  // Find currently active zjazd info
  const activeZjazd = useMemo(() => {
    return zjazdyForTurnus.find(z => z.number === selectedZjazdNumber) || zjazdyForTurnus[0];
  }, [zjazdyForTurnus, selectedZjazdNumber]);

  // Filter events strictly for this year
  const yearEvents = useMemo(() => {
    return events.filter(e => {
      if (e.mode !== 'zaoczne') return false;
      if (e.rok !== profile.rok) return false;
      return true;
    });
  }, [events, profile.rok]);

  // Group events by day of week (5 = Piątek, 6 = Sobota, 7 = Niedziela)
  const fridayEvents = useMemo(() => {
    return yearEvents
      .filter(e => e.dayOfWeek === 5)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [yearEvents]);

  const saturdayEvents = useMemo(() => {
    return yearEvents
      .filter(e => e.dayOfWeek === 6)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [yearEvents]);

  const sundayEvents = useMemo(() => {
    return yearEvents
      .filter(e => e.dayOfWeek === 7)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [yearEvents]);

  // Official SGGW file link for active year
  const activeYearXlsUrl = useMemo(() => {
    switch (profile.rok) {
      case 1: return SGGW_OFFICIAL_LINKS.rok1Url;
      case 2: return SGGW_OFFICIAL_LINKS.rok2Url;
      case 3: return SGGW_OFFICIAL_LINKS.rok3Url;
      case 4: return SGGW_OFFICIAL_LINKS.rok4Url;
    }
  }, [profile.rok]);

  const activeYearFileSize = useMemo(() => {
    switch (profile.rok) {
      case 1: return '42 KB';
      case 2: return '36 KB';
      case 3: return '35 KB';
      case 4: return '42 KB';
    }
  }, [profile.rok]);

  // Format date range for zjazd
  const formatZjazdDates = (z: ZjazdWeekend) => {
    const [startYear, startMonth, startDay] = z.startDate.split('-');
    const [endYear, endMonth, endDay] = z.endDate.split('-');
    return `${startDay} - ${endDay}.${endMonth}.${endYear}`;
  };

  // Helper to calculate duration in minutes
  const getDurationString = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
    if (hours > 0) return `${hours}h`;
    return `${mins}min`;
  };

  // Helper to open Google Calendar for an event on the active zjazd date
  const handleAddToCalendar = (e: ScheduleEvent) => {
    if (!activeZjazd) return;
    // Calculate the concrete date for this day of week
    // e.g. Friday is activeZjazd.startDate
    const startDateObj = new Date(activeZjazd.startDate);
    const dayOffset = e.dayOfWeek === 5 ? 0 : e.dayOfWeek === 6 ? 1 : 2;
    const concreteDate = new Date(startDateObj);
    concreteDate.setDate(startDateObj.getDate() + dayOffset);
    const dateStr = concreteDate.toISOString().split('T')[0];

    const url = createGoogleCalendarUrl(e, dateStr);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* ============================================================== */}
      {/* 1. SGGW FACULTY BANNER (Inspired directly by Screenshot #1 & #2) */}
      {/* ============================================================== */}
      <div className={`p-4 rounded-2xl border transition-colors ${
        isDark 
          ? 'bg-[#111913] border-[#1d2d20] shadow-md' 
          : 'bg-white border-emerald-100 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1f3023]/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                Wydział Nauk Leśnych i Technologii Drewna
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-semibold ${
                isDark ? 'bg-[#18271c] text-emerald-300 border border-emerald-600/30' : 'bg-emerald-100 text-emerald-900'
              }`}>
                Semestr {semesterNumber} (zimowy)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Studia niestacjonarne I stopnia • Meblarstwo
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Plan zajęć na rok akademicki 2026/2027 • Harmonogram zjazdów weekendowych
            </p>
          </div>

          {/* Real SGGW Document Download Links (Exact match with user Screenshot #1 and #2) */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={activeYearXlsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                isDark 
                  ? 'bg-[#162319] hover:bg-[#1d3022] text-emerald-400 border-emerald-700/40 hover:border-emerald-500' 
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Rok {profile.rok} — semestr {semesterNumber} (XLS, {activeYearFileSize})</span>
            </a>

            <a
              href={SGGW_OFFICIAL_LINKS.harmonogramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                isDark 
                  ? 'bg-[#162319] hover:bg-[#1d3022] text-emerald-400 border-emerald-700/40 hover:border-emerald-500' 
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Harmonogram zjazdów (PDF)</span>
            </a>
          </div>
        </div>

        {/* Year Selector Pills inside view */}
        <div className="pt-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-stone-400 font-medium mr-1">Wybierz rok:</span>
            {([1, 2, 3, 4] as RokStudiow[]).map((rok) => {
              const isSelected = profile.rok === rok;
              const rokTurnus = rok % 2 === 1 ? 'Turnus A' : 'Turnus B';
              return (
                <button
                  key={`filter-rok-${rok}`}
                  onClick={() => onSelectYear(rok)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-500 text-black font-extrabold shadow-sm shadow-emerald-500/20'
                      : isDark
                        ? 'bg-[#141e17] text-stone-300 hover:bg-[#1c2c20] border border-[#233827]'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <span>Rok {rok}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-black/20 text-black' : 'bg-black/10 text-stone-400'
                  }`}>
                    {rokTurnus}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-stone-400">
            Kierunek: <strong className="text-emerald-400">Meblarstwo (Zaoczne)</strong>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SGGW OFFICIAL SCHEDULE HEADER BANNER (From Screenshot #3!)   */}
      {/* Yellow warning strip: "Plany mogą ulec zmianie"                */}
      {/* Big title: "Plan na zjazd - Turnus B"                          */}
      {/* ============================================================== */}
      <div className="rounded-2xl overflow-hidden border border-[#2a3d2c] shadow-sm">
        {/* Yellow Warning Strip (exact aesthetic from Screenshot #3) */}
        <div className="bg-[#ffe600] text-black px-4 py-1.5 text-center font-bold text-sm sm:text-base italic tracking-wide flex items-center justify-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 fill-red-600" />
          <span className="text-red-700 font-extrabold">Plany mogą ulec zmianie</span>
          <span className="hidden sm:inline text-stone-800 text-xs font-normal font-sans not-italic ml-2">
            • Aktualizacja WNLiD: 30.09.2026 r.
          </span>
        </div>

        {/* Schedule Title Bar from Screenshot #3 */}
        <div className={`p-4 text-center ${
          isDark ? 'bg-[#0f1712]' : 'bg-stone-50'
        }`}>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Plan na zjazd — {yearTurnus}
          </h2>
          <p className="text-xs text-stone-400 mt-1 font-mono">
            Meblarstwo, ZSZ (zaoczne), r.{profile.rok === 1 ? 'I' : profile.rok === 2 ? 'II' : profile.rok === 3 ? 'III' : 'IV'}, sem.{semesterNumber}, r.akad. 2026/2027
          </p>

          {/* Visual Hour Grid Bar from Screenshot #3 */}
          <div className="mt-3 hidden sm:flex items-center justify-between border-t border-b border-[#233827] py-1 px-2 font-mono text-[11px] text-stone-400 overflow-x-auto">
            <span>08:00</span>
            <span>09:00</span>
            <span>10:00</span>
            <span>11:00</span>
            <span>12:00</span>
            <span>13:00</span>
            <span>14:00</span>
            <span>15:00</span>
            <span>16:00</span>
            <span>17:00</span>
            <span>18:00</span>
            <span>19:00</span>
            <span>20:00</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. ZJAZDY TIMELINE (Co 2 tygodnie według oficjalnego harmonogramu) */}
      {/* ============================================================== */}
      <div className={`p-3 rounded-2xl border ${
        isDark ? 'bg-[#111913] border-[#1d2d20]' : 'bg-white border-emerald-100'
      }`}>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Harmonogram Zjazdów ({yearTurnus} • Zjazdy co 2 tyg.)
            </span>
          </div>

          <span className="text-xs text-emerald-400 font-mono font-semibold">
            {activeZjazd ? `${activeZjazd.description}` : ''}
          </span>
        </div>

        {/* Zjazdy Carousel / Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {zjazdyForTurnus.map((z) => {
            const isSelected = z.number === selectedZjazdNumber;
            const isSesja = z.type === 'sesja' || z.type === 'poprawkowa';

            return (
              <button
                key={`zjazd-btn-${z.number}`}
                onClick={() => setSelectedZjazdNumber(z.number)}
                className={`px-3 py-2 rounded-xl text-left transition shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/40'
                    : isDark
                      ? isSesja
                        ? 'bg-[#1a1824] text-purple-200 border-purple-900/40 hover:bg-[#221f30]'
                        : 'bg-[#141f17] text-stone-300 border-[#223626] hover:bg-[#1a2a1f]'
                      : isSesja
                        ? 'bg-purple-50 text-purple-900 border-purple-200'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">
                    {isSesja ? 'Sesja' : `Zjazd ${z.number}`}
                  </span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </div>
                <div className="text-[11px] font-mono opacity-90 mt-0.5">
                  {formatZjazdDates(z)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. DAY FILTER TABS (Wszystkie / Piątek / Sobota / Niedziela)     */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedDayFilter(0)}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${
              selectedDayFilter === 0
                ? 'bg-emerald-500 text-black shadow-xs'
                : isDark
                  ? 'bg-[#131d16] text-stone-300 hover:bg-[#1b2b1f] border border-[#223626]'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Wszystkie dni ({fridayEvents.length + saturdayEvents.length + sundayEvents.length})
          </button>

          <button
            onClick={() => setSelectedDayFilter(5)}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
              selectedDayFilter === 5
                ? 'bg-emerald-500 text-black shadow-xs'
                : isDark
                  ? 'bg-[#131d16] text-stone-300 hover:bg-[#1b2b1f] border border-[#223626]'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <span>Piątek</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedDayFilter === 5 ? 'bg-black text-white' : 'bg-emerald-950 text-emerald-300'
            }`}>
              {fridayEvents.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedDayFilter(6)}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
              selectedDayFilter === 6
                ? 'bg-emerald-500 text-black shadow-xs'
                : isDark
                  ? 'bg-[#131d16] text-stone-300 hover:bg-[#1b2b1f] border border-[#223626]'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <span>Sobota</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedDayFilter === 6 ? 'bg-black text-white' : 'bg-emerald-950 text-emerald-300'
            }`}>
              {saturdayEvents.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedDayFilter(7)}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
              selectedDayFilter === 7
                ? 'bg-emerald-500 text-black shadow-xs'
                : isDark
                  ? 'bg-[#131d16] text-stone-300 hover:bg-[#1b2b1f] border border-[#223626]'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <span>Niedziela</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedDayFilter === 7 ? 'bg-black text-white' : 'bg-emerald-950 text-emerald-300'
            }`}>
              {sundayEvents.length}
            </span>
          </button>
        </div>

        <button
          onClick={onOpenCalendarModal}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition ${
            isDark 
              ? 'bg-[#131d16] border-[#223827] text-emerald-400 hover:bg-[#1a2c1f]' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>Eksportuj cały zjazd do Google</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 5. THE SCHEDULE BLOCKS (NO OVERLAPS! ALL 6 FRIDAY CLASSES!)    */}
      {/* ============================================================== */}

      {/* --- PIĄTEK --- */}
      {(selectedDayFilter === 0 || selectedDayFilter === 5) && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Piątek • {fridayEvents.length} wykładów
              </h3>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              {activeZjazd ? `${activeZjazd.startDate}` : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {fridayEvents.map((evt, idx) => (
              <ClassEventCard
                key={evt.id}
                event={evt}
                index={idx + 1}
                isDark={isDark}
                onAddToCalendar={() => handleAddToCalendar(evt)}
                duration={getDurationString(evt.startTime, evt.endTime)}
              />
            ))}
          </div>
        </div>
      )}

      {/* --- SOBOTA --- */}
      {(selectedDayFilter === 0 || selectedDayFilter === 6) && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Sobota • {saturdayEvents.length} zajęcia
              </h3>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              Ćwiczenia i laboratoria
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {saturdayEvents.map((evt, idx) => (
              <ClassEventCard
                key={evt.id}
                event={evt}
                index={idx + 1}
                isDark={isDark}
                onAddToCalendar={() => handleAddToCalendar(evt)}
                duration={getDurationString(evt.startTime, evt.endTime)}
              />
            ))}
          </div>
        </div>
      )}

      {/* --- NIEDZIELA --- */}
      {(selectedDayFilter === 0 || selectedDayFilter === 7) && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Niedziela • {sundayEvents.length} zajęcia
              </h3>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              {activeZjazd ? `${activeZjazd.endDate}` : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {sundayEvents.map((evt, idx) => (
              <ClassEventCard
                key={evt.id}
                event={evt}
                index={idx + 1}
                isDark={isDark}
                onAddToCalendar={() => handleAddToCalendar(evt)}
                duration={getDurationString(evt.startTime, evt.endTime)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer Info Notice */}
      <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
        isDark ? 'bg-[#0d140f] border-[#1f3023] text-stone-400' : 'bg-stone-50 border-stone-200 text-stone-600'
      }`}>
        <p className="font-semibold text-stone-300">
          📌 Wskazówka organizacyjna WNLiD:
        </p>
        <p className="mt-1">
          Zajęcia odbywają się w budynku 34 (Wydział Nauk Leśnych i Technologii Drewna) lub w Halach Maszyn (s.007).
          W przypadku pytań dotyczących podziału na grupy laboratoryjne prosimy o kontakt z Dziekanatem lub prowadzącym przedmiot.
        </p>
      </div>
    </div>
  );
};

interface ClassEventCardProps {
  event: ScheduleEvent;
  index: number;
  isDark: boolean;
  onAddToCalendar: () => void;
  duration: string;
}

const ClassEventCard: React.FC<ClassEventCardProps> = ({
  event,
  index,
  isDark,
  onAddToCalendar,
  duration,
}) => {
  const isLecture = event.type === 'wykład';

  return (
    <div className={`p-3.5 rounded-xl border transition hover:border-emerald-500/60 flex flex-col justify-between gap-3 ${
      isDark 
        ? 'bg-[#121b14] border-[#1e2f22] text-white shadow-xs' 
        : 'bg-white border-stone-200 text-stone-900 shadow-xs'
    }`}>
      {/* Header: Number, Time & Type */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Index pill */}
          <span className={`w-6 h-6 rounded-lg text-xs font-mono font-black flex items-center justify-center ${
            isDark ? 'bg-[#18271c] text-emerald-400 border border-emerald-600/30' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {String(index).padStart(2, '0')}
          </span>

          {/* Time badge */}
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{event.startTime} – {event.endTime}</span>
            <span className="text-[10px] text-stone-400 font-sans font-normal">({duration})</span>
          </div>
        </div>

        {/* Type pill */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
          isLecture
            ? 'bg-blue-950/80 text-blue-300 border border-blue-800/40'
            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
        }`}>
          {event.type}
        </span>
      </div>

      {/* Body: Course Name */}
      <div>
        <h4 className="font-bold text-sm sm:text-base leading-snug tracking-tight text-stone-100">
          {event.courseName}
        </h4>

        {/* Instructor & Room badges */}
        <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
          {/* Room Badge */}
          <span className={`px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 ${
            isDark ? 'bg-[#19271c] text-emerald-300 border border-[#28422d]' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          }`}>
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span>{event.room}</span>
          </span>

          {/* Instructor Badge */}
          <span className="text-stone-300 flex items-center gap-1">
            <User className="w-3 h-3 text-stone-400" />
            <span>{event.instructor}</span>
          </span>
        </div>

        {/* Notes (e.g. 7h, I poł. semestru, co drugi zjazd) */}
        {event.notes && (
          <div className={`mt-2 text-[11px] px-2 py-1 rounded-md flex items-center gap-1.5 ${
            isDark ? 'bg-[#0f1711] text-stone-400 border border-[#1b2b1d]' : 'bg-stone-50 text-stone-600 border border-stone-200'
          }`}>
            <Info className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">{event.notes}</span>
          </div>
        )}
      </div>

      {/* Footer: Calendar Sync Button */}
      <div className="pt-2 border-t border-[#1e2f22]/60 flex items-center justify-between">
        <span className="text-[11px] text-stone-400 font-mono">
          {event.group}
        </span>

        <button
          onClick={onAddToCalendar}
          className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition ${
            isDark 
              ? 'hover:bg-[#1c2c20] text-emerald-400 hover:text-emerald-300' 
              : 'hover:bg-emerald-50 text-emerald-700'
          }`}
          title="Dodaj to jedno zajęcie do Kalendarza Google"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>Dodaj do Google</span>
        </button>
      </div>
    </div>
  );
};
