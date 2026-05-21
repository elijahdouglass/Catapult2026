import { createClerkClient } from '@clerk/chrome-extension/background'

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  'http://localhost:3001/api'
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined

// Cached Clerk client so we don't pay the init cost on every reel view.
let clerkPromise: ReturnType<typeof createClerkClient> | null = null

function getClerk() {
  if (!PUBLISHABLE_KEY) {
    return Promise.reject(
      new Error('VITE_CLERK_PUBLISHABLE_KEY is not set — extension auth disabled')
    )
  }
  if (!clerkPromise) {
    clerkPromise = createClerkClient({ publishableKey: PUBLISHABLE_KEY })
  }
  return clerkPromise
}

async function getToken(): Promise<string | null> {
  try {
    const clerk = await getClerk()
    return (await clerk.session?.getToken()) ?? null
  } catch (err) {
    console.error('reel-rizz-reader: failed to get Clerk token', err)
    return null
  }
}

async function sendReelView(reelId: string) {
  const token = await getToken()
  if (!token) return

  try {
    await fetch(`${API_BASE}/reels/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reelId }),
    })
  } catch (err) {
    console.error('reel-rizz-reader: failed to send reel view', err)
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'REEL_VIEWED' && message.reelId) {
    sendReelView(message.reelId)
  }
})
