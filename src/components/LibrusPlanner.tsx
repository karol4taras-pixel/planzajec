import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, MapPin, User, AlertTriangle, 
  CalendarPlus, Clock, X, Check, Calendar, Download, Info, CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { ScheduleEvent, StudentProfile } from '../types/schedule';
import { OFFICIAL_ZJAZDY_CALENDAR } from '../data/sampleSchedules';
import { createGoogleCalendarUrl } from '../utils/calendarSync';

interface LibrusPlannerProps {
  events: ScheduleEvent[];
  profile: StudentProfile;
  isDark: boolean;
  onOpenCalendarSync: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onUpdateProfile?: (newProfile: StudentProfile) => void;
}

type LibrusSubView = 'dzien' | 'tydzien' | 'miesiac';

export type EventGroupType = 'gr1' | 'gr2' | 'all';

/**
 * Determines whether a class is for Grupa 1 (M1), Grupa 2 (M2), or the Whole Year (Cały rok / Wykład).
 * SGGW timetable tracks: M1 on left/top, M2 on right/bottom.
 */
export function getEventGroupType(groupName?: string): EventGroupType {
  if (!groupName) return 'all';
  const norm = groupName.trim().toLowerCase();

  // Explicit whole year / shared lecture across M1 & M2
  if (
    norm.includes('cały rok') ||
    norm.includes('całość') ||
    norm.includes('wszysc') ||
    norm.includes('gr.1+2') ||
    norm === 'meb i' ||
    norm === 'meb ii' ||
    norm === 'meb iii' ||
    norm === 'meb iv'
  ) {
    return 'all';
  }

  // Grupa 1 / M1: "m1", "gr.1", "gr 1", "grupa 1", "l1", "ćw.gr.1"
  const isGr1 = /\b(m1|gr\.?\s*1|grupa\s*1|l1)\b/i.test(norm) || norm.includes('m1') || norm.includes('gr.1') || norm.includes('gr 1');
  // Grupa 2 / M2: "m2", "gr.2", "gr 2", "grupa 2", "l2", "ćw.gr.2"
  const isGr2 = /\b(m2|gr\.?\s*2|grupa\s*2|l2)\b/i.test(norm) || norm.includes('m2') || norm.includes('gr.2') || norm.includes('gr 2');

  if (isGr1 && !isGr2) return 'gr1';
  if (isGr2 && !isGr1) return 'gr2';
  return 'all';
}

/**
 * Normalizes user-selected group from student profile.
 */
export function getUserSelectedGroup(grupa?: string): 'all' | 'gr1' | 'gr2' {
  if (!grupa) return 'all';
  const norm = grupa.toLowerCase();
  if (norm.includes('wszystk')) return 'all';
  if (norm.includes('1') || norm.includes('m1')) return 'gr1';
  if (norm.includes('2') || norm.includes('m2')) return 'gr2';
  return 'all';
}

const DAY_LETTERS = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'];
const DAY_FULL_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

// Rich, authentic Librus subject palette
const SUBJECT_PALETTE = [
  { bg: 'bg-[#2980b9]', border: 'border-[#1f618d]', text: 'text-white' }, // Blue
  { bg: 'bg-[#d35400]', border: 'border-[#a04000]', text: 'text-white' }, // Deep Orange
  { bg: 'bg-[#8e44ad]', border: 'border-[#6c3483]', text: 'text-white' }, // Purple
  { bg: 'bg-[#16a085]', border: 'border-[#117a65]', text: 'text-white' }, // Teal
  { bg: 'bg-[#c0392b]', border: 'border-[#922b21]', text: 'text-white' }, // Crimson
  { bg: 'bg-[#27ae60]', border: 'border-[#1e8449]', text: 'text-white' }, // Green
  { bg: 'bg-[#d81b60]', border: 'border-[#ad1457]', text: 'text-white' }, // Magenta
  { bg: 'bg-[#b7950b]', border: 'border-[#9a7d0a]', text: 'text-white' }, // Golden Amber
  { bg: 'bg-[#4a235a]', border: 'border-[#371943]', text: 'text-white' }, // Indigo Violet
  { bg: 'bg-[#1a5276]', border: 'border-[#11374f]', text: 'text-white' }, // Dark Navy
  { bg: 'bg-[#515a5a]', border: 'border-[#363d3d]', text: 'text-white' }, // Slate Gray
  { bg: 'bg-[#784212]', border: 'border-[#582f0c]', text: 'text-white' }, // Warm Ochre
];

// Helper to normalize subject title so that lectures and lab/exercises of the same course get the exact same color!
function normalizeSubject(courseName: string): string {
  const lower = courseName.toLowerCase().trim();
  if (lower.includes('termodynamik')) return 'termodynamika';
  if (lower.includes('metrologi')) return 'metrologia';
  if (lower.includes('mechanik')) return 'mechanika';
  if (lower.includes('tworzyw')) return 'tworzywa';
  if (lower.includes('maszynoznawstw')) return 'maszynoznawstwo';
  if (lower.includes('materiałów włóknistych') || lower.includes('włóknist')) return 'fizyka_wloknista';
  if (lower.includes('język') || lower.includes('lektorat')) return 'jezyk_obcy';
  if (lower.includes('rysunek') || lower.includes('rys.')) return 'rysunek';
  if (lower.includes('matematyk')) return 'matematyka';
  if (lower.includes('chemi')) return 'chemia';
  if (lower.includes('anatomi')) return 'anatomia_drewna';
  if (lower.includes('ochron')) return 'ochrona';
  if (lower.includes('obrabiark')) return 'obrabiarki';
  if (lower.includes('mebli') || lower.includes('meblarstw')) return 'meble';
  if (lower.includes('ergonomi')) return 'ergonomia';
  if (lower.includes('hydrotermicz')) return 'hydrotermiczna';
  if (lower.includes('transportow')) return 'transportowe';
  if (lower.includes('cad') || lower.includes('grafika')) return 'cad';
  return lower;
}

// Inserts soft hyphens (\u00AD) in long Polish words so the browser cleanly breaks with a hyphen '-' like in books
function formatCourseNameForDisplay(name: string): string {
  return name
    .replace(/Maszynoznawstwo/gi, 'Maszyno\u00ADznawstwo')
    .replace(/Termodynamika/gi, 'Termo\u00ADdynamika')
    .replace(/Metrologia/gi, 'Metro\u00ADlogia')
    .replace(/Mechanika/gi, 'Mecha\u00ADnika')
    .replace(/włóknistych/gi, 'włók\u00ADnistych')
    .replace(/intelektualnej/gi, 'intelek\u00ADtualnej')
    .replace(/doświadczalnictwo/gi, 'doświad\u00ADczalnictwo');
}

// Grid constants: 08:00 to 20:30 (12.5 hours = 50 fifteen-minute slots)
const START_HOUR = 8.0; // 08:00
const END_HOUR = 20.5;  // 20:30
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 750 minutes
const SLOT_MINUTES = 15;
const TOTAL_SLOTS = TOTAL_MINUTES / SLOT_MINUTES; // 50 slots
const SLOT_HEIGHT_PX = 15; // 15px per 15-minute slot for crystal-clear readability
const TOTAL_GRID_HEIGHT = TOTAL_SLOTS * SLOT_HEIGHT_PX; // 750px

const HOUR_LABELS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export const LibrusPlanner: React.FC<LibrusPlannerProps> = ({
  events,
  profile,
  isDark,
  onOpenCalendarSync,
  onOpenNotifications,
  onOpenSettings,
  onUpdateProfile,
}) => {
  const [subView, setSubView] = useState<LibrusSubView>('tydzien');
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState<boolean>(false);
  const [nowTime, setNowTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Real-time current time indicator (08:00 - 20:30)
  const currentMinutesFrom0800 = (nowTime.getHours() * 60 + nowTime.getMinutes()) - (START_HOUR * 60);
  const isCurrentTimeInGrid = currentMinutesFrom0800 >= 0 && currentMinutesFrom0800 <= TOTAL_MINUTES;
  const currentIndicatorTopPx = (currentMinutesFrom0800 / SLOT_MINUTES) * SLOT_HEIGHT_PX;
  const currentTimeFormatted = nowTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const currentDayOfWeek = nowTime.getDay() === 0 ? 7 : nowTime.getDay(); // 1=Mon ... 5=Pt, 6=Sob, 7=Ndz

  // Year turnus is auto-determined: Rok 1 & 3 = Turnus A, Rok 2 & 4 = Turnus B
  const yearTurnus = profile.rok % 2 === 1 ? 'Turnus A' : 'Turnus B';
  const userGroup = getUserSelectedGroup(profile.grupa);

  // Helper to format ISO date YYYY-MM-DD
  const formatISO = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Convert "HH:MM" to minutes from 08:00
  const timeToMinutesFromStart = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMin = h * 60 + (m || 0);
    return Math.max(0, totalMin - (START_HOUR * 60));
  };

  // Calculate top and height in px for the timetable grid
  const getBlockStyles = (startTime: string, endTime: string) => {
    const startMin = timeToMinutesFromStart(startTime);
    const endMin = timeToMinutesFromStart(endTime);
    const durationMin = Math.max(30, endMin - startMin);
    const topPx = (startMin / SLOT_MINUTES) * SLOT_HEIGHT_PX;
    const heightPx = Math.max(32, (durationMin / SLOT_MINUTES) * SLOT_HEIGHT_PX - 2);
    return { top: `${topPx}px`, height: `${heightPx}px`, durationMin, heightPx };
  };

  // Find the first zjazd for this turnus
  const initialDate = useMemo(() => {
    const firstZjazd = OFFICIAL_ZJAZDY_CALENDAR.find(z => z.turnus === yearTurnus);
    if (firstZjazd) {
      return new Date(firstZjazd.startDate);
    }
    return new Date();
  }, [yearTurnus]);

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [activeModalEvent, setActiveModalEvent] = useState<ScheduleEvent | null>(null);

  // 1 = Monday, ..., 5 = Friday, 6 = Saturday, 7 = Sunday
  const selectedDayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

  // Calculate Monday date of current active week
  const weekDays = useMemo(() => {
    const base = new Date(currentDate);
    const day = base.getDay() === 0 ? 7 : base.getDay();
    const monday = new Date(base);
    monday.setDate(base.getDate() - (day - 1));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Check if a specific date is part of an official zjazd for this turnus
  const isDateInZjazd = (date: Date) => {
    const iso = formatISO(date);
    return OFFICIAL_ZJAZDY_CALENDAR.find(z => {
      if (z.turnus !== yearTurnus && z.turnus !== 'Turnus A i B') return false;
      return iso >= z.startDate && iso <= z.endDate;
    });
  };

  // Check if current active week has an official zjazd for this turnus
  const weekZjazd = useMemo(() => {
    const mISO = formatISO(weekDays[0]);
    const sISO = formatISO(weekDays[6]);
    return OFFICIAL_ZJAZDY_CALENDAR.find(z => {
      if (z.turnus !== yearTurnus && z.turnus !== 'Turnus A i B') return false;
      return !(z.endDate < mISO || z.startDate > sISO);
    });
  }, [weekDays, yearTurnus]);

  // Check if current active day is in a zjazd
  const activeDayZjazd = useMemo(() => {
    return isDateInZjazd(currentDate);
  }, [currentDate, yearTurnus]);

  // Closest or next upcoming zjazd for this turnus
  const nextZjazd = useMemo(() => {
    const currentISO = formatISO(currentDate);
    const future = OFFICIAL_ZJAZDY_CALENDAR.filter(z => {
      if (z.turnus !== yearTurnus && z.turnus !== 'Turnus A i B') return false;
      return z.endDate >= currentISO;
    });
    return future[0] || OFFICIAL_ZJAZDY_CALENDAR.find(z => z.turnus === yearTurnus);
  }, [currentDate, yearTurnus]);

  // Week range label e.g. "9 – 11 października 2026"
  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
  }, [weekDays]);

  // Filter events strictly for this year, zaoczne, and student's selected group
  const visibleEvents = useMemo(() => {
    return events.filter(e => {
      if (e.mode !== 'zaoczne') return false;
      if (e.rok !== profile.rok) return false;

      // Group filtering: check if this class belongs to M1, M2, or Whole Year (Cały rok)
      const eventGrp = getEventGroupType(e.group);
      if (userGroup === 'gr1' && eventGrp === 'gr2') return false;
      if (userGroup === 'gr2' && eventGrp === 'gr1') return false;

      return true;
    });
  }, [events, profile.rok, userGroup]);

  // Compute parallel collision columns so overlapping group classes render side by side
  // In SGGW PDF: M1 is on the left track, M2 is on the right track! Whole year classes span 100%!
  const computeEventCollisions = (dayEvents: ScheduleEvent[]) => {
    const sorted = [...dayEvents].sort((a, b) => {
      const aStart = a.startTime.localeCompare(b.startTime);
      if (aStart !== 0) return aStart;
      return a.endTime.localeCompare(b.endTime);
    });

    // If user filtered to a specific single group, all its classes take full width (100%)
    if (userGroup !== 'all') {
      return sorted.map(evt => ({
        event: evt,
        colIndex: 0,
        totalCols: 1,
        groupType: getEventGroupType(evt.group),
      }));
    }

    const clusters: ScheduleEvent[][] = [];
    let currentCluster: ScheduleEvent[] = [];
    let clusterEnd = '00:00';

    for (const evt of sorted) {
      if (currentCluster.length === 0) {
        currentCluster.push(evt);
        clusterEnd = evt.endTime;
      } else {
        if (evt.startTime < clusterEnd) {
          currentCluster.push(evt);
          if (evt.endTime > clusterEnd) clusterEnd = evt.endTime;
        } else {
          clusters.push(currentCluster);
          currentCluster = [evt];
          clusterEnd = evt.endTime;
        }
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    const result: { event: ScheduleEvent; colIndex: number; totalCols: number; groupType: EventGroupType }[] = [];

    for (const cluster of clusters) {
      if (cluster.length === 1) {
        // Single class (e.g. lecture or whole-year exercises): takes full width!
        result.push({
          event: cluster[0],
          colIndex: 0,
          totalCols: 1,
          groupType: getEventGroupType(cluster[0].group),
        });
      } else {
        // Overlapping classes (e.g. M1 and M2 at the same time):
        // Sort so M1 is on the left (colIndex 0) and M2 is on the right (colIndex 1)
        const sortedCluster = [...cluster].sort((a, b) => {
          const aGrp = getEventGroupType(a.group);
          const bGrp = getEventGroupType(b.group);
          if (aGrp === 'gr1' && bGrp !== 'gr1') return -1;
          if (bGrp === 'gr1' && aGrp !== 'gr1') return 1;
          if (aGrp === 'gr2' && bGrp !== 'gr2') return 1;
          if (bGrp === 'gr2' && aGrp !== 'gr2') return -1;
          return a.startTime.localeCompare(b.startTime);
        });

        sortedCluster.forEach((evt, idx) => {
          result.push({
            event: evt,
            colIndex: idx < 2 ? idx : idx % 2,
            totalCols: 2,
            groupType: getEventGroupType(evt.group),
          });
        });
      }
    }

    return result;
  };

  // Group events by day of week (1 to 7)
  const eventsByDay = useMemo(() => {
    const map = new Map<number, ScheduleEvent[]>();
    for (let i = 1; i <= 7; i++) map.set(i, []);
    visibleEvents.forEach(e => {
      const arr = map.get(e.dayOfWeek) || [];
      arr.push(e);
      map.set(e.dayOfWeek, arr);
    });
    // Sort each day chronologically
    for (let i = 1; i <= 7; i++) {
      const arr = map.get(i)!;
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [visibleEvents]);

  // Consistent subject-to-color assignment: same course gets identical color, distinct courses get distinct colors!
  const distinctSubjectColors = useMemo(() => {
    const map = new Map<string, typeof SUBJECT_PALETTE[0]>();
    const normalizedSubjectsSeen: string[] = [];

    // Register all subjects in events deterministically
    events.forEach(e => {
      const key = normalizeSubject(e.courseName);
      if (!normalizedSubjectsSeen.includes(key)) {
        normalizedSubjectsSeen.push(key);
      }
    });

    normalizedSubjectsSeen.forEach((key, idx) => {
      map.set(key, SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length]);
    });

    return map;
  }, [events]);

  // Color generator for an event
  const getEventColor = (e: ScheduleEvent, _idx?: number) => {
    if (e.isChanged) return { bg: 'bg-[#d97706]', border: 'border-[#b45309]', text: 'text-white' };
    const key = normalizeSubject(e.courseName);
    return distinctSubjectColors.get(key) || SUBJECT_PALETTE[0];
  };

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (subView === 'dzien') {
      d.setDate(d.getDate() - 1);
    } else if (subView === 'tydzien') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (subView === 'dzien') {
      d.setDate(d.getDate() + 1);
    } else if (subView === 'tydzien') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  // Jump to specific zjazd date
  const jumpToZjazd = (zjazdDateStr: string) => {
    setCurrentDate(new Date(zjazdDateStr));
    setSubView('tydzien');
  };

  // Day view events: strictly ONLY if active day is part of an official zjazd!
  const currentDayEvents = useMemo(() => {
    if (!activeDayZjazd) return [];
    return eventsByDay.get(selectedDayOfWeek) || [];
  }, [activeDayZjazd, eventsByDay, selectedDayOfWeek]);

  // Day view clusters: groups parallel group classes (e.g. M1 and M2) into side-by-side pairs!
  const dayEventClusters = useMemo(() => {
    if (!activeDayZjazd) return [];
    const dayEvts = eventsByDay.get(selectedDayOfWeek) || [];
    const sorted = [...dayEvts].sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (userGroup !== 'all') {
      return sorted.map(evt => [evt]);
    }

    const clusters: ScheduleEvent[][] = [];
    let currentCluster: ScheduleEvent[] = [];
    let clusterEnd = '00:00';

    for (const evt of sorted) {
      if (currentCluster.length === 0) {
        currentCluster.push(evt);
        clusterEnd = evt.endTime;
      } else {
        if (evt.startTime < clusterEnd) {
          currentCluster.push(evt);
          if (evt.endTime > clusterEnd) clusterEnd = evt.endTime;
        } else {
          clusters.push(currentCluster);
          currentCluster = [evt];
          clusterEnd = evt.endTime;
        }
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    return clusters.map(cluster => {
      if (cluster.length <= 1) return cluster;
      return [...cluster].sort((a, b) => {
        const aGrp = getEventGroupType(a.group);
        const bGrp = getEventGroupType(b.group);
        if (aGrp === 'gr1' && bGrp !== 'gr1') return -1;
        if (bGrp === 'gr1' && aGrp !== 'gr1') return 1;
        return 0;
      });
    });
  }, [activeDayZjazd, eventsByDay, selectedDayOfWeek, userGroup]);

  // Month grid calculations
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Monday = 0, ..., Sunday = 6
    const startOffset = (firstDay.getDay() === 0 ? 7 : firstDay.getDay()) - 1;

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const zjazd = isDateInZjazd(d);
      days.push({
        dayNum,
        date: d,
        zjazd,
      });
    }
    return days;
  }, [currentDate, yearTurnus]);

  const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

  // Set of minute marks where classes start or end for thicker lines
  const lessonMinuteBoundaries = useMemo(() => {
    const set = new Set<number>();
    visibleEvents.forEach(e => {
      const startMin = timeToMinutesFromStart(e.startTime);
      const endMin = timeToMinutesFromStart(e.endTime);
      set.add(startMin);
      set.add(endMin);
    });
    return set;
  }, [visibleEvents]);

  return (
    <div className={`w-full max-w-2xl mx-auto ${isDark ? 'text-stone-100' : 'text-[#222906]'} pb-10`}>
      {/* ============================================================== */}
      {/* 1. STICKY SOLID HEADER BAR (Does not scroll with timetable)    */}
      {/* ============================================================== */}
      <div className={`sticky top-13 z-30 transition-colors border-b shadow-xs ${
        isDark ? 'bg-[#0d1205] border-[#253210]' : 'bg-[#f6f8f0] border-[#e0e6cf]'
      }`}>
        {/* Connected Solid Watermark Info Banner (Stationary with Header) */}
        <div className="text-[10px] text-stone-400 font-mono text-center py-1 border-b border-[#253210]/40 select-none bg-[#090d04]/60">
          Aktualizacja WNLiD: 30.09.2026 r. • Meblarstwo (Zaoczne) • Rok {profile.rok}
        </div>

        {/* Permanent Top Sub-bar (Dzień | Tydzień | Miesiąc | Grupy M1/M2 | Turnus) */}
        <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#253210]/40">
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-semibold">
            <button
              onClick={() => setSubView('dzien')}
              className={`pb-1 transition relative ${
                subView === 'dzien'
                  ? 'text-[#a2c41f] font-extrabold border-b-2 border-[#54650F]'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Dzień
            </button>
            <button
              onClick={() => setSubView('tydzien')}
              className={`pb-1 transition relative ${
                subView === 'tydzien'
                  ? 'text-[#a2c41f] font-extrabold border-b-2 border-[#54650F]'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Tydzień
            </button>
            <button
              onClick={() => setSubView('miesiac')}
              className={`pb-1 transition relative ${
                subView === 'miesiac'
                  ? 'text-[#a2c41f] font-extrabold border-b-2 border-[#54650F]'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Miesiąc
            </button>
          </div>

          {/* Group and Turnus Selectors */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Group Switcher: Wszystkie (M1+M2) | Grupa 1 | Grupa 2 */}
            <div className={`flex items-center p-0.5 rounded-lg border text-[10px] font-bold ${
              isDark ? 'bg-[#151c0b] border-[#253210]' : 'bg-[#eef2de] border-[#d8e0be]'
            }`}>
              <button
                type="button"
                onClick={() => onUpdateProfile && onUpdateProfile({ ...profile, grupa: 'Wszystkie grupy' })}
                className={`px-2 py-0.5 rounded transition ${
                  userGroup === 'all'
                    ? 'bg-[#54650F] text-white shadow-xs'
                    : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Pokaż wszystkie grupy (M1 i M2 obok siebie)"
              >
                Wszystkie (M1+M2)
              </button>
              <button
                type="button"
                onClick={() => onUpdateProfile && onUpdateProfile({ ...profile, grupa: 'Grupa 1 (M1)' })}
                className={`px-2 py-0.5 rounded transition ${
                  userGroup === 'gr1'
                    ? 'bg-[#1f618d] text-white shadow-xs'
                    : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Pokaż tylko zajęcia Grupy 1 (M1)"
              >
                M1 (Gr 1)
              </button>
              <button
                type="button"
                onClick={() => onUpdateProfile && onUpdateProfile({ ...profile, grupa: 'Grupa 2 (M2)' })}
                className={`px-2 py-0.5 rounded transition ${
                  userGroup === 'gr2'
                    ? 'bg-[#b9770e] text-white shadow-xs'
                    : isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Pokaż tylko zajęcia Grupy 2 (M2)"
              >
                M2 (Gr 2)
              </button>
            </div>

            {/* Turnus Pill */}
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] sm:text-[11px] font-bold ${
              isDark ? 'bg-[#1a230d] text-[#a2c41f] border border-[#54650F]/50' : 'bg-[#eef2de] text-[#414f0b]'
            }`}>
              {yearTurnus}
            </span>
          </div>
        </div>

        {/* Collapsible Section: Date Navigator (< Date Range >) & 7-Day Circular Selector */}
        {subView !== 'miesiac' && (
          <div className={`overflow-hidden transition-all duration-200 ease-in-out ${
            isCalendarCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-60 opacity-100'
          }`}>
            {/* 2. DATE NAVIGATOR (< Date Range >) */}
            <div className={`px-3 py-2 flex items-center justify-between text-xs font-bold text-[#a2c41f] border-b ${
              isDark ? 'bg-[#0d1205] border-[#20290d]' : 'bg-[#f4f7eb] border-[#e0e6cf]'
            }`}>
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/5 transition"
                title="Poprzedni"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-xs sm:text-sm font-extrabold text-stone-100 block">
                  {subView === 'dzien'
                    ? `${DAY_FULL_NAMES[selectedDayOfWeek - 1]}, ${currentDate.getDate()} ${['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'][currentDate.getMonth()]} ${currentDate.getFullYear()}`
                    : weekRangeLabel}
                </span>
                <span className={`text-[10px] font-mono font-semibold ${
                  weekZjazd ? 'text-[#a2c41f]' : 'text-stone-500'
                }`}>
                  {weekZjazd ? `● ${weekZjazd.description}` : '○ Weekend wolny (brak zjazdu)'}
                </span>
              </div>

              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/5 transition"
                title="Następny"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 3. 7-DAY CIRCULAR DATE SELECTOR (P W Ś C P S N / 1 2 3 4 5 6 7) */}
            <div className={`border-b ${isDark ? 'border-[#253210] bg-[#111608]' : 'border-[#e0e6cf] bg-white'}`}>
              <div className="grid grid-cols-7 text-center py-1">
                {DAY_LETTERS.map((letter, idx) => (
                  <span
                    key={`day-letter-${idx}`}
                    className={`text-[11px] font-bold ${
                      idx >= 4 ? 'text-[#a2c41f]' : 'text-stone-500'
                    }`}
                  >
                    {letter}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 text-center pb-2">
                {weekDays.map((d, idx) => {
                  const isSelected = formatISO(d) === formatISO(currentDate);
                  const isToday = formatISO(d) === formatISO(new Date());
                  const dayNum = d.getDay() === 0 ? 7 : d.getDay();
                  const hasZjazd = isDateInZjazd(d);
                  const dayEventsCount = (eventsByDay.get(dayNum) || []).length;
                  const hasClasses = Boolean(hasZjazd) && dayEventsCount > 0;

                  return (
                    <button
                      key={`day-num-${idx}`}
                      onClick={() => {
                        setCurrentDate(d);
                        setSubView('dzien');
                      }}
                      className="flex flex-col items-center justify-center py-0.5 group"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition relative ${
                          isSelected
                            ? 'bg-[#54650F] text-white font-extrabold shadow-sm'
                            : isToday
                            ? 'border border-[#54650F] text-[#a2c41f]'
                            : hasClasses
                            ? 'text-stone-100 font-bold hover:bg-[#1a230d]'
                            : 'text-stone-500 hover:bg-stone-800'
                        }`}
                      >
                        <span>{d.getDate()}</span>
                        {hasClasses && !isSelected && (
                          <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#a2c41f]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Full-width Toggle Collapse Button spanning the entire screen */}
        {subView !== 'miesiac' && (
          <button
            onClick={() => setIsCalendarCollapsed(!isCalendarCollapsed)}
            className={`w-full py-1 px-3 flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all border-b border-[#253210]/40 ${
              isDark ? 'bg-[#111608] hover:bg-[#161d0b] text-stone-400 hover:text-[#a2c41f]' : 'bg-[#f0f4e4] hover:bg-[#e6ecd4] text-stone-600 hover:text-[#54650F]'
            }`}
            title={isCalendarCollapsed ? "Pokaż pełną nawigację kalendarzyka" : "Zwiń kalendarzyk (zostaw tylko pasek Dzień/Tydzień/Miesiąc)"}
          >
            {isCalendarCollapsed ? (
              <>
                <span>Pokaż kalendarz dni</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#a2c41f]" />
              </>
            ) : (
              <>
                <span>Zwiń kalendarz dni</span>
                <ChevronUp className="w-3.5 h-3.5 text-[#a2c41f]" />
              </>
            )}
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4A. DZIEŃ VIEW (Full sequential cards for the active day)       */}
      {/* ============================================================== */}
      {subView === 'dzien' && (
        <div className={`mt-2 p-3 sm:p-4 rounded-2xl border ${
          isDark ? 'border-[#253210] bg-[#111608]' : 'border-[#e0e6cf] bg-white'
        } shadow-xs space-y-3`}>
          <div className="flex items-center justify-between pb-2 border-b border-[#253210] text-xs">
            <span className="font-extrabold text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>{DAY_FULL_NAMES[selectedDayOfWeek - 1]}</span>
              {activeDayZjazd && (
                <span className="text-[#a2c41f]">• {currentDayEvents.length} {currentDayEvents.length === 1 ? 'zajęcie' : 'zajęć'}</span>
              )}
            </span>
            <span className="font-bold font-mono text-[#a2c41f]">
              {profile.turnus} (Rok {profile.rok})
            </span>
          </div>

          {!activeDayZjazd || currentDayEvents.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs space-y-2">
              <Clock className="w-8 h-8 text-stone-600 mx-auto mb-1" />
              <p className="font-bold text-stone-300">
                {!activeDayZjazd
                  ? `Brak zjazdu dla ${yearTurnus} w tym terminie`
                  : 'Brak zaplanowanych zajęć w tym dniu'}
              </p>
              <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                {!activeDayZjazd
                  ? `Studia niestacjonarne dla Roku ${profile.rok} odbywają się co 2 tygodnie według harmonogramu Turnusu B.`
                  : 'Wybierz piątek, sobotę lub niedzielę podczas zjazdu.'}
              </p>
              {nextZjazd && (
                <button
                  onClick={() => jumpToZjazd(nextZjazd.startDate)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#54650F] hover:bg-[#667a13] text-white transition shadow-xs"
                >
                  <span>Przejdź do: {nextZjazd.description} ({nextZjazd.startDate})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dayEventClusters.map((cluster, clusterIdx) => {
                if (cluster.length > 1) {
                  // Two parallel classes at the same time (e.g. M1 and M2) rendered side-by-side!
                  return (
                    <div key={`cluster-${clusterIdx}`} className="space-y-1.5">
                      <div className="text-[10px] font-mono font-bold text-stone-400 flex items-center gap-2 pl-1">
                        <Clock className="w-3 h-3 text-[#a2c41f]" />
                        <span>{cluster[0].startTime} – {cluster[0].endTime} • Zajęcia w grupach (M1 i M2 obok siebie)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {cluster.map((event, eventIdx) => {
                          const grpType = getEventGroupType(event.group);
                          const color = getEventColor(event, eventIdx);
                          const isViewingToday = formatISO(currentDate) === formatISO(nowTime);
                          const startMin = timeToMinutesFromStart(event.startTime);
                          const endMin = timeToMinutesFromStart(event.endTime);
                          const isHappeningNow = isViewingToday && currentMinutesFrom0800 >= startMin && currentMinutesFrom0800 <= endMin;

                          return (
                            <div
                              key={event.id}
                              onClick={() => setActiveModalEvent(event)}
                              className={`rounded-xl p-3 sm:p-3.5 border shadow-xs cursor-pointer transition hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between gap-2.5 ${
                                isHappeningNow ? 'ring-2 ring-red-500 shadow-lg' : ''
                              } ${color.bg} ${color.border} ${color.text}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold shadow-xs ${
                                    grpType === 'gr1' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                                  }`}>
                                    {grpType === 'gr1' ? 'M1 • Grupa 1' : 'M2 • Grupa 2'}
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-extrabold tracking-tight leading-snug">
                                    {event.courseName}
                                  </h4>
                                </div>

                                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-black/30 text-white shrink-0">
                                  {event.type}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/20">
                                <div className="flex items-center gap-1.5 font-mono font-bold text-[11px]">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{event.startTime} – {event.endTime}</span>
                                </div>

                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="font-bold">{event.room}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] opacity-90">
                                <span className="truncate max-w-[150px] sm:max-w-none">
                                  {event.instructor.replace(/prof\. dr hab\. inż\.|dr hab\. inż\.|dr inż\.|mgr inż\./, '').trim()}
                                </span>
                                {event.notes && (
                                  <span className="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                    {event.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Single class (e.g. lecture or whole-year course)
                const event = cluster[0];
                const grpType = getEventGroupType(event.group);
                const color = getEventColor(event, clusterIdx);
                const isViewingToday = formatISO(currentDate) === formatISO(nowTime);
                const startMin = timeToMinutesFromStart(event.startTime);
                const endMin = timeToMinutesFromStart(event.endTime);
                const isHappeningNow = isViewingToday && currentMinutesFrom0800 >= startMin && currentMinutesFrom0800 <= endMin;

                return (
                  <div
                    key={event.id}
                    onClick={() => setActiveModalEvent(event)}
                    className={`rounded-xl p-3.5 border shadow-xs cursor-pointer transition hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between gap-2.5 ${
                      isHappeningNow ? 'ring-2 ring-red-500 shadow-lg' : ''
                    } ${color.bg} ${color.border} ${color.text}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {grpType === 'gr1' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white shadow-xs">
                            Grupa 1 (M1)
                          </span>
                        ) : grpType === 'gr2' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-600 text-white shadow-xs">
                            Grupa 2 (M2)
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-md bg-black/30 text-white text-[11px] font-mono font-black flex items-center justify-center">
                            {clusterIdx + 1}
                          </span>
                        )}
                        <h4 className="text-xs sm:text-sm font-extrabold tracking-tight leading-snug">
                          {event.courseName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isHappeningNow && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            TRWA TERAZ
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-black/30 text-white">
                          {grpType === 'all' && event.type === 'wykład' ? 'Wykład (Cały rok)' : grpType === 'all' ? 'Wspólne (Cały rok)' : event.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/20">
                      <div className="flex items-center gap-1.5 font-mono font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{event.startTime} – {event.endTime}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold flex items-center gap-1 font-mono">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{event.room}</span>
                        </span>
                        <span className="hidden sm:inline opacity-90 truncate max-w-[140px]">
                          {event.instructor.replace(/prof\. dr hab\. inż\.|dr hab\. inż\.|dr inż\.|mgr inż\./, '').trim()}
                        </span>
                      </div>
                    </div>

                    {event.notes && (
                      <div className="text-[10px] opacity-85 font-mono bg-black/20 px-2 py-0.5 rounded">
                        {event.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4B. TYDZIEŃ VIEW: TIME-ALIGNED GRID WITH 15-MINUTE LINES       */}
      {/* Time on left (08:00 - 20:30), Piątek | Sobota | Niedziela      */}
      {/* Compact blocks, exact hour alignment, gaps for okienka!        */}
      {/* ============================================================== */}
      {subView === 'tydzien' && (
        <div className={`mt-2 p-2.5 sm:p-4 rounded-2xl border ${
          isDark ? 'border-[#253210] bg-[#111608]' : 'border-[#e0e6cf] bg-white'
        } shadow-xs space-y-2`}>
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#253210] text-xs">
            <span className="font-extrabold text-stone-100 uppercase tracking-wider">
              {weekZjazd ? `${weekZjazd.description}` : `Weekend wolny • ${yearTurnus}`}
            </span>
            <span className="text-xs text-[#a2c41f] font-mono font-semibold">
              08:00 – 20:30
            </span>
          </div>

          {!weekZjazd ? (
            <div className="py-12 text-center text-stone-400 text-xs space-y-2">
              <Clock className="w-8 h-8 text-stone-600 mx-auto mb-1" />
              <p className="font-bold text-stone-300">W tym tygodniu nie ma zjazdu</p>
              <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                Studia niestacjonarne dla Roku {profile.rok} odbywają się co 2 tygodnie według harmonogramu {yearTurnus}.
              </p>
              {nextZjazd && (
                <button
                  onClick={() => jumpToZjazd(nextZjazd.startDate)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#54650F] hover:bg-[#667a13] text-white transition shadow-xs"
                >
                  <span>Przejdź do: {nextZjazd.description} ({nextZjazd.startDate})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            /* True Timetable Grid: Time axis on left, 3 equal day columns */
            <div className="relative">
              {/* Day Headers: Piątek, Sobota, Niedziela */}
              <div className="flex border-b border-[#253210] pb-1.5 mb-1 text-center font-bold text-xs">
                {/* Time Axis Header (spacer) */}
                <div className="w-10 sm:w-12 shrink-0 text-stone-500 font-mono text-[10px]">
                  Godz.
                </div>
                {/* 3 Days */}
                <div className="flex-1 text-[#cfe665]">Piątek</div>
                <div className="flex-1 text-[#cfe665]">Sobota</div>
                <div className="flex-1 text-[#cfe665]">Niedziela</div>
              </div>

              {/* Main Grid Container */}
              <div 
                className="relative flex overflow-hidden border-t border-[#253210]"
                style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
              >
                {/* Real-time horizontal line indicator: ONLY on the column of TODAY */}
                {isCurrentTimeInGrid && (
                  <>
                    {/* Time badge on the left axis */}
                    <div
                      style={{ top: `${currentIndicatorTopPx}px` }}
                      className="absolute left-0 w-10 sm:w-12 -translate-y-1/2 z-30 flex items-center justify-end pr-0.5 pointer-events-none"
                    >
                      <span className="px-1 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[8px] sm:text-[9px] shadow-sm leading-none flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {currentTimeFormatted}
                      </span>
                    </div>

                    {/* Laser red horizontal line: ONLY rendered in today's column (Piątek = 5, Sobota = 6, Niedziela = 7) */}
                    {[5, 6, 7].includes(currentDayOfWeek) && (
                      <div 
                        style={{
                          top: `${currentIndicatorTopPx}px`,
                          left: `calc(2.5rem + ${((currentDayOfWeek - 5) / 3)} * (100% - 2.5rem))`,
                          width: `calc((100% - 2.5rem) / 3)`
                        }}
                        className="absolute h-[2px] bg-red-500 z-20 pointer-events-none shadow-xs flex items-center"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-md animate-pulse -ml-1" />
                      </div>
                    )}
                  </>
                )}

                {/* 1. Left Time Axis */}
                <div 
                  className="w-10 sm:w-12 shrink-0 relative select-none font-mono text-[10px] text-stone-400 border-r border-[#253210]"
                >
                  {HOUR_LABELS.map((hourStr, idx) => {
                    const topPx = idx * (4 * SLOT_HEIGHT_PX); // Every 60 mins = 4 slots
                    return (
                      <div
                        key={`hour-label-${hourStr}`}
                        style={{ top: `${topPx}px` }}
                        className="absolute left-0 right-1 -translate-y-2 text-right font-semibold"
                      >
                        {hourStr}
                      </div>
                    );
                  })}
                </div>

                {/* 2. Background Horizontal Grid Lines: ONLY on full hours (brighter and clearly visible, no lines at 15-min intervals) */}
                <div className="absolute inset-0 left-10 sm:left-12 pointer-events-none">
                  {Array.from({ length: TOTAL_SLOTS }).map((_, slotIdx) => {
                    const minuteFromStart = slotIdx * SLOT_MINUTES;
                    const isHourMark = minuteFromStart % 60 === 0;

                    if (!isHourMark) return null;

                    return (
                      <div
                        key={`grid-line-${slotIdx}`}
                        style={{ top: `${(minuteFromStart / SLOT_MINUTES) * SLOT_HEIGHT_PX}px` }}
                        className="absolute left-0 right-0 border-b border-[#5e782b] dark:border-[#546d24]"
                      />
                    );
                  })}
                </div>

                {/* 3. Three Columns: Piątek (5), Sobota (6), Niedziela (7) */}
                <div className="flex-1 flex divide-x divide-[#253210] relative z-10">
                  {[5, 6, 7].map((dayNum) => {
                    const dayEvents = eventsByDay.get(dayNum) || [];
                    const positioned = computeEventCollisions(dayEvents);

                    return (
                      <div 
                        key={`grid-col-${dayNum}`}
                        className="flex-1 relative h-full"
                      >
                        {positioned.map(({ event: evt, colIndex, totalCols, groupType }, idx) => {
                          const { top, height, durationMin } = getBlockStyles(evt.startTime, evt.endTime);
                          const color = getEventColor(evt, idx);
                          const maxLines = durationMin <= 45 ? 1 : durationMin <= 75 ? 2 : durationMin <= 105 ? 3 : 5;

                          const isMultiCol = totalCols > 1;
                          const widthStyle = isMultiCol ? 'calc(50% - 2px)' : 'calc(100% - 4px)';
                          const leftStyle = isMultiCol ? (colIndex === 0 ? '1px' : 'calc(50% + 1px)') : '2px';

                          return (
                            <div
                              key={evt.id}
                              onClick={() => setActiveModalEvent(evt)}
                              style={{
                                position: 'absolute',
                                top,
                                height,
                                left: leftStyle,
                                width: widthStyle,
                                hyphens: 'auto',
                                WebkitHyphens: 'auto',
                              }}
                              lang="pl"
                              className={`rounded-lg p-1 sm:p-1.5 border shadow-2xs cursor-pointer transition hover:brightness-110 active:scale-95 flex flex-col justify-between overflow-hidden ${color.bg} ${color.border} ${color.text}`}
                              title={`${evt.courseName} (${evt.startTime} - ${evt.endTime}) • ${groupType === 'gr1' ? 'Grupa 1 (M1)' : groupType === 'gr2' ? 'Grupa 2 (M2)' : 'Cały rok'}`}
                            >
                              {/* Subject title */}
                              <p
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: isMultiCol ? Math.min(2, maxLines) : maxLines,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  hyphens: 'auto',
                                  WebkitHyphens: 'auto',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                }}
                                className={`${isMultiCol ? 'text-[8.5px] sm:text-[9.5px]' : 'text-[9.5px] sm:text-[11px]'} font-bold leading-[1.15] tracking-tight`}
                              >
                                {formatCourseNameForDisplay(evt.courseName)}
                              </p>

                              {/* Time badge + Group tag */}
                              <div className="flex items-center justify-between text-[7.5px] sm:text-[8.5px] font-mono pt-0.5 border-t border-white/20 leading-none shrink-0 mt-auto">
                                <span className="font-semibold tracking-tighter truncate">
                                  {evt.startTime} - {evt.endTime}
                                </span>
                                {groupType === 'gr1' ? (
                                  <span className="uppercase text-[6.5px] sm:text-[7.5px] px-1 py-0.2 rounded bg-blue-600/90 text-white font-extrabold shrink-0 ml-0.5 shadow-2xs">
                                    M1
                                  </span>
                                ) : groupType === 'gr2' ? (
                                  <span className="uppercase text-[6.5px] sm:text-[7.5px] px-1 py-0.2 rounded bg-amber-600/90 text-white font-extrabold shrink-0 ml-0.5 shadow-2xs">
                                    M2
                                  </span>
                                ) : (
                                  <span className="uppercase text-[6.5px] sm:text-[7.5px] px-1 py-0.2 rounded bg-black/30 text-white/90 font-medium shrink-0 ml-0.5">
                                    {evt.type === 'wykład' ? 'Wyk' : 'Wspólne'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4C. MIESIĄC VIEW (Full month calendar with zjazdy dots)         */}
      {/* ============================================================== */}
      {subView === 'miesiac' && (
        <div className={`mt-2 p-3 sm:p-4 rounded-2xl border ${
          isDark ? 'border-[#253210] bg-[#111608]' : 'border-[#e0e6cf] bg-white'
        } shadow-xs space-y-3`}>
          <div className="flex items-center justify-between pb-2 border-b border-[#253210] text-xs">
            <span className="font-extrabold text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-[#a2c41f]" />
              <span>Kalendarz miesiąca • {yearTurnus}</span>
            </span>
            <span className="text-[11px] text-stone-400">
              Dotknij dnia z kropką, aby zobaczyć plan
            </span>
          </div>

          {/* Month Weekdays Header */}
          <div className="grid grid-cols-7 text-center py-1 font-bold text-[11px] text-stone-400 border-b border-[#253210]">
            <span>Pn</span>
            <span>Wt</span>
            <span>Śr</span>
            <span>Czw</span>
            <span className="text-[#a2c41f]">Pt</span>
            <span className="text-[#a2c41f]">Sob</span>
            <span className="text-[#a2c41f]">Ndz</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center py-1">
            {monthData.map((item, idx) => {
              if (!item) {
                return <div key={`empty-${idx}`} className="h-10" />;
              }

              const isSelected = formatISO(item.date) === formatISO(currentDate);
              const isToday = formatISO(item.date) === formatISO(new Date());
              const hasZjazd = Boolean(item.zjazd);

              return (
                <button
                  key={`month-day-${item.dayNum}`}
                  onClick={() => {
                    setCurrentDate(item.date);
                    setSubView('dzien');
                  }}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition ${
                    isSelected
                      ? 'bg-[#54650F] text-white font-extrabold shadow-sm'
                      : isToday
                      ? 'border border-[#54650F] text-[#a2c41f]'
                      : hasZjazd
                      ? 'bg-[#1b250d] text-stone-100 font-bold hover:bg-[#233011] border border-[#54650F]/50'
                      : 'text-stone-400 hover:bg-stone-800/60'
                  }`}
                >
                  <span className="text-xs">{item.dayNum}</span>
                  {hasZjazd && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isSelected ? 'bg-white' : 'bg-[#a2c41f]'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-2 border-t border-[#253210] flex items-center justify-between text-[11px] text-stone-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#a2c41f]" />
              <span>Dni zjazdu ({yearTurnus})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-[#54650F]" />
              <span>Dzisiaj</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL SZCZEGÓŁÓW ZAJĘĆ (Event Detail Modal)                 */}
      {/* ============================================================== */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#111608] border border-[#253210] text-stone-100 p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#1b250d] text-[#a2c41f] border border-[#54650F]/50">
                  {activeModalEvent.type}
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">
                  {activeModalEvent.courseName}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalEvent(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-stone-300 font-mono">
                <Clock className="w-4 h-4 text-[#a2c41f]" />
                <span>{activeModalEvent.startTime} – {activeModalEvent.endTime}</span>
              </div>

              <div className="flex items-center gap-2 text-stone-300">
                <MapPin className="w-4 h-4 text-[#a2c41f]" />
                <span>Sala: <strong className="text-white">{activeModalEvent.room}</strong> ({activeModalEvent.building})</span>
              </div>

              <div className="flex items-center gap-2 text-stone-300">
                <User className="w-4 h-4 text-[#a2c41f]" />
                <span>Prowadzący: <strong className="text-white">{activeModalEvent.instructor}</strong></span>
              </div>

              {activeModalEvent.notes && (
                <div className="p-2.5 rounded-xl bg-[#090d04] border border-[#253210] text-stone-400 text-[11px]">
                  📌 {activeModalEvent.notes}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#253210] flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const url = createGoogleCalendarUrl(activeModalEvent, formatISO(currentDate));
                  window.open(url, '_blank');
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-[#54650F] hover:bg-[#667a13] text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Dodaj do Kalendarza Google</span>
              </button>

              <button
                onClick={() => setActiveModalEvent(null)}
                className="py-2 px-3 rounded-xl border border-[#253210] text-stone-400 hover:text-white text-xs font-semibold"
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
