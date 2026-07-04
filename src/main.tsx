import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import { App } from './app/App'
import { initCloudSync } from './features/sync/cloudSync'

// Cloud-Synchronisation der Nutzerdaten starten (reagiert auf Login/Logout).
initCloudSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
