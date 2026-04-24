import eventlet
eventlet.monkey_patch()

import os
from pathlib import Path

print("BOOT 1: patched + stdlib imports ok", flush=True)

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
    print("BOOT 1b: dotenv loaded", flush=True)
except Exception as e:
    print(f"BOOT 1b: dotenv not loaded ({e})", flush=True)

from flask import Flask
from flask_cors import CORS

print("BOOT 2: flask imported", flush=True)

# Isolate failing imports with precise logging
try:
    from socketio_server import socketio
    print("BOOT 2.1: socketio_server imported", flush=True)

    from routes.auth import auth_bp
    print("BOOT 2.2: routes.auth imported", flush=True)

    from routes.volunteers import volunteers_bp
    print("BOOT 2.3: routes.volunteers imported", flush=True)

    from routes.locations import locations_bp
    print("BOOT 2.4: routes.locations imported", flush=True)

    from routes.incidents import incidents_bp
    print("BOOT 2.5: routes.incidents imported", flush=True)

except Exception as e:
    import traceback
    print("BOOT FAIL during imports:", repr(e), flush=True)
    traceback.print_exc()
    raise

import realtime
print("BOOT 3: realtime imported", flush=True)

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "lifeline-dev-secret")
    app.config["UPLOAD_DIR"] = os.environ.get("UPLOAD_DIR", os.path.join(os.getcwd(), "uploads"))
    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)

    CORS(app, supports_credentials=True)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(incidents_bp, url_prefix="/api/incidents")
    app.register_blueprint(volunteers_bp, url_prefix="/api/volunteers")
    app.register_blueprint(locations_bp, url_prefix="/api/locations")

    @app.get("/api/health")
    def health():
        return {"ok": True}

    @app.get("/api/debug/groq")
    def debug_groq():
        return {
            "has_key": bool(os.environ.get("GROQ_API_KEY")),
            "model": os.environ.get("GROQ_MODEL", ""),
        }

    return app

app = create_app()
socketio.init_app(app, cors_allowed_origins="*")
print("BOOT 4: app created + socketio initialized", flush=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    print(f"BOOT 5: about to bind on 0.0.0.0:{port}", flush=True)

    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=False,
    )
