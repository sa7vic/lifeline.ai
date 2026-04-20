from flask import Blueprint, request
from data.stores import VOLUNTEERS, SESSIONS, USERS, now_ts

volunteers_bp = Blueprint("volunteers", __name__)

def _json():
    return request.get_json(force=True, silent=False)

def _require_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    return SESSIONS.get(token)

def _norm_loc(s: str) -> str:
    return " ".join((s or "").strip().lower().split())

@volunteers_bp.post("/opt-in")
def opt_in():
    user_id = _require_user()
    if not user_id:
        return {"error": "unauthorized"}, 401

    body = _json()
    active = bool(body.get("active", True))
    location_text = body.get("location_text") or (USERS[user_id].get("profile") or {}).get("locationText") or ""
    location_norm = _norm_loc(location_text)

    if not location_norm:
        return {"error": "location_text required (or set profile.locationText)"}, 400

    VOLUNTEERS[user_id] = {
        "active": active,
        "location_text": location_text,
        "location_norm": location_norm,
        "updated_at": now_ts(),
    }
    return {"ok": True, "volunteer": VOLUNTEERS[user_id]}