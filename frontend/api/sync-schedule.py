import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from _service import sync_plan


class handler(BaseHTTPRequestHandler):
    def _send(self, code, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _rok_from_body(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length:
                data = json.loads(self.rfile.read(length) or b"{}")
                return int(data.get("rok", 2))
        except Exception:
            pass
        return None

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        rok = self._rok_from_body() or 2
        rok = rok if rok in (1, 2, 3, 4) else 2
        try:
            self._send(200, sync_plan(rok))
        except Exception as e:
            self._send(500, {"success": False, "error": str(e)})

    def do_GET(self):
        # Used by the Vercel daily cron (no body). Refresh all 4 years.
        qs = parse_qs(urlparse(self.path).query)
        rok_q = qs.get("rok", [None])[0]
        try:
            if rok_q:
                rok = int(rok_q)
                rok = rok if rok in (1, 2, 3, 4) else 2
                self._send(200, sync_plan(rok))
                return
            results = {str(r): sync_plan(r).get("success") for r in (1, 2, 3, 4)}
            self._send(200, {"success": True, "cron": True, "results": results})
        except Exception as e:
            self._send(500, {"success": False, "error": str(e)})
