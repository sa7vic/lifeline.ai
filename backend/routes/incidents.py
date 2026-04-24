import io
from flask import Blueprint, request, current_app, send_file

from data.stores import INCIDENTS, new_id, now_ts, VOLUNTEERS, SESSIONS
from utils.video_utils import save_upload, extract_frames
from ai.pose_analysis import analyze_pose_frames
from ai.blood_detection import blood_area_ratio_bgr
from ai.severity_engine import hybrid_severity_gate
from ai.serious_detection import classify_video_serious
from ai.llm_prompts import SEVERITY_EXPLAIN_PROMPT, CHATBOT_PROMPT
from ai.groq_service import GroqService
from socketio_server import socketio
from alerts import create_serious_alert
from i18n import error_response, t, get_locale, resolve_supported_locale

incidents_bp = Blueprint("incidents", __name__)
groq = GroqService()
LOCALE_TO_LANGUAGE = {
    "en": "English",
    "hi": "Hindi",
    "ar": "Arabic",
}


def _llm_locale_payload(preferred_locale: str | None = None):
    locale_code = resolve_supported_locale(preferred_locale or get_locale())
    return {
        "code": locale_code,
        "language_name": LOCALE_TO_LANGUAGE.get(locale_code, "English"),
    }


def _json():
    return request.get_json(force=True, silent=False)

def _norm_loc(s: str) -> str:
    return " ".join((s or "").strip().lower().split())

def _subject_from_request_form():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = SESSIONS.get(token)
    if user_id:
        return "user", user_id

    guest_id = (request.form.get("guest_id") or "").strip()
    if guest_id:
        return "guest", guest_id

    return None, None

@incidents_bp.post("")
def create_incident():
    if "video" not in request.files:
        return error_response("video_required", 400)

    f = request.files["video"]
    incident_id = new_id("inc")
    filename = f"{incident_id}_{f.filename}"
    video_path = save_upload(f, current_app.config["UPLOAD_DIR"], filename)

    subject_type, subject_id = _subject_from_request_form()

    INCIDENTS[incident_id] = {
        "incident_id": incident_id,
        "created_at": now_ts(),
        "uploader": {"subject_type": subject_type, "subject_id": subject_id},
        "video_meta": {"filename": filename, "path": video_path},
        "questionnaire": {},
        "per_frame_results": [],
        "clip_summary": {},
        "hybrid_gate": None,
        "severity": None,
        "auto_analysis": None,
        "auto_alert": None,
        "actions_taken": [],
        "chat_history": [],
    }

    ctx = INCIDENTS[incident_id]
    try:
        auto_analysis = classify_video_serious(video_path)
        ctx["auto_analysis"] = auto_analysis

        if auto_analysis.get("serious") and subject_id:
            alert_id = create_serious_alert(
                incident_id,
                subject_id,
                subject_type or "guest",
                auto_analysis.get("severity", "High"),
                auto_analysis.get("clip_summary") or {},
            )
            ctx["auto_alert"] = {
                "alert_id": alert_id,
                "radius_m": 500.0,
            }
        elif auto_analysis.get("serious") and not subject_id:
            ctx["auto_alert"] = {"error": "uploader_not_identified"}
    except Exception as e:
        ctx["auto_analysis"] = {"error": str(e)}

    return {"incident_id": incident_id}

@incidents_bp.post("/<incident_id>/questionnaire")
def save_questionnaire(incident_id: str):
    if incident_id not in INCIDENTS:
        return error_response("incident_not_found", 404)
    body = _json()

    loc = (body.get("location_text") or "").strip()
    if not loc:
        return error_response("location_required", 400)

    INCIDENTS[incident_id]["questionnaire"] = body
    return {"ok": True}

@incidents_bp.post("/<incident_id>/analyze")
def analyze(incident_id: str):
    if incident_id not in INCIDENTS:
        return error_response("incident_not_found", 404)

    ctx = INCIDENTS[incident_id]
    frames = extract_frames(ctx["video_meta"]["path"], sample_fps=3, max_frames=18)
    pose_per_frame, pose_summary = analyze_pose_frames(frames)

    per_frame = []
    blood_ratios = []
    for i, frame in enumerate(frames):
        blood = blood_area_ratio_bgr(frame)
        blood_ratios.append(blood)
        per_frame.append({"frame_index": i, "pose": pose_per_frame[i], "blood_area_ratio": blood})

    blood_area_ratio = float(sorted(blood_ratios)[len(blood_ratios)//2]) if blood_ratios else 0.0
    clip_summary = {**pose_summary, "blood_area_ratio": blood_area_ratio}

    questionnaire = ctx.get("questionnaire") or {}
    merged = {**clip_summary, **questionnaire}

    hybrid_gate = hybrid_severity_gate(merged)

    # LLM enrichment (strict JSON, robust parsing)
    try:
        llm_out = groq.chat_json(
            SEVERITY_EXPLAIN_PROMPT,
            {
                "merged_metrics_questionnaire": merged,
                "hybrid_gate": hybrid_gate,
                "locale": _llm_locale_payload(),
            },
            temperature=0.2,
            max_tokens=950,
        )

        if hybrid_gate.get("override_applied") and llm_out.get("severity") != hybrid_gate.get("severity"):
            llm_out["severity"] = hybrid_gate["severity"]
            llm_out.setdefault("reasoning", [])
            llm_out["reasoning"].insert(0, t("llm.override_reason"))
    except Exception as e:
        # fallback minimal structured output
        llm_out = {
            "severity": hybrid_gate["severity"],
            "confidence": hybrid_gate["confidence"],
            "summary": t("llm.unavailable_summary"),
            "reasoning": [t("llm.computed_reason")],
            "steps": [
                {
                    "n": 1,
                    "title": t("llm.scene_safety_title"),
                    "details": t("llm.scene_safety_details"),
                    "tts": t("llm.scene_safety_tts"),
                },
                {
                    "n": 2,
                    "title": t("llm.call_emergency_title"),
                    "details": t("llm.call_emergency_details"),
                    "tts": t("llm.call_emergency_tts"),
                },
            ],
            "safety_notes": [],
            "unknowns": [str(e)],
            "citations": hybrid_gate.get("citations", [])
        }

    final_level = llm_out.get("severity", hybrid_gate["severity"])

    ctx["per_frame_results"] = per_frame
    ctx["clip_summary"] = clip_summary
    ctx["hybrid_gate"] = hybrid_gate
    ctx["severity"] = {"level": final_level, "reasoning": llm_out}
    ctx["actions_taken"].append("analysis_completed")

    # Volunteer alerts: exact location text match
    if final_level in ("High", "Critical"):
        incident_location_text = (questionnaire.get("location_text") or "").strip()
        incident_location_norm = _norm_loc(incident_location_text)

        payload = {
            "incident_id": incident_id,
            "severity": final_level,
            "location_text": incident_location_text,
            "hazards": questionnaire.get("environment_hazards") or [],
            "safe_instructions": t("alerts.safe_instructions_default"),
        }

        if incident_location_norm:
            for _, v in VOLUNTEERS.items():
                if v.get("active") and v.get("location_norm") == incident_location_norm:
                    socketio.emit("volunteer_alert", payload)

    return {"incident": ctx}

@incidents_bp.post("/<incident_id>/chat")
def chat(incident_id: str):
    if incident_id not in INCIDENTS:
        return error_response("incident_not_found", 404)
    ctx = INCIDENTS[incident_id]
    body = _json()
    msg = (body.get("message") or "").strip()
    if not msg:
        return error_response("message_required", 400)

    locale = _llm_locale_payload(body.get("locale"))

    context = {
        "questionnaire": ctx.get("questionnaire") or {},
        "clip_summary": ctx.get("clip_summary") or {},
        "severity": (ctx.get("severity") or {}).get("reasoning") or {},
    }

    try:
        out = groq.chat_json(
            CHATBOT_PROMPT,
            {"message": msg, "context": context, "locale": locale},
            temperature=0.2,
            max_tokens=650,
        )
        reply = out.get("reply", "")
        steps = out.get("steps", [])
        recommended_step = out.get("recommended_step", 1)
    except Exception as e:
        reply = t("chat.unavailable", reason=str(e))
        steps = []
        recommended_step = 1

    ctx["chat_history"].append({"message": msg, "reply": reply, "steps": steps})
    return {"reply": reply, "steps": steps, "recommended_step": recommended_step}

@incidents_bp.get("/<incident_id>/report")
def report(incident_id: str):
    ctx = INCIDENTS.get(incident_id)
    if not ctx:
        return error_response("incident_not_found", 404)

    sev = (ctx.get("severity") or {}).get("level", "Unknown")
    sev_json = (ctx.get("severity") or {}).get("reasoning") or {}
    steps = sev_json.get("steps") or []
    summary = sev_json.get("summary") or ""

    lines = [
        "LifeLine AI Incident Report (TEXT)",
        "================================",
        f"Incident ID: {ctx['incident_id']}",
        f"Severity: {sev}",
        "",
        f"Video: {ctx['video_meta'].get('filename')}",
        "",
        "Questionnaire:",
        f"{ctx.get('questionnaire')}",
        "",
        "Computed Metrics (Clip Summary):",
        f"{ctx.get('clip_summary')}",
        "",
        "LLM Summary:",
        summary,
        "",
        "Steps:",
        *[f"{s.get('n')}. {s.get('title')}: {s.get('details')}" for s in steps],
        "",
        "Chat History:",
    ]
    for turn in ctx.get("chat_history", []):
        lines.append(f"- User: {turn.get('message')}")
        lines.append(f"  AI: {turn.get('reply')}")

    content = "\n".join(lines).encode("utf-8")
    buf = io.BytesIO(content)
    buf.seek(0)
    return send_file(buf, mimetype="text/plain", as_attachment=True, download_name=f"{incident_id}_report.txt")