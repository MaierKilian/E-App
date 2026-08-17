// Lokaler Speicher des Karteikarten-Ereignis-Logs (Phase 0).
//
// Warum IndexedDB und nicht localStorage wie bei den übrigen Stores:
// localStorage ist synchron, auf wenige MB begrenzt und schreibt bei jeder
// Änderung den GESAMTEN JSON-Block neu. Wer täglich 50 Karten macht, erzeugt
// über ein Studium hinweg sechsstellige Einträge – das trägt localStorage nicht,
// und es würde bei jeder Bewertung den Hauptthread blockieren.
//
// Diese Datei ist bewusst dünn: Sie kennt nur Lesen, Anhängen und Löschen. Die
// gesamte Logik (Zusammenführen, Aufteilen, Ableiten) liegt als reine Funktionen
// in `features/education/flashcards/engine/` und ist dort ohne Browser testbar.

import type { LogEntry } from '@/features/education/flashcards/engine/types'
import type { DerivedSnapshot } from '@/features/education/flashcards/engine/derive'

const DB_NAME = 'eapp-flashcards'
const DB_VERSION = 1
const STORE_ENTRIES = 'entries'
const STORE_META = 'meta'
const SNAPSHOT_KEY = 'snapshot'

/**
 * Rückfallebene ohne IndexedDB (Server-Rendering, abgeschaltete Speicherung,
 * privater Modus in älteren Browsern). Der Trainer bleibt dann in dieser Sitzung
 * benutzbar, verliert den Fortschritt aber beim Neuladen – besser als ein
 * harter Fehler mitten in einer Lernsession.
 */
const memory = { entries: new Map<string, LogEntry>(), snapshot: null as DerivedSnapshot | null }
let useMemory = false

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      useMemory = true
      resolve(null)
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const store = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' })
        store.createIndex('ts', 'ts')
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.warn('[reviewLog] IndexedDB nicht verfügbar – Rückfall auf Arbeitsspeicher')
      useMemory = true
      resolve(null)
    }
  })
  return dbPromise
}

/** Führt eine Transaktion aus und löst auf, wenn sie abgeschlossen ist. */
function tx<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T> | null,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode)
    const request = run(transaction.objectStore(store))
    transaction.oncomplete = () => resolve(request?.result)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

/**
 * Hängt Einträge an. Vorhandene IDs werden überschrieben – weil Einträge
 * unveränderlich sind, ist das Ergebnis identisch, und ein doppelt gelieferter
 * Eintrag (z. B. aus der Cloud) bleibt harmlos.
 */
export async function appendEntries(entries: LogEntry[]): Promise<void> {
  if (entries.length === 0) return
  const db = await openDb()
  if (!db) {
    for (const entry of entries) memory.entries.set(entry.id, entry)
    return
  }
  await tx(db, STORE_ENTRIES, 'readwrite', (store) => {
    for (const entry of entries) store.put(entry)
    return null
  })
}

/** Alle Einträge, nach Zeit aufsteigend. */
export async function allEntries(): Promise<LogEntry[]> {
  const db = await openDb()
  if (!db) return [...memory.entries.values()].sort((a, b) => a.ts - b.ts)
  const result = await tx<LogEntry[]>(db, STORE_ENTRIES, 'readonly', (store) =>
    store.index('ts').getAll(),
  )
  return result ?? []
}

/** Einträge ab (ausschließlich) `ts` – Grundlage des inkrementellen Ableitens. */
export async function entriesSince(ts: number): Promise<LogEntry[]> {
  const db = await openDb()
  if (!db) {
    return [...memory.entries.values()].filter((e) => e.ts > ts).sort((a, b) => a.ts - b.ts)
  }
  const range = IDBKeyRange.lowerBound(ts, true)
  const result = await tx<LogEntry[]>(db, STORE_ENTRIES, 'readonly', (store) =>
    store.index('ts').getAll(range),
  )
  return result ?? []
}

/** Anzahl gespeicherter Einträge. */
export async function countEntries(): Promise<number> {
  const db = await openDb()
  if (!db) return memory.entries.size
  const result = await tx<number>(db, STORE_ENTRIES, 'readonly', (store) => store.count())
  return result ?? 0
}

/** Zuletzt gespeicherter abgeleiteter Zustand (reiner Beschleuniger). */
export async function loadSnapshot(): Promise<DerivedSnapshot | null> {
  const db = await openDb()
  if (!db) return memory.snapshot
  const result = await tx<DerivedSnapshot>(db, STORE_META, 'readonly', (store) =>
    store.get(SNAPSHOT_KEY),
  )
  return result ?? null
}

/** Abgeleiteten Zustand sichern, damit der nächste Start nicht alles neu rechnet. */
export async function saveSnapshot(snapshot: DerivedSnapshot): Promise<void> {
  const db = await openDb()
  if (!db) {
    memory.snapshot = snapshot
    return
  }
  await tx(db, STORE_META, 'readwrite', (store) => store.put(snapshot, SNAPSHOT_KEY))
}

/**
 * Löscht Log und Schnappschuss vollständig – für „Daten zurücksetzen" und die
 * DSGVO-Löschung. Nicht wiederherstellbar.
 */
export async function clearReviewLog(): Promise<void> {
  memory.entries.clear()
  memory.snapshot = null
  const db = await openDb()
  if (!db) return
  await tx(db, STORE_ENTRIES, 'readwrite', (store) => store.clear())
  await tx(db, STORE_META, 'readwrite', (store) => store.clear())
}

/** Nur für Diagnose: Läuft der Trainer auf der Rückfallebene? */
export function isMemoryFallback(): boolean {
  return useMemory
}
