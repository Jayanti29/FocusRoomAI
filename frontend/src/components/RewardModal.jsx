import { useState } from 'react'
import { api } from '../api'

const REWARDS = ['🎬 Watch Netflix','🎮 Play games','😴 Take a nap','📱 Scroll social media','🍕 Order food','🚶 Go for a walk','📞 Call a friend','📺 Watch YouTube','☕ Coffee break','🎵 Listen to music']

export default function RewardModal({ userId, sessionId, onClose }) {
  const [selected, setSelected] = useState('')
  const [custom, setCustom]   = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)

  const check = async () => {
    const r = selected||custom
    if (!r.trim()) return
    setLoading(true)
    try {
      const res = await api.checkReward({user_id:userId,reward:r,session_id:sessionId||'demo'})
      setResult(res)
    } catch { setResult({earned:false,message:'Could not connect — keep going! 💪'}) }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(61,26,46,0.4)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={onClose}>
      <div className="glass-strong anim-bounce" style={{borderRadius:'var(--r-xl)',padding:'2.5rem',maxWidth:480,width:'100%',position:'relative'}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:20,background:'transparent',border:'none',cursor:'pointer',fontSize:22,color:'var(--muted)'}}>✕</button>

        {!result ? (
          <>
            <div style={{textAlign:'center',marginBottom:'1.5rem'}}>
              <div className="anim-float" style={{fontSize:52,marginBottom:8}}>🎁</div>
              <h2 style={{fontSize:24,fontWeight:900,fontFamily:'var(--font-head)',marginBottom:6}}>Did you earn your reward?</h2>
              <p style={{color:'var(--muted)',fontSize:14,fontWeight:600}}>Tell me what you want — I'll check if your focus earned it!</p>
            </div>

            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:'1.25rem'}}>
              {REWARDS.map(r=>(
                <button key={r} onClick={()=>{setSelected(r);setCustom('')}} style={{background:selected===r?'linear-gradient(135deg,#f759ab,#c41d7f)':'var(--pink-50)',color:selected===r?'#fff':'var(--text2)',border:`1.5px solid ${selected===r?'transparent':'var(--pink-200)'}`,borderRadius:99,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:700,transition:'all .15s',boxShadow:selected===r?'0 4px 12px rgba(247,89,171,0.35)':'none'}}>
                  {r}
                </button>
              ))}
            </div>

            <div style={{marginBottom:'1rem'}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',marginBottom:6,textAlign:'center'}}>— or type your own —</div>
              <input className="input-field" value={custom} onChange={e=>{setCustom(e.target.value);setSelected('')}} placeholder="e.g. Watch one episode of Friends 🤝" />
            </div>

            <button className="btn-primary" style={{width:'100%'}} onClick={check} disabled={loading||(!selected&&!custom)}>
              {loading ? <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/> Checking...</> : '✨ Check My Reward'}
            </button>
          </>
        ) : (
          <div style={{textAlign:'center'}}>
            <div className="anim-bounce" style={{fontSize:70,marginBottom:16}}>{result.earned?'🎉':'⏳'}</div>
            <div style={{fontSize:26,fontWeight:900,fontFamily:'var(--font-head)',marginBottom:12,color:result.earned?'#10b981':'#f59e0b'}}>
              {result.earned ? 'You earned it!' : 'Not yet...'}
            </div>
            <p style={{color:'var(--text2)',fontSize:15,lineHeight:1.7,fontWeight:600,marginBottom:'1.5rem'}}>{result.message}</p>
            {!result.earned && result.minutes_needed>0 && (
              <div style={{background:'var(--pink-50)',border:'2px solid var(--pink-200)',borderRadius:'var(--r-lg)',padding:'1.25rem',marginBottom:'1.5rem',display:'inline-block'}}>
                <div style={{fontSize:44,fontWeight:900,fontFamily:'var(--font-head)',color:'var(--accent)'}}>{result.minutes_needed}</div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--muted)'}}>more minutes needed</div>
              </div>
            )}
            <button className="btn-primary" style={{width:'100%'}} onClick={()=>setResult(null)}>Check another reward 🎁</button>
          </div>
        )}
      </div>
    </div>
  )
}
