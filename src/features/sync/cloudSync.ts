import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useProfilesStore } from '@/store/profilesStore'
import { STORES, snapshot, hydrate, resetAllStores, metaFromState } from './stores'
import {
  createProfile,
  getProfile,
  listProfiles,
  readLegacyState,
  writeProfileState,
} from '@/features/profiles/profiles'

/**
 * Cloud-Synchronisation der Wohnprofile über Firestore.
 *
 * Konzept: Jede Wohnung ist ein Dokument `profiles/{profileId}` mit einem
 * Schnappschuss aller relevanten Stores. Ein Nutzer kann mehrere Profile haben
 * (Stufe 1) und später mit anderen teilen (Stufe 2). Genau EIN Profil ist
 * „aktiv" – dessen Daten liegen in den lokalen Stores und werden angezeigt.
 *
 * Ablauf bei Anmeldung:
 *   1. Profile des Nutzers laden (oder beim ersten Mal aus den Alt-Daten bzw.
 *      den lokalen Stores das erste Profil erzeugen – Migration).
 *   2. Zuletzt geöffnetes (oder neuestes) Profil aktivieren.
 *   3. Auf Store-Änderungen hören und verzögert in die Cloud schreiben; zugleich
 *      per Live-Listener Änderungen aus der Cloud übernehmen (mehrere Geräte /
 *      später mehrere Bewohner).
 *
 * Theme/Sprache (settingsStore) werden bewusst NICHT synchronisiert.
 */

const WRITE_DELAY_MS = 1500

let isHydrating = false
let writeTimer: ReturnType<typeof setTimeout> | null = null
let storeUnsubs: Array<() => void> = []
let snapshotUnsub: (() => void) | null = null
let currentUid: string | null = null
let currentPid: string | null = null
let started = false

/** Spielt einen Cloud-Zustand ein, ohne dabei einen Rück-Schreibvorgang auszulösen. */
function applyRemote(state: Record<string, unknown>) {
  isHydrating = true
  try {
    resetAllStores()
    hydrate(state)
  } finally {
    isHydrating = false
  }
}

/** Schreibt den aktuellen Stand des aktiven Profils sofort in die Cloud. */
async function pushNow(pid: string) {
  const state = snapshot()
  try {
    await writeProfileState(pid, state)
    // Kachel-Name/Bild live aktualisieren (Rolle/Besitzer des Eintrags erhalten).
    const meta = metaFromState(state)
    const existing = useProfilesStore.getState().profiles.find((p) => p.id === pid)
    useProfilesStore.getState().upsertProfile({
      id: pid,
      name: meta.name,
      image: meta.image,
      ownerUid: existing?.ownerUid ?? currentUid ?? '',
      role: existing?.role ?? 'owner',
      updatedAt: Date.now(),
    })
  } catch (e) {
    console.warn('[cloudSync] Schreiben fehlgeschlagen:', e)
  }
}

/** Plant einen verzögerten Cloud-Schreibvorgang (sammelt schnelle Änderungen). */
function scheduleWrite(pid: string) {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    writeTimer = null
    void pushNow(pid)
  }, WRITE_DELAY_MS)
}

/** Schreibt einen ausstehenden Schreibvorgang sofort (z. B. vor einem Profilwechsel). */
async function flushPending() {
  if (writeTimer && currentPid) {
    clearTimeout(writeTimer)
    writeTimer = null
    await pushNow(currentPid)
  }
}

/** Beendet Store-Abos und den Live-Listener des aktiven Profils. */
function teardownProfile() {
  storeUnsubs.forEach((u) => u())
  storeUnsubs = []
  if (snapshotUnsub) {
    snapshotUnsub()
    snapshotUnsub = null
  }
  if (writeTimer) {
    clearTimeout(writeTimer)
    writeTimer = null
  }
}

/** Aktiviert ein Profil: dessen Daten laden, anzeigen und ab jetzt synchronisieren. */
async function activateProfile(pid: string) {
  teardownProfile()
  currentPid = pid
  useProfilesStore.getState().setActive(pid)

  // 1. Profildaten laden und in die Stores einspielen.
  try {
    const profile = await getProfile(pid)
    if (profile?.state) applyRemote(profile.state)
  } catch (e) {
    console.warn('[cloudSync] Profil laden fehlgeschlagen:', e)
  }

  // Nutzer/Profil hat zwischenzeitlich gewechselt? Dann abbrechen.
  if (currentPid !== pid) return

  // 2. Live-Listener: Änderungen aus der Cloud übernehmen (andere Geräte/Bewohner).
  snapshotUnsub = onSnapshot(
    doc(db, 'profiles', pid),
    (snap) => {
      // Eigene, noch nicht bestätigte Schreibvorgänge nicht doppelt einspielen.
      if (snap.metadata.hasPendingWrites) return
      const state = snap.data()?.state as Record<string, unknown> | undefined
      if (state) applyRemote(state)
    },
    (e) => console.warn('[cloudSync] Live-Listener-Fehler:', e),
  )

  // 3. Auf künftige lokale Änderungen hören und verzögert in die Cloud schreiben.
  for (const store of Object.values(STORES)) {
    storeUnsubs.push(
      store.subscribe(() => {
        if (!isHydrating) scheduleWrite(pid)
      }),
    )
  }
}

/** Reagiert auf Login/Logout: Profile laden bzw. Migration durchführen. */
async function onUserChange(uid: string | null) {
  teardownProfile()
  currentUid = uid
  currentPid = null

  if (!uid) {
    useProfilesStore.getState().reset()
    return
  }

  const profilesStore = useProfilesStore.getState()
  profilesStore.setStatus('loading')

  try {
    let metas = await listProfiles(uid)

    // Erststart: aus Alt-Daten oder den aktuellen lokalen Stores das erste Profil erzeugen.
    if (metas.length === 0) {
      const legacy = await readLegacyState(uid)
      const seedState = legacy ?? snapshot()
      const created = await createProfile(uid, seedState)
      metas = [created]
    }

    // Nutzer hat zwischenzeitlich gewechselt? Dann verwerfen.
    if (currentUid !== uid) return

    useProfilesStore.getState().setProfiles(metas)

    // Aktives Profil wählen: zuletzt geöffnetes, sonst das neueste.
    const persisted = useProfilesStore.getState().activeProfileId
    const activeId = metas.find((m) => m.id === persisted)?.id ?? metas[0].id

    await activateProfile(activeId)
    if (currentUid === uid) useProfilesStore.getState().setStatus('ready')
  } catch (e) {
    console.warn('[cloudSync] Profile laden fehlgeschlagen:', e)
    useProfilesStore.getState().setStatus('error')
  }
}

/**
 * Wechselt zum angegebenen Profil (schreibt vorher den aktuellen Stand).
 * Für die Kachel-Umschaltung im Zuhause-Bereich.
 */
export async function switchProfile(pid: string) {
  if (pid === currentPid) return
  await flushPending()
  await activateProfile(pid)
}

/**
 * Legt eine neue, leere Wohnung an und wechselt direkt dorthin.
 * Der Nutzer landet danach im Onboarding für die neue Wohnung.
 */
export async function createNewProfile(): Promise<string | null> {
  const uid = currentUid
  if (!uid) return null
  await flushPending()
  teardownProfile()
  currentPid = null

  // Leeres Profil: Stores zurücksetzen, diesen leeren Stand als neues Profil speichern.
  isHydrating = true
  try {
    resetAllStores()
  } finally {
    isHydrating = false
  }

  try {
    const created = await createProfile(uid, snapshot())
    useProfilesStore.getState().upsertProfile(created)
    await activateProfile(created.id)
    return created.id
  } catch (e) {
    console.warn('[cloudSync] Neues Profil anlegen fehlgeschlagen:', e)
    return null
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
