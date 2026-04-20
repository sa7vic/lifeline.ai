import cv2
import numpy as np

def blood_area_ratio_bgr(frame_bgr) -> float:
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)

    lower1 = np.array([0, 60, 40])
    upper1 = np.array([10, 255, 255])
    lower2 = np.array([160, 60, 40])
    upper2 = np.array([180, 255, 255])

    mask1 = cv2.inRange(hsv, lower1, upper1)
    mask2 = cv2.inRange(hsv, lower2, upper2)
    mask = cv2.bitwise_or(mask1, mask2)

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)

    red_pixels = int(np.count_nonzero(mask))
    total_pixels = int(frame_bgr.shape[0] * frame_bgr.shape[1])
    if total_pixels <= 0:
        return 0.0
    return float(red_pixels / total_pixels)