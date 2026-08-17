import { useEffect, useState } from 'react'
import { useFlashcardStore } from '@/store/flashcardStore'
import {
  doneToday,
  dueCounts,
  todayProgress,
  type DueCounts,
  type QueueCard,
  type TodayProgress,
} from './engine/queue'
import { streakInfo, type StreakInfo } from './engine/rollups'

/**
 * React-Anbindung der Karteikarten-Engine.
 *
 * Die Rechnungen selbst stehen in `engine/` und sind rein; hier geht es nur
 * darum, sie mit dem Store zu verbinden und die Oberfläche bei Änderungen neu
 * zu zeichnen.
 */

/**
 * Lädt den Lernstand aus IndexedDB (einmalig) und meldet, ob er bereitsteht.
 * Vorher zeigt die Oberfläche keine Zahlen – falsche Zahlen wären schlimmer als
 * gar keine.
 */
export function useFlashcardsReady(): boolean {
  const ready = useFlashcardStore((s) => s.ready)
  const init = useFlashcardStore((s) => s.init)
  useEffect(() => {
    void init()
  }, [init])
  return ready
}

/**
 * Aktueller Zeitpunkt, minütlich aktualisiert.
 *
 * Fälligkeiten hängen an der Uhr: Eine Karte, die in drei Minuten wieder dran
 * ist, muss in der Übersicht von selbst auftauchen. Minütlich reicht dafür und
 * hält die Zahl während des Renderns stabil.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Was von diesem Kartenstapel heute noch ansteht. */
export function useDueCounts(cards: QueueCard[], now: number): DueCounts {
  const params = useFlashcardStore((s) => s.params)
  const states = useFlashcardStore((s) => s.states)
  const rollups = useFlashcardStore((s) => s.rollups)

  // Bewusst ohne useMemo: Der Warteschlangenbau ist eine lineare Rechnung über
  // die übergebenen Karten und bei den heutigen Mengen nicht messbar. Sollte der
  // Bestand einmal in die Tausende gehen, gehört hier ein Zwischenspeicher hin.
  return dueCounts({
    cards,
    states,
    params,
    now,
    doneToday: doneToday(rollups, now, params.dayCutoffHour),
  })
}

/** Tagesfortschritt dieses Stapels: abgehakt und noch in Arbeit. */
export function useTodayProgress(cards: QueueCard[], now: number): TodayProgress {
  const params = useFlashcardStore((s) => s.params)
  const states = useFlashcardStore((s) => s.states)
  return todayProgress(cards, states, now, params.dayCutoffHour)
}

/** Aktuelle und längste Lernserie. */
export function useStreak(now: number): StreakInfo {
  const params = useFlashcardStore((s) => s.params)
  const rollups = useFlashcardStore((s) => s.rollups)
  return streakInfo(rollups, now, params.dayCutoffHour)
}
