from typing import Dict, Any

from utils.video_utils import extract_frames
from ai.pose_analysis import analyze_pose_frames
from ai.blood_detection import blood_area_ratio_bgr
from ai.severity_engine import hybrid_severity_gate


def classify_video_serious(video_path: str, sample_fps: int = 2, max_frames: int = 12) -> Dict[str, Any]:
    frames = extract_frames(video_path, sample_fps=sample_fps, max_frames=max_frames)

    _pose_per_frame, pose_summary = analyze_pose_frames(frames)

    blood_ratios = []
    for frame in frames:
        blood_ratios.append(blood_area_ratio_bgr(frame))

    blood_area_ratio = float(sorted(blood_ratios)[len(blood_ratios) // 2]) if blood_ratios else 0.0
    clip_summary = {**pose_summary, "blood_area_ratio": blood_area_ratio}

    hybrid_gate = hybrid_severity_gate(clip_summary)
    severity = hybrid_gate.get("severity", "Low")
    serious = severity in ("High", "Critical")

    return {
        "serious": serious,
        "severity": severity,
        "clip_summary": clip_summary,
        "hybrid_gate": hybrid_gate,
        "frames_analyzed": len(frames),
    }
