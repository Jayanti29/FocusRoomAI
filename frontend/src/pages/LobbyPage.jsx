import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const SUBJECTS = ['📐 Mathematics','⚗️ Chemistry','🔬 Biology','💻 CS / Coding','⚡ Physics','📖 Literature','🌍 History','💰 Economics','🔧 Engineering','🎨 Other']

export default function LobbyPage() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [rooms, setRooms] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name:'', subject:'💻 CS / Coding', max_members:10 })
  const [joining, setJoining] = useState(null)
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadRooms()
    const t = setInterval(loadRooms, 5000)
    return () => clearInterval(t)
  }, [])

  const loadRooms = async () => { try { setRooms(await api.listRooms()) } catch {} }

  const createRoom = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try { const room = await api.createRoom({...form, host_id: user.id}); await joinRoom(room.id) }
    catch { setCreating(false) }
  }

  const joinRoom = async (id) => {
    setJoining(id)
    try { await api.joinRoom(id, user.id); nav(`/room/${id}`) }
    catch { setJoining(null) }
  }

  const joinByCode = (e) => { e.preventDefault(); if (joinCode.trim()) joinRoom(joinCode.trim().toUpperCase()) }

  const filtered = rooms.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.subject.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <header className="glass" style={{padding:'0.9rem 2rem',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,borderRadius:0,borderLeft:'none',borderRight:'none',borderTop:'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:24}}>✨</span>
          <span style={{fontSize:20,fontWeight:900,fontFamily:'var(--font-head)'}}><span className="grad-text">FocusRoom</span></span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <Link to="/dashboard" style={{color:'var(--text2)',textDecoration:'none',fontSize:14,fontWeight:700,fontFamily:'var(--font-head)'}}>📊 Dashboard</Link>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {user?.photoURL
              ? <img src={user.photoURL} style={{width:34,height:34,borderRadius:'50%',border:'2px solid var(--pink-200)',objectFit:'cover'}} alt="" />
              : <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#f759ab,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:14}}>{user?.name?.[0]||'?'}</div>
            }
            <span style={{fontSize:14,fontWeight:700,color:'var(--text2)'}}>{user?.name?.split(' ')[0]}</span>
          </div>
          <button onClick={logout} className="btn-ghost" style={{padding:'7px 16px',fontSize:13}}>Sign out</button>
        </div>
      </header>

      <main style={{maxWidth:1100,width:'100%',margin:'0 auto',padding:'2rem',flex:1}}>
        {/* Hero */}
        <div className="anim-fade-up" style={{textAlign:'center',marginBottom:'2.5rem'}}>
          <h1 style={{fontSize:40,fontWeight:900,fontFamily:'var(--font-head)',letterSpacing:'-1px',marginBottom:8}}>
            Find your <span className="grad-text">study squad</span> 🌸
          </h1>
          <p style={{color:'var(--muted)',fontSize:16,fontWeight:600}}>Join a room, turn on your camera, and let AI track your focus in real time.</p>
        </div>

        {/* Action bar */}
        <div className="anim-fade-up delay-1" style={{display:'flex',gap:12,marginBottom:'1.5rem',flexWrap:'wrap',alignItems:'center'}}>
          <form onSubmit={joinByCode} style={{display:'flex',gap:8,flex:1,minWidth:220}}>
            <input className="input-field" style={{flex:1}} value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Room code (e.g. AB12CD)" maxLength={8} />
            <button className="btn-primary" type="submit" style={{padding:'12px 20px',borderRadius:'var(--r-md)',fontSize:14,flexShrink:0}}>Join →</button>
          </form>
          <input className="input-field" style={{flex:1,minWidth:180}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search rooms..." />
          <button className="btn-primary" onClick={()=>setShowCreate(v=>!v)} style={{flexShrink:0}}>
            {showCreate ? '✕ Cancel' : '+ New Room'}
          </button>
        </div>

        {/* Create room form */}
        {showCreate && (
          <div className="card anim-bounce" style={{marginBottom:'1.5rem',background:'linear-gradient(135deg,#fff8fc,#fff0f6)',border:'2px solid var(--pink-200)'}}>
            <h3 style={{fontSize:18,fontWeight:800,fontFamily:'var(--font-head)',marginBottom:'1rem'}}>✨ Create a new study room</h3>
            <form onSubmit={createRoom} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <input className="input-field" placeholder="Room name (e.g. Calculus Night 🌙)" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={{gridColumn:'1/-1'}} />
              <select className="input-field" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}>
                {SUBJECTS.map(s=><option key={s}>{s}</option>)}
              </select>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <label style={{fontSize:13,fontWeight:700,color:'var(--text2)',whiteSpace:'nowrap'}}>Max:</label>
                <input className="input-field" type="number" min={2} max={20} value={form.max_members} onChange={e=>setForm(f=>({...f,max_members:+e.target.value}))} style={{width:80}} />
              </div>
              <button className="btn-primary" type="submit" disabled={creating} style={{gridColumn:'1/-1'}}>
                {creating ? 'Creating...' : '🚀 Create & Join'}
              </button>
            </form>
          </div>
        )}

        {/* Section label */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1rem'}}>
          <h2 style={{fontSize:20,fontWeight:800,fontFamily:'var(--font-head)'}}>Live Rooms</h2>
          <span style={{background:'var(--pink-100)',color:'var(--accent2)',borderRadius:99,padding:'2px 12px',fontSize:13,fontWeight:700}}>{filtered.length} active</span>
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'4rem',border:'2px dashed var(--pink-200)'}}>
            <div className="anim-float" style={{fontSize:48,marginBottom:12}}>🏫</div>
            <p style={{color:'var(--muted)',fontWeight:600,fontSize:16}}>No rooms yet — be the first to create one!</p>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:16}}>
            {filtered.map((room,i)=>(
              <RoomCard key={room.id} room={room} onJoin={joinRoom} joining={joining===room.id} delay={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function RoomCard({ room, onJoin, joining, delay }) {
  const avg = room.avg_focus || 0
  const focusColor = avg>=70 ? '#10b981' : avg>=40 ? '#f59e0b' : '#94a3b8'

  return (
    <div className={`card anim-fade-up delay-${Math.min(delay+1,5)}`} style={{cursor:'default',display:'flex',flexDirection:'column',gap:14,transition:'all .2s',position:'relative',overflow:'hidden'}}>
      {/* Pink top accent */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${focusColor},var(--pink-300))`}} />

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',paddingTop:4}}>
        <div style={{flex:1}}>
          <div style={{fontSize:17,fontWeight:800,fontFamily:'var(--font-head)',marginBottom:4}}>{room.name}</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <span style={{background:'var(--pink-50)',border:'1px solid var(--pink-200)',borderRadius:99,padding:'2px 10px',fontSize:12,fontWeight:600,color:'var(--text2)'}}>{room.subject}</span>
            <span style={{background:'var(--purple-100)',border:'1px solid var(--purple-300)',borderRadius:99,padding:'2px 10px',fontSize:11,fontWeight:700,color:'var(--accent3)',letterSpacing:1}}>{room.id}</span>
          </div>
        </div>
        <div className="anim-pulse" style={{width:11,height:11,borderRadius:'50%',background:focusColor,flexShrink:0,marginTop:4,boxShadow:`0 0 8px ${focusColor}`}} />
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
        {[
          [room.members?.length||0,'studying'],
          [`${avg}%`,'avg focus'],
          [room.max_members,'max'],
        ].map(([v,l])=>(
          <div key={l} style={{background:'var(--pink-50)',borderRadius:'var(--r-sm)',padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:900,fontFamily:'var(--font-head)',color:'var(--accent)'}}>{v}</div>
            <div style={{fontSize:10,fontWeight:600,color:'var(--muted)'}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Focus bar */}
      <div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
          <span style={{fontSize:12,fontWeight:600,color:'var(--muted)'}}>Room focus</span>
          <span style={{fontSize:12,fontWeight:700,color:focusColor}}>{avg}%</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{width:`${avg}%`,background:`linear-gradient(90deg,${focusColor},var(--pink-300))`}} /></div>
      </div>

      {/* Member avatars */}
      <div style={{display:'flex',alignItems:'center',gap:0}}>
        {(room.members||[]).slice(0,6).map((m,i)=>(
          <div key={m.id} style={{width:28,height:28,borderRadius:'50%',border:'2px solid #fff',marginLeft:i?-8:0,background:`hsl(${(m.name?.charCodeAt(0)||65)*5},70%,65%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',zIndex:6-i,flexShrink:0}}>
            {m.avatar?.[0]||m.name?.[0]||'?'}
          </div>
        ))}
        {(room.members?.length||0)>6 && <span style={{marginLeft:4,fontSize:12,color:'var(--muted)',fontWeight:700}}>+{room.members.length-6}</span>}
        {!(room.members?.length) && <span style={{fontSize:12,color:'var(--muted)',fontWeight:600}}>No members yet</span>}
      </div>

      <button className="btn-primary" style={{width:'100%',opacity:joining?.5:1}} onClick={()=>onJoin(room.id)} disabled={joining}>
        {joining ? '⏳ Joining...' : '✨ Join Room'}
      </button>
    </div>
  )
}
