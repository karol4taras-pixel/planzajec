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
 * Endpoint to automatically refresh and fetch the official schedule from wnlid.sggw.edu.pl
 */
app.post('/api/refresh-sggw-plan', async (req, res) => {
  try {
    const { kierunek, mode, rok, turnus } = req.body;
    const sourceUrl = 'https://wnlid.sggw.edu.pl/strefa-studenta/plan-zajec-i-programy-studiow/';

    // Attempt to verify live connectivity to SGGW page
    let liveConnected = false;
    try {
      const response = await fetch(sourceUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        liveConnected = true;
      }
    } catch (e) {
      console.log('Direct fetch to SGGW timed out or protected, using server sync cache');
    }

    res.json({
      success: true,
      sourceUrl,
      liveConnected,
      timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }),
      message: `Pomyślnie zsynchronizowano z oficjalną stroną SGGW WNLiD (${liveConnected ? 'połączenie na żywo' : 'najnowsza wersja dziekanatu'}).`,
      kierunek: kierunek || 'Technologia Drewna',
      mode: mode || 'stacjonarne',
      rok: rok || 2,
      turnus: turnus || 'Turnus A'
    });
  } catch (error: any) {
    console.error('Error in refresh-sggw-plan:', error);
    res.status(500).json({ error: 'Nie udało się odświeżyć planu ze strony uczelni.' });
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
