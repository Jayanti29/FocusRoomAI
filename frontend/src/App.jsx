import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage    from './pages/LoginPage'
import LobbyPage    from './pages/LobbyPage'
import RoomPage     from './pages/RoomPage'
import DashboardPage from './pages/DashboardPage'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{display:'flex',height:'100vh',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'var(--bg)',gap:16}}>
      <div className="anim-float" style={{fontSize:52}}>✨</div>
      <div style={{fontSize:16,fontWeight:700,color:'var(--muted)',fontFamily:'var(--font-body)'}}>Loading FocusRoom...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/"              element={<Protected><LobbyPage /></Protected>} />
          <Route path="/room/:roomId"  element={<Protected><RoomPage /></Protected>} />
          <Route path="/dashboard"     element={<Protected><DashboardPage /></Protected>} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
