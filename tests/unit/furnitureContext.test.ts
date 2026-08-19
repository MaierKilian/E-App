// Prüfungen der Verknüpfung des Möbel-Abstands-Checks mit dem übrigen Profil.
//
// Der Wert dieser Hinweise liegt darin, dass sie nur in der Kombination
// entstehen. Genauso wichtig ist, dass sie *nicht* erscheinen, wenn die
// Voraussetzung fehlt – ein Hinweis auf ein Muster, das gar nicht vorliegt,
// wäre schlimmer als kein Hinweis.

import { describe, expect, it } from 'vitest'
import { contextNotes, hasSensorFinding } from '@/features/measurements/furniture_spacing/context'
import type { Finding } from '@/features/measurements/furniture_spacing/furnitureSpacing'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'

const VALVE: Finding = { key: 'valve', level: 'yes', points: 4 }
const THERMOSTAT: Finding = { key: 'thermostat', level: 'yes', points: 4 }
const FURNITURE: Finding = { key: 'furniture', level: 'yes', points: 3 }

// Schlafzimmer-Band: 16–18 °C.
const COLD = { roomTempC: 15, comfortMinC: 16 }
const WARM = { roomTempC: 17, comfortMinC: 16 }

describe('Möbel-Abstand – gestörter Fühler', () => {
  it('erkennt beide Fühler-Befunde', () => {
    expect(hasSensorFinding([VALVE])).toBe(true)
    expect(hasSensorFinding([THERMOSTAT])).toBe(true)
    expect(hasSensorFinding([FURNITURE])).toBe(false)
    expect(hasSensorFinding([])).toBe(false)
  })
})

describe('Möbel-Abstand – Hinweis „Fühler und kalter Raum"', () => {
  it('erscheint nur, wenn Fühler gestört und Raum zu kühl ist', () => {
    expect(contextNotes([VALVE], COLD)).toContain('sensorAndCold')
    expect(contextNotes([THERMOSTAT], COLD)).toContain('sensorAndCold')
  })

  it('bleibt aus, wenn der Raum im Komfortband liegt', () => {
    expect(contextNotes([VALVE], WARM)).not.toContain('sensorAndCold')
  })

  it('bleibt aus, wenn kein Fühler-Befund vorliegt', () => {
    expect(contextNotes([FURNITURE], COLD)).not.toContain('sensorAndCold')
  })

  it('bleibt aus, wenn keine Raumtemperatur gemessen wurde', () => {
    expect(contextNotes([VALVE], {})).not.toContain('sensorAndCold')
    expect(contextNotes([VALVE], { comfortMinC: 16 })).not.toContain('sensorAndCold')
    expect(contextNotes([VALVE], { roomTempC: 15 })).not.toContain('sensorAndCold')
  })

  it('behandelt unbrauchbare Werte wie fehlende', () => {
    expect(contextNotes([VALVE], { roomTempC: Number.NaN, comfortMinC: 16 })).not.toContain(
      'sensorAndCold',
    )
    expect(contextNotes([VALVE], { roomTempC: 15, comfortMinC: Number.NaN })).not.toContain(
      'sensorAndCold',
    )
  })

  it('nutzt das raumtypabhängige Band, nicht eine feste Grenze', () => {
    // 17 °C sind im Schlafzimmer (16–18) in Ordnung, im Wohnzimmer (20–22) zu kühl.
    expect(contextNotes([VALVE], { roomTempC: 17, comfortMinC: 16 })).not.toContain('sensorAndCold')
    expect(contextNotes([VALVE], { roomTempC: 17, comfortMinC: 20 })).toContain('sensorAndCold')
  })
})

describe('Möbel-Abstand – Hinweis „Wärmepumpe"', () => {
  it('erscheint bei Wärmepumpe im Profil', () => {
    expect(contextNotes([FURNITURE], { heatPump: true })).toContain('heatPump')
  })

  it('bleibt ohne Wärmepumpe aus', () => {
    expect(contextNotes([FURNITURE], { heatPump: false })).not.toContain('heatPump')
    expect(contextNotes([FURNITURE], {})).not.toContain('heatPump')
  })
})

describe('Möbel-Abstand – Hinweise ohne Befund', () => {
  it('bleiben ganz aus, wenn nichts blockiert', () => {
    expect(contextNotes([], { ...COLD, heatPump: true })).toEqual([])
  })
})

describe('Möbel-Abstand – Hinweistexte', () => {
  for (const [locale, dict] of [
    ['de', de],
    ['en', en],
  ] as const) {
    it(`sind in ${locale} vollständig hinterlegt`, () => {
      const res = (dict as Record<string, never>)['measurements']['furniture_spacing']['result']
      expect(typeof res.notesTitle).toBe('string')
      for (const note of ['sensorAndCold', 'heatPump']) {
        expect(typeof res.notes[note], `${locale}/${note}`).toBe('string')
        expect((res.notes[note] as string).length, `${locale}/${note}`).toBeGreaterThan(0)
      }
    })
  }
})
