from flask import request
from flask_socketio import emit, join_room, leave_room

from data.stores import SESSIONS
from socketio_server import socketio
from i18n import t

SID_TO_SUBJECT = {}
SUBJECT_TO_SIDS = {}


def subject_room(subject_id: str) -> str:
    return f"subject:{subject_id}"


@socketio.on("register")
def register(data):
    payload = data or {}
    token = (payload.get("token") or "").strip()
    guest_id = (payload.get("guest_id") or "").strip()
    locale = payload.get("locale")

    user_id = SESSIONS.get(token) if token else None
    subject_id = user_id or guest_id

    if not subject_id:
        emit(
            "register_error",
            {
                "error": t("errors.unauthorized", locale=locale, default="unauthorized"),
                "error_code": "unauthorized",
            },
        )
        return

    prev = SID_TO_SUBJECT.get(request.sid)
    if prev and prev != subject_id:
        leave_room(subject_room(prev))
        sids = SUBJECT_TO_SIDS.get(prev)
        if sids:
            sids.discard(request.sid)
            if not sids:
                SUBJECT_TO_SIDS.pop(prev, None)

    SID_TO_SUBJECT[request.sid] = subject_id
    SUBJECT_TO_SIDS.setdefault(subject_id, set()).add(request.sid)
    join_room(subject_room(subject_id))

    emit("register_ok", {"subject_id": subject_id})


@socketio.on("disconnect")
def disconnect():
    subject_id = SID_TO_SUBJECT.pop(request.sid, None)
    if not subject_id:
        return

    sids = SUBJECT_TO_SIDS.get(subject_id)
    if sids:
        sids.discard(request.sid)
        if not sids:
            SUBJECT_TO_SIDS.pop(subject_id, None)

    leave_room(subject_room(subject_id))
