import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (!active||!payload?.length) return null
  const d = payload[0].payload
  const colors = { focused:'#10b981', distracted:'#f59e0b', sleepy:'#ef4444', absent:'#94a3b8' }
  const col = colors[d.state]||'#94a3b8'
  return (
    <div style={{background:'rgba(255,255,255,0.96)',border:`1.5px solid var(--pink-200)`,borderRadius:12,padding:'8px 14px',boxShadow:'var(--shadow-md)'}}>
      <div style={{color:col,fontWeight:800,fontFamily:'var(--font-head)',fontSize:13}}>{d.state?.toUpperCase()||'—'}</div>
      <div style={{color:'var(--text)',fontWeight:700,fontSize:15}}>{Math.round(d.score)}%</div>
    </div>
  )
}

export default function FocusTimeline({ timeline }) {
  const data = timeline.map((p,i) => ({...p, i}))
  const avg = data.length ? Math.round(data.reduce((a,d)=>a+d.score,0)/data.length) : 0

  return (
    <div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h3 style={{fontSize:16,fontWeight:900,fontFamily:'var(--font-head)'}}>📈 Focus Timeline</h3>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{background:'var(--pink-100)',color:'var(--accent2)',borderRadius:99,padding:'2px 10px',fontSize:12,fontWeight:700}}>{data.length} pts</span>
          {avg>0 && <span style={{fontWeight:800,fontFamily:'var(--font-head)',fontSize:14,color:'var(--accent)'}}>avg {avg}%</span>}
        </div>
      </div>

      {data.length < 2 ? (
        <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontWeight:600,fontSize:14}}>
          📡 Focus data will appear as you study...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={data} margin={{top:8,right:8,left:-20,bottom:0}}>
            <defs>
              <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f759ab" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#f759ab" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--pink-100)" vertical={false}/>
            <XAxis dataKey="i" hide/>
            <YAxis domain={[0,100]} tick={{fill:'var(--muted)',fontSize:10,fontFamily:'var(--font-body)'}}/>
            <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={.5}/>
            <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={.5}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2.5} fill="url(#focusGrad)" dot={false} activeDot={{r:5,fill:'var(--accent)',strokeWidth:0}} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div style={{display:'flex',gap:16,marginTop:10,flexWrap:'wrap'}}>
        {[['#10b981','Focused (75+)'],['#f59e0b','Distracted (50+)'],['#ef4444','Sleepy (<50)']].map(([c,l])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:c}}/>
            <span style={{fontSize:11,fontWeight:600,color:'var(--muted)'}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
