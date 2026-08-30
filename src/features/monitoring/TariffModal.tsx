import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseDecimalInput, formatDecimalInput } from '@/lib/decimalInput'
import { Modal } from '@/components/ui/Modal'
import { InfoButton } from '@/components/ui/InfoButton'
import { useTariffStore, resolvePrice, resolveEnergyContent } from '@/store/tariffStore'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { PRICE_META, priceFromRefills } from './priceConfig'
import { hasEnergyContent } from './specificValues'

interface TariffModalProps {
  open: boolean
  onClose: () => void
  /** Träger, dessen Preis bearbeitet wird (Standard: Strom). */
  type?: EnergyType
}

/** Wandelt eine Texteingabe in eine Zahl um, mit Fallback bei leer/ungültig. */
function parseNumber(value: string, fallback: number, language: string): number {
  return parseDecimalInput(value, language) ?? fallback
}

/** Modal zum Erfassen / Bearbeiten des Preises eines Energieträgers. */
export function TariffModal({ open, onClose, type = 'electricity' }: TariffModalProps) {
  const { t, i18n } = useTranslation()
  const setTypePrice = useTariffStore((s) => s.setTypePrice)
  const skipPrompt = useTariffStore((s) => s.skipPrompt)
  // Wichtig: Primitive selektieren (nicht ein neues Objekt), sonst wirft
  // useSyncExternalStore „getSnapshot should be cached" → Endlos-Loop.
  const currentWork = useTariffStore((s) => resolvePrice(s, type).work)
  const currentBase = useTariffStore((s) => resolvePrice(s, type).base)
  const setEnergyContent = useTariffStore((s) => s.setEnergyContent)
  const currentContent = useTariffStore((s) => resolveEnergyContent(s, type))
  // Nur Träger, deren Zähler Volumen/Masse misst, brauchen die Umrechnung.
  const showContent = hasEnergyContent(type)
  const readings = useReadingsStore((s) => s.readings[type])

  const meta = PRICE_META[type]
  const name = t(`monitoring.energyTypes.${type}`)
  // Preise immer mit zwei Nachkommastellen: „1 €/l" liest sich wie ein
  // gerundeter Schätzwert, „1,00 €/l" wie der abgelesene Betrag, der er ist.
  const eurFmt = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // Der gemessene Preis aus den Lieferscheinen – ein **Vorschlag**, kein
  // Automatismus. Ein selbst gesetzter Preis ist die Wahrheit des Nutzers und
  // wird nie überschrieben; deshalb steht hier ein Knopf und kein stiller
  // Schreibvorgang.
  const measured = priceFromRefills(readings ?? [])

  const [work, setWork] = useState(String(currentWork))
  const [base, setBase] = useState(String(currentBase))
  const [content, setContent] = useState(String(currentContent))
  const [showHelp, setShowHelp] = useState(false)

  // Felder beim Öffnen mit den aktuellen Store-Werten vorbelegen.
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setWork(String(currentWork))
    setBase(String(currentBase))
    setContent(String(currentContent))
    setShowHelp(false)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  if (!meta) return null

  function handleSave() {
    setTypePrice(type, parseNumber(work, meta!.defaultWork, i18n.language), parseNumber(base, meta!.defaultBase, i18n.language))
    if (showContent) {
      const parsed = parseNumber(content, currentContent, i18n.language)
      if (parsed > 0) setEnergyContent(type, parsed)
    }
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
              type="text"
              inputMode="decimal"
              autoComplete="off"
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
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-sm text-muted shrink-0 w-16">
              {t('monitoring.tariff.basePriceUnit')}
            </span>
          </div>
        </div>

        {/* Energieinhalt: macht aus m³/l/kg die kWh, in denen alle
            Vergleichswerte stehen. Ohne Angabe gilt ein üblicher Mittelwert. */}
        {showContent && (
          <div className="space-y-1.5">
            <label
              htmlFor="tariff-content"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground"
            >
              {t('monitoring.detail.energyContent')}
              <InfoButton text={t('monitoring.detail.energyContentHint')} />
            </label>
            <div className="flex items-center gap-2">
              <input
                id="tariff-content"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-sm text-muted shrink-0 w-16">
                kWh/{meta.priceUnit.replace('€/', '')}
              </span>
            </div>
          </div>
        )}

        {measured && meta && (
          <div className="rounded-lg border border-border bg-surface-2/60 p-3">
            <p className="text-sm font-medium text-foreground">
              {t('monitoring.tank.fromRefills', {
                count: measured.count,
                price: `${eurFmt.format(measured.eurPerUnit / meta.priceToEur)} ${meta.priceUnit}`,
              })}
            </p>
            <p className="mt-1 text-xs text-muted">{t('monitoring.tank.fromRefillsHint')}</p>
            <button
              type="button"
              onClick={() =>
                setWork(
                  formatDecimalInput(
                    Math.round((measured.eurPerUnit / meta!.priceToEur) * 100) / 100,
                    i18n.language,
                  ),
                )
              }
              className="focus-ring mt-2 rounded text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              {t('monitoring.tank.fromRefillsApply')}
            </button>
          </div>
        )}

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
