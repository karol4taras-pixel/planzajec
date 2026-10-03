import type { IncomingMessage, ServerResponse } from 'http';

type VercelRequest = IncomingMessage & { body?: any; query?: any; method?: string };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  send: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
};

// Official SGGW timetable links for Meblarstwo Zaoczne
const SGGW_PDF_URLS: Record<number, string> = {
  1: 'https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MI_1_Z_30.09.pdf',
  2: 'https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MII_3_Z_30.09.pdf',
  3: 'https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MIII_3_Z_30.09.pdf',
  4: 'https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MIV_7_Z_30.09.pdf',
};

const SGGW_PORTAL_URL = 'https://wnlid.sggw.edu.pl/strefa-studenta/plan-zajec-i-programy-studiow/';

// Known deanery release date currently in the database
const KNOWN_OFFICIAL_RELEASE = '30.09.2026 r.';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS for Vercel deployments
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const rok = Number(req.body?.rok || req.query?.rok) || 2;
    const targetPdfUrl = SGGW_PDF_URLS[rok] || SGGW_PDF_URLS[2];

    let liveConnected = false;
    let remoteLastModified = '';
    let remoteETag = '';
    let remoteContentLength = '';
    let detectedPageDate = KNOWN_OFFICIAL_RELEASE;

    try {
      // 1. Check HEAD/GET headers of the official SGGW PDF
      const pdfHeadResponse = await fetch(targetPdfUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,*/*',
        },
        signal: AbortSignal.timeout(4000)
      });

      if (pdfHeadResponse.ok) {
        liveConnected = true;
        remoteLastModified = pdfHeadResponse.headers.get('last-modified') || '';
        remoteETag = pdfHeadResponse.headers.get('etag') || '';
        remoteContentLength = pdfHeadResponse.headers.get('content-length') || '';
      }
    } catch (e) {
      console.log('Direct HEAD check to SGGW PDF timed out or restricted');
    }

    try {
      // 2. Check the faculty portal page for any new date announcements
      const portalResponse = await fetch(SGGW_PORTAL_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(4000)
      });

      if (portalResponse.ok) {
        liveConnected = true;
        const html = await portalResponse.text();
        // Search for update date in text, e.g. "Aktualizacja: DD.MM.YYYY"
        const match = html.match(/aktualizacja[:\s]+(\d{1,2}\.\d{1,2}\.\d{4})/i);
        if (match && match[1]) {
          detectedPageDate = `${match[1]} r.`;
        }
      }
    } catch (e) {
      console.log('Portal check timed out');
    }

    // Determine if deanery changed anything
    // If the detected date on the faculty page is still 30.09.2026, then NO change has occurred!
    const isChanged = detectedPageDate !== KNOWN_OFFICIAL_RELEASE;

    const timeString = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    res.status(200).json({
      success: true,
      changed: isChanged,
      liveConnected,
      targetPdfUrl,
      portalUrl: SGGW_PORTAL_URL,
      lastOfficialUpdate: detectedPageDate,
      lastModifiedHeader: remoteLastModified,
      contentLength: remoteContentLength,
      checkTimestamp: timeString,
      message: isChanged
        ? `Wykryto nową wersję planu na serwerze SGGW WNLiD (z dnia ${detectedPageDate})!`
        : `Plan na serwerze SGGW WNLiD nie uległ zmianie (wersja z dnia ${detectedPageDate} jest aktualna).`
    });
  } catch (error: any) {
    console.error('Error in /api/sync-schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd podczas łączenia z serwerem SGGW: ' + (error?.message || 'Nieznany błąd')
    });
  }
}
