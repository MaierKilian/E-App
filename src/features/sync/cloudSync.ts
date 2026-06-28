import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { useProgressStore } from '@/store/progressStore'
import { useMeasurementDraftStore } from '@/store/measurementDraftStore'

/**
 * Cloud-Synchronisation der Nutzerdaten über Firestore.
 *
 * Konzept: Pro eingeloggtem Nutzer wird ein Dokument `users/{uid}` gepflegt,
 * das einen Schnappschuss aller relevanten Stores enthält. Beim Login werden
 * die Cloud-Daten geladen (oder – falls noch keine existieren – die lokalen
 * Daten hochgeladen). Danach schreibt jede Änderung verzögert in die Cloud.
 *
 * Theme/Sprache (settingsStore) werden bewusst NICHT synchronisiert – das sind
 * gerätespezifische Vorlieben.
 */

/** Minimaler Store-Vertrag, der für die Synchronisation genügt. */
interface SyncStore {
  getState(): object
  setState(partial: object): void
  subscribe(listener: () => void): () => void
}

/** Alle Stores, deren Inhalt in die Cloud gespiegelt wird. */
const STORES: Record<string, SyncStore> = {
  onboarding: useOnboardingStore as unknown as SyncStore,
  measurements: useMeasurementsStore as unknown as SyncStore,
  readings: useReadingsStore as unknown as SyncStore,
  tariff: useTariffStore as unknown as SyncStore,
  progress: useProgressStore as unknown as SyncStore,
  drafts: useMeasurementDraftStore as unknown as SyncStore,
}

const WRITE_DELAY_MS = 1500

let isHydrating = false
let writeTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribers: Array<() => void> = []
let currentUid: string | null = null
let started = false

/** Erzeugt einen JSON-sicheren Schnappschuss aller Stores (Funktionen entfallen). */
function snapshot(): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const [key, store] of Object.entries(STORES)) {
    data[key] = JSON.parse(JSON.stringify(store.getState()))
  }
  return data
}

/** Überträgt Cloud-Daten in die lokalen Stores. */
function hydrate(remote: Record<string, unknown>) {
  isHydrating = true
  try {
    for (const [key, store] of Object.entries(STORES)) {
      const part = remote[key]
      if (part && typeof part === 'object') store.setState(part as object)
    }
  } finally {
    isHydrating = false
  }
}

/** Schreibt den aktuellen Stand sofort in die Cloud. */
async function pushNow(uid: string) {
  try {
    await setDoc(doc(db, 'users', uid), {
      state: snapshot(),
      updatedAt: Date.now(),
    })
  } catch (e) {
    console.warn('[cloudSync] Schreiben fehlgeschlagen:', e)
  }
}

/** Plant einen verzögerten Cloud-Schreibvorgang (sammelt schnelle Änderungen). */
function scheduleWrite(uid: string) {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    writeTimer = null
    void pushNow(uid)
  }, WRITE_DELAY_MS)
}

/** Beendet aktive Abos und ausstehende Schreibvorgänge. */
function teardown() {
  unsubscribers.forEach((u) => u())
  unsubscribers = []
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
}

/** Reagiert auf Login/Logout. */
async function onUserChange(uid: string | null) {
  teardown()
  currentUid = uid
  if (!uid) return

  // 1. Cloud-Daten laden – oder beim ersten Mal lokale Daten hochladen.
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    const remote = snap.exists() ? (snap.data()?.state as Record<string, unknown> | undefined) : undefined
    if (remote) {
      hydrate(remote)
    } else {
      await pushNow(uid)
    }
  } catch (e) {
    console.warn('[cloudSync] Laden fehlgeschlagen:', e)
  }

  // Nutzer hat zwischenzeitlich gewechselt? Dann nichts weiter tun.
  if (currentUid !== uid) return

  // 2. Auf künftige Änderungen hören und in die Cloud schreiben.
  for (const store of Object.values(STORES)) {
    unsubscribers.push(
      store.subscribe(() => {
        if (!isHydrating) scheduleWrite(uid)
      }),
    )
  }
}

/**
 * Startet die Cloud-Synchronisation (einmalig beim App-Start aufrufen).
 * Lauscht auf Änderungen des Anmeldestatus.
 */
export function initCloudSync() {
  if (started) return
  started = true

  let prevUid = useAuthStore.getState().user?.uid ?? null
  if (prevUid) void onUserChange(prevUid)

  useAuthStore.subscribe((state) => {
    const uid = state.user?.uid ?? null
    if (uid !== prevUid) {
      prevUid = uid
      void onUserChange(uid)
    }
  })
}
