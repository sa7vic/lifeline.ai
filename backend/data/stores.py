from typing import Dict, Any, Optional
from pathlib import Path
import json
import threading
import time
import uuid

DATA_DIR = Path(__file__).resolve().parent
USERS_PATH = DATA_DIR / "users.json"
_STORE_LOCK = threading.Lock()

USERS: Dict[str, Dict[str, Any]] = {}
SESSIONS: Dict[str, str] = {}
INCIDENTS: Dict[str, Dict[str, Any]] = {}
VOLUNTEERS: Dict[str, Dict[str, Any]] = {}
LOCATIONS: Dict[str, Dict[str, Any]] = {}
ALERTS: Dict[str, Dict[str, Any]] = {}
ALERT_RECIPIENTS: Dict[str, Dict[str, Any]] = {}

def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def now_ts() -> float:
    return time.time()

def auth_token() -> str:
    return uuid.uuid4().hex

def _load_users_from_disk() -> Optional[Dict[str, Dict[str, Any]]]:
    if not USERS_PATH.exists():
        return None
    try:
        with USERS_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
    except Exception:
        return None
    return None

def _write_users_to_disk(users: Dict[str, Dict[str, Any]]) -> None:
    USERS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = USERS_PATH.with_suffix(".tmp")
    with tmp_path.open("w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)
    tmp_path.replace(USERS_PATH)

def refresh_users() -> None:
    disk_users = _load_users_from_disk()
    if disk_users is None:
        return
    with _STORE_LOCK:
        USERS.clear()
        USERS.update(disk_users)

def persist_users() -> None:
    with _STORE_LOCK:
        _write_users_to_disk(USERS)

refresh_users()