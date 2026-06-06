import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { SelectChip } from '@/components/ui/SelectChip'
import {
  useReadingsStore,
  type MeterReading,
  type ReminderFrequency,
} from '@/store/readingsStore'

interface ReadingReminderProps {
  /** Bereits nach Datum sortierte Ablesungen des Energieträgers. */
  readings: MeterReading[]
}

const FREQUENCIES: ReminderFrequency[] = ['off', 'weekly', 'monthly']

/**
 * Berechnet das nächste Fälligkeitsdatum aus letzter Ablesung + Frequenz.
 * weekly = +7 Tage, monthly = +1 Monat. Gibt undefined bei 'off' oder
 * fehlender Ablesung zurück.
 */
function nextDueDate(
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

/** Dezenter Erinnerungs-Bereich mit Häufigkeits-Auswahl und Fälligkeit. */
export function ReadingReminder({ readings }: ReadingReminderProps) {
  const { t, i18n } = useTranslation()
  const frequency = useReadingsStore((s) => s.reminderFrequency)
  const setFrequency = useReadingsStore((s) => s.setReminderFrequency)

  // „Jetzt" einmalig beim Mounten festhalten, damit der Render rein bleibt
  // (kein Date.now()/new Date() während des Renderns).
  const [now] = useState(() => Date.now())

  const last = readings.length > 0 ? readings[readings.length - 1] : undefined
  const due = nextDueDate(last?.date, frequency)
  const isOverdue = due ? due.getTime() < now : false

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="flex items-center gap-1.5 text-muted">
        <Bell className="w-4 h-4" />
        {t('monitoring.reminder.title')}
      </span>
      <div className="flex gap-1.5">
        {FREQUENCIES.map((freq) => (
          <SelectChip
            key={freq}
            label={t(`monitoring.reminder.frequency.${freq}`)}
            selected={frequency === freq}
            onClick={() => setFrequency(freq)}
            className="px-3 py-1 text-xs"
          />
        ))}
      </div>
      {due && (
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          {t('monitoring.reminder.nextDue', { date: dateFmt.format(due) })}
          {isOverdue && (
            <span className="font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {t('monitoring.reminder.due')}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
