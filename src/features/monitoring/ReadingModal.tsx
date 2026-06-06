import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'

interface ReadingModalProps {
  open: boolean
  onClose: () => void
  /** Energieträger, für den die Ablesung erfasst wird. */
  type: EnergyType
}

/** Heutiges Datum als ISO yyyy-mm-dd in lokaler Zeitzone. */
function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** Modal zum Hinzufügen einer Zählerstand-Ablesung. */
export function ReadingModal({ open, onClose, type }: ReadingModalProps) {
  const { t } = useTranslation()
  const addReading = useReadingsStore((s) => s.addReading)

  const [date, setDate] = useState(todayIso)
  const [value, setValue] = useState('')

  // Felder beim Öffnen zurücksetzen (State-Anpassung beim geschlossen -> offen).
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setDate(todayIso())
    setValue('')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const parsed = Number.parseFloat(value.replace(',', '.'))
  const valid = date !== '' && Number.isFinite(parsed) && parsed >= 0

  function handleSave() {
    if (!valid) return
    addReading(type, { date, value: parsed })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('monitoring.readings.addReading')}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="reading-date"
            className="text-sm font-medium text-foreground"
          >
            {t('monitoring.readings.dateLabel')}
          </label>
          <input
            id="reading-date"
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="reading-value"
            className="text-sm font-medium text-foreground"
          >
            {t('monitoring.readings.valueLabel')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="reading-value"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-sm text-muted shrink-0">
              {t('monitoring.readings.valueUnit')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!valid}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {t('common.save')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          {t('common.close')}
        </button>
      </div>
    </Modal>
  )
}
