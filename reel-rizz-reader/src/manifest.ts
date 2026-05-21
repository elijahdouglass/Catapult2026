import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json'

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: 'Tracks Instagram reels you view for Reel Rizz matching',
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-32.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: 'img/logo-48.png',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://www.instagram.com/*'],
      js: ['src/contentScript/index.ts'],
    },
  ],
  permissions: ['storage', 'cookies'],
  host_permissions: [
    'http://localhost:3001/*',
    // Clerk needs access to the frontend API host configured in your
    // Clerk dashboard. Add the production one when deploying.
    'https://*.clerk.accounts.dev/*',
    'https://clerk.*/*',
    // For sync-host (sharing the web app's session) — adjust to your web
    // app origin in production.
    'http://localhost:5173/*',
  ],
  // The `key` field below pins the extension ID. Clerk requires a stable
  // extension ID; generate one in the Clerk dashboard and inject via
  // CRX_KEY at build time, e.g. `VITE_CRX_KEY=... npm run build`.
  key: process.env.CRX_KEY || undefined,
})
