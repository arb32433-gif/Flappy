import os
import sys
import http.server
import socketserver
import webbrowser
import threading
import time

DIRECTORY = "SRC"

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve from the SRC directory containing index.html, style.css, and game.js
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def open_browser(port):
    time.sleep(0.6)
    url = f"http://localhost:{port}"
    print(f"Opening browser at {url}...", flush=True)
    webbrowser.open(url)

def run_server():
    # Ensure the SRC directory exists before launching
    if not os.path.exists(DIRECTORY):
        print(f"Error: Directory '{DIRECTORY}' not found. Please run this script in the project root containing '{DIRECTORY}/'.", flush=True)
        sys.exit(1)

    socketserver.TCPServer.allow_reuse_address = True

    # Find an available port starting at 8001
    port = 8001
    server_started = False
    httpd = None

    while not server_started and port < 8100:
        try:
            httpd = socketserver.TCPServer(("", port), MyHandler)
            server_started = True
        except OSError:
            print(f"Port {port} is in use, trying next port...", flush=True)
            port += 1

    if not server_started:
        print("Error: Could not find any available ports between 8001 and 8100.", flush=True)
        sys.exit(1)

    try:
        print(f"Serving Flappy Bird at http://localhost:{port} from directory '{DIRECTORY}'", flush=True)
        print("Press Ctrl+C to stop the server.", flush=True)
        
        # Start browser in a background thread
        threading.Thread(target=open_browser, args=(port,), daemon=True).start()
        
        # Start server (blocks until interrupted)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server. Goodbye!", flush=True)
    finally:
        if httpd:
            httpd.server_close()

if __name__ == "__main__":
    # Change working directory to the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    run_server()
