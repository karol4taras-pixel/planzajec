import React, { useState, useMemo } from 'react';
import { Clock, MapPin, User, AlertTriangle, CalendarPlus, ChevronRight, BookOpen, Check } from 'lucide-react';
import { ScheduleEvent, StudyMode, TurnusType } from '../types/schedule';
import { createGoogleCalendarUrl } from '../utils/calendarSync';

interface TodayScheduleProps {
  events: ScheduleEvent[];
  mode: StudyMode;
  turnus: TurnusType;
  onOpenCalendarSync: () => void;
  onOpenNotifications: () => void;
}

const POLISH_DAYS = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
];

export const TodaySchedule: React.FC<TodayScheduleProps> = ({
  events,
  mode,
  turnus,
  onOpenCalendarSync,
  onOpenNotifications,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  const now = new Date();
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const [activeDay, setActiveDay] = useState<number>(currentDayOfWeek);

  // Filter events for this day, mode, and turnus
  const dayEvents = useMemo(() => {
    return events
      .filter(e => {
        if (e.dayOfWeek !== activeDay) return false;
        if (e.mode !== mode) return false;
        if (mode === 'zaoczne') {
          if (turnus !== 'Wszystkie' && e.turnus !== 'Wszystkie' && e.turnus !== turnus) {
            return false;
          }
        }
        if (selectedGroup !== 'all' && e.group !== 'Cały rok' && e.group !== 'Wszyscy' && e.group !== selectedGroup) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events, activeDay, mode, turnus, selectedGroup]);

  // Current time
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const ongoingEvent = useMemo(() => {
    if (activeDay !== currentDayOfWeek) return null;
    return dayEvents.find(e => currentTimeStr >= e.startTime && currentTimeStr <= e.endTime);
  }, [dayEvents, activeDay, currentDayOfWeek, currentTimeStr]);

  const nextEvent = useMemo(() => {
    if (activeDay !== currentDayOfWeek) return dayEvents[0] || null;
    return dayEvents.find(e => e.startTime > currentTimeStr) || null;
  }, [dayEvents, activeDay, currentDayOfWeek, currentTimeStr]);

  const changesCount = dayEvents.filter(e => e.isChanged).length;

  return (
    <div className="space-y-4">
      {/* Clean Status Card */}
      <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#e8f5e9] text-[#1b4332] mb-1.5">
              <Clock className="w-3.5 h-3.5 text-[#2d6a4f]" />
              <span>{POLISH_DAYS[now.getDay()]}, {now.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              Dziś na uczelni (WTD Budynek 34)
            </h2>
            <p className="text-xs text-stone-500">
              Tryb: <strong className="text-stone-800">{mode === 'stacjonarne' ? 'Stacjonarne' : `Zaoczne (${turnus})`}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {changesCount > 0 && (
              <button
                onClick={onOpenNotifications}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{changesCount} zmiana sali!</span>
              </button>
            )}

            <button
              onClick={onOpenCalendarSync}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2d6a4f] hover:bg-[#1b4332] text-white text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Eksportuj dzień</span>
            </button>
          </div>
        </div>

        {/* Co teraz / Następne */}
        {(ongoingEvent || nextEvent) && (
          <div className="mt-4 pt-3.5 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {ongoingEvent && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300">
                <span className="font-extrabold uppercase text-[10px] text-emerald-800 tracking-wider block mb-1">
                  Trwająca lekcja / blok
                </span>
                <p className="font-bold text-stone-900 text-sm">{ongoingEvent.courseName}</p>
                <div className="mt-1 flex items-center gap-3 text-stone-700">
                  <span className="font-mono font-bold text-[#1b4332]">{ongoingEvent.startTime} - {ongoingEvent.endTime}</span>
                  <span className="font-bold bg-white px-2 py-0.5 rounded border border-stone-300">Sala: {ongoingEvent.room}</span>
                </div>
              </div>
            )}

            {nextEvent && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="font-extrabold uppercase text-[10px] text-stone-500 tracking-wider block mb-1">
                  Następne zajęcia dzisiaj
                </span>
                <p className="font-bold text-stone-900 text-sm">{nextEvent.courseName}</p>
                <div className="mt-1 flex items-center gap-3 text-stone-600">
                  <span className="font-mono font-semibold">{nextEvent.startTime} - {nextEvent.endTime}</span>
                  <span>Sala: {nextEvent.room}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center overflow-x-auto gap-1 pb-1 no-scrollbar">
        {[
          { num: 1, label: 'Poniedziałek' },
          { num: 2, label: 'Wtorek' },
          { num: 3, label: 'Środa' },
          { num: 4, label: 'Czwartek' },
          { num: 5, label: 'Piątek' },
          { num: 6, label: 'Sobota' },
          { num: 7, label: 'Niedziela' },
        ].map(d => {
          const isToday = d.num === currentDayOfWeek;
          const isSelected = d.num === activeDay;
          return (
            <button
              key={d.num}
              onClick={() => setActiveDay(d.num)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                isSelected
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
              }`}
            >
              <span>{d.label}</span>
              {isToday && <span className="ml-1 text-[10px] opacity-80">(Dziś)</span>}
            </button>
          );
        })}
      </div>

      {/* Events List */}
      {dayEvents.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 p-8 text-center bg-white shadow-xs">
          <BookOpen className="w-9 h-9 text-stone-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-stone-800">Brak zajęć dydaktycznych w tym dniu</p>
          <p className="text-xs text-stone-500 mt-0.5">Wybierz inny dzień tygodnia powyżej lub sprawdź pełną siatkę planu.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {dayEvents.map(evt => {
            const calUrl = createGoogleCalendarUrl(evt);
            return (
              <div
                key={evt.id}
                className={`p-4 rounded-2xl bg-white border transition shadow-xs ${
                  evt.isChanged
                    ? 'border-amber-400 border-l-4 border-l-amber-600 bg-amber-50/40'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Changed Room Warning Callout */}
                {evt.isChanged && (
                  <div className="mb-2.5 p-2 rounded-lg bg-amber-100 text-amber-950 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>{evt.changeDetails?.message || 'Zmieniono salę na: ' + evt.room}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-stone-100 font-mono text-xs font-bold text-stone-900 border border-stone-200">
                      {evt.startTime} - {evt.endTime}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#e8f5e9] text-[#1b4332] border border-emerald-200">
                      {evt.type}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {evt.group}
                    </span>
                  </div>

                  <a
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start sm:self-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-800 transition"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-[#2d6a4f]" />
                    <span>Dodaj do Kalendarza</span>
                  </a>
                </div>

                <h3 className="text-base font-bold text-stone-900 mt-2">
                  {evt.courseName}
                </h3>

                <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
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
  );
};
