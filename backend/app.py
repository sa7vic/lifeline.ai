import os
from pathlib import Path
from flask import Flask
from flask_cors import CORS

from routes.auth import auth_bp
from routes.incidents import incidents_bp
from routes.volunteers import volunteers_bp
from routes.locations import locations_bp
from socketio_server import socketio
import realtime

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
except Exception:
    pass

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
        return {"has_key": bool(os.environ.get("GROQ_API_KEY")), "model": os.environ.get("GROQ_MODEL", "")}

    return app

app = create_app()
socketio.init_app(app, cors_allowed_origins="*")

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=True)