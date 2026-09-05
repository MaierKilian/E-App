// Die Formulierung der Duschkopf-Empfehlung.
//
// „Hoher Verbrauch – ein Sparaufsatz lohnt sich" war eine Kaufempfehlung ohne
// Kenntnis von Preis und Einbausituation. Der Euro-Betrag daneben lief über
// fünf Annahmen, darunter die Warmwasserquelle, nach der der Check eigens
// fragte. Seit dem 05.09.2026 steht dort ein Prozentsatz, der allein aus dem
// gemessenen Durchfluss folgt.
//
// Diese Tests binden die Texte an das, was der Check wirklich weiß.

import { describe, expect, it } from 'vitest'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'
import { EFFICIENT_FLOW_LPM, GOOD_MAX } from '@/features/measurements/showerhead/showerhead'

const texte = {
  de: de.measurements.showerhead.result,
  en: en.measurements.showerhead.result,
}

const laeufe = {
  de: de.measurements.showerhead.run,
  en: en.measurements.showerhead.run,
}

describe('Duschkopf – was die Texte behaupten', () => {
  it('nennt den gemessenen Wert, statt ihn zu umschreiben', () => {
    for (const [lang, t] of Object.entries(texte)) {
      expect(t.summary.high, lang).toContain('{{flow}}')
      expect(t.summary.medium, lang).toContain('{{flow}}')
    }
  })

  it('nennt die Bedingung, unter der ein Sparaufsatz überhaupt passt', () => {
    // Ohne passendes Gewinde nützt die beste Empfehlung nichts.
    expect(texte.de.summary.high).toMatch(/gewinde/i)
    expect(texte.en.summary.high).toMatch(/thread/i)
    expect(texte.de.chips.saver).toMatch(/gewinde/i)
    expect(texte.en.chips.saver).toMatch(/thread/i)
  })

  it('verspricht kein „lohnt sich" mehr', () => {
    // Was sich lohnt, hängt an Preis und Einbausituation – beides kennt die
    // App nicht.
    expect(texte.de.summary.high).not.toMatch(/lohnt sich/)
    expect(texte.de.summary.medium).not.toMatch(/lohnt sich/)
  })

  it('führt mit dem Prozentsatz und stellt die Jahresmenge dahinter', () => {
    for (const [lang, t] of Object.entries(texte)) {
      // Der Prozentsatz enthält nichts Geschätztes – er trägt die Aussage.
      expect(t.savingLabel, lang).toContain('{{percent}}')
      expect(t.savingLabel, lang).toContain('{{target}}')
      // Die Jahresmenge beruht zusätzlich auf Duschhäufigkeit und -dauer und
      // steht deshalb in einer eigenen, nachgeordneten Zeile.
      expect(t.savingLiters, lang).toContain('{{liters}}')
    }
  })

  it('behauptet nirgends mehr einen Euro-Betrag', () => {
    // Der Check rechnet keinen. Ein Text, der einen nennt, wäre eine Zahl ohne
    // Rechnung dahinter – und die Warmwasserquelle, die ihn möglich machte,
    // ist mit ihm entfallen (archiv/duschkopf-warmwasserquelle/).
    for (const [lang, t] of Object.entries(texte)) {
      const alleTexte = JSON.stringify(t)
      expect(alleTexte, lang).not.toMatch(/€|EUR|\bEuro\b/)
      expect(Object.keys(t), lang).not.toContain('savingMoney')
      expect(Object.keys(t), lang).not.toContain('sourceNote')
    }
  })

  it('fragt im Mess-Schritt nicht mehr nach der Warmwasserquelle', () => {
    for (const [lang, r] of Object.entries(laeufe)) {
      expect(Object.keys(r), lang).not.toContain('sourceLabel')
      expect(Object.keys(r), lang).not.toContain('sources')
      expect(Object.keys(r), lang).not.toContain('sourceFromProfile')
    }
  })

  it('warnt vor ungeschützten Werbebegriffen', () => {
    // Der Fund aus der Quellenprüfung – und die Begründung dieses Checks:
    // Man muss messen, weil das Etikett nichts garantiert.
    expect(texte.de.buyingNote).toMatch(/Eco/)
    expect(texte.de.buyingNote).toMatch(/nicht geschützt|keine geschützten/)
    expect(texte.en.buyingNote).toMatch(/not protected/)
  })

  it('nennt keine Zahl, die nicht aus dem Mess-Modul kommt', () => {
    // Die Schwellen stehen als Platzhalter im Text und werden aus
    // `showerhead.ts` gefüllt – dieselbe Regel wie bei den Richtwert-Tabellen.
    for (const [lang, t] of Object.entries(texte)) {
      expect(t.summary.high, lang).toContain('{{target}}')
      expect(t.buyingNote, lang).toContain('{{target}}')
      expect(t.referenceUpTo, lang).toContain('{{value}}')
    }
    // Und die beiden Grenzen sind verschieden: Der Sparaufsatz bringt auf 8,
    // sparsam heißt unter 9.
    expect(EFFICIENT_FLOW_LPM).toBeLessThan(GOOD_MAX)
  })

  it('hält beide Sprachen gleichwertig', () => {
    const schluessel = (o: object) => Object.keys(o).sort()
    expect(schluessel(texte.en)).toEqual(schluessel(texte.de))
    expect(schluessel(texte.en.summary)).toEqual(schluessel(texte.de.summary))
    expect(schluessel(texte.en.chips)).toEqual(schluessel(texte.de.chips))
  })
})
