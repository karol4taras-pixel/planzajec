import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from _service import build_plan


class handler(BaseHTTPRequestHandler):
    def _send(self, code, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "s-maxage=1800, stale-while-revalidate=86400")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        try:
            rok = int(qs.get("rok", ["2"])[0])
        except Exception:
            rok = 2
        rok = rok if rok in (1, 2, 3, 4) else 2
        force = qs.get("force", ["false"])[0] == "true"
        try:
            self._send(200, build_plan(rok, force=force))
        except Exception as e:
            self._send(500, {"success": False, "error": str(e)})
