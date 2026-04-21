import math
import mediapipe as mp
import numpy as np
import cv2


mp_pose = mp.solutions.pose


def _angle_deg(ax, ay, bx, by):
    vx, vy = (bx - ax), (by - ay)
    dot = vx * 0 + vy * (-1)
    mag = math.sqrt(vx * vx + vy * vy)
    if mag == 0:
        return 0.0
    cos = max(-1.0, min(1.0, dot / mag))
    return math.degrees(math.acos(cos))


def _to_bgr3(frame):
    if frame is None:
        return None

    arr = np.asarray(frame)

    if arr.dtype != np.uint8:
        arr = np.clip(arr, 0, 255).astype(np.uint8)

    if arr.ndim == 2:
        return cv2.cvtColor(arr, cv2.COLOR_GRAY2BGR)

    if arr.ndim != 3:
        return None

    if arr.shape[2] == 3:
        return arr

    if arr.shape[2] == 4:
        return cv2.cvtColor(arr, cv2.COLOR_BGRA2BGR)

    return None


def analyze_pose_frames(frames_bgr):
    per_frame = []
    prev_pts = None
    movement_scores = []
    torso_angles = []
    collapse_flags = 0

    with mp_pose.Pose(static_image_mode=True, model_complexity=1, enable_segmentation=False) as pose:
        for frame in frames_bgr:
            bgr = _to_bgr3(frame)
            if bgr is None:
                per_frame.append(
                    {"landmarks_ok": False, "movement_score": 0.0, "torso_angle": 0.0, "collapse_likelihood": 0.0}
                )
                continue

            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            res = pose.process(rgb)

            if not res.pose_landmarks:
                per_frame.append(
                    {"landmarks_ok": False, "movement_score": 0.0, "torso_angle": 0.0, "collapse_likelihood": 0.0}
                )
                continue

            lm = res.pose_landmarks.landmark

            left_shoulder = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
            right_shoulder = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]
            left_hip = lm[mp_pose.PoseLandmark.LEFT_HIP]
            right_hip = lm[mp_pose.PoseLandmark.RIGHT_HIP]

            sx = (left_shoulder.x + right_shoulder.x) / 2.0
            sy = (left_shoulder.y + right_shoulder.y) / 2.0
            hx = (left_hip.x + right_hip.x) / 2.0
            hy = (left_hip.y + right_hip.y) / 2.0

            torso_angle = _angle_deg(hx, hy, sx, sy)
            torso_angles.append(torso_angle)

            pts = np.array([(p.x, p.y) for p in lm], dtype=np.float32)
            movement_score = 0.0 if prev_pts is None else float(np.mean(np.linalg.norm(pts - prev_pts, axis=1)))
            prev_pts = pts
            movement_scores.append(movement_score)

            collapse_likelihood = 0.0
            if torso_angle > 70:
                collapse_likelihood += 0.6
            if movement_score < 0.002:
                collapse_likelihood += 0.4
            collapse_likelihood = min(1.0, collapse_likelihood)

            if collapse_likelihood >= 0.7:
                collapse_flags += 1

            per_frame.append(
                {
                    "landmarks_ok": True,
                    "movement_score": movement_score,
                    "torso_angle": torso_angle,
                    "collapse_likelihood": collapse_likelihood,
                }
            )

    n = max(1, len(per_frame))
    summary = {
        "movement_score": float(np.median(movement_scores)) if movement_scores else 0.0,
        "torso_angle": float(np.median(torso_angles)) if torso_angles else 0.0,
        "collapse_frames_ratio": float(collapse_flags / n),
    }
    return per_frame, summary
