import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ProfileMeta, ProfileRole } from '@/store/profilesStore'
import { metaFromState } from '@/features/sync/stores'

/**
 * Firestore-Zugriff für Wohnprofile.
 *
 * Datenmodell (bereits „teilen-fähig" für Stufe 2 vorbereitet):
 *
 *   profiles/{profileId}
 *     ├─ ownerUid:   wer das Profil erstellt hat
 *     ├─ memberUids: [uid, …]              → Abfrage „meine Profile"
 *     ├─ roles:      { uid: 'owner'|'editor' }
 *     ├─ meta:       { name, image }        → für die Kachel-Anzeige
 *     ├─ updatedAt
 *     └─ state:      { onboarding, measurements, readings, tariff, progress, drafts }
 *
 * In Stufe 1 enthält jedes Profil nur den Besitzer selbst. Das Teilen (weitere
 * Mitglieder über Einladungslink) kommt in Stufe 2 hinzu – die Struktur bleibt
 * dabei unverändert.
 */

const COLLECTION = 'profiles'

/** Firestore-Dokumentform eines Profils. */
interface ProfileDoc {
  ownerUid: string
  memberUids: string[]
  roles: Record<string, ProfileRole>
  meta: { name: string; image: string }
  updatedAt: number
  state: Record<string, unknown>
}

/** Erzeugt eine zufällige, nicht erratbare Profil-ID. */
function randomId(): string {
  return doc(collection(db, COLLECTION)).id
}

/** Wandelt ein Firestore-Dokument in die leichte Anzeige-Info um. */
function toMeta(id: string, data: ProfileDoc, uid: string): ProfileMeta {
  return {
    id,
    name: data.meta?.name ?? '',
    image: data.meta?.image ?? '',
    ownerUid: data.ownerUid,
    role: data.roles?.[uid] ?? (data.ownerUid === uid ? 'owner' : 'editor'),
    updatedAt: data.updatedAt ?? 0,
  }
}

/** Alle Profile des Nutzers – neueste zuerst. */
export async function listProfiles(uid: string): Promise<ProfileMeta[]> {
  const q = query(collection(db, COLLECTION), where('memberUids', 'array-contains', uid))
  const snap = await getDocs(q)
  const metas = snap.docs.map((d) => toMeta(d.id, d.data() as ProfileDoc, uid))
  return metas.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Legt ein neues Profil an und gibt dessen Anzeige-Info zurück. */
export async function createProfile(
  uid: string,
  state: Record<string, unknown>,
): Promise<ProfileMeta> {
  const id = randomId()
  const meta = metaFromState(state)
  const now = Date.now()
  const data: ProfileDoc = {
    ownerUid: uid,
    memberUids: [uid],
    roles: { [uid]: 'owner' },
    meta,
    updatedAt: now,
    state,
  }
  await setDoc(doc(db, COLLECTION, id), data)
  return { id, name: meta.name, image: meta.image, ownerUid: uid, role: 'owner', updatedAt: now }
}

/** Schreibt den aktuellen Zustand eines Profils (Daten + Anzeige-Metadaten). */
export async function writeProfileState(id: string, state: Record<string, unknown>) {
  const meta = metaFromState(state)
  await setDoc(
    doc(db, COLLECTION, id),
    { meta, updatedAt: Date.now(), state },
    { merge: true },
  )
}

/** Lädt ein einzelnes Profil-Dokument (oder null, wenn es nicht existiert). */
export async function getProfile(
  id: string,
): Promise<{ state?: Record<string, unknown>; meta?: { name: string; image: string } } | null> {
  const snap = await getDoc(doc(db, COLLECTION, id))
  if (!snap.exists()) return null
  const data = snap.data() as ProfileDoc
  return { state: data.state, meta: data.meta }
}

/** Löscht ein Profil (nur der Besitzer darf das laut Sicherheitsregeln). */
export async function deleteProfile(id: string) {
  await deleteDoc(doc(db, COLLECTION, id))
}

/**
 * Übernimmt einmalig die Alt-Daten aus `users/{uid}` als erstes Profil.
 * Gibt den gefundenen Zustand zurück – oder null, wenn es keine Alt-Daten gibt.
 * Das Alt-Dokument bleibt als Sicherung bestehen (wird nicht gelöscht).
 */
export async function readLegacyState(uid: string): Promise<Record<string, unknown> | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    const state = snap.data()?.state
    return state && typeof state === 'object' ? (state as Record<string, unknown>) : null
  } catch {
    return null
  }
}
