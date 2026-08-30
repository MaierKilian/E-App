import type { EnergyType, MeterReading } from '@/store/readingsStore'

/**
 * Preis-Metadaten je (kostenfähigem) Energieträger.
 * Trennt die reinen Preis-Infos (Einheit, Umrechnung, Standardwerte) bewusst
 * von den Anzeige-Metadaten in `energyConfig`, damit auch der Tarif-Store
 * (ohne Icon-/UI-Abhängigkeiten) darauf zugreifen kann.
 */
export interface PriceMeta {
  /** Anzeige-Einheit des Arbeitspreises, z. B. 'ct/kWh', '€/m³'. */
  priceUnit: string
  /** Faktor: Arbeitspreis × priceToEur = € pro Zähler-Einheit. */
  priceToEur: number
  /** Voreingestellter Arbeitspreis (in der Anzeige-Einheit). */
  defaultWork: number
  /** Voreingestellter Grundpreis (€/Monat). */
  defaultBase: number
}

/**
 * Nur Träger, für die ein Preis sinnvoll ist. PV/Solarthermie (Erzeugung)
 * sind bewusst nicht enthalten.
 */
export const PRICE_META: Partial<Record<EnergyType, PriceMeta>> = {
  electricity: { priceUnit: 'ct/kWh', priceToEur: 0.01, defaultWork: 35, defaultBase: 12 },
  heat_pump: { priceUnit: 'ct/kWh', priceToEur: 0.01, defaultWork: 30, defaultBase: 0 },
  water: { priceUnit: '€/m³', priceToEur: 1, defaultWork: 4.5, defaultBase: 0 },
  gas: { priceUnit: '€/m³', priceToEur: 1, defaultWork: 1.2, defaultBase: 12 },
  oil: { priceUnit: '€/l', priceToEur: 1, defaultWork: 1.1, defaultBase: 0 },
  pellets: { priceUnit: '€/kg', priceToEur: 1, defaultWork: 0.35, defaultBase: 0 },
}

/** true, wenn für diesen Träger ein Preis hinterlegt werden kann. */
export function isPriceable(type: EnergyType): boolean {
  return type in PRICE_META
}

/** Was die Lieferscheine über den tatsächlich gezahlten Preis hergeben. */
export interface RefillPrice {
  /** Mengengewichteter Preis in € je Einheit des Trägers. */
  eurPerUnit: number
  /** Zahl der Lieferungen, die eingeflossen sind. */
  count: number
  /** Summe der berücksichtigten Menge. */
  amount: number
}

/** Zeitfenster, über das gemittelt wird. */
const PRICE_WINDOW_DAYS = 365
const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Der tatsächlich gezahlte Preis, aus den Lieferscheinen des letzten Jahres.
 *
 * Ein Tank ist damit **genauer bepreist als ein Gaszähler**: Menge und Betrag
 * stehen ohnehin auf jedem Lieferschein, während für einen Zähler nur der
 * Standardwert aus {@link PRICE_META} zur Verfügung steht. Heizöl schwankt im
 * Jahresverlauf um mehr als ein Drittel – ein fester Vorgabewert liegt also
 * fast immer daneben.
 *
 * **Mengengewichtet, nicht arithmetisch.** Wer 3.000 l zu 0,95 € und später
 * 500 l zu 1,30 € bezieht, hat im Schnitt 1,00 €/l gezahlt, nicht 1,13 €. Der
 * arithmetische Mittelwert gäbe der kleinen Nachbestellung dasselbe Gewicht
 * wie der großen Lieferung und überschätzte damit systematisch.
 *
 * Gemittelt wird über zwölf Monate, nicht über die letzte Lieferung: Der
 * Verbrauch eines Sommers wird noch mit dem Öl des Vorjahres gedeckt.
 *
 * @returns `undefined`, solange keine Lieferung mit Menge **und** Betrag
 *          vorliegt – ohne Beleg wird nichts behauptet.
 */
export function priceFromRefills(
  readings: readonly MeterReading[],
  options: { today?: Date } = {},
): RefillPrice | undefined {
  const now = (options.today ?? new Date()).getTime()
  let cost = 0
  let amount = 0
  let count = 0

  for (const entry of readings) {
    const menge = entry.refill
    const betrag = entry.refillCostEur
    if (typeof menge !== 'number' || !Number.isFinite(menge) || menge <= 0) continue
    if (typeof betrag !== 'number' || !Number.isFinite(betrag) || betrag <= 0) continue
    const t = new Date(`${entry.date}T00:00:00`).getTime()
    if (!Number.isFinite(t)) continue
    if ((now - t) / MS_PER_DAY > PRICE_WINDOW_DAYS) continue
    cost += betrag
    amount += menge
    count += 1
  }

  if (count === 0 || amount <= 0) return undefined
  return { eurPerUnit: cost / amount, count, amount }
}
