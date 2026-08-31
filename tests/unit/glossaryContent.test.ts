// Prüfungen am Glossar-Inhalt und seiner Ordnung.
//
// Der wichtigste Test ist der auf die Querverweise: `related` nennt andere
// Begriffe als freien Text. Ein Tippfehler dort erzeugt einen Chip, der ins
// Leere führt – und das fällt in der Oberfläche erst auf, wenn jemand darauf
// tippt.

import { describe, expect, it } from 'vitest'
import deLocale from '@/i18n/locales/de.json'
import enLocale from '@/i18n/locales/en.json'
import { GLOSSARY } from '@/features/education/educationContent'
import { groupByInitial, initialOf, slugifyTerm } from '@/features/education/lookup/glossary'
import { topicsOf } from '@/features/education/lookup/topics'

const TERMS = new Set(GLOSSARY.map((g) => g.term))

describe('Glossar-Inhalt', () => {
  it('vergibt jeden Begriff nur einmal', () => {
    expect(TERMS.size).toBe(GLOSSARY.length)
  })

  it('löst jeden Querverweis auf einen vorhandenen Begriff auf', () => {
    for (const item of GLOSSARY) {
      for (const ref of item.related ?? []) {
        expect(TERMS.has(ref), `${item.term} → ${ref}`).toBe(true)
      }
    }
  })

  it('verweist kein Begriff auf sich selbst', () => {
    for (const item of GLOSSARY) {
      expect(item.related ?? [], item.term).not.toContain(item.term)
    }
  })

  it('ordnet jeden Begriff einem Thema zu', () => {
    for (const item of GLOSSARY) {
      expect(item.topic, item.term).toBeTruthy()
    }
  })

  it('gibt jedem Begriff eine Definition, die etwas erklärt', () => {
    for (const item of GLOSSARY) {
      expect(item.def.length, item.term).toBeGreaterThan(100)
    }
  })

  it('beginnt keine Definition mit dem Begriff selbst', () => {
    // „Arbeitspreis: Der Arbeitspreis ist …" verschenkt die erste Zeile, und
    // genau die ist im Glossar die sichtbare.
    for (const item of GLOSSARY) {
      const firstWord = item.def.split(/[\s,(]/)[0].toLowerCase()
      expect(item.term.toLowerCase().startsWith(firstWord), item.term).toBe(false)
    }
  })

  it('gibt jeder Quelle Bezeichnung und Ziel', () => {
    for (const item of GLOSSARY) {
      expect(item.source.label.length, item.term).toBeGreaterThan(0)
      expect(item.source.url, item.term).toMatch(/^https:\/\//)
    }
  })

  it('nennt bei alternden Angaben einen Stand', () => {
    for (const item of GLOSSARY.filter((g) => g.source.stand)) {
      expect(item.source.stand, item.term).toMatch(/^\d{2}\/\d{4}$/)
    }
  })

  it('kennt zu jedem vorkommenden Thema eine Beschriftung', () => {
    for (const [locale, dict] of [
      ['de', deLocale],
      ['en', enLocale],
    ] as const) {
      const topics = (dict as Record<string, never>)['education']['topics']
      for (const topic of topicsOf(GLOSSARY)) {
        expect(typeof topics[topic], `${locale}/${topic}`).toBe('string')
      }
    }
  })
})

describe('initialOf', () => {
  it('nimmt den Großbuchstaben', () => {
    expect(initialOf('Arbeitspreis')).toBe('A')
  })

  it('zieht Umlaute auf ihren Grundbuchstaben', () => {
    expect(initialOf('Übertemperatur')).toBe('U')
    expect(initialOf('Ölkessel')).toBe('O')
  })

  it('sammelt alles Übrige unter #', () => {
    expect(initialOf('1-Rohr')).toBe('#')
    expect(initialOf('')).toBe('#')
  })
})

describe('slugifyTerm', () => {
  it('macht aus einem Begriff einen Anker', () => {
    expect(slugifyTerm('Hydraulischer Abgleich')).toBe('hydraulischer-abgleich')
  })

  it('schreibt Umlaute aus', () => {
    expect(slugifyTerm('Wärmepumpe')).toBe('waermepumpe')
    expect(slugifyTerm('Übertemperatur')).toBe('uebertemperatur')
  })

  it('verträgt Klammern und Schrägstriche', () => {
    expect(slugifyTerm('Brennwert / Heizwert')).toBe('brennwert-heizwert')
    expect(slugifyTerm('COP (Leistungszahl)')).toBe('cop-leistungszahl')
  })

  it('vergibt für jeden Begriff einen eigenen Anker', () => {
    const slugs = GLOSSARY.map((g) => slugifyTerm(g.term))
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/)
  })
})

describe('groupByInitial', () => {
  it('sortiert alphabetisch, unabhängig von der Reihenfolge im Inhalt', () => {
    const groups = groupByInitial([{ term: 'Zink' }, { term: 'Ampere' }, { term: 'Molekül' }])
    expect(groups.map((g) => g.letter)).toEqual(['A', 'M', 'Z'])
  })

  it('fasst gleiche Anfangsbuchstaben zusammen', () => {
    const groups = groupByInitial([{ term: 'Watt' }, { term: 'Wärmepumpe' }, { term: 'Amper' }])
    expect(groups).toHaveLength(2)
    expect(groups[1].items.map((i) => i.term)).toEqual(['Wärmepumpe', 'Watt'])
  })

  it('verliert keinen Begriff', () => {
    const grouped = groupByInitial(GLOSSARY).flatMap((g) => g.items)
    expect(grouped).toHaveLength(GLOSSARY.length)
  })

  it('gibt jeden Buchstaben nur einmal aus', () => {
    const letters = groupByInitial(GLOSSARY).map((g) => g.letter)
    expect(new Set(letters).size).toBe(letters.length)
  })
})
