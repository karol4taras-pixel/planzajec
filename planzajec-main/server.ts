import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize Gemini SDK with User-Agent as required by gemini-api skill
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Endpoint to parse schedule text extracted from PDF or pasted by user
 */
app.post('/api/parse-schedule', async (req, res) => {
  try {
    const { text, modePreference, turnusPreference } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Brak tekstu planu do sparsowania' });
    }

    if (!process.env.GEMINI_API_KEY) {
      // In case key is not yet set in environment, indicate fallback to client parser
      return res.status(503).json({ 
        error: 'Klucz GEMINI_API_KEY nie jest skonfigurowany na serwerze. Użyj parsera lokalnego.',
        fallback: true 
      });
    }

    const systemPrompt = `Jesteś ekspertem ds. analizy i parsowania planów zajęć akademickich na Wydziale Technologii Drewna (Wydział Nauk Leśnych i Technologii Drewna - WNLiD) SGGW w Warszawie (Szkoła Główna Gospodarstwa Wiejskiego).
Twoim zadaniem jest wyodrębnienie wszystkich zajęć dydaktycznych z podanego tekstu (pochodzącego z pliku PDF lub tabeli ze strony wnlid.sggw.edu.pl).

Szczegóły struktury SGGW WTD:
- Przedmioty: np. Tworzywa Drzewne, Hydrotermiczna i Chemiczna Obróbka Drewna, Meblarstwo, Obróbka Skrawaniem, Kleje i Klejenie, Konstrukcje Meblowe, CAD/CAM.
- Formy zajęć (type): 'wykład', 'ćwiczenia', 'laboratorium', 'projekt', 'seminarium', 'konsultacje', 'egzamin'.
- Sale (room): zazwyczaj 'Bud. 34 s. 1/12', 'Bud. 34 s. 1/13', 'Bud. 34 s. 2/45', 'Aula II', 'Lab. Pras 0/14', 'Hala Maszyn', 's. 0/28', itp.
- Dni tygodnia (dayOfWeek): 1 = Poniedziałek, 2 = Wtorek, 3 = Środa, 4 = Czwartek, 5 = Piątek, 6 = Sobota, 7 = Niedziela.
- Tryb (mode): 'stacjonarne' (zazwyczaj pon-pt) lub 'zaoczne' (piątek-niedziela).
- Turnusy dla zaocznych (turnus): 'Turnus A', 'Turnus B' lub 'Wszystkie' (jeśli nie dotyczy, 'Nie dotyczy').
- Format godzin: startTime i endTime w formacie "HH:MM", np. "08:15", "10:00".

Zwróć sparsowane zajęcia w czystym formacie JSON zgodnie ze schematem.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Przeanalizuj poniższy tekst planu zajęć WTD SGGW i wyodrębnij wszystkie zajęcia dydaktyczne.
Preferowany tryb: ${modePreference || 'stacjonarne'}
Domyślny turnus: ${turnusPreference || 'Turnus A'}

Tekst planu:
${text.substring(0, 15000)}`
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  courseName: { type: Type.STRING, description: 'Nazwa przedmiotu' },
                  courseCode: { type: Type.STRING, description: 'Kod przedmiotu jeśli dostępny' },
                  type: { 
                    type: Type.STRING, 
                    description: 'wykład | ćwiczenia | laboratorium | projekt | seminarium | konsultacje | egzamin' 
                  },
                  dayOfWeek: { type: Type.INTEGER, description: '1=Poniedziałek, 2=Wtorek, ..., 7=Niedziela' },
                  startTime: { type: Type.STRING, description: 'HH:MM, np. 08:15' },
                  endTime: { type: Type.STRING, description: 'HH:MM, np. 10:00' },
                  room: { type: Type.STRING, description: 'Sala, np. Bud. 34 s. 1/12' },
                  building: { type: Type.STRING, description: 'Budynek, np. Budynek 34 (WTD)' },
                  instructor: { type: Type.STRING, description: 'Prowadzący z tytułem naukowym' },
                  group: { type: Type.STRING, description: 'Grupa, np. Cały rok, L1, P1, Ć1' },
                  mode: { type: Type.STRING, description: 'stacjonarne | zaoczne' },
                  turnus: { type: Type.STRING, description: 'Turnus A | Turnus B | Wszystkie | Nie dotyczy' },
                  notes: { type: Type.STRING, description: 'Dodatkowe uwagi' }
                },
                required: ['courseName', 'type', 'dayOfWeek', 'startTime', 'endTime', 'room', 'instructor', 'mode']
              }
            }
          },
          required: ['events']
        }
      }
    });

    const parsedJson = JSON.parse(response.text || '{"events": []}');
    // Assign stable IDs
    const eventsWithIds = (parsedJson.events || []).map((e: any, idx: number) => ({
      ...e,
      id: `ai-parsed-${Date.now()}-${idx}`
    }));

    res.json({ events: eventsWithIds });
  } catch (error: any) {
    console.error('Error during AI schedule parsing:', error);
    res.status(500).json({ 
      error: 'Błąd podczas przetwarzania planu przez AI: ' + (error?.message || 'Nieznany błąd'),
      fallback: true
    });
  }
});

/**
 * Endpoint to automatically verify and refresh schedule from wnlid.sggw.edu.pl
 */
const SGGW_PDF_URLS: Record<number, string> = {
  1: 'https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MI_1_Z_30.09.pdf',
  2: 'https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MII_3_Z_30.09.pdf',
  3: 'https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MIII_3_Z_30.09.pdf',
  4: 'https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MIV_7_Z_30.09.pdf',
};
const KNOWN_OFFICIAL_RELEASE = '30.09.2026 r.';

async function checkSggwScheduleStatus(rok: number = 2) {
  const targetPdfUrl = SGGW_PDF_URLS[rok] || SGGW_PDF_URLS[2];
  const portalUrl = 'https://wnlid.sggw.edu.pl/strefa-studenta/plan-zajec-i-programy-studiow/';

  let liveConnected = false;
  let remoteLastModified = '';
  let remoteETag = '';
  let remoteContentLength = '';
  let detectedPageDate = KNOWN_OFFICIAL_RELEASE;

  try {
    const pdfHeadResponse = await fetch(targetPdfUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      },
      signal: AbortSignal.timeout(3500)
    });

    if (pdfHeadResponse.ok) {
      liveConnected = true;
      remoteLastModified = pdfHeadResponse.headers.get('last-modified') || '';
      remoteETag = pdfHeadResponse.headers.get('etag') || '';
      remoteContentLength = pdfHeadResponse.headers.get('content-length') || '';
    }
  } catch (e) {
    console.log('Direct HEAD check to SGGW PDF timed out');
  }

  try {
    const portalResponse = await fetch(portalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(3500)
    });

    if (portalResponse.ok) {
      liveConnected = true;
      const html = await portalResponse.text();
      const match = html.match(/aktualizacja[:\s]+(\d{1,2}\.\d{1,2}\.\d{4})/i);
      if (match && match[1]) {
        detectedPageDate = `${match[1]} r.`;
      }
    }
  } catch (e) {
    console.log('Portal check timed out');
  }

  const isChanged = detectedPageDate !== KNOWN_OFFICIAL_RELEASE;
  const timeString = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    success: true,
    changed: isChanged,
    liveConnected,
    targetPdfUrl,
    portalUrl,
    lastOfficialUpdate: detectedPageDate,
    lastModifiedHeader: remoteLastModified,
    checkTimestamp: timeString,
    message: isChanged
      ? `Wykryto nową wersję planu na serwerze SGGW WNLiD (z dnia ${detectedPageDate})!`
      : `Plan na serwerze SGGW WNLiD nie uległ zmianie (wersja z dnia ${detectedPageDate} jest aktualna).`
  };
}

app.post(['/api/refresh-sggw-plan', '/api/sync-schedule'], async (req, res) => {
  try {
    const rok = Number(req.body?.rok) || 2;
    const result = await checkSggwScheduleStatus(rok);
    res.json(result);
  } catch (error: any) {
    console.error('Error in refresh-sggw-plan:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Nie udało się połączyć ze stroną SGGW: ' + (error?.message || 'Błąd sieci') 
    });
  }
});


/**
 * Health and status endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    faculty: 'Wydział Technologii Drewna SGGW (WNLiD)',
    aiAvailable: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString()
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Plan SGGW Drewno Server running on port ${PORT}`);
  });
}

startServer();
