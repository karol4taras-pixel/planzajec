import React, { useState, useMemo } from 'react';
import { ScheduleEvent, StudyMode, TurnusType, ClassType } from '../types/schedule';
import { createGoogleCalendarUrl } from '../utils/calendarSync';
import { AlertTriangle, CalendarPlus, MapPin, User, ChevronLeft, ChevronRight, Clock, Info } from 'lucide-react';

interface LibrusTimetableGridProps {
  events: ScheduleEvent[];
  mode: StudyMode;
  turnus: TurnusType;
  selectedGroup: string;
  onOpenCalendarSync: () => void;
  onSelectEvent?: (event: ScheduleEvent) => void;
}

// Standard academic block periods
const TIME_SLOTS = [
  { slot: 1, start: '08:15', end: '09:45', label: '1. 08:15 – 09:45' },
  { slot: 2, start: '10:15', end: '11:45', label: '2. 10:15 – 11:45' },
  { slot: 3, start: '12:15', end: '13:45', label: '3. 12:15 – 13:45' },
  { slot: 4, start: '14:00', end: '15:30', label: '4. 14:00 – 15:30' },
  { slot: 5, start: '15:45', end: '17:15', label: '5. 15:45 – 17:15' },
  { slot: 6, start: '17:30', end: '19:00', label: '6. 17:30 – 19:00' },
  { slot: 7, start: '19:15', end: '20:45', label: '7. 19:15 – 20:45' },
];

const WEEK_DAYS_STACJONARNE = [
  { id: 1, name: 'Poniedziałek', short: 'Pn' },
  { id: 2, name: 'Wtorek', short: 'Wt' },
  { id: 3, name: 'Środa', short: 'Śr' },
  { id: 4, name: 'Czwartek', short: 'Czw' },
  { id: 5, name: 'Piątek', short: 'Pt' },
];

const WEEK_DAYS_ZAOCZNE = [
  { id: 5, name: 'Piątek', short: 'Pt' },
  { id: 6, name: 'Sobota', short: 'Sob' },
  { id: 7, name: 'Niedziela', short: 'Ndz' },
];

export const LibrusTimetableGrid: React.FC<LibrusTimetableGridProps> = ({
  events,
  mode,
  turnus,
  selectedGroup,
  onOpenCalendarSync,
}) => {
  const [mobileDay, setMobileDay] = useState<number>(() => {
    const today = new Date().getDay();
    if (mode === 'zaoczne') {
      return (today === 5 || today === 6 || today === 0) ? (today === 0 ? 7 : today) : 6;
    }
    return (today >= 1 && today <= 5) ? today : 1;
  });

  const [activeEventModal, setActiveEventModal] = useState<ScheduleEvent | null>(null);

  const activeDays = mode === 'zaoczne' ? WEEK_DAYS_ZAOCZNE : WEEK_DAYS_STACJONARNE;

  // Filter events for current mode, turnus, and group
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.mode !== mode) return false;
      if (mode === 'zaoczne') {
        if (turnus !== 'Wszystkie' && e.turnus !== 'Wszystkie' && e.turnus !== turnus) {
          return false;
        }
      }
      if (selectedGroup && selectedGroup !== 'Wszystkie' && selectedGroup !== 'Cały rok') {
        if (e.group !== 'Cały rok' && e.group !== 'Wszyscy' && e.group !== selectedGroup) {
          return false;
        }
      }
      return true;
    });
  }, [events, mode, turnus, selectedGroup]);

  // Helper to find event in a given day and slot
  const findEventForSlot = (dayId: number, slotStart: string) => {
    return filteredEvents.find(e => {
      if (e.dayOfWeek !== dayId) return false;
      // Match if event start is close to slot start (e.g. 08:00 vs 08:15)
      const eStartHour = parseInt(e.startTime.split(':')[0], 10);
      const sStartHour = parseInt(slotStart.split(':')[0], 10);
      return Math.abs(eStartHour - sStartHour) <= 0 || (e.startTime <= slotStart && e.endTime > slotStart);
    });
  };

  // Color helper based on class type (Librus style palette)
  const getBadgeClass = (type: ClassType) => {
    switch (type) {
      case 'wykład':
        return 'bg-emerald-100 text-emerald-900 border-l-4 border-l-emerald-700';
      case 'laboratorium':
        return 'bg-amber-50 text-amber-950 border-l-4 border-l-amber-600';
      case 'ćwiczenia':
        return 'bg-blue-50 text-blue-950 border-l-4 border-l-blue-600';
      case 'projekt':
        return 'bg-teal-50 text-teal-950 border-l-4 border-l-teal-600';
      case 'seminarium':
        return 'bg-purple-50 text-purple-950 border-l-4 border-l-purple-600';
      default:
        return 'bg-stone-100 text-stone-900 border-l-4 border-l-stone-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile Day Selector Bar (Visible on mobile screens) */}
      <div className="lg:hidden flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200 shadow-sm">
        <button
          onClick={() => {
            const idx = activeDays.findIndex(d => d.id === mobileDay);
            const prev = idx > 0 ? activeDays[idx - 1].id : activeDays[activeDays.length - 1].id;
            setMobileDay(prev);
          }}
          className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {activeDays.map(d => (
            <button
              key={d.id}
              onClick={() => setMobileDay(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                mobileDay === d.id
                  ? 'bg-[#1b4332] text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            const idx = activeDays.findIndex(d => d.id === mobileDay);
            const next = idx < activeDays.length - 1 ? activeDays[idx + 1].id : activeDays[0].id;
            setMobileDay(next);
          }}
          className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop / Tablet Full Timetable Grid (Librus View) */}
      <div className="hidden lg:block bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[130px_repeat(5,1fr)] bg-[#1b4332] text-white divide-x divide-[#2d6a4f]/50 text-xs font-bold">
          <div className="p-3 text-center uppercase tracking-wider text-emerald-100">
            Godzina
          </div>
          {activeDays.map(d => (
            <div key={d.id} className="p-3 text-center uppercase tracking-wider">
              {d.name}
            </div>
          ))}
        </div>

        {/* Rows of Time Periods */}
        <div className="divide-y divide-stone-200">
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot.slot}
              className={`grid grid-cols-[130px_repeat(5,1fr)] divide-x divide-stone-200 transition ${
                slot.slot % 2 === 0 ? 'bg-stone-50/40' : 'bg-white'
              }`}
            >
              {/* Hour Column (Left) */}
              <div className="p-3 flex flex-col justify-center items-center text-center bg-stone-50/70 border-r border-stone-200">
                <span className="text-xs font-bold text-stone-800">{slot.slot}.</span>
                <span className="text-[11px] font-mono text-stone-600 font-semibold">{slot.start}</span>
                <span className="text-[10px] text-stone-400 font-mono">- {slot.end}</span>
              </div>

              {/* Day Columns */}
              {activeDays.map((day) => {
                const event = findEventForSlot(day.id, slot.start);

                if (!event) {
                  return (
                    <div
                      key={day.id}
                      className="p-2 min-h-[90px] flex items-center justify-center text-stone-300 text-xs font-mono select-none"
                    >
                      —
                    </div>
                  );
                }

                const calUrl = createGoogleCalendarUrl(event);

                return (
                  <div key={day.id} className="p-1.5 min-h-[90px]">
                    <div
                      onClick={() => setActiveEventModal(event)}
                      className={`h-full rounded-xl p-2.5 shadow-xs border transition cursor-pointer hover:shadow-md hover:scale-[1.01] flex flex-col justify-between ${
                        event.isChanged
                          ? 'bg-amber-100 text-amber-950 border-amber-400 border-l-4 border-l-amber-600'
                          : getBadgeClass(event.type)
                      }`}
                    >
                      {/* Top Bar: Class Type + Room number in bold badge */}
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
                          {event.type}
                        </span>

                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/90 border border-stone-300 font-mono font-bold text-[11px] text-stone-900 shadow-2xs">
                          <MapPin className="w-2.5 h-2.5 text-[#2d6a4f]" />
                          <span>{event.room}</span>
                        </span>
                      </div>

                      {/* Course Title */}
                      <h4 className="text-xs font-bold leading-snug line-clamp-2 text-stone-900">
                        {event.courseName}
                      </h4>

                      {/* Bottom row: Teacher + Change warning if any */}
                      <div className="mt-1.5 pt-1 border-t border-black/10 flex items-center justify-between text-[11px]">
                        <span className="truncate text-stone-700 max-w-[110px]" title={event.instructor}>
                          {event.instructor.replace(/prof\. dr hab\. inż\.|dr hab\. inż\.|dr inż\.|mgr inż\./, '').trim()}
                        </span>

                        {event.isChanged ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-900 bg-amber-200 px-1 py-0.2 rounded">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                            <span>ZMIANA</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500 font-mono">
                            {event.group}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile List View (Formatted like Librus mobile day view) */}
      <div className="lg:hidden space-y-2.5">
        <div className="px-2 py-1 flex items-center justify-between text-xs text-stone-600">
          <span className="font-bold text-[#1b4332] uppercase tracking-wider">
            {activeDays.find(d => d.id === mobileDay)?.name} • Plan dnia
          </span>
          <span className="text-stone-500">
            {filteredEvents.filter(e => e.dayOfWeek === mobileDay).length} lekcji
          </span>
        </div>

        {TIME_SLOTS.map(slot => {
          const event = findEventForSlot(mobileDay, slot.start);

          if (!event) {
            return (
              <div
                key={slot.slot}
                className="p-3 rounded-xl bg-stone-100/60 border border-stone-200/60 flex items-center justify-between text-xs text-stone-400"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold font-mono text-stone-500">{slot.slot}.</span>
                  <span>{slot.label}</span>
                </div>
                <span className="text-[11px] font-mono italic">Okienko</span>
              </div>
            );
          }

          return (
            <div
              key={slot.slot}
              onClick={() => setActiveEventModal(event)}
              className={`p-3.5 rounded-2xl border shadow-xs transition active:scale-[0.99] cursor-pointer ${
                event.isChanged
                  ? 'bg-amber-50 border-amber-300 border-l-4 border-l-amber-600'
                  : getBadgeClass(event.type)
              }`}
            >
              {/* Slot & Room */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-black/10 font-mono text-xs font-bold text-stone-900">
                    {slot.slot}. {event.startTime} - {event.endTime}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/80 border border-stone-300">
                    {event.type}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white font-mono font-bold text-xs text-stone-900 border border-stone-300 shadow-2xs">
                  <MapPin className="w-3 h-3 text-[#2d6a4f]" />
                  <span>{event.room}</span>
                </span>
              </div>

              {/* Title */}
              <h4 className="text-sm font-bold text-stone-900">
                {event.courseName}
              </h4>

              {/* Teacher & Alerts */}
              <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-xs text-stone-700">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span className="truncate">{event.instructor}</span>
                </div>

                <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/70 border border-stone-300 text-stone-600">
                  {event.group}
                </span>
              </div>

              {event.isChanged && (
                <div className="mt-2 p-2 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                  <span>{event.changeDetails?.message || 'Zmieniono salę na: ' + event.room}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Event Details Popup Modal */}
      {activeEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white border border-stone-200 shadow-2xl p-6 text-stone-900 relative">
            <button
              onClick={() => setActiveEventModal(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#e8f5e9] text-[#1b4332] font-mono text-xs font-bold border border-emerald-300">
                {activeEventModal.startTime} – {activeEventModal.endTime}
              </span>
              <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-stone-100 text-stone-700 border border-stone-300">
                {activeEventModal.type}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
              {activeEventModal.courseName}
            </h3>

            {/* Changed Alert */}
            {activeEventModal.isChanged && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                <span className="font-bold block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  UWAGA: Zmiana w harmonogramie!
                </span>
                <p className="mt-1">{activeEventModal.changeDetails?.message}</p>
              </div>
            )}

            {/* Details */}
            <div className="mt-4 space-y-2.5 text-xs text-stone-700 border-t border-b border-stone-200 py-3">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Sala wykładowa:</span>
                <span className="font-bold text-stone-900 text-sm">{activeEventModal.room}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Budynek:</span>
                <span className="font-semibold text-stone-800">{activeEventModal.building || 'Budynek 34 (WTD)'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Prowadzący:</span>
                <span className="font-semibold text-stone-800 text-right">{activeEventModal.instructor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Grupa dziekańska:</span>
                <span className="font-semibold text-stone-800">{activeEventModal.group}</span>
              </div>
              {activeEventModal.mode === 'zaoczne' && activeEventModal.turnus !== 'Nie dotyczy' && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-medium">Turnus:</span>
                  <span className="font-bold text-[#1b4332]">{activeEventModal.turnus}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center gap-2">
              <a
                href={createGoogleCalendarUrl(activeEventModal)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Dodaj do Kalendarza Google</span>
              </a>

              <button
                onClick={() => setActiveEventModal(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
