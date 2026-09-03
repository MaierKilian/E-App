// Prüfungen am Raumklima-Check.
//
// Kernpunkt: Bewertung und Sparhinweis dürfen sich nicht widersprechen. Ein Raum
// im Komfortband wird als „optimal" bewertet – dann darf die App nicht
// gleichzeitig zum Absenken raten. Das prüft hier ein Test, statt sich auf die
// Abstimmung zweier getrennter Konstanten zu verlassen.

import { describe, expect, it } from 'vitest'
import {
  calcRoomClimate,
  calcRoomTempSaving,
  comfortBand,
  displaySavingEur,
  rateTemperature,
  rateHumidity,
  humidityBand,
  COMFORT_BANDS,
  DEFAULT_COMFORT_BAND,
  DEFAULT_HUMIDITY_BAND,
  HUMIDITY_BANDS,
  MIN_DISPLAY_EUR,
  SAVING_REFERENCE_TEMP,
} from '@/features/measurements/room_temperature/roomClimate'
import type { RoomType } from '@/types'

describe('Raumklima – Bewertung vs. Ersparnis', () => {
  it('weist im Komfortband kein Sparpotenzial aus', () => {
    for (const temp of [20, 20.5, 21, 21.5, 22]) {
      const rating = calcRoomClimate({ temperature: temp, draft: 'none' })
      const saving = calcRoomTempSaving({
        temp,
        roomAreaSqm: 14,
        areaEstimated: true,
        livingArea: 80,
        heatingOnlyCostEur: 1200,
      })
      expect(rateTemperature(temp), `${temp} °C`).toBe('optimal')
      expect(rating.rating, `${temp} °C`).toBe('good')
      expect(saving.deltaT, `${temp} °C`).toBe(0)
      expect(saving.yearlySaving, `${temp} °C`).toBeUndefined()
    }
  })

  it('rechnet ΔT gegen die Komfort-Obergrenze, nicht gegen die Untergrenze', () => {
    const saving = calcRoomTempSaving({
      temp: 24,
      roomAreaSqm: 14,
      areaEstimated: true,
      livingArea: 80,
    })
    expect(saving.referenceTemp).toBe(SAVING_REFERENCE_TEMP)
    expect(saving.deltaT).toBe(24 - SAVING_REFERENCE_TEMP)
  })

  it('bewertet oberhalb des Bands als zu warm und liefert dann eine Ersparnis', () => {
    const temp = 24
    expect(rateTemperature(temp)).toBe('tooWarm')
    const saving = calcRoomTempSaving({
      temp,
      roomAreaSqm: 20,
      areaEstimated: false,
      livingArea: 100,
      heatingOnlyCostEur: 1500,
    })
    // 1500 € × 0,2 Flächenanteil × 6 % × 2 K = 36 €
    expect(saving.yearlySaving).toBeCloseTo(36, 6)
  })
})

describe('Raumklima – Darstellung der Ersparnis', () => {
  it('unterdrückt Kleinbeträge unterhalb der Mindestschwelle', () => {
    expect(displaySavingEur(undefined)).toBeUndefined()
    expect(displaySavingEur(0)).toBeUndefined()
    expect(displaySavingEur(MIN_DISPLAY_EUR - 0.01)).toBeUndefined()
    expect(displaySavingEur(Number.NaN)).toBeUndefined()
  })

  it('rundet auf 5-€-Schritte, um Schein-Genauigkeit zu vermeiden', () => {
    expect(displaySavingEur(36)).toBe(35)
    expect(displaySavingEur(38)).toBe(40)
    expect(displaySavingEur(MIN_DISPLAY_EUR)).toBe(20)
  })
})

describe('Raumklima – Einsparformel', () => {
  it('liefert ohne Heizkosten nur die %-Aussage', () => {
    const saving = calcRoomTempSaving({
      temp: 25,
      roomAreaSqm: 14,
      areaEstimated: true,
      livingArea: 80,
    })
    expect(saving.percent).toBeCloseTo(0.18, 6)
    expect(saving.yearlySaving).toBeUndefined()
  })

  it('liefert ohne bekannte Wohnfläche keinen €-Wert', () => {
    const saving = calcRoomTempSaving({
      temp: 25,
      roomAreaSqm: 14,
      areaEstimated: true,
      livingArea: 0,
      heatingOnlyCostEur: 1200,
    })
    expect(saving.share).toBe(0)
    expect(saving.yearlySaving).toBeUndefined()
  })
})

describe('Raumklima – raumtypabhängiges Komfortband', () => {
  it('bewertet 21 °C im Schlafzimmer als zu warm, im Wohnzimmer als optimal', () => {
    expect(rateTemperature(21, 'bedroom')).toBe('tooWarm')
    expect(rateTemperature(21, 'living_room')).toBe('optimal')
  })

  it('bewertet 23 °C im Bad als optimal', () => {
    expect(rateTemperature(23, 'bathroom')).toBe('optimal')
    expect(rateTemperature(23, 'living_room')).toBe('tooWarm')
  })

  it('fällt ohne Raumbezug auf das Default-Band zurück', () => {
    expect(comfortBand(undefined)).toEqual(DEFAULT_COMFORT_BAND)
    expect(SAVING_REFERENCE_TEMP).toBe(DEFAULT_COMFORT_BAND.max)
  })

  it('führt das angewandte Band im Ergebnis mit', () => {
    const calc = calcRoomClimate({ temperature: 17, draft: 'none', roomType: 'bedroom' })
    expect(calc.band).toEqual(COMFORT_BANDS.bedroom)
    expect(calc.rating).toBe('good')
  })

  it('bezieht die Ersparnis auf die Obergrenze des Raumtyps', () => {
    const band = COMFORT_BANDS.bedroom
    const saving = calcRoomTempSaving({
      temp: 21,
      roomAreaSqm: 14,
      areaEstimated: true,
      livingArea: 80,
      referenceTemp: band.max,
    })
    expect(saving.deltaT).toBe(21 - band.max)
    expect(saving.percent).toBeCloseTo(0.18, 6)
  })

  it('hält für jeden Raumtyp ein plausibles Band vor', () => {
    for (const [type, band] of Object.entries(COMFORT_BANDS) as [RoomType, typeof DEFAULT_COMFORT_BAND][]) {
      expect(band.min, type).toBeLessThan(band.max)
      expect(band.min, type).toBeGreaterThanOrEqual(12)
      expect(band.max, type).toBeLessThanOrEqual(26)
    }
  })

  it('bewertet in jedem Raumtyp die Bandmitte als optimal ohne Sparhinweis', () => {
    for (const type of Object.keys(COMFORT_BANDS) as RoomType[]) {
      const band = COMFORT_BANDS[type]
      const temp = (band.min + band.max) / 2
      const calc = calcRoomClimate({ temperature: temp, draft: 'none', roomType: type })
      const saving = calcRoomTempSaving({
        temp,
        roomAreaSqm: 14,
        areaEstimated: true,
        livingArea: 80,
        heatingOnlyCostEur: 1200,
        referenceTemp: calc.band.max,
      })
      expect(calc.rating, type).toBe('good')
      expect(saving.deltaT, type).toBe(0)
      expect(saving.yearlySaving, type).toBeUndefined()
    }
  })
})

// Die Luftfeuchte war bis September 2026 als einzige Dimension raumblind: Ein
// Keller mit 65 % wurde als „zu feucht" gemeldet, obwohl das dort unauffällig
// ist – und der Fall, auf den es im Keller ankommt, stand nirgends (siehe
// `dewPoint.test.ts`).
describe('Raumklima – raumtypabhängiges Feuchte-Band', () => {
  it('meldet 65 % im Keller nicht mehr als zu feucht', () => {
    expect(rateHumidity(65, 'basement')).toBe('optimal')
  })

  it('meldet 65 % im Wohnzimmer weiterhin als zu feucht', () => {
    expect(rateHumidity(65, 'living_room')).toBe('tooHumid')
    expect(rateHumidity(65)).toBe('tooHumid')
  })

  it('gilt auch für die Waschküche – kühl und mit ständigem Feuchte-Eintrag', () => {
    expect(rateHumidity(63, 'utility_room')).toBe('optimal')
  })

  it('meldet zu trocken weiterhin, im Keller aber erst früher', () => {
    expect(rateHumidity(45, 'basement')).toBe('tooDry')
    expect(rateHumidity(45, 'living_room')).toBe('optimal')
  })

  it('lässt gespeicherte Ergebnisse gültig bleiben', () => {
    // Ergebnisse werden nie migriert (siehe CLAUDE.md). Ein Ergebnis von vor
    // dieser Änderung trägt kein `humMin`/`humMax` und fällt im Ergebnis-Schirm
    // auf dieses Band zurück – es muss deshalb genau den alten Grenzen 40/60
    // entsprechen, sonst bewertete sich ein Altergebnis beim Öffnen um.
    expect(DEFAULT_HUMIDITY_BAND).toEqual({ min: 40, max: 60 })
  })

  it('fällt ohne Raumbezug auf das Wohnraum-Band zurück', () => {
    expect(humidityBand(undefined)).toEqual(DEFAULT_HUMIDITY_BAND)
    expect(humidityBand('bedroom')).toEqual(DEFAULT_HUMIDITY_BAND)
    expect(humidityBand('basement')).toEqual(HUMIDITY_BANDS.basement)
  })

  it('führt das angewandte Band im Ergebnis mit – wie das Komfortband', () => {
    const keller = calcRoomClimate({
      temperature: 16,
      humidity: 65,
      draft: 'none',
      roomType: 'basement',
    })
    expect(keller.humidityBand).toEqual(HUMIDITY_BANDS.basement)
    expect(keller.humidityStatus).toBe('optimal')
    expect(keller.rating).toBe('good')
  })

  it('verschiebt die Extremschwelle mit dem Band, statt sie fest zu setzen', () => {
    // Wohnraum: unverändert ab über 70 % „high". Keller: erst ab über 75 %.
    const wohnen = (humidity: number) =>
      calcRoomClimate({ temperature: 21, humidity, draft: 'none', roomType: 'living_room' }).rating
    expect(wohnen(69)).toBe('medium')
    expect(wohnen(71)).toBe('high')

    const keller = (humidity: number) =>
      calcRoomClimate({ temperature: 16, humidity, draft: 'none', roomType: 'basement' }).rating
    expect(keller(74)).toBe('medium')
    expect(keller(76)).toBe('high')
  })
})
