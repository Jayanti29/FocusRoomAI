const BASE = '/api'

async function req(path, opts = {}) {
  const token = localStorage.getItem('fr_token')
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => 'Error')
    throw new Error(txt)
  }
  return res.json()
}

export const api = {
  // Auth
  login:    (data)     => req('/auth/login',    { method:'POST', body:data }),
  me:       ()         => req(`/auth/me?token=${localStorage.getItem('fr_token')}`),

  // Rooms
  createRoom: (data)   => req('/rooms',             { method:'POST', body:data }),
  listRooms:  ()       => req('/rooms'),
  getRoom:    (id)     => req(`/rooms/${id}`),
  joinRoom:   (id,uid) => req(`/rooms/${id}/join`,  { method:'POST', body:{ user_id:uid } }),
  leaveRoom:  (id,uid) => req(`/rooms/${id}/leave`, { method:'POST', body:{ user_id:uid } }),

  // Focus
  updateFocus: (data)  => req('/focus/update',      { method:'POST', body:data }),

  // Analytics + rewards
  analytics:   (uid)   => req(`/analytics/${uid}`),
  checkReward: (data)  => req('/rewards/check',     { method:'POST', body:data }),
  endSession:  (data)  => req('/sessions/end',      { method:'POST', body:data }),
  badges:      (uid)   => req(`/users/${uid}/badges`),
}
