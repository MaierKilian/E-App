import { Droplet, Snowflake, Plug, Thermometer, Hourglass, Sofa, Gauge, Lightbulb } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MeasurementId } from './types'
import type { RoomType } from '@/types'

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
  /** True = Messung gilt fürs ganze Zuhause (ein Ergebnis, nicht je Raum). */
  wholeHome?: boolean
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
    yieldsSaving: true,
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
  },
  {
    id: 'furniture_spacing',
    icon: Sofa,
    difficulty: 1,
    available: true,
    category: 'heating',
    estimatedMinutes: 2,
    perRoom: true,
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
  },
  {
    id: 'base_load',
    icon: Gauge,
    difficulty: 2,
    available: true,
    category: 'electricity',
    estimatedMinutes: 5,
    wholeHome: true,
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
  },
]

export function getMeasurementMeta(id: string): MeasurementMeta | undefined {
  return MEASUREMENT_CATALOG.find((m) => m.id === id)
}

/** Prüft, ob eine Messung in einem Raum(typ) angeboten wird. */
export function appliesToRoom(meta: MeasurementMeta, room: RoomType): boolean {
  if (meta.wholeHome) return false
  if (meta.perRoom) return true
  return Boolean(meta.rooms?.includes(room))
}
