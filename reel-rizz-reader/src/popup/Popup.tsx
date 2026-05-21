import { useEffect, useState } from 'react'
import {
  ClerkProvider,
  ClerkLoaded,
  SignIn,
  useAuth,
  useUser,
} from '@clerk/chrome-extension'
import './Popup.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined
const SYNC_HOST = import.meta.env.VITE_CLERK_SYNC_HOST as string | undefined
const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  'http://localhost:3001/api'

if (!PUBLISHABLE_KEY) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY — set it in reel-rizz-reader/.env'
  )
}

function ReelCount() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await getToken()
      if (!token) return
      try {
        const res = await fetch(`${API_BASE}/reels`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setCount(data.views?.length ?? 0)
      } catch {
        // backend offline
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken])

  return (
    <main>
      <h3>Reel Rizz Reader</h3>
      <p>
        Logged in as{' '}
        <strong>
          {user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? 'you'}
        </strong>
      </p>
      {count !== null && (
        <p>
          {count} reel{count !== 1 ? 's' : ''} tracked
        </p>
      )}
      <p className="hint">
        Browse Instagram reels — they'll be tracked automatically.
      </p>
    </main>
  )
}

function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) {
    return (
      <main>
        <h3>Reel Rizz Reader</h3>
        <p className="hint">Loading…</p>
      </main>
    )
  }
  if (!isSignedIn) {
    return (
      <main>
        <h3>Reel Rizz Reader</h3>
        <SignIn routing="hash" />
      </main>
    )
  }
  return <ReelCount />
}

export const Popup = () => {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      // Optional: sync session with a hosted Clerk app running at this URL
      // so the extension shares auth with the web frontend.
      syncHost={SYNC_HOST}
      afterSignOutUrl="/"
    >
      <ClerkLoaded>
        <AuthGate />
      </ClerkLoaded>
    </ClerkProvider>
  )
}

export default Popup
