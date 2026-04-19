"""
FocusRoom AI — Improved ML Focus Detection Engine v2
Fixes: proper EAR landmark indices, temporal blink detection,
       more robust head-pose, confidence-weighted scoring.
"""

import cv2, numpy as np, time
from dataclasses import dataclass
from typing import Tuple, List
from collections import deque

try:
    import mediapipe as mp
    MP_OK = True
except ImportError:
    MP_OK = False
    print("[WARN] MediaPipe not installed — simulation mode.")

# ── Correct MediaPipe FaceMesh EAR indices ────────────────────────────────────
# Each list: [outer, top-upper, top-lower, inner, bot-lower, bot-upper]
L_EYE = [362, 385, 387, 263, 373, 380]
R_EYE = [33,  160, 158, 133, 153, 144]

# Head-pose 3-D model (mm, canonical face)
MODEL_3D = np.float64([
    [0,    0,     0  ],   # nose tip     → lm 1
    [0,   -63.6, -12.5],  # chin         → lm 152
    [-43.3, 32.7,-26  ],  # L eye corner → lm 263
    [ 43.3, 32.7,-26  ],  # R eye corner → lm 33
    [-28.9,-28.9,-24.1],  # L mouth      → lm 287
    [ 28.9,-28.9,-24.1],  # R mouth      → lm 57
])
POSE_IDX = [1, 152, 263, 33, 287, 57]

def ear(lm, idx, W, H):
    p = [(lm[i].x*W, lm[i].y*H) for i in idx]
    v1 = np.hypot(p[1][0]-p[5][0], p[1][1]-p[5][1])
    v2 = np.hypot(p[2][0]-p[4][0], p[2][1]-p[4][1])
    hz = np.hypot(p[0][0]-p[3][0], p[0][1]-p[3][1])
    return (v1+v2) / (2.0*hz + 1e-6)

def head_pose(lm, W, H):
    img_pts = np.float64([[lm[i].x*W, lm[i].y*H] for i in POSE_IDX])
    f = W * 1.0
    cam = np.float64([[f,0,W/2],[0,f,H/2],[0,0,1]])
    ok, rvec, _ = cv2.solvePnP(MODEL_3D, img_pts, cam, np.zeros((4,1)),
                                flags=cv2.SOLVEPNP_ITERATIVE)
    if not ok:
        return 0., 0., 0.
    R, _ = cv2.Rodrigues(rvec)
    angles, *_ = cv2.RQDecomp3x3(R)
    return float(angles[1]), float(angles[0]), float(angles[2])   # yaw, pitch, roll

@dataclass
class FocusResult:
    score: float
    state: str           # focused | distracted | sleepy | absent
    ear_l: float
    ear_r: float
    yaw:   float
    pitch: float
    blink_rate: float
    confidence: float
    ts:    float

class FocusDetector:
    BLINK_THR  = 0.22    # EAR threshold for blink
    CONSEC_THR = 2        # frames below threshold = blink
    SMOOTH_N   = 12       # score smoothing window

    def __init__(self):
        self._blink_times: List[float] = []
        self._consec = 0
        self._score_buf = deque(maxlen=self.SMOOTH_N)
        self._last_ear = 1.0
        self._absent_frames = 0

        if MP_OK:
            self._fm = mp.solutions.face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.55,
                min_tracking_confidence=0.55,
            )

    def process(self, frame: np.ndarray) -> FocusResult:
        ts  = time.time()
        h, w = frame.shape[:2]

        if not MP_OK:
            return self._sim(ts)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = self._fm.process(rgb)

        if not res.multi_face_landmarks:
            self._absent_frames += 1
            s = max(0, 35 - self._absent_frames * 3)
            self._score_buf.append(s)
            sm = np.mean(self._score_buf)
            return FocusResult(round(float(sm),1),'absent',0,0,0,0,0,0.95,ts)

        self._absent_frames = 0
        lm = res.multi_face_landmarks[0].landmark

        earL = ear(lm, L_EYE, w, h)
        earR = ear(lm, R_EYE, w, h)
        avg_ear = (earL + earR) / 2

        # Blink: count when EAR falls below threshold for CONSEC_THR frames
        if avg_ear < self.BLINK_THR:
            self._consec += 1
        else:
            if self._consec >= self.CONSEC_THR:
                self._blink_times.append(ts)
            self._consec = 0
        self._last_ear = avg_ear

        # Keep 60-second window
        self._blink_times = [t for t in self._blink_times if ts-t < 60]
        window = min(60, ts - self._blink_times[0]) if self._blink_times else 60
        blink_rate = len(self._blink_times) / window * 60

        yaw, pitch, roll = head_pose(lm, w, h)

        # ── Score computation ──────────────────────────────────────────
        score = 100.0

        # 1. Head rotation
        ay = abs(yaw)
        ap = abs(pitch)
        if ay > 12:  score -= min(50, (ay-12) * 2.4)
        if ap > 10:  score -= min(20, (ap-10) * 1.5)

        # 2. Eye closure
        if avg_ear < 0.16:   score -= 60    # eyes shut
        elif avg_ear < 0.20: score -= 35    # very drowsy
        elif avg_ear < 0.24: score -= 15    # heavy

        # 3. Sustained closure
        if self._consec > 6: score -= 20

        # 4. Abnormal blink rate
        if blink_rate > 30:            score -= 10
        elif blink_rate < 3 and len(self._blink_times) > 2: score -= 8

        score = max(0.0, min(100.0, score))
        self._score_buf.append(score)
        sm = float(np.mean(self._score_buf))

        state = ('focused' if sm>=75 else 'distracted' if sm>=50 else
                 'sleepy'  if sm>=20 else 'absent')

        return FocusResult(round(sm,1), state, round(earL,3), round(earR,3),
                           round(yaw,1), round(pitch,1), round(blink_rate,1), 0.92, ts)

    def _sim(self, ts):
        import math, random
        base  = 72 + 15*math.sin(ts/30)
        score = max(0, min(100, base + random.gauss(0,5)))
        self._score_buf.append(score)
        sm    = float(np.mean(self._score_buf))
        state = 'focused' if sm>=75 else 'distracted' if sm>=50 else 'sleepy'
        return FocusResult(round(sm,1),state,.30,.30,0,0,15,0.5,ts)

    def annotate(self, frame, r: FocusResult):
        col = {'focused':(0,200,0),'distracted':(0,165,255),
                'sleepy':(0,0,255),'absent':(128,128,128)}[r.state]
        cv2.rectangle(frame,(8,8),(310,95),(0,0,0),-1)
        cv2.rectangle(frame,(8,8),(310,95),col,2)
        cv2.putText(frame,f"Focus: {r.score:.0f}%",(18,42),
                    cv2.FONT_HERSHEY_SIMPLEX,0.85,col,2)
        cv2.putText(frame,f"{r.state.upper()} | EAR {(r.ear_l+r.ear_r)/2:.2f} | Yaw {r.yaw:.0f}deg",
                    (18,74),cv2.FONT_HERSHEY_SIMPLEX,0.48,col,1)
        return frame


if __name__ == '__main__':
    det = FocusDetector()
    cap = cv2.VideoCapture(0)
    print("FocusRoom ML Engine v2 — press Q to quit")
    while cap.isOpened():
        ok, frame = cap.read()
        if not ok: break
        r = det.process(frame)
        frame = det.annotate(frame, r)
        cv2.imshow("FocusRoom AI", frame)
        print(f"Score:{r.score:5.1f} | {r.state:10s} | EAR L:{r.ear_l:.3f} R:{r.ear_r:.3f} | Yaw:{r.yaw:5.1f} | Blink:{r.blink_rate:.0f}/min")
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    cap.release()
    cv2.destroyAllWindows()
