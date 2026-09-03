// Der Vergleichsmaßstab im Bericht.
//
// Die Mess-Übersicht druckte eine Spalte „Bewertung" mit dem Wort („gut",
// „hoch") und keinen Maßstab. Wer den Bericht in die Hand bekommt, kann eine
// Bewertung ohne Vergleichswert nicht prüfen – sie ist dann eine Behauptung.
//
// Der heiklere Teil ist das Quellenverzeichnis: Es muss auch das Unbelegte
// zeigen. Eines, das nur die belegten Werte auflistet, ließe den Rest wie
// belegt aussehen.

import { describe, expect, it } from 'vitest'
import {
  buildSourceList,
  originOf,
  sourceIndexOf,
  targetRange,
} from '@/features/reports/thresholdReference'
import { MEASUREMENT_THRESHOLDS } from '@/features/education/measurementThresholds'
import { GOOD_MAX as FLOW_GOOD_MAX } from '@/features/measurements/showerhead/showerhead'

describe('Richtwert einer Messung', () => {
  it('nennt den Zielbereich, nicht irgendeine Zeile', () => {
    expect(targetRange('showerhead')).toContain(String(FLOW_GOOD_MAX))
  })

  it('liest ihn aus dem Mess-Modul – keine Zahl steht doppelt', () => {
    // Ändert sich `GOOD_MAX` im Duschkopf-Modul, ändert sich der Bericht mit.
    expect(targetRange('showerhead')).toBe(MEASUREMENT_THRESHOLDS.showerhead?.rows[0].range)
  })

  it('bleibt leer, wo es keinen einzelnen Zielbereich gibt', () => {
    // Das Raumklima hat ein Band je Raumtyp; welcher Raum gemeint ist, weiß
    // die Übersicht nicht. Eine beliebige Zeile zu zeigen wäre schlechter.
    expect(targetRange('room_temperature')).toBeUndefined()
  })

  it('bleibt leer für eine unbekannte Messung', () => {
    expect(targetRange('gibt_es_nicht')).toBeUndefined()
    expect(originOf('gibt_es_nicht')).toBeUndefined()
  })
})

describe('Quellenverzeichnis', () => {
  it('fasst dieselbe Quelle zusammen, statt sie zu wiederholen', () => {
    // Kühl- und Gefrier-Check teilen sich eine Quelle.
    const liste = buildSourceList(['fridge', 'freezer'])
    expect(liste).toHaveLength(1)
    expect(liste[0].measurementIds).toEqual(['fridge', 'freezer'])
    expect(sourceIndexOf(liste, 'freezer')).toBe(1)
  })

  it('nummeriert in der Reihenfolge des ersten Auftretens', () => {
    const liste = buildSourceList(['showerhead', 'fridge'])
    expect(liste.map((s) => s.index)).toEqual([1, 2])
    expect(sourceIndexOf(liste, 'showerhead')).toBe(1)
    expect(sourceIndexOf(liste, 'fridge')).toBe(2)
  })

  it('führt belegte Quellen mit Link und Stand', () => {
    const [eintrag] = buildSourceList(['showerhead'])
    expect(eintrag.url).toMatch(/^https:\/\//)
    expect(eintrag.stand).toMatch(/^\d{2}\/\d{4}$/)
    expect(eintrag.pending).toBeUndefined()
  })

  it('zeigt Unbelegtes als unbelegt, nicht als Lücke', () => {
    // Der Punkt der ganzen Etappe: Was keine Quelle hat, sagt das.
    const [eintrag] = buildSourceList(['standby'])
    expect(eintrag.url).toBeUndefined()
    expect(eintrag.pending).toBe(true)
    expect(eintrag.reason.length).toBeGreaterThan(40)
  })

  it('unterscheidet einen Richtwert der App von einem offenen Punkt', () => {
    // „Wir haben entschieden" und „wir sind noch nicht fertig" sind zweierlei.
    const [led] = buildSourceList(['lighting'])
    expect(led.pending).toBe(false)
    expect(led.reason).toBeDefined()

    const [standby] = buildSourceList(['standby'])
    expect(standby.pending).toBe(true)
  })

  it('deckt jede Messung ab, die im Bericht vorkommt', () => {
    const ids = Object.keys(MEASUREMENT_THRESHOLDS)
    const liste = buildSourceList(ids)
    for (const id of ids) {
      expect(sourceIndexOf(liste, id), id).toBeDefined()
    }
  })

  it('kommt mit einer leeren Liste zurecht', () => {
    expect(buildSourceList([])).toEqual([])
  })
})
