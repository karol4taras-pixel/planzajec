"""
Deterministic parser for SGGW WNLiD Meblarstwo (zaoczne) timetable PDFs.

The PDF is a time-grid table:
  - columns = hours 8:00..20:00 (header row with labels "800".."2000")
  - rows    = days (Piątek / Sobota / Niedziela), each possibly split into
              group sub-rows (ćw.gr.1 / ćw.gr.2)
  - a class is a (merged) cell. Its horizontal span -> start/end time,
    its vertical band -> day.

We detect class cells from the PDF ruling lines (vertical/horizontal edges),
map x-coordinates to time using the hour header, crop each cell and extract
clean text, then split that text into course / type / room / instructor / group.
"""
from __future__ import annotations
import io
import re
import hashlib
from datetime import datetime, timezone

import numpy as np
import pdfplumber

# Official current timetable PDFs - Meblarstwo niestacjonarne (zaoczne)
# rok -> url. These are auto-discovered/overridable; see fetch_pdf_url().
SGGW_PDF_URLS = {
    1: "https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MI_1_Z_02.10.pdf",
    2: "https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MII_3_Z_02.10.pdf",
    3: "https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MIII_5_Z_02.10.pdf",
    4: "https://wnlid.sggw.edu.pl/wp-content/uploads/sites/12/2026/10/MIV_7_Z_02.10.pdf",
}
SGGW_PORTAL_URL = "https://wnlid.sggw.edu.pl/strefa-studenta/plan-zajec-i-programy-studiow/"

DAY_MAP = {
    "pon": ("Poniedziałek", 1), "wt": ("Wtorek", 2), "śr": ("Środa", 3),
    "czw": ("Czwartek", 4), "pt": ("Piątek", 5), "sob": ("Sobota", 6),
    "nie": ("Niedziela", 7),
}

ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV"}


def turnus_for_rok(rok: int) -> str:
    # Rok I & III -> Turnus A ; Rok II & IV -> Turnus B
    return "Turnus A" if rok % 2 == 1 else "Turnus B"


def _clusters(vals, tol):
    vals = sorted(vals)
    out = []
    for v in vals:
        if out and v - out[-1][-1] <= tol:
            out[-1].append(v)
        else:
            out.append([v])
    return [sum(c) / len(c) for c in out]


def _clean(txt: str) -> str:
    txt = re.sub(r"\s+", " ", (txt or "")).strip()
    # collapse letter-spaced runs: 3+ single chars separated by spaces -> join
    txt = re.sub(r"(?:\b\w\b ){2,}\b\w\b", lambda m: m.group(0).replace(" ", ""), txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    # tidy spacing around dots used in rooms / initials
    txt = txt.replace("s .", "s.").replace("s..", "s.")
    txt = re.sub(r"\ss\.\s+", " s.", txt)
    return txt


def _normalize_name(name: str) -> str:
    fixes = [
        (r"\bTermody\s*namika\b", "Termodynamika"),
        (r"\bw\s*mebl\s*arstwie\b", "w meblarstwie"),
        (r"\bmebl\s*arstwie\b", "meblarstwie"),
        (r"\bwłasnosci\b", "własności"),
        (r"\bnarzedzi\b", "narzędzi"),
        (r"\bimetody\b", "i metody"),
        (r"\bimetodyochronyw?\b", "i metody ochrony"),
        (r"\bochronyw\b", "ochrony"),
        (r"\bmate\s*raiłów\b", "materiałów"),
        (r"\bmateraiłów\b", "materiałów"),
        (r"\bin\s*ż\s*ynierskie\b", "inżynierskie"),
        (r"\bwmeblarstwie\b", "w meblarstwie"),
    ]
    for pat, rep in fixes:
        name = re.sub(pat, rep, name, flags=re.IGNORECASE)
    # join a leftover lowercase continuation after a capitalized word fragment glued by cleanup
    name = re.sub(r"\s{2,}", " ", name).strip()
    return name


def _split_cell(text: str, rok: int, dow: int):
    """Split raw cell text into structured class fields (best-effort)."""
    raw = text
    notes = []
    # pull parenthetical notes
    for m in re.findall(r"\(([^)]*)\)", text):
        notes.append(m.strip())
    text_wo_paren = re.sub(r"\([^)]*\)", " ", text)

    # type
    ctype = "wykład" if re.search(r"\bw\.", text) else "ćwiczenia"
    if re.search(r"semin", text, re.I):
        ctype = "seminarium"
    if re.search(r"laborator|lab\.", text, re.I):
        ctype = "laboratorium"
    if re.search(r"projekt", text, re.I):
        ctype = "projekt"

    # group (MEB I/II/III/IV with optional ćw.gr.X)
    grp = ""
    gm = re.search(r"MEB\s+[IVX]+(?:\s*ćw\.?gr\.?\s*[\d+]+)?", text)
    if gm:
        grp = re.sub(r"\s+", " ", gm.group(0)).strip()
    else:
        grp = f"MEB {ROMAN.get(rok, '')}".strip()

    # room: s.XXX, SPNJO, Hala...
    rooms = re.findall(r"s\.\s?[\w\-/]+|Hala[\w\-/]*|SPNJO", text)
    room = rooms[0].replace(" ", "") if rooms else ""

    # instructor: Initial.Surname (optionally paired with slash)
    instr = ""
    im = re.search(r"[A-ZŁŚŻ]\.[A-ZŁŚŻ][\wąćęłńóśźż]+(?:/\s?[A-ZŁŚŻ]\.[A-ZŁŚŻ][\wąćęłńóśźż]+)?", text)
    if im:
        instr = im.group(0).strip()

    # course name = remove type marker, group, rooms, instructor, notes
    name = text_wo_paren
    name = re.sub(r"\bw\.\s*", " ", name)
    if grp:
        name = name.replace(grp, " ")
    name = re.sub(r"MEB\s+[IVX]+(?:\s*ćw\.?gr\.?\s*[\d+]+)?", " ", name)
    for r in rooms:
        name = name.replace(r, " ")
    if instr:
        name = name.replace(instr, " ")
    name = re.sub(r"ćw\.?gr\.?\s*[\d+]+", " ", name)
    name = re.sub(r"\s+", " ", name).strip(" .-·,")
    name = re.sub(r"\s+", " ", name).strip()
    if not name:
        name = raw[:40]
    name = _normalize_name(name)

    return {
        "courseName": name,
        "type": ctype,
        "room": room or "—",
        "instructor": instr or "—",
        "group": grp,
        "notes": "; ".join([n for n in notes if n]) or "",
    }


def parse_pdf_bytes(pdf_bytes: bytes, rok: int):
    """Return (events, meta) parsed from the given PDF bytes."""
    events = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        p = pdf.pages[0]
        words = p.extract_words()

        # --- time scale from the hour header ("800".."2000") ---
        hdr = sorted(
            [w for w in words if w["text"].strip().isdigit() and len(w["text"].strip()) >= 3],
            key=lambda w: w["x0"],
        )
        if len(hdr) < 3:
            return [], {"error": "no-hour-header"}
        a, b = np.polyfit(
            [(w["x0"] + w["x1"]) / 2 for w in hdr],
            [int(w["text"]) // 100 for w in hdr],
            1,
        )

        def to_time(x):
            q = round((a * x + b) * 60 / 15) * 15
            return f"{int(q // 60):02d}:{int(q % 60):02d}"

        # --- update date + turnus from text ---
        full_text = p.extract_text() or ""
        mdate = re.search(r"aktualizacja[:\s]+(\d{1,2}\.\d{1,2}\.\d{4})", full_text, re.I)
        last_update = f"{mdate.group(1)} r." if mdate else ""
        mt = re.search(r"Turnus\s+([AB])", full_text)
        turnus = f"Turnus {mt.group(1)}" if mt else turnus_for_rok(rok)

        # --- horizontal ruling lines (with x-span) and day bands ---
        hedges = [(min(e["x0"], e["x1"]), max(e["x0"], e["x1"]), e["top"]) for e in p.horizontal_edges]
        hy = sorted(_clusters([e[2] for e in hedges], 4))

        labels = []
        for w in words:
            k = w["text"].strip().lower().rstrip(".")[:3]
            if w["x0"] < 82 and k in DAY_MAP:
                name, dow = DAY_MAP[k]
                labels.append(((w["top"] + w["bottom"]) / 2, name, dow))
        labels.sort()

        counter = 0
        for i, (cy, day_name, dow) in enumerate(labels):
            tops = [h for h in hy if h < cy - 2]
            if not tops:
                continue
            top = max(tops)
            nextcy = labels[i + 1][0] if i + 1 < len(labels) else 1e9
            bots = [h for h in hy if cy + 2 < h < nextcy]
            if bots:
                bot = max(bots)
            else:
                rest = [h for h in hy if h > cy + 2]
                bot = min(rest) if rest else p.height

            interior = [h for h in hy if top + 3 < h < bot - 3]
            ve = [e for e in p.vertical_edges if e["top"] <= top + 3 and e["bottom"] >= bot - 3]
            borders = [x for x in _clusters([e["x0"] for e in ve], 14) if 95 < x < 755]
            if len(borders) < 2:
                continue

            for L, R in zip(borders, borders[1:]):
                if R - L < 22:
                    continue
                # horizontal split lines that actually cross this time column
                sp = [h for h in interior
                      if any(min(e0, e1) <= R - 3 and max(e0, e1) >= L + 3 and abs(et - h) < 4
                             for (e0, e1, et) in hedges)]
                rows = sorted([top] + sp + [bot])

                fragments = []  # (st, sb, text)
                for st, sb in zip(rows, rows[1:]):
                    if sb - st < 14:
                        continue
                    crop = p.within_bbox((L + 1, st + 1, R - 1, sb - 1))
                    txt = _clean(crop.extract_text(x_tolerance=2, y_tolerance=2.5) or "")
                    if len(txt) >= 3:
                        fragments.append(txt)

                if not fragments:
                    continue

                # Decide: separate group cells vs one vertically-merged (wykład)
                gr_tokens = set()
                for f in fragments:
                    for g in re.findall(r"ćw\.?gr\.?\s*([\d+]+)", f):
                        gr_tokens.add(g)
                if len(gr_tokens) >= 2:
                    cell_texts = fragments            # genuinely separate classes
                else:
                    cell_texts = [" ".join(fragments)]  # merged -> single class

                for ct in cell_texts:
                    info = _split_cell(ct, rok, dow)
                    counter += 1
                    events.append({
                        "id": f"sggw-r{rok}-{dow}-{counter}",
                        "courseName": info["courseName"],
                        "type": info["type"],
                        "dayOfWeek": dow,
                        "startTime": to_time(L),
                        "endTime": to_time(R),
                        "room": info["room"],
                        "building": "Budynek WTD (SGGW)",
                        "instructor": info["instructor"],
                        "group": info["group"],
                        "mode": "zaoczne",
                        "turnus": turnus,
                        "rok": rok,
                        "notes": info["notes"],
                        "rawText": ct,
                    })

    meta = {
        "lastUpdate": last_update,
        "turnus": turnus,
        "contentHash": hashlib.sha256(pdf_bytes).hexdigest()[:16],
        "count": len(events),
    }
    return events, meta
