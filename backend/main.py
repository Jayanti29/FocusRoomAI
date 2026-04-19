from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json, uuid, time, math, random
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel
import asyncio

app = FastAPI(title="FocusRoom AI API v2", version="2.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000","http://localhost:5173","http://127.0.0.1:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ── In-memory stores ──────────────────────────────────────────────────────────
users_db:   Dict[str, dict] = {}
rooms_db:   Dict[str, dict] = {}
sessions_db:Dict[str, dict] = {}
focus_hist: Dict[str, List[dict]] = {}

# ── WebSocket manager ─────────────────────────────────────────────────────────
class WSManager:
    def __init__(self):
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, room_id, user_id, ws):
        await ws.accept()
        self.rooms.setdefault(room_id, {})[user_id] = ws

    def disconnect(self, room_id, user_id):
        if room_id in self.rooms:
            self.rooms[room_id].pop(user_id, None)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast(self, room_id, msg, exclude=None):
        dead = []
        for uid, ws in list(self.rooms.get(room_id, {}).items()):
            if uid == exclude: continue
            try: await ws.send_json(msg)
            except: dead.append(uid)
        for uid in dead: self.disconnect(room_id, uid)

mgr = WSManager()

# ── Pydantic models ───────────────────────────────────────────────────────────
class UserLogin(BaseModel):
    name: Optional[str] = None
    email: str
    uid: Optional[str] = None      # Firebase UID
    avatar: Optional[str] = None   # Google photo URL

class CreateRoom(BaseModel):
    name: str
    subject: str
    max_members: int = 10
    host_id: str

class FocusUpdate(BaseModel):
    user_id: str
    room_id: str
    score: float
    state: str
    features: dict

class RewardCheck(BaseModel):
    user_id: str
    reward: str
    session_id: str

class SessionEnd(BaseModel):
    user_id: str
    room_id: str
    session_id: str

# ── Badge catalogue ───────────────────────────────────────────────────────────
BADGES = {
    "deep_focus":   {"name":"Deep Focus",       "emoji":"🧠","desc":"90%+ avg focus"},
    "consistency":  {"name":"Consistency King",  "emoji":"🔥","desc":"5-day streak"},
    "no_distract":  {"name":"No Distraction",    "emoji":"🚫","desc":"Zero distractions"},
    "early_bird":   {"name":"Early Bird",        "emoji":"🐦","desc":"Study before 9 AM"},
    "night_owl":    {"name":"Night Owl",         "emoji":"🦉","desc":"Study after 10 PM"},
    "marathon":     {"name":"Marathon Scholar",  "emoji":"🏃","desc":"4+ hour session"},
    "collaborator": {"name":"Collaborator",      "emoji":"🤝","desc":"3+ people in room"},
    "century":      {"name":"Century",           "emoji":"💯","desc":"Perfect 100 score"},
}

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
async def login(data: UserLogin):
    # Use Firebase UID if provided, else derive from email
    uid = data.uid or str(uuid.uuid5(uuid.NAMESPACE_DNS, data.email))
    if uid not in users_db:
        users_db[uid] = {
            "id": uid,
            "name": data.name or data.email.split("@")[0],
            "email": data.email,
            "avatar": data.avatar or (data.name or data.email)[0].upper(),
            "photoURL": data.avatar,
            "created_at": datetime.utcnow().isoformat(),
            "total_study_hours": 0.0,
            "weekly_hours": [0]*7,
            "streak": 0,
            "badges": [],
            "sessions": [],
        }
    else:
        # Update avatar if changed (e.g. Google photo)
        if data.avatar:
            users_db[uid]["avatar"]   = data.avatar
            users_db[uid]["photoURL"] = data.avatar
        if data.name:
            users_db[uid]["name"] = data.name
    return {"token": f"fr_{uid}", "user": users_db[uid]}

@app.get("/api/auth/me")
async def me(token: str):
    uid = token.removeprefix("fr_")
    if uid not in users_db:
        raise HTTPException(404, "User not found")
    return users_db[uid]

# ── Rooms ─────────────────────────────────────────────────────────────────────
@app.post("/api/rooms")
async def create_room(data: CreateRoom):
    rid = str(uuid.uuid4())[:8].upper()
    rooms_db[rid] = {
        "id": rid, "name": data.name, "subject": data.subject,
        "host_id": data.host_id, "max_members": data.max_members,
        "members": [], "created_at": datetime.utcnow().isoformat(),
        "avg_focus": 0, "active": True,
    }
    return rooms_db[rid]

@app.get("/api/rooms")
async def list_rooms():
    return [r for r in rooms_db.values() if r["active"]]

@app.get("/api/rooms/{rid}")
async def get_room(rid: str):
    if rid not in rooms_db: raise HTTPException(404, "Room not found")
    return rooms_db[rid]

@app.post("/api/rooms/{rid}/join")
async def join_room(rid: str, data: dict):
    if rid not in rooms_db: raise HTTPException(404, "Room not found")
    room = rooms_db[rid]
    uid  = data.get("user_id")
    u    = users_db.get(uid, {})
    member = {
        "id": uid,
        "name": u.get("name","Anonymous"),
        "avatar": u.get("photoURL") or u.get("avatar","?"),
        "focus_score": 0,
        "state": "absent",
    }
    if not any(m["id"] == uid for m in room["members"]):
        room["members"].append(member)

    sid = str(uuid.uuid4())
    sessions_db[sid] = {
        "id": sid, "user_id": uid, "room_id": rid,
        "started_at": time.time(), "focus_timeline": [],
    }
    focus_hist.setdefault(uid, [])
    return {"session_id": sid, "room": room}

@app.post("/api/rooms/{rid}/leave")
async def leave_room(rid: str, data: dict):
    if rid in rooms_db:
        uid = data.get("user_id")
        rooms_db[rid]["members"] = [m for m in rooms_db[rid]["members"] if m["id"] != uid]
    return {"ok": True}

# ── Focus updates ─────────────────────────────────────────────────────────────
@app.post("/api/focus/update")
async def update_focus(data: FocusUpdate):
    room = rooms_db.get(data.room_id)
    if not room: return {"ok": False}

    for m in room["members"]:
        if m["id"] == data.user_id:
            m["focus_score"] = round(data.score)
            m["state"]       = data.state

    scores = [m["focus_score"] for m in room["members"]]
    room["avg_focus"] = round(sum(scores)/len(scores)) if scores else 0

    focus_hist.setdefault(data.user_id, []).append({
        "t": time.time(), "score": data.score, "state": data.state
    })

    await mgr.broadcast(data.room_id, {
        "type": "focus_update",
        "user_id": data.user_id,
        "score": round(data.score),
        "state": data.state,
        "room_avg": room["avg_focus"],
        "members": room["members"],
    })
    return {"ok": True, "room_avg": room["avg_focus"]}

# ── Analytics ─────────────────────────────────────────────────────────────────
@app.get("/api/analytics/{uid}")
async def analytics(uid: str):
    hist = focus_hist.get(uid, [])
    if not hist:
        return {"timeline":[],"avg_score":0,"peak_hour":"—","distraction_count":0,"total_time_min":0,"insight":"Complete a session to see insights! 🌟"}

    scores      = [h["score"] for h in hist]
    avg         = sum(scores)/len(scores)
    distractions= sum(1 for h in hist if h["state"] in ("distracted","absent"))
    total_min   = round(len(hist) * 2)

    # Peak hour: bucket timestamps into hours
    from collections import Counter
    hour_scores: Dict[int,List[float]] = {}
    for h in hist:
        hr = int(time.strftime("%H", time.localtime(h["t"])))
        hour_scores.setdefault(hr,[]).append(h["score"])
    best_hr = max(hour_scores, key=lambda hr: sum(hour_scores[hr])/len(hour_scores[hr]), default=None)
    peak = f"{best_hr}:00" if best_hr is not None else "—"

    return {
        "timeline": hist[-80:],
        "avg_score": round(avg,1),
        "peak_hour": peak,
        "distraction_count": distractions,
        "total_time_min": total_min,
        "insight": _insight(avg, distractions, total_min),
    }

def _insight(avg, dist, mins):
    if avg >= 88: return "🚀 Outstanding! You're in deep flow state. Keep it up!"
    if avg >= 75: return f"✨ Great focus! You stayed on track for {mins} minutes."
    if avg >= 60: return f"💪 Good effort! {dist} distraction(s) — try 25-min Pomodoro sprints."
    return "🎯 Your environment may be distracting. Try noise-cancelling headphones."

# ── Rewards ───────────────────────────────────────────────────────────────────
@app.post("/api/rewards/check")
async def check_reward(data: RewardCheck):
    hist = focus_hist.get(data.user_id, [])
    if not hist:
        return {"earned":False,"message":"No study data yet — start studying first! 📚","minutes_needed":25}

    scores    = [h["score"] for h in hist]
    avg       = sum(scores)/len(scores)
    total_min = len(hist)*2/60

    if avg >= 65 and total_min >= 20:
        return {"earned":True,"message":f"You earned it! 🎉 Avg focus {avg:.0f}%, {total_min:.0f} min studied. Enjoy your {data.reward}!"}
    if total_min < 20:
        needed = math.ceil(20 - total_min)
        return {"earned":False,"message":f"Study {needed} more minute(s) to unlock that reward.","minutes_needed":needed}
    return {"earned":False,"message":f"Focus score {avg:.0f}% — reach 65% to earn your reward.","minutes_needed":0}

# ── Session end & badges ──────────────────────────────────────────────────────
@app.post("/api/sessions/end")
async def end_session(data: SessionEnd):
    hist  = focus_hist.get(data.user_id, [])
    scores= [h["score"] for h in hist]
    avg   = sum(scores)/len(scores) if scores else 0
    dist  = sum(1 for h in hist if h["state"] in ("distracted","absent"))
    mins  = len(hist)*2/60

    earned = []
    u      = users_db.get(data.user_id, {})
    have   = set(u.get("badges",[]))

    if avg>=90      and "deep_focus"  not in have: earned.append("deep_focus")
    if dist==0 and len(scores)>10 and "no_distract" not in have: earned.append("no_distract")
    if mins>=240    and "marathon"    not in have: earned.append("marathon")
    if 100 in scores and "century"   not in have: earned.append("century")

    # Hour-based badges
    hr = int(datetime.utcnow().strftime("%H"))
    if hr < 9  and "early_bird" not in have: earned.append("early_bird")
    if hr >= 22 and "night_owl" not in have: earned.append("night_owl")

    if u:
        u["badges"] = list(have | set(earned))
        u["total_study_hours"] = round(u.get("total_study_hours",0) + mins/60, 2)

    focus_hist[data.user_id] = []  # reset for next session

    return {
        "avg_score": round(avg,1),
        "total_minutes": round(mins),
        "distraction_count": dist,
        "earned_badges": [{"id":b,**BADGES[b]} for b in earned],
        "insight": _insight(avg, dist, round(mins)),
    }

@app.get("/api/users/{uid}/badges")
async def get_badges(uid: str):
    u = users_db.get(uid,{})
    earned_ids = set(u.get("badges",[]))
    return {
        "earned": [{"id":k,**v} for k,v in BADGES.items() if k in earned_ids],
        "all":    [{"id":k,**v,"earned": k in earned_ids} for k,v in BADGES.items()],
    }

# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/{room_id}/{user_id}")
async def ws_endpoint(ws: WebSocket, room_id: str, user_id: str):
    await mgr.connect(room_id, user_id, ws)
    room = rooms_db.get(room_id, {})
    await ws.send_json({"type":"connected","room":room})
    try:
        while True:
            data = await ws.receive_json()
            if data.get("type") == "chat":
                await mgr.broadcast(room_id,
                    {**data,"user_id":user_id,"ts":time.time()})
    except WebSocketDisconnect:
        mgr.disconnect(room_id, user_id)
        await mgr.broadcast(room_id, {"type":"user_left","user_id":user_id})

@app.get("/")
async def root():
    return {"status":"FocusRoom AI v2 running","rooms":len(rooms_db),"users":len(users_db)}
