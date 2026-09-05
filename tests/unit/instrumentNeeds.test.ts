// Die Geräte-Übersicht im Fragebogen ist abgeleitet, nicht geschrieben.
//
// Vorgeschichte: An dieser Stelle fragte die App, welche Messgeräte vorhanden
// sind. Die Antwort hatte genau eine Wirkung, die 24 wählbaren Bauarten gar
// keine. Jetzt steht dort eine Auskunft – und die ist nur so viel wert, wie sie
// stimmt. Deshalb hängt sie an `MEASUREMENT_CATALOG` und nicht an einer zweiten
// Liste, und deshalb prüfen diese Tests genau diese Kopplung.

import { describe, expect, it } from 'vitest'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import {
  instrumentsToShow,
  measurementsWithoutRequiredInstrument,
  summarizeInstrumentNeeds,
} from '@/features/measurements/instrumentNeeds'
import { getModelTypes } from '@/features/onboarding/instrumentOptions'
import deLocale from '@/i18n/locales/de.json'
import enLocale from '@/i18n/locales/en.json'

const LOCALES = { de: deLocale, en: enLocale } as Record<string, Record<string, never>>

/** Greift einen verschachtelten i18n-Schlüssel ab ("a.b.c"). */
function at(locale: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) return (acc as Record<string, unknown>)[key]
    return undefined
  }, locale)
}

describe('Messgeräte-Bedarf', () => {
  it('trägt zu jeder verfügbaren Messung eine Angabe – „braucht keins" eingeschlossen', () => {
    // Der Typechecker erzwingt das Feld schon. Hier steht es gegen das
    // eigentliche Risiko: dass jemand eine Messung ergänzt und das Array leer
    // lässt, weil er den Zusammenhang nicht kennt. Ein leeres Array ist eine
    // gültige Aussage – aber nur für Messungen, die wirklich ohne auskommen.
    for (const meta of MEASUREMENT_CATALOG) {
      expect(Array.isArray(meta.instruments), meta.id).toBe(true)
    }
    const ohne = measurementsWithoutRequiredInstrument()
    expect(ohne).toContain('showerhead')
    expect(ohne).toContain('lighting')
    // Der Möbelabstand-Check nennt ein Abstandsmessgerät, verlangt es aber
    // nicht – für die Frage „womit kann ich sofort anfangen?" zählt das.
    expect(ohne).toContain('furniture_spacing')
  })

  it('nennt kein Gerät doppelt je Messung', () => {
    for (const meta of MEASUREMENT_CATALOG) {
      const typen = meta.instruments.map((i) => i.type)
      expect(new Set(typen).size, meta.id).toBe(typen.length)
    }
  })

  it('leitet die Rolle aus dem Katalog ab, statt sie zu behaupten', () => {
    const nach = Object.fromEntries(summarizeInstrumentNeeds().map((s) => [s.type, s]))

    // Ohne Thermometer gibt es im Raumklima- und Kühlschrank-Check nichts
    // einzugeben; die Luftfeuchte ist dort der Zusatzschritt.
    expect(nach.temperature_sensor.role).toBe('required')
    expect(nach.humidity_sensor.role).toBe('optional')
    expect(nach.humidity_sensor.requiredFor).toEqual([])

    // Der CO₂-Sensor stand jahrelang zur Auswahl, ohne dass ihn etwas gelesen
    // hätte. Diese Zeile ist der Grund, warum „ungenutzt" eine eigene Stufe ist:
    // Sobald ein Check ihn liest, wird sie rot und der Satz dazu ist fällig.
    expect(nach.co2_sensor.role).toBe('unused')
  })

  it('zeigt Pflichtgeräte vor optionalen und ungenutzten', () => {
    const rollen = summarizeInstrumentNeeds().map((s) => s.role)
    const rang = { required: 0, optional: 1, unused: 2 }
    const sortiert = [...rollen].sort((a, b) => rang[a] - rang[b])
    expect(rollen).toEqual(sortiert)
  })
})

describe('Texte der Geräte-Übersicht', () => {
  const typen = instrumentsToShow().map((s) => s.type)

  for (const [name, locale] of Object.entries(LOCALES)) {
    it(`erklärt in ${name} jede Bauart, die die Übersicht anbietet`, () => {
      // Die Bauarten sind der eigentliche Inhalt der Seite. Eine ohne Erklärung
      // wäre wieder nur ein Wort in einer Liste – genau das, was die alte
      // Abfrage war.
      const fehlend: string[] = []
      for (const type of typen) {
        for (const model of getModelTypes(type)) {
          const key = `onboarding.step6.guide.variantNotes.${type}.${model}`
          const text = at(locale, key)
          if (typeof text !== 'string' || text.length < 20) fehlend.push(key)
        }
      }
      expect(fehlend).toEqual([])
    })

    it(`nennt in ${name} jede Rolle, die die Übersicht zeigt`, () => {
      // Nur zwei: „ungenutzt" wird seit dem 05.09.2026 gar nicht mehr
      // angezeigt, die Übersicht filtert solche Geräte vorher weg.
      for (const s of instrumentsToShow()) {
        expect(typeof at(locale, `onboarding.step6.guide.roles.${s.role}`), s.role).toBe('string')
      }
    })

  }
})

describe('Was die Übersicht zeigt', () => {
  it('lässt Geräte weg, die keine Messung liest', () => {
    // Die Seite heißt „Was du zum Messen brauchst" – ein Gerät, das kein Check
    // liest, braucht man dafür nicht. Der CO₂-Sensor war die einzige Zeile,
    // die dem Nutzer nichts zu tun gab.
    expect(instrumentsToShow().map((s) => s.type)).not.toContain('co2_sensor')
    expect(instrumentsToShow().every((s) => s.role !== 'unused')).toBe(true)
  })

  it('behält die vollständige Auskunft im Modul', () => {
    // Gefiltert wird erst an der Anzeige: Die Lücke bleibt im Code sichtbar,
    // und sobald ein Check den Sensor liest, steht er von selbst wieder in der
    // Übersicht.
    const alle = summarizeInstrumentNeeds().map((s) => s.type)
    expect(alle).toContain('co2_sensor')
    expect(alle.length).toBeGreaterThan(instrumentsToShow().length)
  })
})
