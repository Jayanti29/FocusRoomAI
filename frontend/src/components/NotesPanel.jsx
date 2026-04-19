import { useState, useRef } from 'react'

export default function NotesPanel({ roomId, userId }) {
  const [notes, setNotes] = useState([])
  const [text, setText]   = useState('')
  const fileRef = useRef(null)

  const addNote = () => {
    if (!text.trim()) return
    setNotes(p=>[...p,{id:Date.now(),type:'text',content:text.trim(),author:'You',ts:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}])
    setText('')
  }

  const onFile = (e) => {
    Array.from(e.target.files).forEach(f => {
      const url = URL.createObjectURL(f)
      setNotes(p=>[...p,{id:Date.now()+Math.random(),type:'file',name:f.name,url,size:f.size,fileType:f.type,author:'You',ts:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}])
    })
    e.target.value=''
  }

  const remove = id => setNotes(p=>p.filter(n=>n.id!==id))
  const fmtSize = b => b<1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`
  const fileEmoji = t => t?.includes('pdf')?'📄':t?.includes('image')?'🖼️':'📎'

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',gap:12}}>
      <div className="card" style={{flexShrink:0}}>
        <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.docx" style={{display:'none'}} onChange={onFile}/>
        <button onClick={()=>fileRef.current?.click()} style={{width:'100%',background:'var(--pink-50)',border:'2px dashed var(--pink-300)',borderRadius:'var(--r-md)',padding:'14px',cursor:'pointer',fontSize:14,fontWeight:700,color:'var(--accent)',fontFamily:'var(--font-head)',marginBottom:10,transition:'all .2s'}}>
          📎 Upload PDF, image or notes
        </button>
        <div style={{display:'flex',gap:8}}>
          <input className="input-field" style={{flex:1}} value={text} onChange={e=>setText(e.target.value)} placeholder="Share a quick note with your group..." onKeyDown={e=>e.key==='Enter'&&addNote()}/>
          <button className="btn-primary" style={{padding:'12px 18px',borderRadius:'var(--r-md)',flexShrink:0}} onClick={addNote}>→</button>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
        {notes.length===0 ? (
          <div style={{textAlign:'center',padding:'3rem',color:'var(--muted)'}}>
            <div className="anim-float" style={{fontSize:44,marginBottom:10}}>📂</div>
            <p style={{fontWeight:700,fontSize:15}}>No notes yet</p>
            <p style={{fontSize:13,marginTop:4}}>Upload files or type a note to share with your study group</p>
          </div>
        ) : (
          notes.map(n=>(
            <div key={n.id} className="card anim-fade-up" style={{padding:'12px 14px'}}>
              {n.type==='text' ? (
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{fontSize:18,flexShrink:0}}>💬</span>
                  <div style={{flex:1}}>
                    <p style={{fontSize:14,fontWeight:600,lineHeight:1.6,wordBreak:'break-word',marginBottom:4}}>{n.content}</p>
                    <span style={{fontSize:11,color:'var(--muted)',fontWeight:600}}>{n.author} · {n.ts}</span>
                  </div>
                  <button onClick={()=>remove(n.id)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,flexShrink:0,lineHeight:1}}>×</button>
                </div>
              ):(
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{fontSize:24,flexShrink:0}}>{fileEmoji(n.fileType)}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <a href={n.url} download={n.name} style={{fontSize:14,fontWeight:700,color:'var(--accent)',textDecoration:'none',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3}}>{n.name}</a>
                    <span style={{fontSize:11,color:'var(--muted)',fontWeight:600}}>{fmtSize(n.size)} · {n.author} · {n.ts}</span>
                    {n.fileType?.includes('image') && <img src={n.url} alt={n.name} style={{maxWidth:'100%',maxHeight:150,objectFit:'cover',borderRadius:'var(--r-sm)',marginTop:8,display:'block'}}/>}
                  </div>
                  <button onClick={()=>remove(n.id)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,flexShrink:0,lineHeight:1}}>×</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
