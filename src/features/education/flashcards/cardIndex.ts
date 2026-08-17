// Brücke zwischen Karteninhalt und Engine (Phase 1).
//
// Die Engine kennt keine Karteninhalte – sie arbeitet nur mit IDs und Zuständen.
// Der Inhalt kennt umgekehrt die Engine nicht. Diese Datei verbindet beides:
// Sie liefert die schmalen `QueueCard`-Objekte, die der Warteschlangenbau
// braucht, und findet umgekehrt zu einer ID die Karte samt Kontext.

import type { QueueCard } from './engine/queue'
import {
  FLASHCARD_SETS,
  modulesForSemester,
  setsForSubject,
  type Flashcard,
  type FlashcardSet,
} from './flashcardsContent'

/** Karte samt Set und Fach – für Anzeige und Fach-Filter. */
export interface CardWithContext {
  card: Flashcard
  set: FlashcardSet
  subjectId: string
}

function toQueueCard(card: Flashcard, set: FlashcardSet): QueueCard {
  return { cardId: card.id, subjectId: set.subjectId, setId: set.id }
}

/** Alle Karten eines Sets. */
export function cardsOfSet(setId: string): QueueCard[] {
  const set = FLASHCARD_SETS.find((s) => s.id === setId)
  if (!set) return []
  return set.cards.map((card) => toQueueCard(card, set))
}

/** Alle Karten eines Moduls (über alle Sets). */
export function cardsOfSubject(subjectId: string): QueueCard[] {
  return setsForSubject(subjectId).flatMap((set) => set.cards.map((card) => toQueueCard(card, set)))
}

/** Alle Karten eines Semesters (über alle Module). */
export function cardsOfSemester(semester: number): QueueCard[] {
  return modulesForSemester(semester).flatMap((m) => cardsOfSubject(m.id))
}

/** Alle Karten des gesamten Bestands – Grundlage der „Heute"-Ansicht. */
export function allCards(): QueueCard[] {
  return FLASHCARD_SETS.flatMap((set) => set.cards.map((card) => toQueueCard(card, set)))
}

/** Nachschlagewerk ID → Karte samt Kontext. Einmal gebaut, dann konstant. */
const BY_ID: Map<string, CardWithContext> = new Map(
  FLASHCARD_SETS.flatMap((set) =>
    set.cards.map(
      (card) => [card.id, { card, set, subjectId: set.subjectId }] as [string, CardWithContext],
    ),
  ),
)

/** Karte samt Set und Fach zu einer ID. */
export function findCard(cardId: string): CardWithContext | undefined {
  return BY_ID.get(cardId)
}

/**
 * IDs, die es im Inhalt (noch) gibt. Nützlich, um Fortschritt zu ignorieren,
 * dessen Karte entfernt wurde – der Lernstand bleibt im Log erhalten, taucht
 * aber nirgends mehr auf.
 */
export function isKnownCard(cardId: string): boolean {
  return BY_ID.has(cardId)
}
