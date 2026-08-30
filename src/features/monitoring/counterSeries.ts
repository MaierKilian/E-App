import type { EnergyType, MeterConfig, MeterReading, ReadingMode } from '@/store/readingsStore'

/**
 * Übersetzt einen Vorratsverlauf in einen virtuellen Zählerstand.
 *
 * Öl, Pellets und Flüssiggas werden nicht gezählt, sondern bevorratet: Der
 * Stand fällt und springt beim Befüllen zurück. Die gesamte Auswertung der App
 * rechnet dagegen mit aufsteigenden Zählerständen – `consumptionSegments`
 * verwirft in `readings.ts` jedes Segment mit negativer Differenz. Für einen
 * Tank fiele damit *jeder* Abschnitt weg, und allein der Auffüll-Sprung zählte
 * als Verbrauch.
 *
 * Statt einer zweiten Rechenkette wird der Füllstand hier einmalig in einen
 * kumulierten Verbrauch übersetzt. Danach sehen Tank und Zähler für alles
 * Nachgelagerte gleich aus: `stats`, Trend, Jahres-Hochrechnung, Saisonprofil,
 * spezifische Kennwerte, Sparkline und PDF-Bericht bleiben unverändert.
 *
 * Siehe `docs/tank-concept.md`, Abschnitte 2 und 3.
 */

/** Energieträger, die als Vorrat geführt werden können. */
const TANK_TYPES: ReadonlySet<EnergyType> = new Set<EnergyType>(['oil', 'pellets', 'gas'])

/**
 * true → für diesen Träger darf zwischen Zähler und Vorrat gewählt werden.
 *
 * Strom, Wasser, Wärmepumpe, PV und Solarthermie kennen keinen Vorrat; dort
 * wird die Wahl gar nicht erst angeboten.
 */
export function isTankType(type: EnergyType): boolean {
  return TANK_TYPES.has(type)
}

/**
 * Der Modus, mit dem ein **neu angelegter** Zähler dieses Trägers starten
 * sollte.
 *
 * Öl und Pellets sind praktisch immer ein Vorrat – die allermeisten Haushalte
 * haben dafür einen Peilstab, keinen Zähler. Erdgas ist umgekehrt der
 * Regelfall mit Zählwerk; Flüssiggas-Tanks werden ausdrücklich umgestellt.
 *
 * **Nur für die Neuanlage.** Der Modus eines bestehenden Zählers ergibt sich
 * aus {@link meterMode} und kippt nie von selbst, siehe dort.
 */
export function defaultMeterMode(type: EnergyType): ReadingMode {
  return type === 'oil' || type === 'pellets' ? 'level' : 'counter'
}

/**
 * Der tatsächlich geltende Modus eines Zählers.
 *
 * Ohne hinterlegte Konfiguration gilt **immer** `counter`. Das ist der Punkt,
 * an dem die Rückwärtskompatibilität hängt: Griffe hier statt dessen
 * {@link defaultMeterMode}, läse die App die gespeicherten aufsteigenden Zahlen
 * eines bestehenden Öl-Zählers rückwirkend als fallende Füllstände – der ganze
 * Verlauf wäre Unsinn, und zwar still. `level` entsteht ausschließlich durch
 * eine ausdrückliche Entscheidung des Nutzers.
 */
export function meterMode(config: MeterConfig | undefined): ReadingMode {
  return config?.mode === 'level' ? 'level' : 'counter'
}

/** Sortiert Einträge aufsteigend nach Datum, bei Gleichstand nach Erfassungszeit. */
function sortByDate(entries: MeterReading[]): MeterReading[] {
  return [...entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  )
}

/**
 * Der Stand **vor** diesem Eintrag: bei einer Lieferung der Füllstand, den der
 * Tank vor dem Befüllen hatte.
 *
 * Genau hier fällt der Unterschied zwischen Ablesung und Lieferung heraus.
 * `value` trägt in beiden Fällen den Stand *nach* dem Eintrag; abzüglich der
 * gelieferten Menge ist das der Punkt, an dem die Verbrauchsrechnung
 * weiterläuft. Eine Ablesung ohne `refill` ergibt schlicht sich selbst – eine
 * Formel für beide Eintragsarten.
 */
function levelBefore(entry: MeterReading): number {
  const refill = Number.isFinite(entry.refill) ? (entry.refill as number) : 0
  return entry.value - refill
}

/**
 * Wandelt Einträge in die Reihe um, auf der alle Verbrauchsrechnungen
 * arbeiten.
 *
 * Bei `counter` ist das die Eingabe selbst – **identisch**, nicht nur gleich:
 * Der Regelfall darf durch den Tank-Umbau keine zusätzliche Kopie je Render
 * bezahlen.
 *
 * Bei `level` entsteht eine Reihe gleicher Länge mit denselben Datumsangaben
 * und IDs, deren `value` der kumulierte Verbrauch ist. Weil Länge und Daten
 * erhalten bleiben, funktionieren Fensterfilter (`inWindow` im Bericht) und
 * Sortierung darauf unverändert.
 *
 * Ein Füllstand, der **ohne** eingetragene Lieferung steigt, ergibt einen
 * fallenden virtuellen Zähler. Das ist Absicht: Nachgelagert greift dann
 * dieselbe Behandlung wie bei einem zurückgesetzten Zählwerk – der Abschnitt
 * gilt als nicht auswertbar und wird übersprungen, statt einen erfundenen
 * Verbrauch von null zu behaupten. Der Vorrat ist ja tatsächlich gestiegen;
 * wie viel dazwischen verbraucht wurde, weiß niemand.
 */
export function counterSeries(
  entries: MeterReading[],
  config: MeterConfig | undefined,
): MeterReading[] {
  if (meterMode(config) === 'counter') return entries

  const sorted = sortByDate(entries)
  const out: MeterReading[] = []
  // Stand nach dem letzten brauchbaren Eintrag und der bis dahin kumulierte
  // Verbrauch. Beide überspringen unbrauchbare Werte, damit ein einzelner
  // kaputter Eintrag nicht die ganze Reihe vergiftet.
  let prevLevel: number | undefined
  let consumed = 0

  for (const entry of sorted) {
    const before = levelBefore(entry)
    if (!Number.isFinite(entry.value) || !Number.isFinite(before)) {
      // Unbrauchbarer Eintrag: als NaN durchreichen. Die angrenzenden
      // Abschnitte werden dadurch nachgelagert übersprungen (dieselbe
      // NaN-Prüfung wie bei einem kaputten Zählerstand), die Kette läuft
      // danach vom letzten brauchbaren Stand weiter.
      out.push({ ...entry, value: NaN })
      continue
    }
    if (prevLevel !== undefined) consumed += prevLevel - before
    prevLevel = entry.value
    out.push({ ...entry, value: consumed })
  }

  return out
}
