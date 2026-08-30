import type {
  MeterConfig,
  MeterReading,
  ReminderFrequency,
  EnergyType,
} from '@/store/readingsStore'
import type { OnboardingData } from '@/types'
import { boardEnergyTypes, isSeasonal } from './energyConfig'
import { sortByDate } from './readings'
import { isRefillDue, meterRange } from './range'

/**
 * Nächstes Fälligkeitsdatum aus letzter Ablesung + Frequenz.
 * weekly = +7 Tage, monthly = +1 Monat. undefined bei 'off' / ohne Ablesung.
 */
export function nextDueDate(
  lastDateIso: string | undefined,
  freq: ReminderFrequency,
): Date | undefined {
  if (!lastDateIso || freq === 'off') return undefined
  const base = new Date(`${lastDateIso}T00:00:00`)
  if (Number.isNaN(base.getTime())) return undefined
  const due = new Date(base)
  if (freq === 'weekly') due.setDate(due.getDate() + 7)
  else if (freq === 'monthly') due.setMonth(due.getMonth() + 1)
  return due
}

/** true, wenn für diese (sortierten) Ablesungen eine Ablesung überfällig ist. */
export function isTypeDue(
  readings: MeterReading[],
  freq: ReminderFrequency,
  now: number,
): boolean {
  if (freq === 'off' || readings.length === 0) return false
  const last = readings[readings.length - 1]
  const due = nextDueDate(last.date, freq)
  return due ? due.getTime() < now : false
}

/**
 * Energieträger mit überfälliger Ablesung.
 *
 * Geht über die Träger des Boards, nicht mehr über die des Profils: Ein selbst
 * angelegter Zähler soll genauso erinnern wie ein vom Fragebogen
 * vorgeschlagener. Umgekehrt bleibt es dabei, dass ohne eine einzige Ablesung
 * nie erinnert wird (siehe {@link isTypeDue}) – sonst mahnte die App jeden
 * Haushalt zu Pellets, nur weil der Träger existiert. Entfernte Zähler
 * (`hidden`) erinnern ebenfalls nicht mehr.
 */
export function dueTypes(
  data: OnboardingData,
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>,
  freq: ReminderFrequency,
  now: number,
  hidden: readonly EnergyType[] = [],
  meters: Partial<Record<EnergyType, MeterConfig>> = {},
): EnergyType[] {
  const today = new Date(now)
  return boardEnergyTypes(data, readingsByType, hidden).filter((type) => {
    const readings = sortByDate(readingsByType[type] ?? [])
    if (readings.length === 0) return false
    // Ein knapper Vorrat meldet sich unabhängig von der Ablese-Frequenz. Die
    // Frequenz regelt eine Gewohnheit („wie oft ablesen?"); dass der Tank in
    // sechs Wochen leer ist, ist keine Gewohnheitsfrage. Wer die Erinnerung
    // auf „Aus" stellt, will nicht ans Ablesen erinnert werden – nicht, dass
    // ihm im Januar das Öl ausgeht.
    if (isTankRefillDue(type, readings, meters[type], today)) return true
    return isTypeDue(readings, freq, now)
  })
}

/** true → dieser Vorrat reicht keine sechs Wochen mehr. */
export function isTankRefillDue(
  type: EnergyType,
  readings: MeterReading[],
  config: MeterConfig | undefined,
  today: Date,
): boolean {
  return isRefillDue(
    meterRange(readings, config, { seasonal: isSeasonal(type), today }),
  )
}
