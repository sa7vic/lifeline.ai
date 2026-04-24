import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from flask import g, request

SUPPORTED_LOCALES = ("en", "hi", "ar")
DEFAULT_LOCALE = "en"
_LOCALES_DIR = Path(__file__).resolve().parent / "locales"
_TEMPLATE_RE = re.compile(r"{{\s*([a-zA-Z0-9_]+)\s*}}")


def normalize_locale(value: Optional[str]) -> str:
    if not value:
        return DEFAULT_LOCALE

    normalized = value.strip().replace("_", "-").lower()
    return normalized.split("-")[0]


def resolve_supported_locale(value: Optional[str]) -> str:
    locale = normalize_locale(value)
    return locale if locale in SUPPORTED_LOCALES else DEFAULT_LOCALE


def _parse_accept_language(header: Optional[str]) -> Iterable[str]:
    if not header:
        return []

    parsed = []
    for chunk in header.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue

        language = chunk
        quality = 1.0

        if ";" in chunk:
            parts = [p.strip() for p in chunk.split(";") if p.strip()]
            language = parts[0]
            for part in parts[1:]:
                if part.startswith("q="):
                    try:
                        quality = float(part[2:])
                    except ValueError:
                        quality = 0.0

        parsed.append((language, quality))

    parsed.sort(key=lambda x: x[1], reverse=True)
    return [lang for lang, _ in parsed]


def choose_locale(accept_language: Optional[str] = None, preferred: Optional[str] = None) -> str:
    candidates = []
    if preferred:
        candidates.append(preferred)

    candidates.extend(_parse_accept_language(accept_language))

    for candidate in candidates:
        locale = normalize_locale(candidate)
        if locale in SUPPORTED_LOCALES:
            return locale

    return DEFAULT_LOCALE


@lru_cache(maxsize=16)
def _load_locale(locale: str) -> Dict[str, Any]:
    path = _LOCALES_DIR / f"{locale}.json"
    if not path.exists():
        return {}

    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _lookup(data: Dict[str, Any], key: str) -> Any:
    cur: Any = data
    for part in key.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _interpolate(template: str, params: Dict[str, Any]) -> str:
    if not params:
        return template

    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        value = params.get(key)
        return "" if value is None else str(value)

    return _TEMPLATE_RE.sub(replace, template)


def set_request_locale() -> None:
    preferred = (request.args.get("lang") or request.headers.get("X-Locale") or "").strip() or None
    g.locale = choose_locale(request.headers.get("Accept-Language"), preferred)


def get_locale() -> str:
    return getattr(g, "locale", DEFAULT_LOCALE)


def translate(key: str, locale: Optional[str] = None, default: Optional[str] = None, **params: Any) -> Any:
    active_locale = resolve_supported_locale(locale or get_locale())

    value = _lookup(_load_locale(active_locale), key)
    if value is None and active_locale != DEFAULT_LOCALE:
        value = _lookup(_load_locale(DEFAULT_LOCALE), key)

    if value is None:
        value = default if default is not None else key

    if isinstance(value, str):
        return _interpolate(value, params)
    return value


def t(key: str, locale: Optional[str] = None, default: Optional[str] = None, **params: Any) -> Any:
    return translate(key, locale=locale, default=default, **params)


def error_response(code: str, status: int = 400, locale: Optional[str] = None, **params: Any):
    active_locale = resolve_supported_locale(locale or get_locale())
    return {
        "error": translate(f"errors.{code}", locale=active_locale, default=code, **params),
        "error_code": code,
        "locale": active_locale,
    }, status
