import { describe, it, expect } from 'vitest'
import { parseDecimalInput } from '@/lib/decimalInput'

describe('parseDecimalInput (deutsch)', () => {
  it('liest das Komma als Dezimaltrenner', () => {
    expect(parseDecimalInput('13200,4')).toBe(13200.4)
    expect(parseDecimalInput('0,5')).toBe(0.5)
  })

  it('erkennt den Punkt als Tausendertrenner', () => {
    expect(parseDecimalInput('13.200')).toBe(13200)
    expect(parseDecimalInput('13.200,4')).toBe(13200.4)
    expect(parseDecimalInput('1.234.567')).toBe(1234567)
  })

  it('deutet einen einzelnen Punkt ohne Dreiergruppe als Dezimaltrenner', () => {
    // Auf der Desktop-Zehnertastatur tippt auch mancher Deutsche einen Punkt.
    expect(parseDecimalInput('13200.4')).toBe(13200.4)
    expect(parseDecimalInput('13200.45')).toBe(13200.45)
  })

  it('kommt ohne Trenner und mit Leerzeichen zurecht', () => {
    expect(parseDecimalInput('13200')).toBe(13200)
    expect(parseDecimalInput(' 13 200,4 ')).toBe(13200.4)
  })

  it('lehnt Unlesbares ab', () => {
    expect(parseDecimalInput('')).toBeUndefined()
    expect(parseDecimalInput('   ')).toBeUndefined()
    expect(parseDecimalInput('abc')).toBeUndefined()
    expect(parseDecimalInput('12a3')).toBeUndefined()
    expect(parseDecimalInput(',')).toBeUndefined()
  })
})

describe('parseDecimalInput (englisch)', () => {
  it('dreht die Rollen von Punkt und Komma um', () => {
    expect(parseDecimalInput('13200.4', 'en')).toBe(13200.4)
    expect(parseDecimalInput('13,200.4', 'en')).toBe(13200.4)
    expect(parseDecimalInput('13,200', 'en')).toBe(13200)
  })
})
