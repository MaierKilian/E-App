import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Ein Eintrag im Änderungsprotokoll: was sich geändert hat und wann. */
export interface ChangelogEntry {
  id: string
  /** ISO-Datum (YYYY-MM-DD), unter dem der Eintrag gruppiert wird. */
  date: string
  title: string
  description: string
}

interface ChangelogState {
  entries: ChangelogEntry[]
}

/**
 * Startpunkt des Protokolls: die Änderungen, mit denen das Protokoll selbst
 * eingeführt wurde. Ab hier wandert jede weitere Änderung per
 * `addChangelogEntry` dazu.
 */
const SEED_DATE = '2026-08-23'
const SEED_ENTRIES: ChangelogEntry[] = [
  {
    id: 'seed-changelog',
    date: SEED_DATE,
    title: 'Neu: Änderungsprotokoll',
    description:
      'Neue Seite unter Einstellungen → Über: listet alle neuen bzw. geänderten Funktionen der App auf und lässt sich als PDF herunterladen.',
  },
  {
    id: 'seed-scroll-cues',
    date: SEED_DATE,
    title: 'Startseite: Scroll-Hinweise zwischen den Abschnitten',
    description:
      'Zwischen den Abschnitten der Startseite zeigt jetzt ein sanft schwingender Pfeil, dass beim Herunterscrollen weitere Informationen folgen.',
  },
  {
    id: 'seed-education-htw-toggle',
    date: SEED_DATE,
    title: 'Wissen: HTW GEIT nur noch über Icon-Button erreichbar',
    description:
      'Der Umschalter mit den zwei breiten Buttons wurde entfernt. Der HTW-GEIT-Bereich ist jetzt über einen kompakten, rechtsbündigen Button mit Absolventenkappen-Symbol erreichbar. Außerdem erscheinen beliebte FAQ-Fragen nicht mehr doppelt unter „Alle Fragen".',
  },
  {
    id: 'seed-logo-home-link',
    date: SEED_DATE,
    title: 'Logo führt jetzt zum Zuhause-Bereich',
    description:
      'Das E-App-Logo in der Kopfzeile und auf der Startseite ist jetzt anklickbar und führt zurück zum Zuhause-Bereich.',
  },
]

/**
 * Änderungsprotokoll der App: hält fest, welche Funktionen neu hinzukamen
 * oder verändert wurden – bewusst als eigener, dauerhafter Store (localStorage
 * `eapp-changelog`), damit die Historie einen Neuladen der Seite übersteht und
 * sich unabhängig von einzelnen Features als PDF exportieren lässt.
 *
 * Neue Einträge werden mit `addChangelogEntry` ergänzt, sobald eine Änderung
 * abgeschlossen ist – neueste zuerst, damit die Anzeige sie nicht sortieren
 * muss.
 */
export const useChangelogStore = create<ChangelogState>()(
  persist(
    () => ({
      entries: SEED_ENTRIES,
    }),
    { name: 'eapp-changelog' },
  ),
)

/** Fügt einen neuen Änderungseintrag oben in die Liste ein. */
export function addChangelogEntry(entry: Omit<ChangelogEntry, 'id' | 'date'>): void {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const date = new Date().toISOString().slice(0, 10)
  useChangelogStore.setState((s) => ({
    entries: [{ id, date, ...entry }, ...s.entries],
  }))
}
