import { useState, useEffect } from 'react'
import './Popup.css'

const API_BASE = 'http://localhost:3001/api'

export const Popup = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [error, setError] = useState('')
  const [reelCount, setReelCount] = useState<number | null>(null)

  useEffect(() => {
    chrome.storage.sync.get(['token'], async (result) => {
      if (result.token) {
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${result.token}` },
          })
          if (res.ok) {
            const data = await res.json()
            setLoggedIn(true)
            setUserName(data.user.displayName)
            fetchReelCount(result.token)
          } else {
            chrome.storage.sync.remove('token')
          }
        } catch {
          // backend offline
        }
      }
    })
  }, [])

  async function fetchReelCount(token: string) {
    try {
      const res = await fetch(`${API_BASE}/reels`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setReelCount(data.views.length)
      }
    } catch {
      // ignore
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      chrome.storage.sync.set({ token: data.token })
      setLoggedIn(true)
      setUserName(data.user.displayName)
      fetchReelCount(data.token)
    } catch {
      setError('Could not reach server')
    }
  }

  function handleLogout() {
    chrome.storage.sync.remove('token')
    setLoggedIn(false)
    setUserName('')
    setReelCount(null)
  }

  if (loggedIn) {
    return (
      <main>
        <h3>Reel Rizz Reader</h3>
        <p>Logged in as <strong>{userName}</strong></p>
        {reelCount !== null && <p>{reelCount} reel{reelCount !== 1 ? 's' : ''} tracked</p>}
        <p className="hint">Browse Instagram reels — they'll be tracked automatically.</p>
        <button onClick={handleLogout} className="btn">Log out</button>
      </main>
    )
  }

  return (
    <main>
      <h3>Reel Rizz Reader</h3>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn">Log in</button>
      </form>
    </main>
  )
}

export default Popup
