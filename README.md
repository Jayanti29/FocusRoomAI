# ✨ FocusRoom AI v2

> Smart collaborative study platform — white & pink theme, Google auth, real EAR blink detection

## What's Fixed in v2
- 🐛 **Camera bug fixed** — `startCamera` guards against double-start; `stopCamera` cleanly kills stream + MediaPipe + intervals
- 🧠 **Real EAR blink detection** — correct MediaPipe landmark indices, consecutive-frame blink detection, 60-s rolling blink rate
- 🔥 **Firebase Google Auth** — `onAuthStateChanged` watcher, UID synced to backend
- 🎨 **Full white + pink animated UI** — Nunito/Quicksand fonts, glassmorphism cards, blob animations, gradient buttons

---

## Quick Start

### 1. Firebase Setup (Required for Google Auth)
1. Go to https://console.firebase.google.com → Create project "FocusRoom AI"
2. Add Web App → copy `firebaseConfig`
3. Authentication → Sign-in methods → Enable **Google**
4. Firestore Database → Create database (test mode)
5. Paste your config into `frontend/src/firebase.js`

### 2. Backend
```bash
cd focusroom/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd focusroom/frontend
npm install
npm run dev
# → http://localhost:3000
```

### 4. ML Engine (standalone demo, optional)
```bash
cd focusroom/ml_model
pip install -r requirements.txt
python focus_engine.py   # opens webcam window
```

---

## Camera Bug — What Was Fixed

**Problem:** Calling `startCamera` multiple times created multiple streams and multiple `setInterval` detection loops.

**Fix:**
```js
// Guard at top of startCamera:
if (streamRef.current) return  // Already running — prevent double start

// stopCamera now kills everything:
streamRef.current.getTracks().forEach(t => t.stop())
videoRef.current.srcObject = null
cancelAnimationFrame(rafRef.current)
clearInterval(timerRef.current)
detectorRef.current = new RealFocusDetector()  // reset state
```

---

## ML Improvements — EAR & Blink Detection

### Correct EAR Landmark Indices
The old code used wrong indices. v2 uses the correct 6-point EAR formula:
```
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]

EAR = (|p1-p5| + |p2-p4|) / (2 * |p0-p3|)
```

### Blink Detection (consecutive-frame method)
```python
BLINK_THR  = 0.22   # EAR below this = eyes closing
CONSEC_THR = 2      # need 2+ consecutive frames = real blink

if avg_ear < BLINK_THR:
    consec_frames += 1
else:
    if consec_frames >= CONSEC_THR:
        blink_times.append(now)   # confirmed blink
    consec_frames = 0

blink_rate = len(blink_times_last_60s) / window_s * 60
```

### Scoring Logic
```
Start: 100 pts

Head yaw  > 12°  → -up to 50 pts
Head pitch> 10°  → -up to 20 pts
EAR < 0.16       → -60 pts  (eyes shut)
EAR < 0.20       → -35 pts  (very drowsy)
EAR < 0.24       → -15 pts  (heavy)
Sustained closure → -20 pts  (>6 frames)
Blink rate > 30/m → -10 pts
Blink rate < 3/m  → -8 pts

Smooth over 12-frame window → stable score
State: 75+ = Focused | 50-74 = Distracted | 20-49 = Sleepy | <20 = Absent
```

---

## Firebase Auth Flow
```
User clicks "Continue with Google"
  → signInWithPopup(auth, googleProvider)
  → Firebase returns user (uid, displayName, email, photoURL)
  → onAuthStateChanged fires
  → POST /api/auth/login { uid, name, email, avatar }
  → Backend creates/updates user keyed by Firebase UID
  → Token stored in localStorage as "fr_FIREBASE_UID"
```

---

## Project Structure
```
focusroom/
├── README.md
├── backend/
│   ├── main.py              FastAPI — auth, rooms, ws, focus, badges, rewards
│   └── requirements.txt
├── ml_model/
│   ├── focus_engine.py      MediaPipe EAR + head-pose + blink detection
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx
        ├── api.js
        ├── firebase.js      ← Add your Firebase config here
        ├── index.css        White + pink animated theme
        ├── main.jsx
        ├── context/
        │   └── AuthContext.jsx   Firebase onAuthStateChanged
        ├── hooks/
        │   └── useFocusDetector.js  Real EAR detection + camera fix
        ├── pages/
        │   ├── LoginPage.jsx     Google Sign-In
        │   ├── LobbyPage.jsx     Room list + create
        │   ├── RoomPage.jsx      Live study room
        │   └── DashboardPage.jsx Analytics + badges
        └── components/
            ├── FocusGauge.jsx
            ├── Leaderboard.jsx
            ├── FocusTimeline.jsx
            ├── RewardModal.jsx
            └── NotesPanel.jsx
```
