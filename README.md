![Status](https://img.shields.io/badge/Status-Work%20In%20Progress-FFB6C1?style=for-the-badge&logo=github&logoColor=white)
# FocusRoom AI

Collaborative study rooms with real-time focus tracking, live chat, badges & leaderboards.

## Stack
- **Frontend** — React + Vite, Firebase Auth
- **Backend** — FastAPI, WebSockets
- **ML** — MediaPipe (EAR blink detection, head pose)

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Firebase
1. Create a project at firebase.google.com
2. Enable Google Auth + Firestore
3. Paste your config into `frontend/src/firebase.js`

## Features
- Google Sign-In
- Create / join study rooms
- Focus score via webcam (blink rate + head pose)
- Live leaderboard & badges
- Notes panel

## Project Structure
```
focusroom/
├── backend/        FastAPI server
├── frontend/       React app
└── ml_model/       Standalone focus engine (optional)
```
