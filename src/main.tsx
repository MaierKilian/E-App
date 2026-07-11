import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import { App } from './app/App'
import { initCloudSync } from './features/sync/cloudSync'
import { completeGoogleRedirect } from './features/auth/auth'

// Cloud-Synchronisation der Nutzerdaten starten (reagiert auf Login/Logout).
initCloudSync()

// Eine ggf. laufende Google-Weiterleitung (Redirect-Login) abschließen.
void completeGoogleRedirect()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
