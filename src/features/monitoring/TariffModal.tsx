import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { InfoButton } from '@/components/ui/InfoButton'
import { useTariffStore, resolvePrice } from '@/store/tariffStore'
import type { EnergyType } from '@/store/readingsStore'
import { PRICE_META } from './priceConfig'

interface TariffModalProps {
  open: boolean
  onClose: () => void
  /** Träger, dessen Preis bearbeitet wird (Standard: Strom). */
  type?: EnergyType
}

/** Wandelt eine Texteingabe in eine Zahl um, mit Fallback bei leer/ungültig. */
function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

/** Modal zum Erfassen / Bearbeiten des Preises eines Energieträgers. */
export function TariffModal({ open, onClose, type = 'electricity' }: TariffModalProps) {
  const { t } = useTranslation()
  const setTypePrice = useTariffStore((s) => s.setTypePrice)
  const skipPrompt = useTariffStore((s) => s.skipPrompt)
  const current = useTariffStore((s) => resolvePrice(s, type))

  const meta = PRICE_META[type]
  const name = t(`monitoring.energyTypes.${type}`)

  const [work, setWork] = useState(String(current.work))
  const [base, setBase] = useState(String(current.base))
  const [showHelp, setShowHelp] = useState(false)

  // Felder beim Öffnen mit den aktuellen Store-Werten vorbelegen.
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setWork(String(current.work))
    setBase(String(current.base))
    setShowHelp(false)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  if (!meta) return null

  function handleSave() {
    setTypePrice(type, parseNumber(work, meta!.defaultWork), parseNumber(base, meta!.defaultBase))
    onClose()
  }

  function handleSkip() {
    skipPrompt()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('monitoring.price.modalTitle', { name })}>
      <p className="text-sm text-muted mb-4">{t('monitoring.price.intro')}</p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="tariff-work"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground"
          >
            {t('monitoring.tariff.workPrice')}
            <InfoButton text={t('monitoring.price.workInfo', { name })} />
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
            <span className="text-sm text-muted shrink-0 w-16">{meta.priceUnit}</span>
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
            <span className="text-sm text-muted shrink-0 w-16">
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
            {t('monitoring.price.whereTitle', { name })}
          </button>
          {showHelp && (
            <p className="mt-2 text-sm text-muted rounded-lg border border-border bg-surface-2 p-3">
              {t('monitoring.price.whereText')}
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
      </div>
    </Modal>
  )
}
