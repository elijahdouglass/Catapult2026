const REEL_URL_REGEX = /instagram\.com\/reels?\/([A-Za-z0-9_-]+)/

let lastReelId: string | null = null

function extractReelId(): string | null {
  const match = window.location.href.match(REEL_URL_REGEX)
  return match ? match[1] : null
}

function trySendReel() {
  const reelId = extractReelId()
  if (!reelId || reelId === lastReelId) return
  lastReelId = reelId
  chrome.runtime.sendMessage({ type: 'REEL_VIEWED', reelId })
}

// Check on initial load
trySendReel()

// Instagram is an SPA — watch for URL changes via History API
const origPushState = history.pushState.bind(history)
const origReplaceState = history.replaceState.bind(history)

history.pushState = (...args) => {
  origPushState(...args)
  trySendReel()
}

history.replaceState = (...args) => {
  origReplaceState(...args)
  trySendReel()
}

window.addEventListener('popstate', () => trySendReel())

// Also poll as a fallback (Instagram sometimes updates URL without pushState)
setInterval(trySendReel, 2000)
