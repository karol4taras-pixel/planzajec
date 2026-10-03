import React, { useState, useMemo } from 'react';
import { Search, Filter, CalendarPlus, MapPin, User, AlertTriangle, ChevronRight, Layers, FileDown } from 'lucide-react';
import { ScheduleEvent, StudyMode, TurnusType, ClassType } from '../types/schedule';
import { createGoogleCalendarUrl } from '../utils/calendarSync';

interface WeekScheduleViewProps {
  events: ScheduleEvent[];
  mode: StudyMode;
  turnus: TurnusType;
  onOpenCalendarSync: () => void;
  onEditEvent?: (event: ScheduleEvent) => void;
}

const DAY_LABELS = [
  { id: 1, name: 'Poniedziałek', short: 'Pn' },
  { id: 2, name: 'Wtorek', short: 'Wt' },
  { id: 3, name: 'Środa', short: 'Śr' },
  { id: 4, name: 'Czwartek', short: 'Czw' },
  { id: 5, name: 'Piątek', short: 'Pt' },
  { id: 6, name: 'Sobota', short: 'Sob' },
  { id: 7, name: 'Niedziela', short: 'Ndz' },
];

export const WeekScheduleView: React.FC<WeekScheduleViewProps> = ({
  events,
  mode,
  turnus,
  onOpenCalendarSync,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [onlyChanges, setOnlyChanges] = useState<boolean>(false);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.mode !== mode) return false;
      if (mode === 'zaoczne') {
        if (turnus !== 'Wszystkie' && e.turnus !== 'Wszystkie' && e.turnus !== turnus) {
          return false;
        }
      }
      if (selectedDay !== 'all' && e.dayOfWeek !== selectedDay) return false;
      if (selectedType !== 'all' && e.type !== selectedType) return false;
      if (onlyChanges && !e.isChanged) return false;

      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchName = e.courseName.toLowerCase().includes(query);
        const matchRoom = e.room.toLowerCase().includes(query);
        const matchInstr = e.instructor.toLowerCase().includes(query);
        const matchGroup = e.group.toLowerCase().includes(query);
        if (!matchName && !matchRoom && !matchInstr && !matchGroup) return false;
      }

      return true;
    }).sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [events, mode, turnus, selectedDay, selectedType, onlyChanges, searchQuery]);

  // Group by day of week
  const eventsByDay = useMemo(() => {
    const map = new Map<number, ScheduleEvent[]>();
    for (let i = 1; i <= 7; i++) map.set(i, []);
    filteredEvents.forEach(e => {
      const arr = map.get(e.dayOfWeek) || [];
      arr.push(e);
      map.set(e.dayOfWeek, arr);
    });
    return map;
  }, [filteredEvents]);

  const daysToDisplay = selectedDay === 'all' 
    ? (mode === 'stacjonarne' ? DAY_LABELS.slice(0, 5) : DAY_LABELS) 
    : DAY_LABELS.filter(d => d.id === selectedDay);

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-3 shadow-md">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Szukaj przedmiotu, sali (np. 1/12), prowadzącego (np. Borysiuk)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-700/70 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
            >
              Wyczyść
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-xs">
          {/* Day filter pills */}
          <div className="flex items-center overflow-x-auto gap-1 no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedDay('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                selectedDay === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              Cały tydzień
            </button>
            {DAY_LABELS.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedDay === d.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Type selector */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-neutral-950 text-neutral-300 border border-neutral-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Wszystkie formy</option>
              <option value="wykład">Wykład</option>
              <option value="laboratorium">Laboratorium</option>
              <option value="ćwiczenia">Ćwiczenia</option>
              <option value="projekt">Projekt</option>
              <option value="seminarium">Seminarium</option>
            </select>

            {/* Only changes toggle */}
            <button
              onClick={() => setOnlyChanges(!onlyChanges)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                onlyChanges
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Tylko zmiany sal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Synchronize bar */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs">
        <span className="text-emerald-300">
          Wyświetlanie <strong>{filteredEvents.length}</strong> bloków zajęć dla trybu: <strong>{mode}</strong>
        </span>
        <button
          onClick={onOpenCalendarSync}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition active:scale-95"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>Eksportuj do Google Calendar</span>
        </button>
      </div>

      {/* Days Schedule Sections */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 p-8 text-center bg-neutral-900/30">
          <p className="text-sm font-semibold text-neutral-300">Nie znaleziono zajęć dla wybranych filtrów</p>
          <p className="text-xs text-neutral-500 mt-1">Zmień frazę wyszukiwania lub zresetuj filtry.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {daysToDisplay.map(day => {
            const dayList = eventsByDay.get(day.id) || [];
            if (dayList.length === 0) return null;

            return (
              <div key={day.id} className="space-y-2">
                <div className="flex items-center gap-2 border-b border-neutral-800 pb-1.5">
                  <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
                    {day.name}
                  </h3>
                  <span className="text-[11px] px-2 py-0.2 rounded-full bg-neutral-800 text-neutral-400 font-semibold">
                    {dayList.length} {dayList.length === 1 ? 'zajęcia' : 'zajęć'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {dayList.map(evt => {
                    const calUrl = createGoogleCalendarUrl(evt);
                    return (
                      <div
                        key={evt.id}
                        className={`rounded-xl p-3.5 border transition ${
                          evt.isChanged
                            ? 'bg-neutral-900 border-amber-500/60 shadow-md shadow-amber-950/20'
                            : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {/* Change alert bar */}
                        {evt.isChanged && (
                          <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="font-semibold">{evt.changeDetails?.message || 'Zmieniono salę zajęć!'}</span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded font-mono text-xs font-bold text-emerald-400 bg-neutral-950 border border-neutral-800">
                              {evt.startTime} - {evt.endTime}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                              {evt.type}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
                              {evt.group}
                            </span>
                            {evt.turnus !== 'Nie dotyczy' && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                                {evt.turnus}
                              </span>
                            )}
                          </div>

                          <a
                            href={calUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="self-start sm:self-auto flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-750 text-[11px] text-neutral-300 hover:text-white transition"
                            title="Dodaj do Kalendarza Google"
                          >
                            <CalendarPlus className="w-3 h-3 text-emerald-400" />
                            <span>Kalendarz Google</span>
                          </a>
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-white mt-1.5">
                          {evt.courseName}
                        </h4>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-300">
                          <div className="flex items-center gap-1 font-semibold text-white">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{evt.room}</span>
                          </div>
                          <div className="flex items-center gap-1 text-neutral-400">
                            <User className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="truncate">{evt.instructor}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
