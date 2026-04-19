import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, signInWithGoogle, signOutUser, getUserDoc } from '../firebase'
import { api } from '../api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync with backend
        try {
          const { token, user: u } = await api.login({
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            uid: firebaseUser.uid,
            avatar: firebaseUser.photoURL,
          })
          localStorage.setItem('fr_token', token)
          setUser({ ...u, photoURL: firebaseUser.photoURL, firebaseUid: firebaseUser.uid })
        } catch {
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            avatar: firebaseUser.photoURL || firebaseUser.displayName?.[0],
            badges: [],
            total_study_hours: 0,
            streak: 0,
          })
        }
      } else {
        setUser(null)
        localStorage.removeItem('fr_token')
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const loginWithGoogle = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      // onAuthStateChanged handles the rest
    } catch (e) {
      setLoading(false)
      throw e
    }
  }

  const logout = async () => {
    await signOutUser()
    setUser(null)
    localStorage.removeItem('fr_token')
  }

  return (
    <AuthCtx.Provider value={{ user, setUser, loginWithGoogle, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
