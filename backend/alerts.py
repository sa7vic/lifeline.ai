import math
from typing import Dict, Any

from data.stores import ALERTS, ALERT_RECIPIENTS, LOCATIONS, new_id, now_ts
from realtime import subject_room
from socketio_server import socketio

ALERT_RADIUS_M = 500.0
MAX_LOCATION_AGE_SEC = 120.0
MIN_DISTANCE_DELTA_M = 5.0
MIN_UPDATE_INTERVAL_SEC = 2.0


def _haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _is_stale(loc: Dict[str, Any], now: float) -> bool:
    updated_at = loc.get("updated_at")
    if updated_at is None:
        return True
    return (now - updated_at) > MAX_LOCATION_AGE_SEC


def create_serious_alert(
    incident_id: str,
    uploader_subject_id: str,
    uploader_subject_type: str,
    severity: str,
    clip_summary: Dict[str, Any],
    radius_m: float = ALERT_RADIUS_M,
) -> str:
    alert_id = new_id("alt")
    alert = {
        "alert_id": alert_id,
        "incident_id": incident_id,
        "uploader_subject_id": uploader_subject_id,
        "uploader_subject_type": uploader_subject_type,
        "severity": severity,
        "clip_summary": clip_summary,
        "radius_m": float(radius_m),
        "created_at": now_ts(),
        "active": True,
    }
    ALERTS[alert_id] = alert
    ALERT_RECIPIENTS[alert_id] = {}

    _refresh_alert(alert_id, now_ts())
    return alert_id


def handle_location_update(subject_id: str):
    now = now_ts()
    subject_loc = LOCATIONS.get(subject_id)
    if not subject_loc:
        return

    for alert_id, alert in list(ALERTS.items()):
        if not alert.get("active"):
            continue

        if alert.get("uploader_subject_id") == subject_id:
            _refresh_alert(alert_id, now)
        else:
            _maybe_emit_for_subject(alert_id, subject_id, subject_loc, now)


def _refresh_alert(alert_id: str, now: float):
    alert = ALERTS.get(alert_id)
    if not alert or not alert.get("active"):
        return

    for sid, loc in LOCATIONS.items():
        if sid == alert.get("uploader_subject_id"):
            continue
        _maybe_emit_for_subject(alert_id, sid, loc, now)


def _maybe_emit_for_subject(alert_id: str, subject_id: str, subject_loc: Dict[str, Any], now: float):
    alert = ALERTS.get(alert_id)
    if not alert or not alert.get("active"):
        return

    uploader_id = alert.get("uploader_subject_id")
    if subject_id == uploader_id:
        return

    uploader_loc = LOCATIONS.get(uploader_id)
    if not uploader_loc:
        return

    if _is_stale(subject_loc, now) or _is_stale(uploader_loc, now):
        return

    if subject_loc.get("lat") is None or subject_loc.get("lon") is None:
        return
    if uploader_loc.get("lat") is None or uploader_loc.get("lon") is None:
        return

    distance_m = _haversine_m(
        subject_loc["lat"],
        subject_loc["lon"],
        uploader_loc["lat"],
        uploader_loc["lon"],
    )

    uploader_location = {
        "lat": float(uploader_loc["lat"]),
        "lon": float(uploader_loc["lon"]),
        "accuracy_m": uploader_loc.get("accuracy_m"),
        "updated_at": uploader_loc.get("updated_at"),
    }

    radius_m = float(alert.get("radius_m") or ALERT_RADIUS_M)
    recipients = ALERT_RECIPIENTS.setdefault(alert_id, {})
    state = recipients.get(subject_id)

    if distance_m <= radius_m:
        should_send = False
        if not state:
            should_send = True
        else:
            last_distance = state.get("distance_m", 0.0)
            last_sent = state.get("last_sent", 0.0)
            if abs(distance_m - last_distance) >= MIN_DISTANCE_DELTA_M:
                should_send = True
            if (now - last_sent) >= MIN_UPDATE_INTERVAL_SEC:
                should_send = True

        if should_send:
            payload = {
                "alert_id": alert_id,
                "incident_id": alert.get("incident_id"),
                "severity": alert.get("severity"),
                "distance_m": float(distance_m),
                "radius_m": radius_m,
                "uploader_subject_id": uploader_id,
                "uploader_location": uploader_location,
                "updated_at": now,
            }
            event = "serious_alert" if not state else "serious_alert_update"
            socketio.emit(event, payload, room=subject_room(subject_id))

        recipients[subject_id] = {
            "distance_m": float(distance_m),
            "last_sent": now,
        }
    else:
        if state:
            socketio.emit(
                "serious_alert_exit",
                {
                    "alert_id": alert_id,
                    "incident_id": alert.get("incident_id"),
                    "severity": alert.get("severity"),
                    "distance_m": float(distance_m),
                    "radius_m": radius_m,
                    "uploader_subject_id": uploader_id,
                    "uploader_location": uploader_location,
                    "updated_at": now,
                },
                room=subject_room(subject_id),
            )
            recipients.pop(subject_id, None)
