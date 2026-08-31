// Suche und Vorschauzeile des Wissensbereichs.
//
// Beides ist reine Logik und wird hier ohne DOM geprüft: Die Faltung entscheidet
// darüber, ob jemand mit „warme" auch „Wärme" findet, und die Vorschau darüber,
// ob die Liste überfliegbar wird oder mitten in einer Abkürzung abbricht.

import { describe, expect, it } from 'vitest'
import {
  deriveTeaser,
  fold,
  matchesQuery,
  normalizeQuery,
  searchPreview,
  snippetAround,
  splitHighlight,
  teaserOf,
} from '@/features/education/lookup/search'

describe('fold', () => {
  it('senkt Groß-/Kleinschreibung', () => {
    expect(fold('Arbeitspreis').folded).toBe('arbeitspreis')
  })

  it('entfernt Umlaut-Punkte', () => {
    expect(fold('Wärmerückgewinnung').folded).toBe('warmeruckgewinnung')
  })

  it('schreibt ß als ss', () => {
    expect(fold('Straße').folded).toBe('strasse')
  })

  it('zeigt für jedes gefaltete Zeichen auf sein Original', () => {
    const { folded, map } = fold('Straße')
    expect(folded).toBe('strasse')
    // Beide „s" aus dem ß zeigen auf denselben Originalindex (5).
    expect(map[folded.indexOf('ss', 3)]).toBe(4)
    expect(map).toHaveLength(folded.length)
  })
})

describe('normalizeQuery', () => {
  it('trimmt und faltet', () => {
    expect(normalizeQuery('  Wärme ')).toBe('warme')
  })

  it('meldet eine leere Anfrage als leer', () => {
    expect(normalizeQuery('   ')).toBe('')
  })
})

describe('matchesQuery', () => {
  it('lässt ohne Anfrage alles durch', () => {
    expect(matchesQuery('', 'irgendwas')).toBe(true)
  })

  it('findet über Umlaute hinweg', () => {
    expect(matchesQuery('warme', 'Wärmepumpe')).toBe(true)
    expect(matchesQuery('Wärme', 'warmepumpe')).toBe(true)
  })

  it('durchsucht mehrere Felder', () => {
    expect(matchesQuery('standby', 'Was kostet Strom?', 'Geräte im Standby ziehen …')).toBe(true)
  })

  it('verträgt fehlende Felder', () => {
    expect(matchesQuery('x', undefined, 'axt')).toBe(true)
    expect(matchesQuery('q', undefined)).toBe(false)
  })

  it('meldet keinen Treffer, wenn nichts passt', () => {
    expect(matchesQuery('pellets', 'Duschkopf-Durchfluss')).toBe(false)
  })
})

describe('splitHighlight', () => {
  it('gibt ohne Anfrage genau ein Stück zurück', () => {
    expect(splitHighlight('Heizkurve', '')).toEqual([{ text: 'Heizkurve', hit: false }])
  })

  it('markiert die Fundstelle im Original', () => {
    expect(splitHighlight('Hydraulischer Abgleich', 'abgleich')).toEqual([
      { text: 'Hydraulischer ', hit: false },
      { text: 'Abgleich', hit: true },
    ])
  })

  it('markiert trotz Umlaut an der richtigen Stelle', () => {
    expect(splitHighlight('Wärmepumpe', 'warme')).toEqual([
      { text: 'Wärme', hit: true },
      { text: 'pumpe', hit: false },
    ])
  })

  it('markiert ein ß ganz, auch wenn nur das erste s getroffen wird', () => {
    expect(splitHighlight('Straße', 'stras')).toEqual([
      { text: 'Straß', hit: true },
      { text: 'e', hit: false },
    ])
  })

  it('markiert jede Fundstelle', () => {
    const parts = splitHighlight('Watt je Watt', 'watt')
    expect(parts.filter((p) => p.hit)).toHaveLength(2)
    expect(parts.map((p) => p.text).join('')).toBe('Watt je Watt')
  })

  it('behält den Originaltext lückenlos bei', () => {
    const text = 'Grundpreis und Arbeitspreis'
    expect(splitHighlight(text, 'preis').map((p) => p.text).join('')).toBe(text)
  })
})

describe('deriveTeaser', () => {
  it('nimmt den ersten ganzen Satz', () => {
    const body =
      'Die Raumtemperatur ist einer der größten Hebel beim Heizen. Als Richtwerte gelten 20 °C.'
    expect(deriveTeaser(body)).toBe('Die Raumtemperatur ist einer der größten Hebel beim Heizen.')
  })

  it('bricht nicht in einer Abkürzung ab', () => {
    const body =
      'Geräte ziehen dauerhaft Strom, z. B. Fernseher und Router, und das rund um die Uhr. Mehr dazu unten.'
    expect(deriveTeaser(body)).toContain('Fernseher und Router')
  })

  it('kürzt am Wort, wenn kein Satzende in Reichweite ist', () => {
    const body =
      'Ein sehr langer Satz ohne jedes Satzzeichen der einfach immer weiter laeuft und niemals endet sondern weiterlaeuft'
    const teaser = deriveTeaser(body)
    expect(teaser.endsWith(' …')).toBe(true)
    expect(teaser.length).toBeLessThanOrEqual(100)
    // Kein abgeschnittenes Wort am Ende.
    expect(body.startsWith(teaser.replace(' …', ''))).toBe(true)
  })

  it('lässt keine angebrochene Abkürzung am Ende stehen', () => {
    const body =
      'Energiemenge, die beim Verbraucher ankommt und tatsächlich genutzt wird (z. B. Strom aus der Steckdose oder Gas am Kessel).'
    const teaser = deriveTeaser(body)
    expect(teaser.endsWith(' …')).toBe(true)
    expect(teaser).not.toMatch(/\(z\.?\s*B?\s*…$/)
    expect(teaser).toContain('genutzt wird')
  })

  it('lässt keine offene Klammer am Ende stehen', () => {
    const teaser = deriveTeaser(
      'Ein hinreichend langer Text, der irgendwann umbricht und dann eine Klammer (öffnet',
      70,
    )
    expect(teaser).not.toMatch(/\($/)
  })

  it('lässt kurze Texte unangetastet', () => {
    expect(deriveTeaser('Kurz und knapp.')).toBe('Kurz und knapp.')
  })

  it('verträgt leeren Text', () => {
    expect(deriveTeaser('')).toBe('')
    expect(deriveTeaser('   ')).toBe('')
  })

  it('glättet Zeilenumbrüche', () => {
    expect(deriveTeaser('Erste\n  Zeile und noch etwas Text dazu.')).toBe(
      'Erste Zeile und noch etwas Text dazu.',
    )
  })
})

describe('teaserOf', () => {
  it('bevorzugt die gepflegte Vorschau', () => {
    expect(teaserOf({ teaser: 'Handverlesen' }, 'Ein anderer Fließtext.')).toBe('Handverlesen')
  })

  it('leitet ohne gepflegte Vorschau aus dem Fließtext ab', () => {
    expect(teaserOf({}, 'Aus dem Fließtext abgeleitet.')).toBe('Aus dem Fließtext abgeleitet.')
  })

  it('behandelt eine leere Vorschau wie keine', () => {
    expect(teaserOf({ teaser: '   ' }, 'Der Fließtext zählt.')).toBe('Der Fließtext zählt.')
  })
})

describe('snippetAround', () => {
  const body =
    'In den meisten Bestandsanlagen ja: Er sorgt dafür, dass jeder Heizkörper die richtige Wassermenge erhält. Ergebnis sind gleichmäßige Wärme und ein geringerer Verbrauch.'

  it('holt die Fundstelle in den Ausschnitt', () => {
    expect(snippetAround(body, 'wärme')).toContain('Wärme')
  })

  it('markiert mit Auslassungszeichen, dass vorne etwas fehlt', () => {
    expect(snippetAround(body, 'wärme').startsWith('… ')).toBe(true)
  })

  it('setzt vorne kein Auslassungszeichen, wenn der Treffer am Anfang steht', () => {
    expect(snippetAround(body, 'in den meisten').startsWith('…')).toBe(false)
  })

  it('bleibt ohne Treffer leer', () => {
    expect(snippetAround(body, 'pellets')).toBe('')
    expect(snippetAround(body, '  ')).toBe('')
  })

  it('schneidet nicht mitten im Wort ab', () => {
    const snippet = snippetAround(body, 'heizkörper').replace(/^… |( …)$/g, '')
    expect(body).toContain(snippet)
  })
})

describe('searchPreview', () => {
  const teaser = 'Eine kurze Vorschau.'
  const body = 'Eine kurze Vorschau. Weiter hinten steht das Wort Kavitation im Text.'

  it('zeigt ohne Suche die Vorschau', () => {
    expect(searchPreview('Titel', teaser, body, '')).toBe(teaser)
  })

  it('bleibt bei der Vorschau, wenn der Titel den Treffer trägt', () => {
    expect(searchPreview('Kavitation', teaser, body, 'kavitation')).toBe(teaser)
  })

  it('bleibt bei der Vorschau, wenn sie den Treffer selbst zeigt', () => {
    expect(searchPreview('Titel', teaser, body, 'vorschau')).toBe(teaser)
  })

  it('holt den Ausschnitt, wenn der Treffer nur im Fließtext steht', () => {
    const preview = searchPreview('Titel', teaser, body, 'kavitation')
    expect(preview).not.toBe(teaser)
    expect(preview).toContain('Kavitation')
  })

  it('fällt auf die Vorschau zurück, wenn kein Ausschnitt entsteht', () => {
    expect(searchPreview('Titel', teaser, '', 'kavitation')).toBe(teaser)
  })
})
