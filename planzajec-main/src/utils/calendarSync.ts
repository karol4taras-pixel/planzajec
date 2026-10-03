import { ScheduleEvent, ZjazdWeekend } from '../types/schedule';

/**
 * Formats a date and time into UTC iCalendar format (YYYYMMDDTHHMMSSZ) or local (YYYYMMDDTHHMMSS)
 */
function formatICalDate(dateStr: string, timeStr: string): string {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM"
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Returns the next upcoming occurrence of a given day of the week (1 = Mon ... 7 = Sun)
 */
function getNextDayOfWeek(dayOfWeek: number): Date {
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  let diff = dayOfWeek - currentDay;
  if (diff < 0) diff += 7;
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  return target;
}

function formatDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates direct Google Calendar Web Intent URL for 1-click addition
 */
export function createGoogleCalendarUrl(event: ScheduleEvent, dateStr?: string): string {
  // If specific date is not provided, calculate next date for this day of week
  const date = dateStr || formatDateToIso(getNextDayOfWeek(event.dayOfWeek));
  
  const startDt = formatICalDate(date, event.startTime);
  const endDt = formatICalDate(date, event.endTime);

  const title = `[WTD SGGW] ${event.courseName} (${event.type.toUpperCase()})`;
  const location = `${event.room}, ${event.building || 'Wydział Technologii Drewna SGGW, Budynek 34, ul. Nowoursynowska 159, Warszawa'}`;
  
  const details = [
    `Prowadzący: ${event.instructor}`,
    `Forma: ${event.type}`,
    `Grupa: ${event.group}`,
    event.turnus !== 'Nie dotyczy' ? `Turnus: ${event.turnus}` : '',
    event.notes ? `Uwagi: ${event.notes}` : '',
    'Wygenerowano z aplikacji Plan SGGW Drewno (WTD)'
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startDt}/${endDt}`,
    details: details,
    location: location,
    recur: event.mode === 'stacjonarne' ? 'RRULE:FREQ=WEEKLY;UNTIL=20270215T235959Z' : ''
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates standard RFC 5545 .ics (iCalendar) content for an array of events
 */
export function generateICalendarFile(
  events: ScheduleEvent[],
  semesterName: string = 'Semestr Zimowy 2026/2027 WTD SGGW',
  zjazdy: ZjazdWeekend[] = []
): string {
  const now = new Date();
  const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icsLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SGGW WNLiD//Plan Technologia Drewna//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${semesterName}`,
    'X-WR-TIMEZONE:Europe/Warsaw',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Warsaw',
    'X-LIC-LOCATION:Europe/Warsaw',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'END:VTIMEZONE'
  ];

  // Base semester date for recurrent stacjonarne events: 2026-10-01
  const semesterStart = new Date('2026-10-01');

  events.forEach((evt, idx) => {
    // Determine dates for event
    let targetDates: string[] = [];

    if (evt.mode === 'zaoczne') {
      // Find matching zjazdy for this turnus
      const matchingZjazdy = zjazdy.filter(z => 
        evt.turnus === 'Wszystkie' || z.turnus === evt.turnus || z.turnus === 'Turnus A i B'
      );

      matchingZjazdy.forEach(z => {
        const start = new Date(z.startDate);
        // dayOfWeek 5 = Friday, 6 = Saturday, 7 = Sunday
        const offset = evt.dayOfWeek === 5 ? 0 : evt.dayOfWeek === 6 ? 1 : 2;
        const eventDate = new Date(start);
        eventDate.setDate(start.getDate() + offset);
        targetDates.push(formatDateToIso(eventDate));
      });

      if (targetDates.length === 0) {
        // Fallback to next occurrence
        targetDates.push(formatDateToIso(getNextDayOfWeek(evt.dayOfWeek)));
      }
    } else {
      // For stacjonarne, anchor to first occurrence in semester
      const firstOccur = new Date(semesterStart);
      const currentDay = firstOccur.getDay() === 0 ? 7 : firstOccur.getDay();
      let diff = evt.dayOfWeek - currentDay;
      if (diff < 0) diff += 7;
      firstOccur.setDate(semesterStart.getDate() + diff);
      targetDates.push(formatDateToIso(firstOccur));
    }

    targetDates.forEach((dateStr, dIdx) => {
      const startClean = formatICalDate(dateStr, evt.startTime);
      const endClean = formatICalDate(dateStr, evt.endTime);
      const uid = `wtd-${evt.id}-${dIdx}-${Date.now()}@sggw.edu.pl`;

      const summary = `[WTD SGGW] ${evt.courseName} (${evt.type.toUpperCase()})`;
      const desc = `Prowadzący: ${evt.instructor}\\nGrupa: ${evt.group}\\nForma: ${evt.type}${evt.turnus !== 'Nie dotyczy' ? `\\nTurnus: ${evt.turnus}` : ''}${evt.notes ? `\\nUwagi: ${evt.notes}` : ''}`;
      const loc = `${evt.room}, ${evt.building || 'Bud. 34 WTD SGGW, Warszawa'}`;

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;TZID=Europe/Warsaw:${startClean}`,
        `DTEND;TZID=Europe/Warsaw:${endClean}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `LOCATION:${loc}`
      );

      // Repeat weekly until end of semester for stacjonarne
      if (evt.mode === 'stacjonarne' && dIdx === 0) {
        icsLines.push('RRULE:FREQ=WEEKLY;UNTIL=20270215T235959Z');
      }

      icsLines.push('STATUS:CONFIRMED', 'END:VEVENT');
    });
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

/**
 * Triggers download of generated .ics file
 */
export function downloadICalendarFile(icsContent: string, fileName: string = 'Plan_Zajec_WTD_SGGW.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
