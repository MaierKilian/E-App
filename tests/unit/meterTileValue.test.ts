// Schriftgröße des Zählerstands auf der Zuhause-Karte.
//
// Anlass: Ein Gaszähler mit „7.370" erschien in der schmalen Kachel als
// „7.3…" – gekürzt ist ein Zählerstand keine Information mehr. Statt zu kürzen
// wird die Schrift kleiner, je länger der Wert ist.

import { describe, expect, it } from 'vitest'
import { valueSizeClass } from '@/features/home/meterValueSize'

describe('valueSizeClass', () => {
  it('setzt kurze Stände groß', () => {
    expect(valueSizeClass('268')).toBe('text-xl')
    expect(valueSizeClass('5.606')).toBe('text-xl')
  })

  it('lässt den Gaszähler aus dem gemeldeten Fall groß', () => {
    // „7.370" passte vorher nicht neben den Trend-Badge und wurde zu „7.3…".
    // Der Badge sitzt jetzt in der Kopfzeile, die Zahl behält ihre Größe.
    expect(valueSizeClass('7.370')).toBe('text-xl')
  })

  it('geht bei sechs- und siebenstelligen Ständen stufenweise herunter', () => {
    expect(valueSizeClass('137.014')).toBe('text-lg')
    expect(valueSizeClass('7.370.123')).toBe('text-base')
  })

  it('hat für absurd lange Werte noch eine Stufe übrig', () => {
    expect(valueSizeClass('123.456.789.012')).toBe('text-sm')
  })

  it('wächst monoton mit der Länge (nie wieder größer)', () => {
    const rank = ['text-xl', 'text-lg', 'text-base', 'text-sm']
    let last = 0
    for (let len = 1; len <= 20; len++) {
      const current = rank.indexOf(valueSizeClass('9'.repeat(len)))
      expect(current).toBeGreaterThanOrEqual(last)
      last = current
    }
  })
})
