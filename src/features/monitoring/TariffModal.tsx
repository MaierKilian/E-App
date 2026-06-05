import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { InfoButton } from '@/components/ui/InfoButton'
import {
  useTariffStore,
  DEFAULT_WORK_PRICE,
  DEFAULT_BASE_PRICE,
} from '@/store/tariffStore'

interface TariffModalProps {
  open: boolean
  onClose: () => void
}

/** Wandelt eine Texteingabe in eine Zahl um, mit Fallback bei leer/ungültig. */
function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

/** Modal zum Erfassen / Bearbeiten des Strom-Tarifs (Arbeits- und Grundpreis). */
export function TariffModal({ open, onClose }: TariffModalProps) {
  const { t } = useTranslation()
  const electricityWorkPrice = useTariffStore((s) => s.electricityWorkPrice)
  const electricityBasePrice = useTariffStore((s) => s.electricityBasePrice)
  const setTariff = useTariffStore((s) => s.setTariff)
  const skipPrompt = useTariffStore((s) => s.skipPrompt)

  const [work, setWork] = useState(String(electricityWorkPrice))
  const [base, setBase] = useState(String(electricityBasePrice))
  const [showHelp, setShowHelp] = useState(false)

  // Felder beim Öffnen mit den aktuellen Store-Werten vorbelegen
  // (Anpassung des States während des Renderns beim Wechsel von geschlossen -> offen).
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setWork(String(electricityWorkPrice))
    setBase(String(electricityBasePrice))
    setShowHelp(false)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  function handleSave() {
    setTariff(parseNumber(work, DEFAULT_WORK_PRICE), parseNumber(base, DEFAULT_BASE_PRICE))
    onClose()
  }

  function handleSkip() {
    skipPrompt()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('monitoring.tariff.prompt.title')}>
      <p className="text-sm text-muted mb-4">{t('monitoring.tariff.prompt.text')}</p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="tariff-work"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground"
          >
            {t('monitoring.tariff.workPrice')}
            <InfoButton text={t('monitoring.tariff.workPriceInfo')} />
          </label>
          <div className="flex items-center gap-2">
            <input
              id="tariff-work"
              type="number"
              min={0}
              step="any"
              value={work}
              onChange={(e) => setWork(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-sm text-muted shrink-0">
              {t('monitoring.tariff.workPriceUnit')}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="tariff-base"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground"
          >
            {t('monitoring.tariff.basePrice')}
            <InfoButton text={t('monitoring.tariff.basePriceInfo')} />
          </label>
          <div className="flex items-center gap-2">
            <input
              id="tariff-base"
              type="number"
              min={0}
              step="any"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-sm text-muted shrink-0">
              {t('monitoring.tariff.basePriceUnit')}
            </span>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            className="text-sm text-primary hover:underline"
          >
            {t('monitoring.tariff.whereToFind.title')}
          </button>
          {showHelp && (
            <p className="mt-2 text-sm text-muted rounded-lg border border-border bg-surface-2 p-3">
              {t('monitoring.tariff.whereToFind.text')}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {t('monitoring.tariff.save')}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          {t('monitoring.tariff.skip')}
        </button>
        <p className="text-center text-xs text-muted">{t('monitoring.tariff.skipHint')}</p>
      </div>
    </Modal>
  )
}
