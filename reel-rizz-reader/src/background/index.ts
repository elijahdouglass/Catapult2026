const API_BASE = 'http://localhost:3001/api'

async function getToken(): Promise<string | null> {
  const result = await chrome.storage.sync.get(['token'])
  return result.token || null
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
