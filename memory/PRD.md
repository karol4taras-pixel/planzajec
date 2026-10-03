# PRD — Plan SGGW WNLiD Meblarstwo (zaoczne)

## Original problem statement (user, PL)
Przerobić projekt pod hosting na Vercel. Aplikacja ma dobrze sprawdzać plan zajęć ze strony
WNLiD SGGW, bo obecnie czasy zajęć są złe. Plan nie aktualizuje się po wciśnięciu „Odśwież",
nawet jeśli dziś była zmiana czasu. Dodatkowo:
- auto-aktualizacja planu codziennie ~6 rano (zostawić też przycisk Odśwież do testów),
- czerwona linia „teraz" ma się pokazywać TYLKO w aktualnym dniu (nie co weekend),
- dokładne wykrywanie godzin rozpoczęcia/zakończenia i okienek,
- jeśli się da, lepsze parsowanie pliku PDF.

## User choices
- Zakres: Meblarstwo zaoczne — wszystkie 4 lata.
- Parser: deterministyczny, BEZ AI (brak klucza Gemini).
- Hosting: Vercel (serverless /api).

## Architecture
- Frontend: Vite + React 19 + TS + Tailwind v4 (PWA). Dir: /app/frontend. Serves on :3000 (preview).
  Uses same-origin relative `/api/*` (works in preview ingress -> :8001 and on Vercel functions).
- Backend (preview): FastAPI /app/backend/server.py on :8001. Endpoints: /api/health, /api/plan,
  /api/sync-schedule (+ /api/refresh-plan). Reuses /app/backend/plan_parser.py.
- Parser: /app/backend/plan_parser.py (deterministic, pdfplumber). Downloads the live SGGW PDF,
  reconstructs the time-grid table from ruling lines, maps x->time via the hour header, crops each
  class cell and extracts course/type/room/instructor/group. Correct start/end + okienka.
- Vercel deliverable lives INSIDE /app/frontend:
  - api/plan.py, api/sync-schedule.py (Python serverless, BaseHTTPRequestHandler)
  - api/_service.py + api/_parser_core.py (shared; underscore => not routed)
  - api/requirements.txt (pdfplumber, numpy, requests)
  - vercel.json (vite build -> dist, Python functions, daily cron 06:00 UTC on /api/sync-schedule)
  NOTE: keep /app/backend/plan_parser.py and /app/frontend/api/_parser_core.py IN SYNC (copy).

## Live data sources (auto-discovered from portal, fallback hardcoded)
Portal: https://wnlid.sggw.edu.pl/strefa-studenta/plan-zajec-i-programy-studiow/
Rok1 MI_1_Z_*.pdf · Rok2 MII_3_Z_*.pdf · Rok3 MIII_5_Z_*.pdf · Rok4 MIV_7_Z_*.pdf

## Implemented (2026-10-03)
- Live deterministic PDF parsing of real timetables -> CORRECT class times (fixes wrong times).
- 15-MINUTE RESOLUTION: parser keeps the quarter-hour grid (prev bug: merged 15-min rulings),
  so starts/ends land on :00/:15/:30/:45, 15-min breaks between classes show as gaps, and
  classes that start 15 min earlier (08:15, 14:15, 15:15, 17:15...) are correct.
- "Odśwież" now re-downloads + re-parses the live PDF and REPLACES the shown schedule; detects
  version change via content hash + embedded "aktualizacja DD.MM.YYYY" date.
- App auto-fetches the freshest plan on load and on year change (localStorage cache fallback).
- Vercel daily cron 06:00 warms/refreshes all 4 years.
- Fixed: red "now" line shows only on the real current day AND only when the current week is displayed.
- Dynamic "Aktualizacja WNLiD" banner from the PDF.
- Converted project to Vercel (static Vite + Python serverless /api). Preview mirrors via FastAPI.

## Known limitations
- Rok 4 (and a few Rok 1) cells have heavy letter-spacing in the source PDF; some course names /
  instructor initials may render with minor spacing artifacts. TIMES are correct for all years.
- Academic year 2026/2027 zjazdy start Oct 2026; current weeks before that show "brak zjazdu"
  (by design — navigate to a zjazd / use day view).

## Backlog / Next
- P1: Improve Rok 4 name/instructor de-spacing (dictionary of SGGW courses & lecturers).
- P2: Persist last-known-good per year server-side (KV) to diff changes across cold starts.
- P2: Per-year cron entries (currently one cron refreshes all 4 via GET).
