// Der Link-Parameter `?demo` trägt seit dem 06.09.2026 mehr als den Dialog:
// An ihm hängen die Links aus der schriftlichen Ausarbeitung, die aus der PDF
// heraus direkt in einen einzelnen Bereich der App zeigen
// (`docs/hausarbeit-verlinkung.md`). Zwei Stellen fragen ihn ab – der Dialog
// selbst und die Erst-Besuch-Weiche, die ihn durchlässt, statt den Pfad auf die
// Landing Page zu verwerfen. Diese Tests halten fest, dass beide dieselbe
// Antwort bekommen und dass die Prüfung auf den ganzen Schlüssel geht.

import { describe, expect, it } from 'vitest'
import { DEMO_PARAM, wantsDemo } from '@/features/demo/enterDemo'

describe('wantsDemo', () => {
  it('erkennt den Parameter ohne Wert', () => {
    expect(wantsDemo('?demo')).toBe(true)
  })

  it('erkennt ihn neben anderen Parametern', () => {
    // Genau die Form, die ein Deep-Link auf einen raumbezogenen Check hat:
    // `/measurements/room_temperature?room=living_room%230&demo`
    expect(wantsDemo('?room=living_room%230&demo')).toBe(true)
    expect(wantsDemo('?demo&room=living_room%230')).toBe(true)
  })

  it('erkennt ihn mit Wert', () => {
    expect(wantsDemo('?demo=1')).toBe(true)
  })

  it('bleibt ohne Parameter aus', () => {
    expect(wantsDemo('')).toBe(false)
    expect(wantsDemo('?room=bathroom%230')).toBe(false)
  })

  it('greift nicht bei einem Schlüssel, der nur so anfängt', () => {
    // Sonst würde eine Weiche, die diesen Aufruf durchlässt, bei einem
    // beliebigen anderen Parameter aufhören zu greifen.
    expect(wantsDemo('?demonstration=1')).toBe(false)
    expect(wantsDemo('?nodemo=1')).toBe(false)
  })

  it('nennt den Schlüssel, den die Links verwenden', () => {
    // Die URLs in `docs/hausarbeit-verlinkung.md` stehen in einer PDF, die
    // nicht mitwandert, wenn hier jemand umbenennt.
    expect(DEMO_PARAM).toBe('demo')
  })
})
