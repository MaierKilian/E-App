import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useProfilesStore } from '@/store/profilesStore'
import { useSettingsStore } from '@/store/settingsStore'
import { STORES, snapshot, hydrate, resetAllStores, metaFromState } from './stores'
import {
  createProfile,
  deleteProfile,
  getProfile,
  joinProfile,
  listProfiles,
  readLegacyState,
  removeMember,
  transferOwnership,
  writeProfileState,
} from '@/features/profiles/profiles'
import { getEntitlements } from '@/features/billing/entitlements'

/**
 * Ob der Nutzer laut Tarif noch eine weitere Wohnung anlegen darf.
 * Gilt nur für die bewusste „+"-Aktion – der interne Fallback (immer mind. eine
 * Wohnung) in `handleAccessLost` umgeht das Limit absichtlich.
 */
export function canCreateProfile(): boolean {
  const { maxProfiles } = getEntitlements()
  return useProfilesStore.getState().profiles.length < maxProfiles
}

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

/**
 * Im Demo-Modus (über `?demo` geladene Beispiel-Wohnung) wird die Cloud-Sync
 * in beide Richtungen pausiert: Es wird weder aus der Cloud in die Stores
 * eingespielt noch etwas geschrieben. So bleibt das echte Profil eines
 * angemeldeten Nutzers unberührt, während er die Demo ansieht.
 */
function demoActive(): boolean {
  return useSettingsStore.getState().demoMode
}

/** Spielt einen Cloud-Zustand ein, ohne dabei einen Rück-Schreibvorgang auszulösen. */
function applyRemote(state: Record<string, unknown>) {
  if (demoActive()) return
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
  if (demoActive()) return
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
      memberCount: existing?.memberCount ?? 1,
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
    (e) => {
      console.warn('[cloudSync] Live-Listener-Fehler:', e)
      // Zugriff verloren (z. B. aus der Wohnung entfernt)? Profile neu laden
      // und auf eine verbleibende Wohnung ausweichen.
      if ((e as { code?: string }).code === 'permission-denied' && currentUid) {
        void handleAccessLost(pid)
      }
    },
  )

  // 3. Auf künftige lokale Änderungen hören und verzögert in die Cloud schreiben.
  for (const store of Object.values(STORES)) {
    storeUnsubs.push(
      store.subscribe(() => {
        if (!isHydrating && !demoActive()) scheduleWrite(pid)
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
      const created = await createProfile(uid, seedState, displayNameOf(uid))
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
    const created = await createProfile(uid, snapshot(), displayNameOf(uid))
    useProfilesStore.getState().upsertProfile(created)
    await activateProfile(created.id)
    return created.id
  } catch (e) {
    console.warn('[cloudSync] Neues Profil anlegen fehlgeschlagen:', e)
    return null
  }
}

/** Anzeigename des angemeldeten Nutzers (für die Mitgliederliste beim Teilen). */
function displayNameOf(uid: string): string | undefined {
  const user = useAuthStore.getState().user
  return user?.uid === uid ? (user.displayName ?? user.email ?? undefined) : undefined
}

/** Lädt die Profilliste neu (z. B. nach Beitritt oder Mitglieder-Änderungen). */
export async function refreshProfiles() {
  const uid = currentUid
  if (!uid) return
  try {
    const metas = await listProfiles(uid)
    if (currentUid === uid) useProfilesStore.getState().setProfiles(metas)
  } catch (e) {
    console.warn('[cloudSync] Profile neu laden fehlgeschlagen:', e)
  }
}

/**
 * Tritt einer geteilten Wohnung per Einladung bei und wechselt direkt dorthin.
 * Wirft bei ungültiger/widerrufener Einladung (permission-denied).
 */
export async function joinSharedProfile(pid: string, inviteId: string) {
  const uid = currentUid
  if (!uid) throw new Error('not-signed-in')

  // Bereits Mitglied? (Profil lesbar) → nur wechseln.
  const already = useProfilesStore.getState().profiles.some((p) => p.id === pid)
  if (!already) {
    await joinProfile(pid, inviteId, uid, displayNameOf(uid))
    await refreshProfiles()
  }
  await switchProfile(pid)
}

/**
 * Verlässt eine geteilte Wohnung (bzw. entfernt als Besitzer ein Mitglied).
 * Wechselt danach bei Bedarf auf eine verbleibende Wohnung – oder legt eine
 * neue leere an, wenn keine übrig bleibt.
 */
export async function leaveProfile(pid: string) {
  const uid = currentUid
  if (!uid) return
  await flushPending()
  await removeMember(pid, uid)
  await handleAccessLost(pid)
}

/**
 * Löscht eine Wohnung endgültig (nur der Besitzer darf das laut Sicherheitsregeln).
 * Damit verschwindet sie für alle Bewohner. Danach wird auf eine verbleibende
 * Wohnung gewechselt – oder eine neue leere angelegt, wenn keine übrig bleibt.
 */
export async function deleteActiveProfile(pid: string) {
  const uid = currentUid
  if (!uid) return
  // Ausstehende Schreibvorgänge/Listener auf dieses Dokument stoppen, bevor es weg ist.
  if (currentPid === pid) teardownProfile()
  try {
    await deleteProfile(pid)
  } catch (e) {
    console.warn('[cloudSync] Wohnung löschen fehlgeschlagen:', e)
    throw e
  }
  await handleAccessLost(pid)
}

/**
 * Übergibt die Besitzerrolle der Wohnung an ein Mitglied. Danach ist der
 * bisherige Besitzer nur noch Editor – die Profilliste wird neu geladen, damit
 * die geänderten Rollen (und die verfügbaren Aktionen) sofort stimmen.
 */
export async function transferProfileOwnership(pid: string, newOwnerUid: string) {
  const uid = currentUid
  if (!uid) return
  await transferOwnership(pid, newOwnerUid, uid)
  await refreshProfiles()
}

/** Reagiert auf verlorenen Zugriff: Liste aktualisieren, Ausweich-Profil aktivieren. */
async function handleAccessLost(pid: string) {
  const uid = currentUid
  if (!uid) return
  if (currentPid === pid) {
    teardownProfile()
    currentPid = null
  }
  useProfilesStore.getState().removeProfile(pid)
  await refreshProfiles()
  if (currentUid !== uid) return

  const remaining = useProfilesStore.getState().profiles.filter((p) => p.id !== pid)
  if (remaining.length > 0) {
    await activateProfile(remaining[0].id)
  } else {
    await createNewProfile()
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
