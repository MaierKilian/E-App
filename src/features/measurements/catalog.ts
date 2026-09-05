import { Droplet, Snowflake, Plug, Thermometer, Hourglass, Sofa, Gauge, Lightbulb } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MeasurementId } from './types'
import type { InstrumentType, RoomType, HeatTransferType } from '@/types'

/** Gewerk-Kategorie einer Messung (für die „Gewerke"-Ansicht). */
export type MeasurementCategory = 'heating' | 'hot_water' | 'electricity' | 'water'

/**
 * Farbe je Gewerk. Lag vorher in `views/TradesView.tsx` und war damit an eine
 * Ansicht gebunden – der Wissensbereich zeigt dieselben Gewerke und hätte die
 * Werte sonst abschreiben müssen.
 */
export const CATEGORY_COLOR: Record<MeasurementCategory, string> = {
  heating: '#f97316',
  hot_water: '#3b82f6',
  electricity: '#eab308',
  water: '#06b6d4',
}

/**
 * Ein Messgerät, das eine Messung voraussetzt.
 *
 * `required: false` heißt: Der Check läuft auch ohne vollständig durch, das
 * Gerät schaltet nur einen zusätzlichen, genaueren Schritt frei (z. B. der
 * Zollstock im Möbelabstand-Check).
 */
export interface InstrumentNeed {
  type: InstrumentType
  required: boolean
}

export interface MeasurementMeta {
  id: MeasurementId
  icon: LucideIcon
  /** 1 = einfach, 3 = anspruchsvoller. Steuert die Reihenfolge im Katalog. */
  difficulty: 1 | 2 | 3
  /** Nur verfügbare Messungen sind anklickbar; der Rest erscheint als „bald". */
  available: boolean
  /** Gewerk, dem die Messung zugeordnet ist. */
  category: MeasurementCategory
  /** Geschätzte Dauer in Minuten. */
  estimatedMinutes: number
  /** Räume(typen), in denen die Messung sinnvoll ist (ein gemeinsames Ergebnis). */
  rooms?: RoomType[]
  /** True = Messung wird je Raum einzeln durchgeführt (eigenes Ergebnis pro Raum). */
  perRoom?: boolean
  /**
   * True = in einem als **unbeheizt** angegebenen Raum entfällt die Messung.
   *
   * Für den Möbelabstand-Check: Wo nichts heizt, gibt es nichts freizuhalten.
   * Ohne das Flag stünde der Check in jedem Keller und Dachboden als offene
   * Aufgabe, die niemand sinnvoll erledigen kann – und der Fortschritt käme
   * nie auf 100 %.
   */
  skipWhenUnheated?: boolean
  /** True = Messung gilt fürs ganze Zuhause (ein Ergebnis, nicht je Raum). */
  wholeHome?: boolean
  /**
   * True = Messung wird je Gerät einzeln durchgeführt (eigenes Ergebnis pro
   * Kühl-/Gefriergerät).
   *
   * Das Gegenstück zu {@link MeasurementMeta.perRoom}: Dort ist der Raum die
   * Instanz, hier das Gerät. Vier Geräte ergeben vier Messungen – vorher
   * überschrieb das zweite Gerät das Ergebnis des ersten, ohne Warnung.
   */
  perAppliance?: boolean
  /**
   * True = diese Messung beziffert eine Jahres-Ersparnis in Euro.
   *
   * Der Riegel gegen Geister-Beträge: Gespeicherte Ergebnisse werden nie
   * migriert (siehe CLAUDE.md), Auswertungen lesen `yearlySaving` /
   * `avoidableCost` aber aus **jedem** Ergebnis. Schafft ein Check seine
   * Euro-Rechnung ab – wie der LED-Check es getan hat –, trüge ein Altergebnis
   * den Betrag sonst weiter durch Bericht und Summe. Maßgeblich ist deshalb
   * nicht, was in den Details steht, sondern was die Messung **heute** rechnet.
   *
   * Bewusst ohne Flag: `lighting` (rechnet absichtlich nicht mehr),
   * `base_load` (Diagnose – die € beziffern die Folge-Checks),
   * `furniture_spacing` und `fridge` (qualitativer Befund).
   */
  yieldsSaving?: boolean
  /**
   * Welche Messgeräte diese Messung braucht.
   *
   * Die einzige Stelle, an der dieser Zusammenhang steht: Der Fragebogen führt
   * daraus die Geräte-Übersicht („Was du zum Messen brauchst") her, statt sie
   * abzuschreiben. Wer eine Messung ergänzt oder ihr einen Eingabeschritt
   * nimmt, pflegt ihn hier – ein Test hält fest, dass jede verfügbare Messung
   * eine Angabe trägt, „braucht keins" eingeschlossen (leeres Array).
   */
  instruments: InstrumentNeed[]
}

/**
 * Zentrale Registry aller Messungen. Reihenfolge = empfohlene Reihenfolge
 * (einfach zuerst). Neue Messungen werden hier ergänzt und – sobald fertig –
 * auf `available: true` gesetzt sowie in der Runner-Registry registriert.
 */
export const MEASUREMENT_CATALOG: MeasurementMeta[] = [
  {
    id: 'showerhead',
    icon: Droplet,
    difficulty: 1,
    available: true,
    category: 'hot_water',
    estimatedMinutes: 5,
    rooms: ['bathroom'],
    // **Kein `yieldsSaving`** (seit 05.09.2026): Der Check rechnet keinen
    // Euro-Betrag mehr, sondern einen Prozentsatz. Der Eintrag ist zugleich
    // der Riegel gegen Altergebnisse – ein vor dem Umbau gespeichertes
    // `yearlySaving` käme sonst über `resultSavingsEur` in Wirkungs-Summe und
    // Bericht zurück, obwohl der Check ihn nicht mehr behauptet. Genau
    // derselbe Fall wie beim LED-Check.
    // Gemessen wird mit Messbecher und Stoppuhr – die Stoppuhr bringt die App
    // mit. Kein Gerät aus der Geräteliste.
    instruments: [],
  },
  {
    id: 'hot_water_wait',
    icon: Hourglass,
    difficulty: 1,
    available: true,
    category: 'hot_water',
    estimatedMinutes: 2,
    rooms: ['bathroom', 'kitchen'],
    yieldsSaving: true,
    instruments: [],
  },
  {
    id: 'room_temperature',
    icon: Thermometer,
    difficulty: 1,
    available: true,
    category: 'heating',
    estimatedMinutes: 5,
    perRoom: true,
    yieldsSaving: true,
    // Die Temperatur ist die Messung; die Luftfeuchte ist der optionale
    // Zusatzschritt, aus dem der Taupunkt und damit die Schimmelwarnung
    // entsteht (`humidityOn` in `RoomTemperatureRun`).
    instruments: [
      { type: 'temperature_sensor', required: true },
      { type: 'humidity_sensor', required: false },
    ],
  },
  {
    id: 'furniture_spacing',
    icon: Sofa,
    difficulty: 1,
    available: true,
    category: 'heating',
    estimatedMinutes: 2,
    perRoom: true,
    skipWhenUnheated: true,
    // Der Check kommt mit geschätzten Antworten aus; ein Messgerät ersetzt die
    // Schätzung durch einen Zahlenwert (`measureOn`).
    instruments: [{ type: 'distance_meter', required: false }],
  },
  {
    id: 'lighting',
    icon: Lightbulb,
    difficulty: 1,
    available: true,
    category: 'electricity',
    estimatedMinutes: 2,
    // Ein Ergebnis fuer die ganze Wohnung: Der Check fragt alle Raeume auf einem
    // Schirm ab, statt den Nutzer einzeln durch sie hindurchzufuehren.
    wholeHome: true,
    instruments: [],
  },
  {
    id: 'base_load',
    icon: Gauge,
    difficulty: 2,
    available: true,
    category: 'electricity',
    estimatedMinutes: 5,
    wholeHome: true,
    // Abgelesen wird der Stromzähler des Hauses, nicht ein eigenes Gerät –
    // deshalb Pflicht, aber ohne Anschaffung.
    instruments: [{ type: 'power_meter', required: true }],
  },
  {
    id: 'standby',
    icon: Plug,
    difficulty: 2,
    available: true,
    category: 'electricity',
    estimatedMinutes: 12,
    wholeHome: true,
    yieldsSaving: true,
    // Ohne Steckdosen-Energiemessgerät gibt es keine Wattzahl einzugeben.
    instruments: [{ type: 'power_meter', required: true }],
  },
  {
    id: 'fridge',
    icon: Snowflake,
    difficulty: 2,
    available: true,
    category: 'electricity',
    estimatedMinutes: 10,
    // Der Zweitkühlschrank im Keller ist verbreitet. Beide Checks liefern ein
    // Ergebnis fürs ganze Zuhause – die zusätzliche Zuordnung ändert deshalb
    // nur, in welcher Raum-Kachel sie auftauchen, nicht die Zählung.
    rooms: ['kitchen', 'basement'],
    perAppliance: true,
    instruments: [{ type: 'temperature_sensor', required: true }],
  },
  {
    id: 'freezer',
    icon: Snowflake,
    difficulty: 1,
    available: true,
    category: 'electricity',
    estimatedMinutes: 5,
    // Die Gefriertruhe steht typisch im Keller oder Hauswirtschaftsraum – dort
    // suchte man den Check bisher vergeblich, weil er auf der Küche festhing.
    rooms: ['kitchen', 'basement', 'utility_room'],
    yieldsSaving: true,
    perAppliance: true,
    // Bewusst leer: Der Check schätzt die Vereisung mit dem Auge. Eine
    // Temperatur-Eingabe gibt es hier nicht (siehe Punkt 15 in
    // `docs/gefundene-probleme.md`) – der Info-Tab verspricht sie zu Unrecht.
    instruments: [],
  },
]

export function getMeasurementMeta(id: string): MeasurementMeta | undefined {
  return MEASUREMENT_CATALOG.find((m) => m.id === id)
}

/**
 * Prüft, ob eine Messung in einem konkreten Raum angeboten wird.
 *
 * Nimmt den Raum, nicht nur seine Art: Ob der Möbelabstand-Check hier etwas zu
 * sagen hat, hängt an der Wärmeübergabe **dieses** Raums – ein unbeheizter
 * Keller und ein beheizter Hobbykeller sind beide `basement`.
 */
export function appliesToRoom(
  meta: MeasurementMeta,
  room: { type: RoomType; heatTransfer?: HeatTransferType },
): boolean {
  if (meta.wholeHome) return false
  if (meta.skipWhenUnheated && room.heatTransfer === 'none') return false
  if (meta.perRoom) return true
  return Boolean(meta.rooms?.includes(room.type))
}

/** Die Räume, in denen diese Messung zählt – Gegenstück zu {@link appliesToRoom}. */
export function roomsForMeasurement<T extends { type: RoomType; heatTransfer?: HeatTransferType }>(
  meta: MeasurementMeta,
  instances: readonly T[],
): T[] {
  return instances.filter((inst) => appliesToRoom(meta, inst))
}
