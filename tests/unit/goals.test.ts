// Die Ziele entscheiden seit dem 05.09.2026 sichtbar etwas: in welchem Bereich
// der Fragebogen den Nutzer ausspuckt.
//
// Vorher endete er für jeden im Messbereich – auch für den, der als einziges
// Ziel „Zählerstände verfolgen" angekreuzt hatte. Diese Tests halten die
// Zuordnung und ihre Rangfolge fest: Die Auswahl ist mehrfach, zwei Ziele
// können auf zwei Bereiche zeigen, und dann muss klar sein, welcher gewinnt.

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DESTINATION,
  GOALS,
  destinationFor,
  destinationLabelKey,
} from '@/features/onboarding/goals'
import { NAV_ITEMS } from '@/app/navigation'
import type { UserGoal } from '@/types'

describe('Ziel-Registry', () => {
  it('führt jedes Ziel genau einmal', () => {
    const ids = GOALS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('deckt jedes Ziel des Typs ab', () => {
    // Die Gegenrichtung erzwingt der Compiler nicht: `GOALS` ist ein Array,
    // kein Record. Ein neues Ziel in `UserGoal` ohne Eintrag hier wäre eine
    // Frage, die niemand zu sehen bekäme.
    const alle: UserGoal[] = [
      'save_costs',
      'reduce_co2',
      'improve_comfort',
      'track_readings',
      'curiosity',
    ]
    expect(GOALS.map((g) => g.id).sort()).toEqual([...alle].sort())
  })
})

describe('Wohin der Fragebogen führt', () => {
  it('schickt ohne Ziel in den Messbereich', () => {
    expect(destinationFor([])).toBe('/measurements')
    expect(destinationFor(undefined)).toBe('/measurements')
    expect(DEFAULT_DESTINATION).toBe('/measurements')
  })

  it('schickt die drei Mess-Ziele in den Messbereich', () => {
    for (const goal of ['save_costs', 'reduce_co2', 'improve_comfort'] as UserGoal[]) {
      expect(destinationFor([goal]), goal).toBe('/measurements')
    }
  })

  it('schickt „Zählerstände verfolgen" ins Monitoring', () => {
    expect(destinationFor(['track_readings'])).toBe('/monitoring')
  })

  it('schickt „Neugier" in den Wissensbereich', () => {
    expect(destinationFor(['curiosity'])).toBe('/education')
  })

  it('lässt bei mehreren Zielen das speziellere gewinnen', () => {
    // Drei Ziele führen in denselben Messbereich, zwei je an genau einen
    // anderen Ort – bei einer Mehrfachauswahl gewinnen diese beiden.
    expect(destinationFor(['save_costs', 'track_readings'])).toBe('/monitoring')
    expect(destinationFor(['save_costs', 'curiosity'])).toBe('/education')
    // Und untereinander die feste Rangfolge, damit die Wahl nie von der
    // Anklick-Reihenfolge abhängt.
    expect(destinationFor(['curiosity', 'track_readings'])).toBe('/monitoring')
    expect(destinationFor(['track_readings', 'curiosity'])).toBe('/monitoring')
  })

  it('führt nur auf Bereiche, die es wirklich gibt', () => {
    // Ein Tippfehler im Pfad wäre sonst erst nach dem Speichern zu sehen –
    // auf einer leeren Seite, aus der nur die Navigation herausführt.
    const pfade = new Set(NAV_ITEMS.map((i) => i.path))
    const alle: UserGoal[] = [
      'save_costs',
      'reduce_co2',
      'improve_comfort',
      'track_readings',
      'curiosity',
    ]
    for (const goal of alle) {
      expect(pfade.has(destinationFor([goal])), goal).toBe(true)
    }
  })

  it('beschriftet jeden Bereich mit dem Namen aus der Navigation', () => {
    // Die Zeile „Danach startest du hier" darf nicht etwas anderes behaupten
    // als die Navigation tut.
    const labels = new Map(NAV_ITEMS.map((i) => [i.path, i.labelKey]))
    for (const path of ['/measurements', '/monitoring', '/education']) {
      expect(destinationLabelKey(path), path).toBe(labels.get(path))
    }
  })
})
