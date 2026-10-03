import { ScheduleEvent, ScheduleChangeAlert } from '../types/schedule';

/**
 * Synthesizes an audible notification sound using the Web Audio API
 */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    // Pleasant dual chime (F5 then A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(698.46, now); // F5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn('Web Audio notification sound could not play:', err);
  }
}

/**
 * Requests browser permission for native push/desktop notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return 'denied';
  }
  return await Notification.requestPermission();
}

/**
 * Sends a native browser notification if granted
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  try {
    new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/icon.svg',
      ...options,
    });
  } catch (e) {
    console.error('Error firing browser notification:', e);
  }
}

/**
 * Detects diffs between two schedules (e.g. updated version vs old version)
 */
export function detectScheduleChanges(
  oldEvents: ScheduleEvent[],
  newEvents: ScheduleEvent[]
): ScheduleChangeAlert[] {
  const alerts: ScheduleChangeAlert[] = [];
  const oldMap = new Map<string, ScheduleEvent>();
  
  // Key by subject name + dayOfWeek + group for robust matching even if ID shifts
  const getEventKey = (e: ScheduleEvent) => `${e.courseName.toLowerCase()}_${e.dayOfWeek}_${e.group.toLowerCase()}`;
  
  oldEvents.forEach(e => oldMap.set(getEventKey(e), e));

  newEvents.forEach(fresh => {
    const key = getEventKey(fresh);
    const prev = oldMap.get(key);

    if (prev) {
      // Check room change
      if (prev.room.trim() !== fresh.room.trim()) {
        alerts.push({
          id: `room-change-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: `Zmiana sali: ${fresh.courseName}`,
          message: `Zajęcia ${fresh.courseName} przeniesiono z sali ${prev.room} do sali ${fresh.room}.`,
          courseName: fresh.courseName,
          oldValue: prev.room,
          newValue: fresh.room,
          type: 'room_change',
          timestamp: new Date().toISOString(),
          read: false,
          severity: 'warning'
        });
      }

      // Check time change
      if (prev.startTime !== fresh.startTime || prev.endTime !== fresh.endTime) {
        alerts.push({
          id: `time-change-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: `Zmiana godzin: ${fresh.courseName}`,
          message: `Zmieniono godziny zajęć z ${prev.startTime}-${prev.endTime} na ${fresh.startTime}-${fresh.endTime}.`,
          courseName: fresh.courseName,
          oldValue: `${prev.startTime}-${prev.endTime}`,
          newValue: `${fresh.startTime}-${fresh.endTime}`,
          type: 'time_change',
          timestamp: new Date().toISOString(),
          read: false,
          severity: 'warning'
        });
      }

      // Check instructor change
      if (prev.instructor.trim() !== fresh.instructor.trim()) {
        alerts.push({
          id: `instr-change-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: `Zastępstwo / nowy prowadzący: ${fresh.courseName}`,
          message: `Zamiast ${prev.instructor} zajęcia poprowadzi ${fresh.instructor}.`,
          courseName: fresh.courseName,
          oldValue: prev.instructor,
          newValue: fresh.instructor,
          type: 'instructor_change',
          timestamp: new Date().toISOString(),
          read: false,
          severity: 'info'
        });
      }
    }
  });

  return alerts;
}
