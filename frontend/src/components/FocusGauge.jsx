import { useEffect, useRef } from 'react'

const STATE_COLORS = {
  focused:    { main:'#10b981', bg:'rgba(16,185,129,0.12)',  label:'Focused ✨'    },
  distracted: { main:'#f59e0b', bg:'rgba(245,158,11,0.12)', label:'Distracted 🌀'  },
  sleepy:     { main:'#ef4444', bg:'rgba(239,68,68,0.12)',   label:'Sleepy 😴'     },
  absent:     { main:'#94a3b8', bg:'rgba(148,163,184,0.12)',label:'Absent 👁️'     },
}

export default function FocusGauge({ score, state }) {
  const pct = Math.max(0, Math.min(100, score))
  const meta = STATE_COLORS[state] || STATE_COLORS.absent
  const r = 54, cx = 72, cy = 72, sw = 9
  const circ = 2 * Math.PI * r
  // Arc from 7-o'clock to 5-o'clock = 75% of circle
  const arc = (pct / 100) * circ * 0.75
  const offset = circ * 0.125   // start at 225°

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
      <div style={{position:'relative',width:144,height:130}}>
        <svg width={144} height={130} viewBox="0 0 144 130">
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--pink-100)" strokeWidth={sw}
            strokeDasharray={`${circ*.75} ${circ*.25}`} strokeDashoffset={-offset} strokeLinecap="round" />
          {/* Filled arc */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={meta.main} strokeWidth={sw}
            strokeDasharray={`${arc} ${circ-arc}`} strokeDashoffset={-offset} strokeLinecap="round"
            style={{transition:'stroke-dasharray .7s cubic-bezier(.22,1,.36,1),stroke .4s'}} />
          {/* Score */}
          <text x={cx} y={cy-4} textAnchor="middle" dominantBaseline="central"
            style={{fontFamily:'var(--font-head)',fontSize:28,fontWeight:900,fill:meta.main}}>
            {Math.round(pct)}
          </text>
          <text x={cx} y={cy+20} textAnchor="middle"
            style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,fill:'var(--muted)',letterSpacing:1}}>
            FOCUS SCORE
          </text>
        </svg>
      </div>
      <div style={{background:meta.bg,border:`1.5px solid ${meta.main}44`,borderRadius:99,padding:'5px 16px'}}>
        <span style={{fontSize:12,fontWeight:800,fontFamily:'var(--font-head)',color:meta.main}}>{meta.label}</span>
      </div>
    </div>
  )
}
