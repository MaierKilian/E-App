// Prüfungen an den Mess-Hintergründen.
//
// Der wichtigste Test ist der auf die Richtwerte: Sie werden aus den
// Mess-Modulen gelesen, nicht im Text wiederholt. Bricht dieser Bezug, behauptet
// der Wissensbereich irgendwann einen Grenzwert, den die Messung längst anders
// sieht – genau die Art Geister-Zahl, die im Bericht schon einmal aufgeräumt
// werden musste.

import { describe, expect, it } from 'vitest'
import deLocale from '@/i18n/locales/de.json'
import enLocale from '@/i18n/locales/en.json'
import { MEASUREMENT_INFOS } from '@/features/education/educationContent'
import { MEASUREMENT_THRESHOLDS } from '@/features/education/measurementThresholds'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { GOOD_MAX as FLOW_GOOD_MAX } from '@/features/measurements/showerhead/showerhead'
import { WAIT_GOOD_MAX_S } from '@/features/measurements/hot_water_wait/hotWaterWait'
import { GOOD_MAX as STANDBY_GOOD_MAX } from '@/features/measurements/standby/standby'

describe('Mess-Hintergründe', () => {
  it('deckt jede Messung des Katalogs ab', () => {
    const covered = new Set(MEASUREMENT_INFOS.map((i) => i.id))
    for (const meta of MEASUREMENT_CATALOG) {
      expect(covered.has(meta.id), meta.id).toBe(true)
    }
  })

  it('beschreibt keine Messung, die es nicht gibt', () => {
    const known = new Set(MEASUREMENT_CATALOG.map((m) => m.id))
    for (const info of MEASUREMENT_INFOS) {
      expect(known.has(info.id as never), info.id).toBe(true)
    }
  })

  it('vergibt jede Kennung nur einmal', () => {
    const ids = MEASUREMENT_INFOS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gibt jedem Hintergrund die drei Fließtext-Abschnitte', () => {
    for (const info of MEASUREMENT_INFOS) {
      expect(info.body.length, info.id).toBeGreaterThan(150)
      expect(info.sections?.influence.length, info.id).toBeGreaterThanOrEqual(3)
      expect(info.sections?.mistakes.length, info.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('wiederholt die Messanleitung nicht', () => {
    // Die Anleitung steht im Messablauf. Stand sie zusätzlich hier, liefen die
    // beiden Fassungen auseinander.
    for (const info of MEASUREMENT_INFOS) {
      expect(info.body, info.id).not.toMatch(/So misst du/i)
    }
  })

  it('ordnet jeden Hintergrund einem Thema zu', () => {
    for (const info of MEASUREMENT_INFOS) {
      expect(info.topic, info.id).toBeTruthy()
    }
  })
})

describe('Vertiefende Fragen an den Messungen', () => {
  const withQuestions = MEASUREMENT_INFOS.filter((i) => i.sections?.questions?.length)

  it('hat die Fachfragen aus der FAQ aufgenommen', () => {
    expect(withQuestions.length).toBeGreaterThanOrEqual(5)
  })

  it('stellt jede Frage als Frage und beantwortet sie', () => {
    for (const info of withQuestions) {
      for (const item of info.sections!.questions!) {
        expect(item.q.endsWith('?'), `${info.id}: ${item.q}`).toBe(true)
        expect(item.a.length, `${info.id}: ${item.q}`).toBeGreaterThan(120)
      }
    }
  })

  it('stellt keine Frage zweimal', () => {
    const all = withQuestions.flatMap((i) => i.sections!.questions!.map((q) => q.q))
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('Richtwert-Tabellen', () => {
  it('gehört jede Tabelle zu einer vorhandenen Messung', () => {
    const known = new Set(MEASUREMENT_CATALOG.map((m) => m.id))
    for (const id of Object.keys(MEASUREMENT_THRESHOLDS)) {
      expect(known.has(id as never), id).toBe(true)
    }
  })

  it('gibt jeder Zeile Beschriftung und Bereich', () => {
    for (const [id, table] of Object.entries(MEASUREMENT_THRESHOLDS)) {
      expect(table!.rows.length, id).toBeGreaterThanOrEqual(2)
      for (const row of table!.rows) {
        expect(row.label.length, id).toBeGreaterThan(0)
        expect(row.range, `${id}/${row.label}`).toMatch(/\d/)
      }
    }
  })

  it('liest die Grenzen aus den Mess-Modulen', () => {
    // Der eigentliche Punkt dieser Etappe: Ändert sich eine Grenze im Modul,
    // ändert sich die Tabelle mit. Diese drei Stichproben halten das fest.
    expect(MEASUREMENT_THRESHOLDS.showerhead?.rows[0].range).toContain(String(FLOW_GOOD_MAX))
    expect(MEASUREMENT_THRESHOLDS.hot_water_wait?.rows[0].range).toContain(String(WAIT_GOOD_MAX_S))
    expect(MEASUREMENT_THRESHOLDS.standby?.rows[0].range).toContain(String(STANDBY_GOOD_MAX))
  })

  it('lässt nur den Check ohne Tabelle, der keine Messgröße hat', () => {
    const withoutTable = MEASUREMENT_CATALOG.map((m) => m.id).filter(
      (id) => !MEASUREMENT_THRESHOLDS[id],
    )
    expect(withoutTable).toEqual(['lighting'])
  })
})

describe('Reiter-Beschriftung', () => {
  it('heißt nicht mehr wie ein Bereich der unteren Navigationsleiste', () => {
    for (const [locale, dict] of [
      ['de', deLocale],
      ['en', enLocale],
    ] as const) {
      const d = dict as Record<string, never>
      const tab = d['education']['sections']['measurements'] as string
      const navLabel = d['nav']['measurements'] as string
      expect(tab, locale).not.toBe(navLabel)
    }
  })
})
