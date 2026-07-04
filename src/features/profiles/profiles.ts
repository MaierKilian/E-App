import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ProfileMeta, ProfileRole } from '@/store/profilesStore'
import { metaFromState } from '@/features/sync/stores'

/**
 * Firestore-Zugriff für Wohnprofile.
 *
 * Datenmodell:
 *
 *   profiles/{profileId}
 *     ├─ ownerUid:    wer das Profil erstellt hat
 *     ├─ memberUids:  [uid, …]               → Abfrage „meine Profile"
 *     ├─ roles:       { uid: 'owner'|'editor' }
 *     ├─ memberNames: { uid: Anzeigename }    → für die Mitgliederliste
 *     ├─ meta:        { name, image }         → für die Kachel-Anzeige
 *     ├─ updatedAt
 *     └─ state:       { onboarding, measurements, readings, tariff, progress, drafts }
 *
 *   profiles/{profileId}/invites/{inviteId}
 *     ├─ active:    true|false   → Besitzer kann den Link jederzeit widerrufen
 *     ├─ role:      'editor'
 *     ├─ createdBy: uid
 *     └─ createdAt
 *
 * Die Einladungs-ID ist ein langer Zufallsstring und steckt im Einladungslink –
 * sie ist das „Geheimnis", das zum Beitritt berechtigt (wie bei geteilten Docs).
 */

const COLLECTION = 'profiles'

/** Firestore-Dokumentform eines Profils. */
interface ProfileDoc {
  ownerUid: string
  memberUids: string[]
  roles: Record<string, ProfileRole>
  memberNames?: Record<string, string>
  meta: { name: string; image: string }
  updatedAt: number
  state: Record<string, unknown>
}

/** Ein Mitglied einer Wohnung (für die Mitgliederliste im Teilen-Dialog). */
export interface ProfileMember {
  uid: string
  name: string
  role: ProfileRole
}

/** Erzeugt eine zufällige, nicht erratbare Dokument-ID. */
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
    memberCount: data.memberUids?.length ?? 1,
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
  displayName?: string,
): Promise<ProfileMeta> {
  const id = randomId()
  const meta = metaFromState(state)
  const now = Date.now()
  const data: ProfileDoc = {
    ownerUid: uid,
    memberUids: [uid],
    roles: { [uid]: 'owner' },
    memberNames: { [uid]: displayName ?? '' },
    meta,
    updatedAt: now,
    state,
  }
  await setDoc(doc(db, COLLECTION, id), data)
  return {
    id,
    name: meta.name,
    image: meta.image,
    ownerUid: uid,
    role: 'owner',
    memberCount: 1,
    updatedAt: now,
  }
}

/**
 * Schreibt den aktuellen Zustand eines Profils (Daten + Anzeige-Metadaten).
 * Bewusst updateDoc statt setDoc/merge: `state` wird dadurch als Ganzes ersetzt,
 * sodass lokal gelöschte Einträge auch in der Cloud verschwinden – und die
 * Mitgliedschaftsfelder bleiben unangetastet.
 */
export async function writeProfileState(id: string, state: Record<string, unknown>) {
  const meta = metaFromState(state)
  await updateDoc(doc(db, COLLECTION, id), { meta, updatedAt: Date.now(), state })
}

/** Lädt ein einzelnes Profil-Dokument (oder null, wenn nicht existent/kein Zugriff). */
export async function getProfile(id: string): Promise<{
  state?: Record<string, unknown>
  meta?: { name: string; image: string }
  ownerUid?: string
  members?: ProfileMember[]
} | null> {
  const snap = await getDoc(doc(db, COLLECTION, id))
  if (!snap.exists()) return null
  const data = snap.data() as ProfileDoc
  const members: ProfileMember[] = (data.memberUids ?? []).map((uid) => ({
    uid,
    name: data.memberNames?.[uid] ?? '',
    role: data.roles?.[uid] ?? (data.ownerUid === uid ? 'owner' : 'editor'),
  }))
  return { state: data.state, meta: data.meta, ownerUid: data.ownerUid, members }
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

// ---------------------------------------------------------------------------
// Teilen: Einladungen & Mitgliedschaft (Stufe 2)
// ---------------------------------------------------------------------------

/**
 * Liefert die aktive Einladung der Wohnung – oder erstellt eine neue,
 * falls noch keine existiert. Nur der Besitzer darf das (Sicherheitsregeln).
 */
export async function getOrCreateInvite(pid: string, uid: string): Promise<string> {
  const invitesRef = collection(db, COLLECTION, pid, 'invites')
  const snap = await getDocs(query(invitesRef, where('active', '==', true), limit(1)))
  if (!snap.empty) return snap.docs[0].id

  const inviteRef = doc(invitesRef)
  await setDoc(inviteRef, {
    active: true,
    role: 'editor',
    createdBy: uid,
    createdAt: Date.now(),
  })
  return inviteRef.id
}

/**
 * Widerruft alle aktiven Einladungen und erstellt eine frische.
 * Damit wird der alte Einladungslink sofort ungültig.
 */
export async function rotateInvite(pid: string, uid: string): Promise<string> {
  const invitesRef = collection(db, COLLECTION, pid, 'invites')
  const snap = await getDocs(query(invitesRef, where('active', '==', true)))
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { active: false })))
  return getOrCreateInvite(pid, uid)
}

/** Baut aus Profil- und Einladungs-ID den teilbaren Einladungslink. */
export function buildInviteLink(pid: string, inviteId: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${window.location.origin}${base}join/${pid}/${inviteId}`
}

/**
 * Tritt einer Wohnung per Einladung bei: trägt den Nutzer selbst als Editor
 * ein. Die Sicherheitsregeln prüfen dabei, dass die Einladung aktiv ist.
 */
export async function joinProfile(
  pid: string,
  inviteId: string,
  uid: string,
  displayName?: string,
) {
  await updateDoc(doc(db, COLLECTION, pid), {
    memberUids: arrayUnion(uid),
    [`roles.${uid}`]: 'editor',
    [`memberNames.${uid}`]: displayName ?? '',
    joinInviteId: inviteId,
  })
}

/**
 * Entfernt ein Mitglied aus der Wohnung. Wird sowohl vom Besitzer
 * (Mitglied entfernen) als auch vom Mitglied selbst (Wohnung verlassen) genutzt.
 */
export async function removeMember(pid: string, memberUid: string) {
  await updateDoc(doc(db, COLLECTION, pid), {
    memberUids: arrayRemove(memberUid),
    [`roles.${memberUid}`]: deleteField(),
    [`memberNames.${memberUid}`]: deleteField(),
  })
}
