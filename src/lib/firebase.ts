// Zentrale Firebase-Initialisierung für die Web-App.
//
// Die Werte stammen aus der "Web-App"-Konfiguration in der Firebase Console
// (Projekteinstellungen → Allgemein → Deine Apps → SDK-Konfiguration).
// Diese Werte sind KEINE Geheimnisse – sie dürfen öffentlich im Browser stehen.
// Trotzdem legen wir sie in einer .env-Datei ab, damit sie leicht austauschbar
// bleiben. Siehe .env.example.

import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// true, sobald alle nötigen Werte in der .env stehen.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)

let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let dbInstance: Firestore | undefined

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  authInstance = getAuth(app)
  dbInstance = getFirestore(app)
} else if (import.meta.env.DEV) {
  // Hinweis während der Entwicklung, falls die .env noch nicht gefüllt ist.
  console.warn(
    '[firebase] Keine Konfiguration gefunden. Lege eine .env-Datei nach dem ' +
      'Vorbild von .env.example an, damit Login und Backend funktionieren.',
  )
}

export { app, authInstance as auth, dbInstance as db }
