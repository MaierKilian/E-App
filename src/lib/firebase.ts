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
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'

/**
 * Schalter für den FIRST-PARTY-Auth-Handler auf `e-app-info.web.app`.
 *
 * Hintergrund: Firebase wickelt Google-Login über einen (versteckten) iframe
 * bzw. eine Weiterleitung auf der `authDomain` ab. Weicht diese Domain von der
 * App-Domain ab, ist das ein Cross-Origin-Kontext – Safari/iOS (ITP,
 * Storage-Partitionierung) blockiert dort den Storage, `getRedirectResult()`
 * liefert oft `null` und der Nutzer bleibt trotz Anmeldung ausgeloggt.
 * Setzt man `authDomain` = App-Domain, läuft alles gleich-origin und der
 * Redirect-Login wird auf Safari/iOS zuverlässig.
 *
 * ⚠️ HÄNGT AN EINER EINSTELLUNG IM OAUTH-CLIENT:
 * Google prüft die `redirect_uri` gegen eine Allowlist. Steht dort
 * `https://e-app-info.web.app/__/auth/handler` nicht drin, bricht Google jeden
 * Login mit „Fehler 400: redirect_uri_mismatch" ab – der Login ist dann komplett
 * tot. Der Eintrag ist im Client „Web client (auto created by Google Service)"
 * hinterlegt (Google Auth Platform → Clients), zusammen mit dem JavaScript-Origin
 * `https://e-app-info.web.app`. Wird er dort entfernt, muss dieser Schalter
 * zurück auf `false`. Details: `docs/firebase-setup.md`.
 */
const USE_FIRST_PARTY_AUTH_DOMAIN = true

/** Domain, auf der der First-Party-Auth-Handler ausgeliefert würde. */
const FIRST_PARTY_AUTH_HOST = 'e-app-info.web.app'

/**
 * Wählt die `authDomain` für den Google-OAuth-Ablauf. Standard ist die von
 * Firebase vorgegebene Domain – nur wenn der First-Party-Modus aktiviert ist
 * UND die App wirklich auf der Produktionsdomain läuft, wird umgeschaltet.
 */
function resolveAuthDomain(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  if (USE_FIRST_PARTY_AUTH_DOMAIN && host === FIRST_PARTY_AUTH_HOST) return FIRST_PARTY_AUTH_HOST
  return 'e-app-info.firebaseapp.com'
}

const firebaseConfig = {
  apiKey: 'AIzaSyCf52jDrugmsralbzLMIoqZZ1FIniA-ZHw',
  authDomain: resolveAuthDomain(),
  projectId: 'e-app-info',
  storageBucket: 'e-app-info.firebasestorage.app',
  messagingSenderId: '379772614513',
  appId: '1:379772614513:web:01f63efc811c4fe621e8d0',
  measurementId: 'G-63T81J9E5B',
}

/**
 * Läuft der Auth-Handler gleich-origin zur App?
 *
 * Nur dann ist `signInWithRedirect` zuverlässig – andernfalls muss das Ergebnis
 * über einen Cross-Site-Kontext zurückkommen, den Safari/iOS blockiert. Der
 * Login-Ablauf (`features/auth/auth.ts`) entscheidet daran, ob er mobil auf
 * Redirect umschaltet oder beim Popup bleibt.
 */
export const authDomainIsFirstParty =
  typeof window !== 'undefined' && firebaseConfig.authDomain === window.location.hostname

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

/**
 * Firestore mit persistentem Offline-Cache (IndexedDB) – lazy statt beim
 * Modul-Import.
 *
 * `initializeFirestore()` legt beim ersten Aufruf sofort eine IndexedDB-
 * Datenbank auf dem Gerät an. Läge dieser Aufruf wie zuvor auf Modulebene,
 * geschähe das bei jedem Seitenaufruf, bevor React rendert und bevor der
 * Cookie-Hinweis überhaupt eine Entscheidung eingesammelt hat – auch bei
 * einem Besucher, der sich nie anmeldet. Das ist mit § 25 Abs. 2 Nr. 2 TDDDG
 * („unbedingt erforderlich für einen vom Nutzer ausdrücklich gewünschten
 * Dienst") vor jeder Interaktion nicht zu begründen.
 *
 * `getDb()` verschiebt die Initialisierung auf den ersten tatsächlichen
 * Zugriff. Alle Firestore-Aufrufe im Projekt stehen bereits ausschließlich in
 * Funktionen, die nur für einen angemeldeten Nutzer laufen (Cloud-Sync,
 * Profilbild-Sync, Wohnprofile, Feedback) – ein anonymer Erstbesucher löst
 * keinen davon aus. Ohne Anmeldung/Aktion bleibt der Gerätespeicher also
 * unberührt.
 *
 * Cache-Verhalten unverändert: `persistentMultipleTabManager` erlaubt
 * mehrere offene Tabs; ist IndexedDB nicht verfügbar (privates Fenster, alter
 * Browser), fällt Firestore selbsttätig auf den reinen Speicher-Cache zurück.
 */
let dbInstance: ReturnType<typeof initializeFirestore> | null = null

export function getDb() {
  if (!dbInstance) {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  }
  return dbInstance
}
// Callable Functions – gleiche Region wie die deployte Funktion (siehe functions/).
export const functions = getFunctions(app, 'europe-west1')

/** Mess-ID des Analytics-Datenstroms – u. a. für den Google-Opt-out-Schalter. */
export const ANALYTICS_MEASUREMENT_ID = firebaseConfig.measurementId

/**
 * Analytics wird bewusst NICHT beim Laden der App initialisiert.
 *
 * Google Analytics setzt beim Start sofort seine `_ga`-Cookies – das ist nach
 * § 25 Abs. 1 TDDDG ohne vorherige Einwilligung unzulässig. Deshalb liegt die
 * Initialisierung hinter dieser Funktion, die ausschließlich
 * `features/analytics/analytics.ts` aufruft, und zwar erst nach einer
 * wirksamen Einwilligung.
 *
 * ⚠️ Nicht an anderer Stelle aufrufen und nicht durch ein eifriges
 * `getAnalytics(app)` ersetzen – damit wäre die Einwilligung wirkungslos.
 */
let analyticsPromise: Promise<Analytics | null> | null = null

export function loadAnalytics(): Promise<Analytics | null> {
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((ok) => (ok ? getAnalytics(app) : null))
      .catch(() => null)
  }
  return analyticsPromise
}

/**
 * Wurde Analytics in dieser Sitzung schon geladen? Nur dann muss beim Widerruf
 * überhaupt etwas abgeschaltet werden.
 */
export function analyticsStarted(): boolean {
  return analyticsPromise !== null
}
