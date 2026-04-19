export default function Leaderboard({ members, myId }) {
  const sorted = [...members].sort((a,b)=>(b.focus_score||0)-(a.focus_score||0))

  const stateColor = s=>({ focused:'#10b981', distracted:'#f59e0b', sleepy:'#ef4444', absent:'#94a3b8' }[s]||'#94a3b8')
  const stateEmoji = s=>({ focused:'🟢', distracted:'🟡', sleepy:'🔴', absent:'⚫' }[s]||'⚪')
  const rankEmoji  = i => i===0?'👑':i===1?'🥈':i===2?'🥉':`${i+1}`

  return (
    <div className="card" style={{background:'linear-gradient(135deg,#fff8fc,#fff0f6)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h3 style={{fontSize:16,fontWeight:900,fontFamily:'var(--font-head)'}}>📊 Focus Leaderboard</h3>
        <span style={{background:'var(--pink-100)',color:'var(--accent2)',borderRadius:99,padding:'2px 10px',fontSize:12,fontWeight:700}}>{members.length} in room</span>
      </div>

      {sorted.length===0 ? (
        <div style={{textAlign:'center',padding:'1.5rem',color:'var(--muted)',fontWeight:600,fontSize:14}}>
          <div style={{fontSize:32,marginBottom:8}}>⏳</div>Waiting for members...
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {sorted.map((m,i)=>{
            const isMe = m.id===myId
            const col  = stateColor(m.state)
            const pct  = Math.min(100,m.focus_score||0)
            return (
              <div key={m.id} style={{background:isMe?'rgba(247,89,171,0.06)':'var(--bg2)',border:`1.5px solid ${isMe?'var(--pink-300)':'var(--pink-100)'}`,borderRadius:'var(--r-md)',padding:'10px 12px',display:'flex',alignItems:'center',gap:10,transition:'all .2s'}}>
                <div style={{fontSize:i<3?18:13,fontWeight:800,width:24,textAlign:'center',flexShrink:0}}>{rankEmoji(i)}</div>
                <div style={{width:32,height:32,borderRadius:'50%',background:`hsl(${(m.name?.charCodeAt(0)||65)*5},65%,60%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',flexShrink:0,border:`2px solid ${col}44`}}>
                  {m.avatar?.[0]||m.name?.[0]||'?'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.name}</span>
                    {isMe && <span style={{fontSize:9,fontWeight:800,background:'var(--pink-100)',color:'var(--accent)',borderRadius:99,padding:'1px 6px',letterSpacing:1}}>YOU</span>}
                    <span style={{marginLeft:'auto',fontSize:12}}>{stateEmoji(m.state)}</span>
                  </div>
                  <div style={{height:5,background:'var(--pink-100)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:99,background:`linear-gradient(90deg,${col},var(--pink-300))`,width:`${pct}%`,transition:'width .8s cubic-bezier(.22,1,.36,1)'}} />
                  </div>
                </div>
                <div style={{fontWeight:900,fontFamily:'var(--font-head)',fontSize:20,color:col,flexShrink:0,minWidth:36,textAlign:'right'}}>{Math.round(pct)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
