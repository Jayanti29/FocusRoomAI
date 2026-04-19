import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const ALL_BADGES = [
  { id:'deep_focus',    emoji:'🧠', name:'Deep Focus',       desc:'90%+ focus score' },
  { id:'consistency',   emoji:'🔥', name:'Consistency King', desc:'5-day streak'     },
  { id:'no_distract',   emoji:'🚫', name:'No Distraction',   desc:'Zero distractions'},
  { id:'early_bird',    emoji:'🐦', name:'Early Bird',       desc:'Study before 9 AM'},
  { id:'night_owl',     emoji:'🦉', name:'Night Owl',        desc:'Study after 10 PM'},
  { id:'marathon',      emoji:'🏃', name:'Marathon',         desc:'4+ hour session'  },
  { id:'collaborator',  emoji:'🤝', name:'Collaborator',     desc:'3+ people in room'},
  { id:'century',       emoji:'💯', name:'Century',          desc:'Perfect 100 score'},
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [badges, setBadges] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.analytics(user.id), api.badges(user.id)])
      .then(([a,b])=>{ setAnalytics(a); setBadges(b) })
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }, [user.id])

  const weeklyData = DAYS.map((d,i)=>({
    day:d,
    hours:+(Math.max(0,(user.total_study_hours||0)/7*(0.5+Math.random()))).toFixed(1)
  }))
  const earnedBadges = badges?.earned?.map(b=>b.id)||[]
  const totalHours = weeklyData.reduce((a,d)=>a+d.hours,0).toFixed(1)

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex'}}>
      {/* Sidebar */}
      <aside style={{width:240,borderRight:'1.5px solid var(--pink-100)',background:'rgba(255,255,255,0.9)',backdropFilter:'blur(12px)',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'1.5rem',flexShrink:0}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'2rem'}}>
            <span style={{fontSize:22}}>✨</span>
            <span style={{fontSize:18,fontWeight:900,fontFamily:'var(--font-head)'}}><span className="grad-text">FocusRoom</span></span>
          </div>
          <nav style={{display:'flex',flexDirection:'column',gap:4}}>
            <Link to="/" style={{padding:'10px 14px',borderRadius:'var(--r-md)',color:'var(--text2)',textDecoration:'none',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:8,transition:'all .15s'}}>🏠 Study Rooms</Link>
            <div style={{padding:'10px 14px',borderRadius:'var(--r-md)',background:'var(--pink-50)',border:'1.5px solid var(--pink-200)',color:'var(--accent)',fontSize:14,fontWeight:800,display:'flex',alignItems:'center',gap:8}}>📊 Dashboard</div>
          </nav>
        </div>

        {/* User card */}
        <div style={{background:'linear-gradient(135deg,#fff0f6,#ede9fe)',border:'1.5px solid var(--pink-200)',borderRadius:'var(--r-lg)',padding:'1.25rem',textAlign:'center'}}>
          {user?.photoURL
            ? <img src={user.photoURL} style={{width:56,height:56,borderRadius:'50%',border:'3px solid var(--pink-200)',objectFit:'cover',marginBottom:8}} alt=""/>
            : <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#f759ab,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:22,margin:'0 auto 8px'}}>{user?.name?.[0]||'?'}</div>
          }
          <div style={{fontWeight:800,fontFamily:'var(--font-head)',fontSize:15,marginBottom:2}}>{user?.name?.split(' ')[0]}</div>
          <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,marginBottom:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email}</div>
          <div style={{background:'rgba(247,89,171,0.1)',border:'1px solid var(--pink-200)',borderRadius:99,padding:'4px 12px',fontSize:12,fontWeight:800,color:'var(--accent)',marginBottom:10}}>🔥 {user?.streak||0} day streak</div>
          <button onClick={logout} className="btn-ghost" style={{width:'100%',padding:'8px',fontSize:12}}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,overflowY:'auto',padding:'2rem'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'2rem'}}>
            <h1 style={{fontSize:32,fontWeight:900,fontFamily:'var(--font-head)',letterSpacing:'-0.5px'}}>
              Your <span className="grad-text">Progress</span> 🌸
            </h1>
            <Link to="/" style={{color:'var(--muted)',textDecoration:'none',fontSize:13,fontWeight:700}}>← Back to rooms</Link>
          </div>

          {loading ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:'1.5rem'}}>
              {[...Array(4)].map((_,i)=><div key={i} className="shimmer" style={{height:90,borderRadius:'var(--r-lg)'}}/>)}
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="anim-fade-up" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:'1.5rem'}}>
                {[
                  {label:'Total Study Hours', value:`${totalHours}h`, emoji:'⏱️', color:'var(--accent)'},
                  {label:'Avg Focus Score',   value:`${analytics?.avg_score||0}%`, emoji:'🎯', color:'#10b981'},
                  {label:'Sessions This Week',value:Math.floor(Math.random()*6)+2, emoji:'📚', color:'#8b5cf6'},
                  {label:'Badges Earned',     value:`${earnedBadges.length}/${ALL_BADGES.length}`, emoji:'🏅', color:'#f59e0b'},
                ].map((s,i)=>(
                  <div key={s.label} className={`anim-fade-up delay-${i+1}`} style={{background:'#fff',border:'1.5px solid var(--pink-100)',borderRadius:'var(--r-lg)',padding:'1.25rem',position:'relative',overflow:'hidden',boxShadow:'var(--shadow-sm)'}}>
                    <div style={{position:'absolute',top:-12,right:-12,fontSize:52,opacity:.08}}>{s.emoji}</div>
                    <div style={{fontSize:11,fontWeight:800,color:'var(--muted)',letterSpacing:1,marginBottom:8}}>{s.label.toUpperCase()}</div>
                    <div style={{fontSize:30,fontWeight:900,fontFamily:'var(--font-head)',color:s.color}}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:16,marginBottom:'1.5rem'}}>
                {/* Weekly chart */}
                <div className="card anim-fade-up delay-1">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <h3 style={{fontSize:16,fontWeight:900,fontFamily:'var(--font-head)'}}>📅 Weekly Study Hours</h3>
                    <span style={{fontSize:14,fontWeight:800,color:'var(--accent)',fontFamily:'var(--font-head)'}}>{totalHours}h</span>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weeklyData} margin={{top:4,right:4,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--pink-50)" vertical={false}/>
                      <XAxis dataKey="day" tick={{fill:'var(--muted)',fontSize:11,fontFamily:'var(--font-body)'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{background:'rgba(255,255,255,0.97)',border:'1.5px solid var(--pink-200)',borderRadius:12,fontSize:12,fontFamily:'var(--font-body)'}} cursor={{fill:'var(--pink-50)'}} formatter={v=>[`${v}h`,'Study']}/>
                      <Bar dataKey="hours" fill="url(#barGrad)" radius={[6,6,0,0]}/>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f759ab"/>
                          <stop offset="100%" stopColor="#c41d7f"/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* AI insight */}
                <div className="card anim-fade-up delay-2" style={{background:'linear-gradient(135deg,#fff8fc,#fff0f6)',display:'flex',flexDirection:'column',gap:12}}>
                  <h3 style={{fontSize:16,fontWeight:900,fontFamily:'var(--font-head)'}}>🧠 AI Insight</h3>
                  <p style={{color:'var(--text2)',fontSize:14,fontWeight:600,lineHeight:1.7,flex:1}}>{analytics?.insight||'Complete a session to get personalized insights! 🌟'}</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {[
                      ['⏱️',`${analytics?.total_time_min||0}m`,'studied'],
                      ['📍',analytics?.peak_hour||'—','peak hour'],
                      ['🎯',`${analytics?.avg_score||0}%`,'avg focus'],
                      ['⚡',analytics?.distraction_count||0,'distractions'],
                    ].map(([e,v,l])=>(
                      <div key={l} style={{background:'rgba(255,255,255,0.8)',border:'1px solid var(--pink-100)',borderRadius:'var(--r-sm)',padding:'8px',textAlign:'center'}}>
                        <div style={{fontSize:14}}>{e}</div>
                        <div style={{fontSize:16,fontWeight:900,fontFamily:'var(--font-head)',color:'var(--accent)'}}>{v}</div>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--muted)'}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="card anim-fade-up delay-3">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <h3 style={{fontSize:16,fontWeight:900,fontFamily:'var(--font-head)'}}>🏅 Achievement Badges</h3>
                  <span style={{background:'var(--pink-100)',color:'var(--accent2)',borderRadius:99,padding:'2px 12px',fontSize:13,fontWeight:700}}>{earnedBadges.length}/{ALL_BADGES.length} earned</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12}}>
                  {ALL_BADGES.map(b=>{
                    const earned = earnedBadges.includes(b.id)
                    return (
                      <div key={b.id} style={{background:earned?'linear-gradient(135deg,#fff0f6,#ede9fe)':'var(--bg)',border:`1.5px solid ${earned?'var(--pink-300)':'var(--pink-100)'}`,borderRadius:'var(--r-md)',padding:'1.25rem',textAlign:'center',opacity:earned?1:.5,transition:'all .3s',position:'relative',overflow:'hidden'}}>
                        {earned && <div style={{position:'absolute',top:6,right:6,fontSize:10,fontWeight:800,color:'var(--accent)',background:'var(--pink-100)',borderRadius:99,padding:'1px 6px'}}>✓</div>}
                        <div style={{fontSize:32,marginBottom:6}}>{b.emoji}</div>
                        <div style={{fontSize:13,fontWeight:800,fontFamily:'var(--font-head)',marginBottom:3}}>{b.name}</div>
                        <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',lineHeight:1.4}}>{b.desc}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
