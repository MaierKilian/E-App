// Die Reiter des Wissensbereichs brauchen in beiden Sprachen eine Beschriftung.
import { describe, expect, it } from 'vitest'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'

// Dieselbe Liste wie `Section` in `EducationPage`. Der Compiler erzwingt die
// Gegenrichtung nicht: Ein neuer Reiter ohne Beschriftung zeigte dem Nutzer
// einen rohen i18n-Schlüssel als Chip.
const SECTIONS = ['faq', 'glossary', 'measurements', 'instruments', 'university', 'flashcards']

describe('Reiter des Wissensbereichs', () => {
  for (const [name, dict] of [['de', de], ['en', en]] as const) {
    it(`beschriftet in ${name} jeden Reiter`, () => {
      const labels = dict.education.sections as Record<string, string>
      for (const s of SECTIONS) {
        expect(labels[s], `${name}/${s}`).toBeTruthy()
      }
    })
  }

  it(`erklärt die Ausrüstungs-Seite in beiden Sprachen`, () => {
    // Die Übersicht „Was du zum Messen brauchst" gab es nur im Fragebogen –
    // dort sieht sie jeder genau einmal, beim Anlegen der Wohnung.
    for (const [name, dict] of [['de', de], ['en', en]] as const) {
      const sub = (dict.education as Record<string, unknown>).instruments as { subtitle: string }
      expect(sub?.subtitle, name).toBeTruthy()
    }
  })
})
