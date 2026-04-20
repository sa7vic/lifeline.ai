import cv2
import os

def save_upload(file_storage, upload_dir: str, filename: str) -> str:
    path = os.path.join(upload_dir, filename)
    file_storage.save(path)
    return path

def extract_frames(video_path: str, sample_fps: int = 3, max_frames: int = 24):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(int(round(fps / sample_fps)), 1)

    frames = []
    idx = 0
    grabbed = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step == 0:
            frames.append(frame)
            grabbed += 1
            if grabbed >= max_frames:
                break
        idx += 1

    cap.release()
    return frames