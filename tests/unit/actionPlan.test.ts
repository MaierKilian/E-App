// Der Handlungsplan im Bericht.
//
// Der Bericht sagte, wie es steht, aber nicht, was zu tun ist. Die Tipps-Seite
// konnte beides längst – nach Aufwand gruppiert, nach den genannten Interessen
// sortiert; im PDF kam davon nichts an.
//
// Der Kern dieser Tests ist die Gleichheit: Bericht und Bildschirm ordnen nach
// derselben Funktion. Ein Bericht, der anders ordnet als die App, wäre ein
// zweites Urteil über dieselbe Lage.

import { describe, expect, it } from 'vitest'
import { buildActionPlanData } from '@/features/reports/actionPlanData'
import { isQuickWin, type Tip } from '@/features/tips/buildTips'
import { orderedMeasurements } from '@/features/measurements/order'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { Lightbulb } from 'lucide-react'

function tip(partial: Partial<Tip> & { id: string }): Tip {
  return {
    icon: Lightbulb,
    category: 'electricity',
    effortMinutes: 10,
    costEur: 0,
    ...partial,
  }
}

/** Sofort machbar: kostet nichts und dauert höchstens 15 Minuten. */
const SOFORT = tip({ id: 'sofort', savingEur: 60 })
const SOFORT_KLEIN = tip({ id: 'klein', savingEur: 1 })
const VORBEREITUNG = tip({ id: 'vorbereitung', costEur: 120, effortMinutes: 90, savingEur: 200 })
const OHNE_BETRAG = tip({ id: 'qualitativ', costEur: 0, effortMinutes: 5 })

describe('Handlungsplan', () => {
  it('gruppiert nach derselben Grenze wie die Tipps-Seite', () => {
    const plan = buildActionPlanData([SOFORT, VORBEREITUNG], [])
    expect(plan.groups.map((g) => g.titleKey)).toEqual(['tips.groupQuick', 'tips.groupPrepared'])
    expect(plan.groups[0].tips.every(isQuickWin)).toBe(true)
    expect(plan.groups[1].tips.some(isQuickWin)).toBe(false)
  })

  it('sortiert nicht um – die Reihenfolge kommt von buildTips', () => {
    const plan = buildActionPlanData([SOFORT, SOFORT_KLEIN], [])
    expect(plan.groups[0].tips.map((t) => t.id)).toEqual(['sofort', 'klein'])
  })

  it('lässt leere Gruppen weg', () => {
    const plan = buildActionPlanData([SOFORT], [])
    expect(plan.groups).toHaveLength(1)
  })

  it('meldet den Leerfall, statt ein leeres Kapitel zu erzeugen', () => {
    const plan = buildActionPlanData([], ['reduce_co2'])
    expect(plan.empty).toBe(true)
    expect(plan.groups).toEqual([])
  })

  it('nennt nur Ziele, die die Reihenfolge wirklich verändern', () => {
    // `save_costs` ändert nichts – die €-Sortierung ist ohnehin die Voreinstellung.
    expect(buildActionPlanData([SOFORT], ['save_costs']).goals).toEqual([])
    expect(buildActionPlanData([SOFORT], ['reduce_co2']).goals).toEqual(['reduce_co2'])
  })

  it('zählt keinen Betrag, den die Messung nicht mehr behauptet', () => {
    // Ein Tipp ohne `savingEur` und einer unter der Anzeigeschwelle dürfen
    // die Summe nicht erhöhen.
    const nurKlein = buildActionPlanData([SOFORT_KLEIN, OHNE_BETRAG], [])
    expect(nurKlein.groups[0].savingRange).toBeUndefined()

    const mitBetrag = buildActionPlanData([SOFORT, OHNE_BETRAG], [])
    expect(mitBetrag.groups[0].savingRange?.low).toBeGreaterThan(0)
  })
})

describe('empfohlene Messreihenfolge', () => {
  const alle = MEASUREMENT_CATALOG.filter((m) => m.available)

  it('bleibt ohne Ziele die Katalog-Reihenfolge', () => {
    expect(orderedMeasurements(alle, []).map((m) => m.id)).toEqual(alle.map((m) => m.id))
    expect(orderedMeasurements(alle, undefined).map((m) => m.id)).toEqual(alle.map((m) => m.id))
  })

  it('zieht bei „CO₂ senken" Wärme und Warmwasser nach vorn', () => {
    const ids = orderedMeasurements(alle, ['reduce_co2'])
    const ersteStrom = ids.findIndex((m) => m.category === 'electricity')
    const letzteWaerme = ids.map((m) => m.category).lastIndexOf('heating')
    expect(letzteWaerme).toBeLessThan(ersteStrom)
  })

  it('verschiebt nur, statt neu zu ordnen – bei gleichem Gewicht bleibt der Katalog', () => {
    const ids = orderedMeasurements(alle, ['reduce_co2']).map((m) => m.id)
    const waerme = alle.filter((m) => m.category === 'heating').map((m) => m.id)
    expect(ids.filter((id) => waerme.includes(id))).toEqual(waerme)
  })

  it('gibt zwei Nutzern mit verschiedenen Zielen verschiedene Reihenfolgen', () => {
    // „Komfort verbessern" zieht Raumklima und Möbelabstand vor den Duschkopf.
    const komfort = orderedMeasurements(alle, ['improve_comfort']).map((m) => m.id)
    const kosten = orderedMeasurements(alle, ['save_costs']).map((m) => m.id)
    expect(komfort).not.toEqual(kosten)
    expect(komfort[0]).toBe('room_temperature')
  })

  it('fällt bei „CO₂ senken" mit dem Katalog zusammen – und das ist in Ordnung', () => {
    // Festgehalten, damit es niemand für einen Fehler hält: Der Katalog führt
    // ohnehin mit Warmwasser und Wärme, die Gewichtung findet dort nichts zu
    // verschieben. Sortiert jemand den Katalog später um, schlägt dieser Test
    // an und die Aussage ist neu zu prüfen.
    const co2 = orderedMeasurements(alle, ['reduce_co2']).map((m) => m.id)
    expect(co2).toEqual(alle.map((m) => m.id))
  })
})
