import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { useFocusDetector } from '../hooks/useFocusDetector'
import FocusGauge from '../components/FocusGauge'
import Leaderboard from '../components/Leaderboard'
import FocusTimeline from '../components/FocusTimeline'
import RewardModal from '../components/RewardModal'
import NotesPanel from '../components/NotesPanel'

const STATE_META = {
  focused:    { emoji:'🟢', label:'Focused',    color:'#10b981', bg:'rgba(16,185,129,0.1)' },
  distracted: { emoji:'🟡', label:'Distracted', color:'#f59e0b', bg:'rgba(245,158,11,0.1)' },
  sleepy:     { emoji:'🔴', label:'Sleepy',     color:'#ef4444', bg:'rgba(239,68,68,0.1)'  },
  absent:     { emoji:'⚫', label:'Absent',     color:'#94a3b8', bg:'rgba(148,163,184,0.1)' },
}

export default function RoomPage() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()

  const [room, setRoom] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [members, setMembers] = useState([])
  const [timeline, setTimeline] = useState([])
  const [showReward, setShowReward] = useState(false)
  const [activeTab, setActiveTab] = useState('focus')
  const [sessionTime, setSessionTime] = useState(0)
  const wsRef = useRef(null)
  const sessionStart = useRef(Date.now())

  useEffect(() => {
    const t = setInterval(() => setSessionTime(Math.floor((Date.now()-sessionStart.current)/1000)),1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let mounted = true
    api.joinRoom(roomId, user.id).then(({session_id,room:r})=>{
      if(!mounted) return
      setSessionId(session_id); setRoom(r); setMembers(r.members||[])
    }).catch(()=>nav('/'))

    const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}/${user.id}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type==='focus_update') setMembers(msg.members||[])
      else if (msg.type==='user_left') setMembers(p=>p.filter(m=>m.id!==msg.user_id))
    }
    return () => { mounted=false; try{ws.close()}catch{}; api.leaveRoom(roomId,user.id).catch(()=>{}) }
  }, [roomId, user.id, nav])

  const onFocusUpdate = useCallback(async (result) => {
    setTimeline(p=>[...p.slice(-80),{score:result.score,state:result.state,t:Date.now()}])
    try { await api.updateFocus({user_id:user.id,room_id:roomId,score:result.score,state:result.state,features:result.features}) } catch {}
  }, [user.id, roomId])

  const {focusData,cameraActive,cameraError,videoRef,startCamera,stopCamera} = useFocusDetector({ onUpdate:onFocusUpdate })

  const endSession = async () => {
    stopCamera()
    if(sessionId) try{await api.endSession({user_id:user.id,room_id:roomId,session_id:sessionId})}catch{}
    nav('/')
  }

  const myFocus = focusData?.score??0
  const myState = focusData?.state??'absent'
  const stateMeta = STATE_META[myState]||STATE_META.absent
  const roomAvg = members.length ? Math.round(members.reduce((a,m)=>a+(m.focus_score||0),0)/members.length) : 0
  const topMember = [...members].sort((a,b)=>(b.focus_score||0)-(a.focus_score||0))[0]
  const fmt = s=>`${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'var(--bg)',overflow:'hidden'}}>
      {/* ── Header ── */}
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.75rem 1.5rem',background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',borderBottom:'1.5px solid var(--pink-100)',flexShrink:0,gap:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flex:1}}>
          <span style={{fontSize:20}}>✨</span>
          <div>
            <div style={{fontSize:16,fontWeight:900,fontFamily:'var(--font-head)'}}>{room?.name||'Loading...'}</div>
            <div style={{fontSize:11,color:'var(--muted)',fontWeight:600}}>{room?.subject} · <span style={{color:'var(--accent)',fontWeight:800,letterSpacing:1}}>{roomId}</span></div>
          </div>
        </div>
        <div style={{textAlign:'center',flexShrink:0}}>
          <div style={{fontSize:22,fontWeight:900,fontFamily:'var(--font-head)',color:'var(--accent)',letterSpacing:2}}>{fmt(sessionTime)}</div>
          <div style={{fontSize:10,color:'var(--muted)',fontWeight:700}}>SESSION TIME</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,flex:1,justifyContent:'flex-end'}}>
          <div style={{background:'var(--pink-50)',border:'1.5px solid var(--pink-200)',borderRadius:'var(--r-md)',padding:'6px 16px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'var(--muted)',fontWeight:700}}>ROOM AVG</div>
            <div style={{fontSize:18,fontWeight:900,fontFamily:'var(--font-head)',color:'var(--accent)'}}>{roomAvg}%</div>
          </div>
          <button className="btn-ghost" style={{padding:'8px 16px',fontSize:13}} onClick={()=>setShowReward(true)}>🎁 Reward</button>
          <button onClick={endSession} style={{background:'transparent',border:'1.5px solid var(--rose-200)',color:'#be123c',borderRadius:99,padding:'8px 16px',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'var(--font-head)'}}>Leave ✕</button>
        </div>
      </header>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        {/* ── Left: Camera + Gauge ── */}
        <aside style={{width:300,borderRight:'1.5px solid var(--pink-100)',background:'rgba(255,255,255,0.8)',backdropFilter:'blur(12px)',display:'flex',flexDirection:'column',gap:12,padding:'1rem',overflowY:'auto',flexShrink:0}}>

          {/* Camera box */}
          <div style={{position:'relative',background:'var(--pink-50)',borderRadius:'var(--r-lg)',overflow:'hidden',aspectRatio:'4/3',border:'2px solid var(--pink-200)'}}>
            <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)',display:cameraActive?'block':'none'}} muted playsInline />

            {!cameraActive && (
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'1rem'}}>
                <div className="anim-float" style={{fontSize:44}}>📷</div>
                <p style={{color:'var(--text2)',fontWeight:700,fontSize:14,textAlign:'center'}}>Enable camera for AI focus tracking</p>
                {cameraError && <p style={{color:'#be123c',fontSize:12,fontWeight:600,textAlign:'center',background:'#fff1f2',padding:'6px 10px',borderRadius:'var(--r-sm)'}}>{cameraError}</p>}
                <button className="btn-primary" style={{fontSize:13,padding:'10px 20px'}} onClick={startCamera}>Enable Camera ✨</button>
              </div>
            )}

            {cameraActive && (
              <>
                <div style={{position:'absolute',bottom:8,left:8,background:stateMeta.bg,backdropFilter:'blur(8px)',borderRadius:99,padding:'4px 12px',border:`1px solid ${stateMeta.color}33`}}>
                  <span style={{fontSize:11,fontWeight:800,fontFamily:'var(--font-head)',color:stateMeta.color}}>{stateMeta.emoji} {stateMeta.label.toUpperCase()}</span>
                </div>
                <button onClick={stopCamera} style={{position:'absolute',top:8,right:8,background:'rgba(255,255,255,0.85)',border:'none',borderRadius:99,padding:'4px 10px',cursor:'pointer',fontSize:11,fontWeight:700,color:'var(--text2)'}}>■ Stop</button>
              </>
            )}
          </div>

          {/* Focus Gauge */}
          <FocusGauge score={myFocus} state={myState} />

          {/* Feature readouts */}
          {focusData && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
              {[
                ['EAR', ((focusData.features.ear_left+focusData.features.ear_right)/2).toFixed(2)],
                ['YAW', `${Math.abs(focusData.features.head_yaw).toFixed(0)}°`],
                ['BLINK', `${focusData.features.blink_rate.toFixed(0)}/m`],
              ].map(([k,v])=>(
                <div key={k} style={{background:'var(--pink-50)',border:'1.5px solid var(--pink-100)',borderRadius:'var(--r-sm)',padding:'8px',textAlign:'center'}}>
                  <div style={{fontSize:9,fontWeight:800,color:'var(--muted)',letterSpacing:1,marginBottom:2}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:900,color:'var(--accent)',fontFamily:'var(--font-head)'}}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Room mini-stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'var(--pink-50)',border:'1.5px solid var(--pink-100)',borderRadius:'var(--r-md)',padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:900,fontFamily:'var(--font-head)',color:'var(--accent)'}}>{members.length}</div>
              <div style={{fontSize:11,fontWeight:700,color:'var(--muted)'}}>studying</div>
            </div>
            <div style={{background:'var(--pink-50)',border:'1.5px solid var(--pink-100)',borderRadius:'var(--r-md)',padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:14,fontWeight:900,fontFamily:'var(--font-head)',color:'var(--accent)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{topMember?.name?.split(' ')[0]||'—'}</div>
              <div style={{fontSize:11,fontWeight:700,color:'var(--muted)'}}>👑 top focus</div>
            </div>
          </div>
        </aside>

        {/* ── Center: Tabs ── */}
        <main style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',padding:'1rem',gap:12}}>
          {/* Tabs */}
          <div style={{display:'flex',gap:6}}>
            {[['focus','📊 Focus Board'],['notes','📝 Notes']].map(([t,l])=>(
              <button key={t} onClick={()=>setActiveTab(t)} style={{padding:'8px 20px',borderRadius:99,fontSize:14,fontWeight:700,fontFamily:'var(--font-head)',cursor:'pointer',border:'1.5px solid',transition:'all .2s',...(activeTab===t?{background:'linear-gradient(135deg,#f759ab,#c41d7f)',color:'#fff',borderColor:'transparent',boxShadow:'0 4px 12px rgba(247,89,171,0.3)'}:{background:'#fff',color:'var(--muted)',borderColor:'var(--pink-200)'})}}>
                {l}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflow:'auto',display:'flex',flexDirection:'column',gap:12}}>
            {activeTab==='focus' ? (
              <>
                <Leaderboard members={members} myId={user.id} />
                <FocusTimeline timeline={timeline} />
              </>
            ) : (
              <NotesPanel roomId={roomId} userId={user.id} />
            )}
          </div>
        </main>
      </div>

      {showReward && <RewardModal userId={user.id} sessionId={sessionId} onClose={()=>setShowReward(false)} />}
    </div>
  )
}
