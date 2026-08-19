// Prüfungen am Karteninhalt.
//
// Karten-IDs sind der Anker des Lernfortschritts: Wird eine ID doppelt vergeben
// oder nachträglich geändert, wandert der Fortschritt auf die falsche Karte oder
// verschwindet. Das prüft hier ein Test, statt es in der Dokumentation zu hoffen.

import { describe, expect, it } from 'vitest'
import deLocale from '@/i18n/locales/de.json'
import enLocale from '@/i18n/locales/en.json'
import {
  FLASHCARD_SETS,
  FLASHCARD_SUBJECTS,
  SEMESTERS,
} from '@/features/education/flashcards/flashcardsContent'
import { allCards, findCard } from '@/features/education/flashcards/cardIndex'

const allSetCards = FLASHCARD_SETS.flatMap((set) => set.cards)

describe('Karteninhalt', () => {
  it('vergibt jede Karten-ID nur einmal', () => {
    const ids = allSetCards.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('vergibt jede Set-ID nur einmal', () => {
    const ids = FLASHCARD_SETS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ordnet jedes Set einem vorhandenen Modul zu', () => {
    const subjects = new Set(FLASHCARD_SUBJECTS.map((s) => s.id))
    for (const set of FLASHCARD_SETS) {
      expect(subjects.has(set.subjectId), `${set.id} → ${set.subjectId}`).toBe(true)
    }
  })

  it('ordnet jedes Modul einem Fachsemester zu', () => {
    for (const subject of FLASHCARD_SUBJECTS) {
      expect(SEMESTERS).toContain(subject.semester)
    }
  })

  it('gibt jeder Karte eine Vorder- und eine Rückseite', () => {
    for (const card of allSetCards) {
      const front = card.frontText?.trim() || card.frontImage
      const back = card.backText?.trim() || card.backImage
      expect(front, `Vorderseite fehlt: ${card.id}`).toBeTruthy()
      expect(back, `Rückseite fehlt: ${card.id}`).toBeTruthy()
    }
  })

  it('stellt jede Frage als Frage', () => {
    // Eine Karteikarte ohne Frage auf der Vorderseite ist ein Merkzettel.
    const withoutQuestion = allSetCards.filter(
      (c) => c.frontText && !/[?:]|Nenne|Definiere|Skizziere/.test(c.frontText),
    )
    expect(withoutQuestion.map((c) => c.id)).toEqual([])
  })

  it('findet jede Karte über den Index wieder', () => {
    for (const card of allSetCards) {
      expect(findCard(card.id)?.card.id).toBe(card.id)
    }
    expect(allCards()).toHaveLength(allSetCards.length)
  })

  it('kennzeichnet Beispielkarten als solche', () => {
    // Echter Prüfungsstoff und Anschauungsmaterial dürfen nicht verwechselbar sein.
    const real = FLASHCARD_SETS.filter((s) => !s.placeholder)
    expect(real.length).toBeGreaterThan(0)
    for (const set of FLASHCARD_SETS) {
      expect(typeof set.placeholder === 'boolean' || set.placeholder === undefined).toBe(true)
    }
  })
})

describe('Bewertungsskala', () => {
  // Vorher hatte fast jeder Check eigene Labels für dieselbe vierstufige Skala
  // ("sparsam" / "Sehr gut" / "Alles frei"). Nebeneinander wirkte das zufällig.
  // Ein Override ist nur noch gerechtfertigt, wenn er den Befund benennt.
  const RATINGS = ['good', 'medium', 'elevated', 'high'] as const

  for (const [locale, dict] of [
    ['de', deLocale],
    ['en', enLocale],
  ] as const) {
    it(`ist in ${locale} vollständig`, () => {
      const m = (dict as Record<string, never>)['measurements']
      for (const r of RATINGS) {
        expect(typeof m.ratings[r], `${locale}/${r}`).toBe('string')
        expect((m.ratings[r] as string).length, `${locale}/${r}`).toBeGreaterThan(0)
      }
    })

    it(`hat in ${locale} zu jedem Override alle vier Stufen`, () => {
      const m = (dict as Record<string, never>)['measurements']
      for (const [check, node] of Object.entries(m)) {
        const overrides = (node as { result?: { ratings?: Record<string, string> } })?.result?.ratings
        if (!overrides) continue
        for (const r of RATINGS) {
          expect(typeof overrides[r], `${locale}/${check}/${r}`).toBe('string')
        }
      }
    })
  }
})
