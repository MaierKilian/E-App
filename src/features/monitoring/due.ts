import type { MeterReading, ReminderFrequency, EnergyType } from '@/store/readingsStore'
import type { OnboardingData } from '@/types'
import { activeEnergyTypes } from './energyConfig'
import { sortByDate } from './readings'

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

/** Liste der aktiven Energieträger mit überfälliger Ablesung. */
export function dueTypes(
  data: OnboardingData,
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>,
  freq: ReminderFrequency,
  now: number,
): EnergyType[] {
  if (freq === 'off') return []
  return activeEnergyTypes(data).filter((type) =>
    isTypeDue(sortByDate(readingsByType[type] ?? []), freq, now),
  )
}
