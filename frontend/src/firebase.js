import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "AIzaSyCWIeNPdKr1lbMB-sheuqw3G11yETOBDSA",
  authDomain:        "focusroom-91461.firebaseapp.com",
  projectId:         "focusroom-91461",
  storageBucket:     "focusroom-91461.firebasestorage.app",
  messagingSenderId: "540936733591",
  appId:             "1:540936733591:web:2954cb58807c8473f9bad2",
  measurementId:     "G-FJZTZBPKXT"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  const user = result.user
  await setDoc(doc(db, 'users', user.uid), {
    id: user.uid, name: user.displayName,
    email: user.email, avatar: user.photoURL,
    lastSeen: serverTimestamp(),
  }, { merge: true })
  return user
}

export async function signOutUser() { await signOut(auth) }

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function updateUserStats(uid, data) {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() })
}
