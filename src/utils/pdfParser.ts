import * as pdfjsLib from 'pdfjs-dist';
import { ScheduleEvent, ClassType, StudyMode, TurnusType } from '../types/schedule';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Use cloudflare CDN worker matching version or fallback
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

/**
 * Extracts raw text from an ArrayBuffer of a PDF file
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY: number | null = null;
      let pageText = '';

      for (const item of textContent.items) {
        if ('str' in item) {
          // Add newline if vertical position shifted significantly
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }
      }
      fullText += `--- STRONA ${pageNum} ---\n` + pageText + '\n\n';
    }

    return fullText;
  } catch (err) {
    console.error('Błąd podczas odczytu pliku PDF przez pdfjs:', err);
    throw new Error('Nie udało się odczytać tekstu z pliku PDF. Upewnij się, że plik nie jest uszkodzony lub zabezpieczony hasłem.');
  }
}

/**
 * Determines class type based on string keywords
 */
function detectClassType(text: string): ClassType {
  const lower = text.toLowerCase();
  if (lower.includes('wykład') || lower.includes('wyk.') || /\bw\b/i.test(lower)) return 'wykład';
  if (lower.includes('laboratorium') || lower.includes('lab') || /\bl\b/i.test(lower)) return 'laboratorium';
  if (lower.includes('projekt') || lower.includes('proj') || /\bp\b/i.test(lower)) return 'projekt';
  if (lower.includes('ćwiczenia') || lower.includes('ćwicz') || lower.includes('ćw')) return 'ćwiczenia';
  if (lower.includes('seminarium') || lower.includes('sem')) return 'seminarium';
  if (lower.includes('konsultacje') || lower.includes('kons')) return 'konsultacje';
  if (lower.includes('egzamin') || lower.includes('kolokwium') || lower.includes('zaliczenie')) return 'egzamin';
  return 'ćwiczenia';
}

/**
 * Maps day of week names to 1-7 (1=Monday ... 7=Sunday)
 */
const DAY_MAP: Record<string, number> = {
  poniedziałek: 1,
  poniedzialek: 1,
  pn: 1,
  wtorek: 2,
  wt: 2,
  środa: 3,
  sroda: 3,
  śr: 3,
  sr: 3,
  czwartek: 4,
  czw: 4,
  cz: 4,
  piątek: 5,
  piatek: 5,
  pt: 5,
  sobota: 6,
  sob: 6,
  sb: 6,
  niedziela: 7,
  ndz: 7,
  nd: 7
};

/**
 * High-performance heuristic client-side parser for SGGW WTD schedule formats
 */
export function parseScheduleTextLocally(
  rawText: string,
  defaultMode: StudyMode = 'stacjonarne',
  defaultTurnus: TurnusType = 'Nie dotyczy'
): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  let currentDay = 1;
  let currentTurnus: TurnusType = defaultTurnus;
  let currentMode: StudyMode = defaultMode;

  // Regex patterns
  const timeRangeRegex = /(\b[0-2]?[0-9][:.][0-5][0-9])\s*[-–—]\s*([0-2]?[0-9][:.][0-5][0-9]\b)/;
  const roomRegex = /(Bud\.\s*\d+|Budynek\s*\d+|s\.\s*\d+\/?\d*|Aula\s+[IVX0-9]+|Lab\.[^\n,;]+|Hala\s+Maszyn[^\n,;]*)/i;
  const instructorRegex = /(prof\.\s*(?:dr\s*hab\.)?|dr\s*hab\.(?:\s*inż\.)?|dr\s*inż\.|dr\b|mgr\s*inż\.|mgr\b)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Turnus markers
    if (/turnus\s*a\b/i.test(line)) {
      currentTurnus = 'Turnus A';
      currentMode = 'zaoczne';
    } else if (/turnus\s*b\b/i.test(line)) {
      currentTurnus = 'Turnus B';
      currentMode = 'zaoczne';
    }

    // Detect Day markers
    for (const [dayName, dayNum] of Object.entries(DAY_MAP)) {
      const dayRegex = new RegExp(`^${dayName}\\b`, 'i');
      if (dayRegex.test(line)) {
        currentDay = dayNum;
        if (dayNum >= 6) {
          currentMode = 'zaoczne';
          if (currentTurnus === 'Nie dotyczy') currentTurnus = 'Turnus A';
        }
        break;
      }
    }

    // Match time ranges
    const timeMatch = line.match(timeRangeRegex);
    if (timeMatch) {
      const rawStart = timeMatch[1].replace('.', ':');
      const rawEnd = timeMatch[2].replace('.', ':');
      
      const startTime = rawStart.padStart(5, '0');
      const endTime = rawEnd.padStart(5, '0');

      // Extract subject, room, instructor from line and adjacent lines
      let combinedBlock = line;
      if (i > 0 && !lines[i - 1].match(timeRangeRegex)) {
        combinedBlock = lines[i - 1] + ' ' + combinedBlock;
      }
      if (i + 1 < lines.length && !lines[i + 1].match(timeRangeRegex)) {
        combinedBlock += ' ' + lines[i + 1];
      }

      // Find room
      const roomMatch = combinedBlock.match(roomRegex);
      const room = roomMatch ? roomMatch[0].trim() : 'Bud. 34 (WTD)';

      // Find instructor
      const instrMatch = combinedBlock.match(instructorRegex);
      const instructor = instrMatch ? `${instrMatch[1]} ${instrMatch[2]}`.trim() : 'Prowadzący Katedry WTD';

      // Clean subject name
      let subject = combinedBlock
        .replace(timeRangeRegex, '')
        .replace(roomRegex, '')
        .replace(instructorRegex, '')
        .replace(/wykład|laboratorium|ćwiczenia|projekt|seminarium/gi, '')
        .replace(/gr\.\s*\w+|grupa\s*\w+|L\d+|P\d+|Ć\d+/gi, '')
        .replace(/[–—\-\|\(\)\[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (subject.length < 3) {
        subject = 'Zajęcia specjalistyczne WTD';
      }

      // Group detection
      let group = 'Cały rok';
      const grMatch = combinedBlock.match(/\b(L[1-9]|P[1-9]|Ć[1-9]|Grupa\s*[1-9]|Gr\.\s*[1-9])\b/i);
      if (grMatch) {
        group = grMatch[0].toUpperCase();
      }

      const event: ScheduleEvent = {
        id: `parsed-${Date.now()}-${events.length}`,
        courseName: subject.substring(0, 75),
        type: detectClassType(combinedBlock),
        dayOfWeek: currentDay,
        startTime,
        endTime,
        room,
        building: 'Budynek 34 (WTD SGGW)',
        instructor,
        group,
        mode: currentMode,
        turnus: currentMode === 'zaoczne' ? (currentTurnus !== 'Nie dotyczy' ? currentTurnus : 'Turnus A') : 'Nie dotyczy',
        notes: `Automatycznie wyodrębniono z pliku PDF WTD SGGW.`
      };

      events.push(event);
    }
  }

  return events;
}

/**
 * Sends PDF text to server Gemini AI route for intelligent table/layout parsing
 */
export async function parseScheduleWithAI(
  rawText: string,
  modePreference: StudyMode = 'stacjonarne',
  turnusPreference: TurnusType = 'Turnus A'
): Promise<ScheduleEvent[]> {
  try {
    const res = await fetch('/api/parse-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: rawText,
        modePreference,
        turnusPreference
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Błąd serwera: ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data.events) && data.events.length > 0) {
      return data.events;
    }
  } catch (err) {
    console.warn('AI parser endpoint unavailable or errored, falling back to local regex parser:', err);
  }

  // Graceful fallback to local regex parser
  return parseScheduleTextLocally(rawText, modePreference, turnusPreference);
}
