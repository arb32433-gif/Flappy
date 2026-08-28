import os
import sys
import json
import http.server
import socketserver
import webbrowser
import threading
import time
from urllib.parse import urlparse, parse_qs
import db

DIRECTORY = "SRC"


class GameHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.handle_api_get()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self.handle_api_post()
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            self.handle_api_delete()
        else:
            self.send_error(404)

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def handle_api_get(self):
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            query = parse_qs(parsed_url.query)
            params = {k: v[0] for k, v in query.items()}

            if path == "/api/scores":
                diff = params.get("difficulty")
                scores = db.get_recent_scores(limit=50, difficulty=diff)
                high_score = db.get_high_score(difficulty=diff) if diff else db.get_high_score("medium")
                self.send_json({"scores": scores, "high_score": high_score})

            elif path == "/api/scores/stats":
                diff = params.get("difficulty")
                stats = db.get_stats(difficulty=diff)
                self.send_json(stats)

            else:
                self.send_json({"error": "Not found"}, 404)
        except Exception as e:
            print(f"[API GET Error] {e}")
            self.send_json({"error": str(e)}, 500)

    def handle_api_post(self):
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            
            if path == "/api/scores":
                body = self.read_body()
                score = body.get("score")
                difficulty = body.get("difficulty", "medium")
                if score is None:
                    self.send_json({"error": "score is required"}, 400)
                    return
                is_high = db.add_score(int(score), difficulty)
                high = db.get_high_score(difficulty=difficulty)
                self.send_json({"ok": True, "is_high": bool(is_high), "high_score": high})
            else:
                self.send_json({"error": "Not found"}, 404)
        except Exception as e:
            print(f"[API POST Error] {e}")
            self.send_json({"error": str(e)}, 500)

    def handle_api_delete(self):
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            
            if path.startswith("/api/scores/"):
                try:
                    score_id = int(path.split("/")[-1])
                    db.delete_score(score_id)
                    self.send_json({"ok": True})
                except (ValueError, IndexError):
                    self.send_json({"error": "Invalid id"}, 400)
            else:
                self.send_json({"error": "Not found"}, 404)
        except Exception as e:
            print(f"[API DELETE Error] {e}")
            self.send_json({"error": str(e)}, 500)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        if "/api/" not in str(args[0]):
            super().log_message(format, *args)



def open_browser(port):
    time.sleep(0.6)
    url = f"http://localhost:{port}"
    print(f"Opening browser at {url}...", flush=True)
    webbrowser.open(url)


def run_server():
    if not os.path.exists(DIRECTORY):
        print(f"Error: Directory '{DIRECTORY}' not found.", flush=True)
        sys.exit(1)

    db.init_db()
    print("Database initialized.", flush=True)

    socketserver.TCPServer.allow_reuse_address = True

    port = 8001
    server_started = False
    httpd = None

    while not server_started and port < 8100:
        try:
            httpd = socketserver.TCPServer(("", port), GameHandler)
            server_started = True
        except OSError:
            print(f"Port {port} is in use, trying next port...", flush=True)
            port += 1

    if not server_started:
        print("Error: Could not find any available ports between 8001 and 8100.", flush=True)
        sys.exit(1)

    try:
        print(f"Serving Flappy Bird at http://localhost:{port} from directory '{DIRECTORY}'", flush=True)
        print("API available at /api/scores", flush=True)
        print("Press Ctrl+C to stop the server.", flush=True)

        threading.Thread(target=open_browser, args=(port,), daemon=True).start()
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server. Goodbye!", flush=True)
    finally:
        if httpd:
            httpd.server_close()


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    run_server()
