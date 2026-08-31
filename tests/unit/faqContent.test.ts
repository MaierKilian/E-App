// Prüfungen am FAQ-Inhalt.
//
// Die Kennung einer Frage trägt ihren Anker (`#faq-<id>`) und damit jeden
// Verweis auf sie. Wird eine doppelt vergeben oder nachträglich geändert,
// zeigt der Verweis ins Leere. Das prüft hier ein Test, statt es in der
// Dokumentation zu hoffen.

import { describe, expect, it } from 'vitest'
import deLocale from '@/i18n/locales/de.json'
import enLocale from '@/i18n/locales/en.json'
import { FAQ } from '@/features/education/educationContent'
import { groupByTopic, topicsOf } from '@/features/education/lookup/topics'
import { deriveTeaser, teaserOf } from '@/features/education/lookup/search'

describe('FAQ-Inhalt', () => {
  it('vergibt jede Kennung nur einmal', () => {
    const ids = FAQ.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('nutzt Kennungen, die sich als Anker eignen', () => {
    // Kleinbuchstaben, Ziffern, Bindestrich – alles andere müsste in der URL
    // kodiert werden und wäre als Verweis nicht mehr lesbar.
    for (const item of FAQ) {
      expect(item.id, item.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('ordnet jede Frage einem Thema zu', () => {
    for (const item of FAQ) {
      expect(item.topic, item.q).toBeTruthy()
    }
  })

  it('stellt jede Frage als Frage', () => {
    for (const item of FAQ) {
      expect(item.q.endsWith('?'), item.q).toBe(true)
    }
  })

  it('gibt jeder Frage eine Antwort, die etwas erklärt', () => {
    for (const item of FAQ) {
      expect(item.a.length, item.q).toBeGreaterThan(120)
    }
  })

  it('hebt eine überschaubare Zahl von Fragen hervor', () => {
    // „Beliebt" wirkt nur, solange es die Ausnahme ist.
    const popular = FAQ.filter((f) => f.popular)
    expect(popular.length).toBeGreaterThanOrEqual(3)
    expect(popular.length).toBeLessThanOrEqual(6)
  })

  it('gibt jeder Quelle Bezeichnung und Ziel', () => {
    for (const item of FAQ) {
      if (!item.source) continue
      expect(item.source.label.length, item.id).toBeGreaterThan(0)
      expect(item.source.url, item.id).toMatch(/^https:\/\//)
    }
  })

  it('nennt bei alternden Angaben einen Stand', () => {
    // Wo eine Zahl altert (Abgaben, Förderung), muss der Stand dabeistehen –
    // sonst liest sich ein Betrag wie eine zeitlose Wahrheit.
    const dated = FAQ.filter((f) => f.source?.stand)
    expect(dated.length).toBeGreaterThan(0)
    for (const item of dated) {
      expect(item.source?.stand, item.id).toMatch(/^\d{2}\/\d{4}$/)
    }
  })
})

describe('FAQ-Gliederung', () => {
  it('verteilt die Fragen auf mehrere Themen', () => {
    expect(topicsOf(FAQ).length).toBeGreaterThanOrEqual(5)
  })

  it('verliert beim Gruppieren keine Frage', () => {
    const rest = FAQ.filter((f) => !f.popular)
    const grouped = groupByTopic(rest).flatMap((g) => g.items)
    expect(grouped).toHaveLength(rest.length)
    expect(new Set(grouped.map((f) => f.id)).size).toBe(rest.length)
  })

  it('kennt zu jedem vorkommenden Thema eine Beschriftung', () => {
    for (const [locale, dict] of [
      ['de', deLocale],
      ['en', enLocale],
    ] as const) {
      const topics = (dict as Record<string, never>)['education']['topics']
      for (const topic of topicsOf(FAQ)) {
        expect(typeof topics[topic], `${locale}/${topic}`).toBe('string')
      }
    }
  })
})

describe('FAQ-Vorschau', () => {
  it('leitet für jede Frage eine Vorschau ab', () => {
    for (const item of FAQ) {
      const teaser = teaserOf(item, item.a)
      expect(teaser.length, item.id).toBeGreaterThan(20)
    }
  })

  it('lässt keine Vorschau in einer angebrochenen Abkürzung enden', () => {
    for (const item of FAQ) {
      // Ein einzelner Buchstabe vor dem Auslassungszeichen ist immer ein Rest.
      expect(deriveTeaser(item.a), item.id).not.toMatch(/\s[A-Za-zÄÖÜäöü]\.? …$/)
    }
  })
})
