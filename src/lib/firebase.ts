// Zentrale Firebase-Initialisierung für die Web-App.
//
// Diese Konfiguration stammt aus der Firebase Console
// (Projekteinstellungen → Allgemein → Deine Apps → SDK-Konfiguration).
//
// WICHTIG: Diese Werte sind KEINE Geheimnisse. Bei jeder Firebase-Web-App
// liegen sie offen im Browser – das ist so vorgesehen. Die eigentliche
// Sicherheit entsteht über die Firestore-/Storage-Sicherheitsregeln und die
// Liste der autorisierten Domains in der Authentication-Konfiguration.
// Deshalb dürfen sie bedenkenlos im Code (und im Repo) stehen.

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyCf52jDrugmsralbzLMIoqZZ1FIniA-ZHw',
  authDomain: 'e-app-info.firebaseapp.com',
  projectId: 'e-app-info',
  storageBucket: 'e-app-info.firebasestorage.app',
  messagingSenderId: '379772614513',
  appId: '1:379772614513:web:01f63efc811c4fe621e8d0',
  measurementId: 'G-63T81J9E5B',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
// Callable Functions – gleiche Region wie die deployte Funktion (siehe functions/).
export const functions = getFunctions(app, 'europe-west1')

// Analytics nur dort initialisieren, wo es unterstützt wird (Browser, kein
// SSR/Worker). Liefert das Analytics-Objekt – oder null, wenn nicht verfügbar.
export const analyticsReady: Promise<Analytics | null> = isSupported().then(
  (ok) => (ok ? getAnalytics(app) : null),
)
