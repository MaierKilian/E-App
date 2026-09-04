// Der Haushalts-Steckbrief im Bericht.
//
// Der Bericht kannte vom Profil zwei Felder – Name und Räume. Wer das PDF
// bekommt, kennt das Objekt nicht; ohne Baujahr, Heizung und Sanierungsstand
// sind die Messwerte darunter nicht einzuordnen.
//
// Geprüft wird der Inhalt, nicht das Zeichnen: `buildProfileReportData` ist
// bewusst von der PDF-Ausgabe getrennt. Die Übersetzungen kommen aus den echten
// Sprachdateien – ein fehlender Schlüssel fällt damit hier auf und nicht erst
// im fertigen PDF.

import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'
import {
  buildProfileReportData,
  coarsePostalCode,
  fmtRow,
} from '@/features/reports/profileReportData'
import { buildDemoSnapshot } from '@/features/demo/demoProfile'
import { migrateOnboardingData } from '@/store/onboardingStore'
import type { OnboardingData } from '@/types'

/** Übersetzer auf der echten Sprachdatei; unbekannte Schlüssel kommen roh zurück. */
function translator(dict: Record<string, unknown>): TFunction {
  return ((key: string) => {
    const hit = key.split('.').reduce<unknown>((o, part) => {
      return o && typeof o === 'object' ? (o as Record<string, unknown>)[part] : undefined
    }, dict)
    return typeof hit === 'string' ? hit : key
  }) as unknown as TFunction
}

const t = translator(de)
const tEn = translator(en)

const demoProfile = (
  (buildDemoSnapshot().onboarding as { data: OnboardingData })
).data

/** Schnellstart: fast nichts beantwortet. */
const leer = migrateOnboardingData({})

const alleZeilen = (data: OnboardingData, tf = t) =>
  buildProfileReportData(data, tf, 'de').flatMap((b) => b.rows)

describe('Haushalts-Steckbrief', () => {
  it('gliedert in Gebäude, Haushalt, Anlagentechnik und Sanierungen', () => {
    const titel = buildProfileReportData(demoProfile, t, 'de').map((b) => b.title)
    expect(titel).toEqual(['Gebäude', 'Haushalt', 'Anlagentechnik', 'Sanierungen'])
  })

  it('übersetzt jede Beschriftung – in beiden Sprachen', () => {
    // Ein unbekannter Schlüssel käme roh zurück und trüge einen Punkt.
    for (const tf of [t, tEn]) {
      for (const [label] of alleZeilen(demoProfile, tf)) {
        expect(label, label).not.toMatch(/^[a-z]+(\.[a-zA-Z_]+)+$/)
      }
    }
  })

  it('kürzt die Postleitzahl auf zwei Stellen', () => {
    expect(coarsePostalCode('12683')).toBe('12___')
    expect(coarsePostalCode('')).toBeNull()
    expect(coarsePostalCode('1')).toBeNull()
  })

  it('nennt fehlende Angaben, statt sie zu verschweigen', () => {
    const zeilen = alleZeilen(leer)
    const offen = zeilen.filter(([, wert]) => wert === null)
    expect(offen.length).toBeGreaterThan(0)
    expect(fmtRow(t, null)).toBe('nicht angegeben')
  })

  it('zeigt „nie saniert", lässt das Kapitel bei „nie gefragt" aber weg', () => {
    // Seit dem Wegfall des Schritts „Gebäudehülle & Modernisierung" (04.09.2026)
    // wird der Sanierungs-Log nicht mehr erhoben. Ein Bestandsprofil, das
    // ausdrücklich „nie saniert" gewählt hat, behält seine Antwort im Bericht.
    const nie = buildProfileReportData({ ...leer, renovations: [] }, t, 'de').at(-1)!
    expect(nie.title).toBe('Sanierungen')
    expect(nie.rows).toEqual([['Stand', 'Nie saniert']])

    // `null` heißt jetzt „nie gefragt", nicht „Frage offen gelassen". Ein
    // Kapitel, das dem Leser eine Lücke vorhält, die niemand schließen kann,
    // gehört nicht in den Bericht.
    const nieGefragt = buildProfileReportData({ ...leer, renovations: null }, t, 'de')
    expect(nieGefragt.map((b) => b.title)).not.toContain('Sanierungen')
  })

  it('listet Sanierungen chronologisch', () => {
    const data: OnboardingData = {
      ...leer,
      renovations: [
        { id: 'b', year: 2018, items: ['facade'] },
        { id: 'a', year: 2005, items: ['windows'] },
      ],
    }
    const jahre = buildProfileReportData(data, t, 'de').at(-1)!.rows.map(([jahr]) => jahr)
    expect(jahre).toEqual(['2005', '2018'])
  })

  it('nennt das Baujahr des Wärmeerzeugers, wo eines bekannt ist', () => {
    const data: OnboardingData = {
      ...leer,
      heatGenerators: ['gas_boiler'],
      heatGeneratorYears: { gas_boiler: 2009 },
    }
    const anlagen = buildProfileReportData(data, t, 'de')[2]
    expect(anlagen.rows[0][1]).toContain('2009')
  })

  it('erzeugt aus dem Demo-Profil ein vollständiges Kapitel', () => {
    const offen = alleZeilen(demoProfile).filter(([, wert]) => wert === null)
    expect(offen.map(([label]) => label)).toEqual([])
  })

  it('bleibt beim Schnellstart lesbar – nicht jede Zeile ist leer', () => {
    const zeilen = alleZeilen(leer)
    const gefuellt = zeilen.filter(([, wert]) => wert !== null)
    expect(gefuellt.length).toBeGreaterThan(0)
  })
})
