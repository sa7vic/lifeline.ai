import math
from flask import Blueprint, request

from data.stores import LOCATIONS, SESSIONS, now_ts
from alerts import handle_location_update

locations_bp = Blueprint("locations", __name__)

def _json():
    return request.get_json(force=True, silent=False)

def _float(v):
    try:
        if v is None:
            return None
        return float(v)
    except (TypeError, ValueError):
        return None

def _subject_from_request(body=None):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = SESSIONS.get(token)
    if user_id:
        return "user", user_id

    if body is None:
        body = request.get_json(silent=True) or {}

    guest_id = (body.get("guest_id") or "").strip()
    if guest_id:
        return "guest", guest_id

    return None, None

def _haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c

@locations_bp.post("/update")
def update_location():
    body = _json()
    subject_type, subject_id = _subject_from_request(body)
    if not subject_id:
        return {"error": "unauthorized"}, 401

    lat = _float(body.get("lat"))
    lon = _float(body.get("lon"))
    if lat is None or lon is None:
        return {"error": "lat and lon required"}, 400

    location = {
        "subject_id": subject_id,
        "subject_type": subject_type,
        "lat": lat,
        "lon": lon,
        "accuracy_m": _float(body.get("accuracy_m")),
        "heading_deg": _float(body.get("heading_deg")),
        "speed_mps": _float(body.get("speed_mps")),
        "altitude_m": _float(body.get("altitude_m")),
        "client_ts": _float(body.get("client_ts")),
        "source": (body.get("source") or "browser"),
        "updated_at": now_ts(),
    }

    LOCATIONS[subject_id] = location
    handle_location_update(subject_id)
    return {"ok": True, "location": location}

@locations_bp.get("/me")
def get_my_location():
    subject_type, subject_id = _subject_from_request()
    if not subject_id:
        guest_id = (request.args.get("guest_id") or "").strip()
        if guest_id:
            subject_type, subject_id = "guest", guest_id

    if not subject_id:
        return {"error": "unauthorized"}, 401

    location = LOCATIONS.get(subject_id)
    if not location:
        return {"error": "location not found"}, 404

    return {"location": location}

@locations_bp.get("/nearby")
def nearby_locations():
    lat = _float(request.args.get("lat"))
    lon = _float(request.args.get("lon"))
    radius_m = _float(request.args.get("radius_m")) or 2000.0
    max_age_sec = _float(request.args.get("max_age_sec")) or 300.0

    subject_type, subject_id = _subject_from_request()
    if not subject_id:
        guest_id = (request.args.get("guest_id") or "").strip()
        if guest_id:
            subject_type, subject_id = "guest", guest_id

    if lat is None or lon is None:
        if subject_id and subject_id in LOCATIONS:
            lat = LOCATIONS[subject_id].get("lat")
            lon = LOCATIONS[subject_id].get("lon")
        if lat is None or lon is None:
            return {"error": "lat and lon required"}, 400

    now = now_ts()
    results = []
    for sid, loc in LOCATIONS.items():
        if sid == subject_id:
            continue
        updated_at = loc.get("updated_at")
        if max_age_sec and updated_at and now - updated_at > max_age_sec:
            continue
        if loc.get("lat") is None or loc.get("lon") is None:
            continue

        distance_m = _haversine_m(lat, lon, loc["lat"], loc["lon"])
        if distance_m <= radius_m:
            results.append({
                "subject_id": sid,
                "subject_type": loc.get("subject_type"),
                "distance_m": distance_m,
                "updated_at": updated_at,
            })

    results.sort(key=lambda x: x["distance_m"])
    return {
        "center": {"lat": lat, "lon": lon},
        "radius_m": radius_m,
        "max_age_sec": max_age_sec,
        "results": results,
    }
