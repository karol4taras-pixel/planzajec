"""Backend tests for SGGW Meblarstwo (zaoczne) timetable viewer."""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://7f72ff08-e811-4491-9c30-83915a0904b8.preview.emergentagent.com").rstrip("/")

TIME_RE = re.compile(r"^\d{2}:\d{2}$")
DATE_RE = re.compile(r"\d{1,2}\.\d{1,2}\.\d{4}\s*r\.")


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Health ---
def test_health(client):
    r = client.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"


# --- /api/plan for each year ---
@pytest.mark.parametrize("rok,min_events", [(1, 10), (2, 10), (3, 8), (4, 10)])
def test_plan_per_year(client, rok, min_events):
    r = client.get(f"{BASE_URL}/api/plan", params={"rok": rok}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("success") is True, f"rok={rok} payload={data}"
    assert data.get("rok") == rok
    events = data.get("events") or []
    assert len(events) >= min_events, f"rok={rok} only {len(events)} events"
    for ev in events:
        assert TIME_RE.match(ev["startTime"]), ev
        assert TIME_RE.match(ev["endTime"]), ev
        assert ev["dayOfWeek"] in (5, 6, 7), ev
        assert ev["mode"] == "zaoczne"
    assert DATE_RE.search(data.get("lastUpdate", "")), f"lastUpdate={data.get('lastUpdate')}"


def test_plan_rok2_contains_known_classes(client):
    r = client.get(f"{BASE_URL}/api/plan", params={"rok": 2}, timeout=30)
    data = r.json()
    events = data["events"]
    # Friday Metrologia 09:00-10:00
    metro = [e for e in events if e["dayOfWeek"] == 5 and "Metrologia" in e["courseName"]]
    assert metro, "No Metrologia on Friday"
    assert any(e["startTime"] == "09:00" and e["endTime"] == "10:00" for e in metro), [
        (e["startTime"], e["endTime"]) for e in metro
    ]
    # Friday Mechanika techniczna I 12:00-14:00
    mech = [e for e in events if e["dayOfWeek"] == 5 and "Mechanika techniczna" in e["courseName"]]
    assert mech, "No Mechanika techniczna on Friday"
    assert any(e["startTime"] == "12:00" and e["endTime"] == "14:00" for e in mech), [
        (e["startTime"], e["endTime"]) for e in mech
    ]


# --- POST /api/sync-schedule ---
def test_sync_schedule(client):
    r = client.post(f"{BASE_URL}/api/sync-schedule", json={"rok": 2}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("success") is True
    assert isinstance(data.get("events"), list) and len(data["events"]) > 0
    assert "changed" in data and isinstance(data["changed"], bool)
    assert isinstance(data.get("message"), str) and len(data["message"]) > 0
    # Polish message
    assert ("aktualny" in data["message"]) or ("Wykryto" in data["message"])
    assert "Roku 2" in data["message"] or "Rok 2" in data["message"]
