export type StudyMode = 'stacjonarne' | 'zaoczne';

export type KierunekType = 'Technologia Drewna' | 'Meblarstwo';

export type RokStudiow = 1 | 2 | 3 | 4;

export type TurnusType = 'Turnus A' | 'Turnus B' | 'Wszystkie' | 'Nie dotyczy';

export type ClassType = 
  | 'wykład' 
  | 'ćwiczenia' 
  | 'laboratorium' 
  | 'projekt' 
  | 'seminarium' 
  | 'konsultacje'
  | 'egzamin';

export interface StudentProfile {
  kierunek: KierunekType;
  rok: RokStudiow;
  mode: StudyMode;
  turnus: 'Turnus A' | 'Turnus B';
  grupa: string;
  isConfigured: boolean;
}

export interface ScheduleEvent {
  id: string;
  courseName: string;
  courseCode?: string;
  kierunek?: KierunekType;
  rok?: RokStudiow;
  type: ClassType;
  dayOfWeek: number; // 1 = Poniedziałek, 2 = Wtorek, ..., 5 = Piątek, 6 = Sobota, 7 = Niedziela
  startTime: string; // "HH:MM" e.g. "08:15"
  endTime: string;   // "HH:MM" e.g. "10:00"
  room: string;      // e.g. "Bud. 34 s. 1/12"
  building?: string; // e.g. "Budynek 34 (WTD)"
  instructor: string;// e.g. "dr hab. inż. Jan Kowalski"
  instructorEmail?: string;
  group: string;     // e.g. "Grupa 1", "L1", "Wszyscy"
  mode: StudyMode;
  turnus: TurnusType;// dla zaocznych
  zjazdNumber?: number | null; // e.g. Zjazd 1, Zjazd 2...
  weekType?: 'każdy' | 'tydzień A' | 'tydzień B' | 'parzysty' | 'nieparzysty';
  notes?: string;
  isChanged?: boolean;
  changeDetails?: {
    originalRoom?: string;
    originalTime?: string;
    originalInstructor?: string;
    message: string;
    timestamp: string;
  };
}

export interface ZjazdWeekend {
  number: number;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  turnus: 'Turnus A' | 'Turnus B' | 'Turnus A i B';
  description: string;
  type: 'dydaktyczny' | 'sesja' | 'poprawkowa' | 'wolne';
}

export interface ScheduleChangeAlert {
  id: string;
  title: string;
  message: string;
  courseName: string;
  oldValue: string;
  newValue: string;
  type: 'room_change' | 'time_change' | 'cancellation' | 'instructor_change' | 'general';
  timestamp: string;
  read: boolean;
  severity: 'warning' | 'info' | 'critical';
  dateAffected?: string;
}

export interface StudentPreferences {
  kierunek: string; // "Technologia Drewna" | "Meblarstwo"
  stopien: 'I stopień' | 'II stopień';
  semestr: number;
  mode: StudyMode;
  turnus: 'Turnus A' | 'Turnus B';
  grupaCwiczeniowa: string;
  grupaLaboratoryjna: string;
  notificationsEnabled: boolean;
  notificationSound: boolean;
}
