"""FastAPI backend (preview) for the SGGW Meblarstwo (zaoczne) timetable app.

On Vercel the equivalent endpoints live in /api/*.py (serverless). Here we serve
the same logic so the app is fully testable in the preview environment.
"""
import re
import time
from datetime import datetime, timezone

import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from plan_parser import parse_pdf_bytes, SGGW_PDF_URLS, SGGW_PORTAL_URL, turnus_for_rok

app = FastAPI(title="Plan SGGW WNLiD - Meblarstwo (zaoczne)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
# Meblarstwo niestacjonarne file prefixes per year of study
ROK_PREFIX = {1: "MI_1_Z", 2: "MII_3_Z", 3: "MIII_5_Z", 4: "MIV_7_Z"}

# simple in-memory cache: rok -> (timestamp, payload)
_CACHE: dict = {}
_TTL = 60 * 30  # 30 minutes


def discover_pdf_url(rok: int) -> str:
    """Try to find the freshest PDF link on the faculty portal, fallback to default."""
    prefix = ROK_PREFIX.get(rok, ROK_PREFIX[2])
    try:
        html = requests.get(SGGW_PORTAL_URL, headers={"User-Agent": UA}, timeout=6).text
        links = re.findall(r'https://[^"\']+?/' + re.escape(prefix) + r'_[\d.]+\.pdf', html)
        if links:
            def keydate(u):
                m = re.search(prefix + r"_(\d{1,2})\.(\d{1,2})\.pdf", u)
                return (int(m.group(2)), int(m.group(1))) if m else (0, 0)
            return sorted(set(links), key=keydate)[-1]
    except Exception:
        pass
    return SGGW_PDF_URLS.get(rok, SGGW_PDF_URLS[2])


def build_plan(rok: int, force: bool = False) -> dict:
    now = time.time()
    if not force and rok in _CACHE and now - _CACHE[rok][0] < _TTL:
        return _CACHE[rok][1]

    url = discover_pdf_url(rok)
    live_connected = False
    events, meta = [], {}
    try:
        resp = requests.get(url, headers={"User-Agent": UA, "Accept": "application/pdf,*/*"}, timeout=12)
        if resp.ok and resp.content[:4] == b"%PDF":
            live_connected = True
            events, meta = parse_pdf_bytes(resp.content, rok)
    except Exception as e:
        meta = {"error": str(e)}

    payload = {
        "success": bool(events),
        "liveConnected": live_connected,
        "rok": rok,
        "turnus": meta.get("turnus", turnus_for_rok(rok)),
        "events": events,
        "lastUpdate": meta.get("lastUpdate", ""),
        "contentHash": meta.get("contentHash", ""),
        "sourceUrl": url,
        "portalUrl": SGGW_PORTAL_URL,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "checkTimestamp": datetime.now(timezone.utc).astimezone().strftime("%H:%M:%S"),
    }
    if events:
        _CACHE[rok] = (now, payload)
    return payload


@app.get("/api/health")
def health():
    return {"status": "ok", "faculty": "WNLiD SGGW - Meblarstwo (zaoczne)",
            "time": datetime.now(timezone.utc).isoformat()}


@app.get("/api/plan")
def get_plan(rok: int = 2, force: bool = False):
    rok = rok if rok in (1, 2, 3, 4) else 2
    return build_plan(rok, force=force)


@app.post("/api/refresh-plan")
@app.post("/api/sync-schedule")
def refresh(body: dict = None):
    rok = 2
    if body and isinstance(body, dict):
        try:
            rok = int(body.get("rok", 2))
        except Exception:
            rok = 2
    rok = rok if rok in (1, 2, 3, 4) else 2
    prev = _CACHE.get(rok, (0, {}))[1].get("contentHash")
    payload = build_plan(rok, force=True)
    payload["changed"] = bool(prev) and prev != payload.get("contentHash")
    payload["message"] = (
        f"Wykryto nową wersję planu (Rok {rok}, aktualizacja {payload.get('lastUpdate') or 'n/d'})."
        if payload["changed"]
        else f"Plan dla Roku {rok} jest aktualny (wersja {payload.get('lastUpdate') or 'n/d'})."
    )
    return payload
