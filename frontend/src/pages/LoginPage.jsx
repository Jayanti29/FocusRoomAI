import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { loginWithGoogle } = useAuth()
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleGoogle = async () => {
    setLoading(true); setErr('')
    try { await loginWithGoogle(); nav('/') }
    catch (e) { setErr('Sign-in failed. Check your Firebase config.'); setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem',position:'relative',overflow:'hidden'}} className="pink-bg">
      {/* Animated blobs */}
      <div className="blob" style={{width:420,height:420,background:'rgba(247,89,171,0.12)',top:'-80px',left:'-100px',animationDuration:'9s'}} />
      <div className="blob" style={{width:300,height:300,background:'rgba(139,92,246,0.1)',bottom:'-60px',right:'-80px',animationDuration:'11s',animationDelay:'3s'}} />
      <div className="blob" style={{width:200,height:200,background:'rgba(247,89,171,0.08)',top:'40%',right:'15%',animationDuration:'7s',animationDelay:'1.5s'}} />

      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:440}}>
        {/* Logo */}
        <div className="anim-fade-up" style={{textAlign:'center',marginBottom:'2rem'}}>
          <div className="anim-float" style={{display:'inline-block',fontSize:52,marginBottom:12}}>✨</div>
          <h1 style={{fontSize:38,fontWeight:900,letterSpacing:'-1px',fontFamily:'var(--font-head)',lineHeight:1}}>
            <span className="grad-text">FocusRoom</span>
          </h1>
          <p style={{color:'var(--text2)',marginTop:6,fontSize:16,fontWeight:600}}>Study smarter. Together. 🌸</p>
        </div>

        {/* Card */}
        <div className="glass-strong anim-fade-up delay-1" style={{borderRadius:'var(--r-xl)',padding:'2.5rem',textAlign:'center'}}>
          <h2 style={{fontSize:22,fontWeight:800,fontFamily:'var(--font-head)',marginBottom:8}}>Welcome back! 👋</h2>
          <p style={{color:'var(--muted)',fontSize:14,marginBottom:'2rem',lineHeight:1.6}}>Sign in to join study rooms, track your focus,<br/>and earn rewards for staying on task.</p>

          {/* Google sign in */}
          <button onClick={handleGoogle} disabled={loading} style={{width:'100%',background:'#fff',border:'2px solid var(--pink-200)',borderRadius:'var(--r-md)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'center',gap:12,fontSize:15,fontWeight:700,cursor:'pointer',transition:'all .2s',color:'var(--text)',fontFamily:'var(--font-head)',boxShadow:'var(--shadow-sm)'}}>
            {loading ? (
              <div style={{width:20,height:20,border:'2px solid var(--pink-200)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {err && <div style={{marginTop:12,padding:'10px 14px',background:'#fff1f2',border:'1.5px solid #fecdd3',borderRadius:'var(--r-sm)',color:'#be123c',fontSize:13,fontWeight:600}}>{err}</div>}

          {/* Firebase setup note */}
          <div style={{marginTop:'1.5rem',padding:'12px 16px',background:'var(--pink-50)',borderRadius:'var(--r-md)',border:'1px solid var(--pink-100)'}}>
            <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
              ⚙️ First time? Add your Firebase config to <code style={{background:'var(--pink-100)',padding:'1px 5px',borderRadius:4,fontSize:11}}>src/firebase.js</code><br/>
              Enable Google Auth in your Firebase console.
            </p>
          </div>
        </div>

        {/* Feature list */}
        <div className="anim-fade-up delay-2" style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginTop:'1.5rem'}}>
          {['🎯 AI Focus Tracking','👥 Live Rooms','📊 Analytics','🏆 Badges & Rewards'].map(f => (
            <span key={f} style={{background:'rgba(255,255,255,0.75)',border:'1.5px solid var(--pink-200)',borderRadius:99,padding:'5px 14px',fontSize:12,fontWeight:600,color:'var(--text2)'}}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
