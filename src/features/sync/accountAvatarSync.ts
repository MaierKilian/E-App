import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import { useAccountAvatarStore } from '@/store/accountAvatarStore'

/**
 * Geräteübergreifende Synchronisation des Konto-Profilbilds über Firestore.
 *
 * Ablage: `users/{uid}.accountPhoto` (Data-URL). Anders als die Wohnprofile
 * (`profiles/{id}`) gehört das Bild zum ANGEMELDETEN KONTO – deshalb ein
 * nutzergebundenes Dokument. Die Sicherheitsregeln erlauben genau dem Nutzer
 * Lese-/Schreibzugriff auf sein eigenes `users/{uid}`.
 *
 * Bewusst NICHT als Firebase-`photoURL` gespeichert: ein Data-URL würde das
 * Auth-Token unnötig aufblähen. `user.photoURL` (z. B. Google) bleibt aber als
 * automatischer Fallback – siehe `useAccountAvatarSrc()`.
 *
 * Der lokale `accountAvatarStore` (localStorage) dient als Cache: Das Bild
 * erscheint sofort beim Start und offline, während Firestore die Quelle der
 * Wahrheit ist und alle Geräte aktuell hält.
 */

/** Dokument-Referenz auf das Nutzerkonto. */
function userRef(uid: string) {
  return doc(getDb(), 'users', uid)
}

let currentUid: string | null = null
let unsub: (() => void) | null = null
let started = false

/** Live-Listener auf das Nutzerdokument: Cache bei Cloud-Änderungen aktualisieren. */
function listen(uid: string) {
  teardown()
  currentUid = uid
  unsub = onSnapshot(
    userRef(uid),
    (snap) => {
      // Eigene, noch nicht bestätigte Schreibvorgänge nicht doppelt einspielen.
      if (snap.metadata.hasPendingWrites) return
      const photo = snap.data()?.accountPhoto
      const store = useAccountAvatarStore.getState()
      if (typeof photo === 'string' && photo) store.setAvatar(uid, photo)
      else store.removeAvatar(uid)
    },
    (e) => console.warn('[accountAvatarSync] Live-Listener-Fehler:', e),
  )
}

/** Listener beenden. */
function teardown() {
  if (unsub) {
    unsub()
    unsub = null
  }
  currentUid = null
}

/**
 * Setzt das Konto-Profilbild: optimistisch im lokalen Cache und in Firestore.
 * Wirkt sofort auf allen Geräten des Nutzers (Live-Listener).
 */
export async function saveAccountPhoto(dataUrl: string): Promise<void> {
  const uid = useAuthStore.getState().user?.uid
  if (!uid) return
  useAccountAvatarStore.getState().setAvatar(uid, dataUrl)
  try {
    await setDoc(userRef(uid), { accountPhoto: dataUrl }, { merge: true })
  } catch (e) {
    console.warn('[accountAvatarSync] Profilbild speichern fehlgeschlagen:', e)
  }
}

/** Entfernt das selbst gewählte Konto-Profilbild (Cache + Firestore). */
export async function deleteAccountPhoto(): Promise<void> {
  const uid = useAuthStore.getState().user?.uid
  if (!uid) return
  useAccountAvatarStore.getState().removeAvatar(uid)
  try {
    await setDoc(userRef(uid), { accountPhoto: deleteField() }, { merge: true })
  } catch (e) {
    console.warn('[accountAvatarSync] Profilbild entfernen fehlgeschlagen:', e)
  }
}

/**
 * Startet die Konto-Profilbild-Synchronisation (einmalig beim App-Start).
 * Reagiert auf Login/Logout und hört pro angemeldetem Nutzer auf Cloud-Änderungen.
 */
export function initAccountAvatarSync() {
  if (started) return
  started = true

  const initialUid = useAuthStore.getState().user?.uid ?? null
  if (initialUid) listen(initialUid)

  useAuthStore.subscribe((state) => {
    const uid = state.user?.uid ?? null
    if (uid === currentUid) return
    if (uid) listen(uid)
    else teardown()
  })
}
