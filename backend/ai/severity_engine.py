from typing import Dict, Any, List, Optional

def _yn_unsure(v):
    v = (v or "").lower()
    if v in ("yes", "no", "unsure"):
        return v
    if v is True:
        return "yes"
    if v is False:
        return "no"
    return "unsure"

def hybrid_severity_gate(merged: Dict[str, Any]) -> Dict[str, Any]:
    conscious = _yn_unsure(merged.get("conscious"))
    breathing = _yn_unsure(merged.get("breathing"))
    blood = float(merged.get("blood_area_ratio") or 0.0)
    movement = float(merged.get("movement_score") or 0.0)
    collapse_ratio = float(merged.get("collapse_frames_ratio") or 0.0)

    override_applied = False
    override_reason: Optional[str] = None
    citations: List[Dict[str, Any]] = []

    def cite(field, value):
        citations.append({"field": field, "value_used": value})

    if conscious == "no" and breathing == "no":
        severity = "Critical"
        confidence = 0.95
        override_applied = True
        override_reason = "unconscious_and_not_breathing"
        cite("conscious", "no")
        cite("breathing", "no")
    elif blood > 0.12:
        severity = "Critical"
        confidence = 0.85
        override_applied = True
        override_reason = "extreme_bleeding"
        cite("blood_area_ratio", blood)
    else:
        if collapse_ratio >= 0.7 and movement < 0.002:
            severity = "High"
            confidence = 0.78
            cite("collapse_frames_ratio", collapse_ratio)
            cite("movement_score", movement)
        elif blood > 0.06:
            severity = "High"
            confidence = 0.72
            cite("blood_area_ratio", blood)
        elif blood > 0.02 or collapse_ratio >= 0.4:
            severity = "Moderate"
            confidence = 0.65
            cite("blood_area_ratio", blood)
            cite("collapse_frames_ratio", collapse_ratio)
        else:
            severity = "Low"
            confidence = 0.60
            cite("blood_area_ratio", blood)
            cite("movement_score", movement)

    return {
        "severity": severity,
        "confidence": confidence,
        "override_applied": override_applied,
        "override_reason": override_reason,
        "citations": citations
    }