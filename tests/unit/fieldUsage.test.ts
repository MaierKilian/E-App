// Die Feld-Landkarte: Jede Frage des Fragebogens braucht einen Abnehmer.
//
// Ausgangslage war, dass die Hälfte der Fragen ins Leere lief – erhoben,
// gespeichert, in die Cloud synchronisiert und nie wieder gelesen. Das fiel
// nicht auf, weil es keine Stelle gab, an der es hätte auffallen können.
//
// Diese Tests sind diese Stelle. Der zweite ist der eigentliche: Er nagelt die
// offene Rechnung auf eine Liste fest. Wer ein Feld anschließt, kürzt sie; wer
// eine Frage ohne Abnehmer hinzufügt, muss sie erweitern und dabei erklären,
// warum – ein stilles Durchrutschen gibt es nicht mehr.

import { describe, expect, it } from 'vitest'
import { FIELD_USAGE, fieldsFor, fieldsWithoutConsumer } from '@/features/onboarding/fieldUsage'
import { migrateOnboardingData } from '@/store/onboardingStore'

/**
 * Stand nach Etappe 4 (03.09.2026): noch fünf Felder ohne Abnehmer. Vorher
 * waren es 15 – der Haushalts-Steckbrief im Bericht hat zehn davon
 * angeschlossen.
 *
 * Was übrig ist, ist bewusst übrig: ein Bild, zwei aus `renovations`
 * abgeleitete Felder und zwei rein steuernde. Die Begründung steht je Feld in
 * `fieldUsage.ts`.
 *
 * **Diese Liste ist eine Schuld, keine Sollvorgabe.** Sie soll kürzer werden.
 */
const OHNE_ABNEHMER = [
  'profileImage',
  'roomsCount',
  'locationMode',
  'lastRenovationYear',
  'renovationItems',
]

describe('Feld-Landkarte', () => {
  it('deckt jedes Feld von OnboardingData ab', () => {
    // Der Typechecker hält das über `satisfies` schon fest. Hier steht es
    // gegen ein tatsächlich erzeugtes Profil, damit niemand den Typ aufweicht.
    const felder = Object.keys(migrateOnboardingData({})).sort()
    const kartiert = Object.keys(FIELD_USAGE).sort()
    expect(kartiert).toEqual(expect.arrayContaining(felder))
    expect(felder.filter((f) => !kartiert.includes(f))).toEqual([])
  })

  it('hält genau die bekannten Felder ohne Abnehmer', () => {
    expect(fieldsWithoutConsumer().sort()).toEqual([...OHNE_ABNEHMER].sort())
  })

  it('begründet jedes Feld im Klartext', () => {
    for (const [feld, usage] of Object.entries(FIELD_USAGE)) {
      expect(usage.reason.length, `${feld} ohne Begründung`).toBeGreaterThan(20)
      expect(usage.reason.trim().endsWith('.'), `${feld}: kein ganzer Satz`).toBe(true)
    }
  })

  it('nennt für jeden Bereich mindestens ein Feld', () => {
    for (const bereich of ['measurements', 'monitoring', 'report', 'tips'] as const) {
      expect(fieldsFor(bereich).length, bereich).toBeGreaterThan(0)
    }
  })
})
