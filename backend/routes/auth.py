from flask import Blueprint, request
from data.stores import USERS, SESSIONS, new_id, auth_token, refresh_users, persist_users

auth_bp = Blueprint("auth", __name__)

def _json():
    return request.get_json(force=True, silent=False)

@auth_bp.post("/signup")
def signup():
    refresh_users()
    body = _json()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    profile = body.get("profile") or {}

    if not email or not password:
        return {"error": "email and password required"}, 400

    for u in USERS.values():
        if u["email"] == email:
            return {"error": "email already exists"}, 409

    user_id = new_id("usr")
    USERS[user_id] = {"email": email, "password": password, "profile": profile}
    persist_users()
    token = auth_token()
    SESSIONS[token] = user_id

    return {"token": token, "user": {"user_id": user_id, "email": email, "profile": profile}}

@auth_bp.post("/login")
def login():
    refresh_users()
    body = _json()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    for user_id, u in USERS.items():
        if u["email"] == email and u["password"] == password:
            token = auth_token()
            SESSIONS[token] = user_id
            return {"token": token, "user": {"user_id": user_id, "email": email, "profile": u.get("profile", {})}}

    return {"error": "invalid credentials"}, 401

@auth_bp.get("/me")
def me():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = SESSIONS.get(token)
    if not user_id:
        return {"error": "unauthorized"}, 401
    u = USERS[user_id]
    return {"user": {"user_id": user_id, "email": u["email"], "profile": u.get("profile", {})}}