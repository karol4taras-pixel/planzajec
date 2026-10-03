"""Shared service logic for Vercel serverless functions (plan + sync).
Underscore-prefixed -> Vercel does NOT treat this as a route."""
import re
import time
from datetime import datetime, timezone

import requests

from _parser_core import parse_pdf_bytes, SGGW_PDF_URLS, SGGW_PORTAL_URL, turnus_for_rok

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"
ROK_PREFIX = {1: "MI_1_Z", 2: "MII_3_Z", 3: "MIII_5_Z", 4: "MIV_7_Z"}

_CACHE = {}
_TTL = 60 * 30


def discover_pdf_url(rok: int) -> str:
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


def sync_plan(rok: int) -> dict:
    prev = _CACHE.get(rok, (0, {}))[1].get("contentHash")
    payload = build_plan(rok, force=True)
    payload["changed"] = bool(prev) and prev != payload.get("contentHash")
    payload["message"] = (
        f"Wykryto nową wersję planu (Rok {rok}, aktualizacja {payload.get('lastUpdate') or 'n/d'})."
        if payload["changed"]
        else f"Plan dla Roku {rok} jest aktualny (wersja {payload.get('lastUpdate') or 'n/d'})."
    )
    return payload
