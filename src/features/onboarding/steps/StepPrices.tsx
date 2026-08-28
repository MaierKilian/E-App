import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseDecimalInput } from '@/lib/decimalInput'
import { Wallet } from 'lucide-react'
import type { OnboardingData } from '@/types'
import type { EnergyType } from '@/store/readingsStore'
import { useTariffStore, resolvePrice } from '@/store/tariffStore'
import { PRICE_META } from '@/features/monitoring/priceConfig'
import { InfoButton } from '@/components/ui/InfoButton'

/** Wandelt eine Texteingabe in eine Zahl um (Komma erlaubt); null bei ungültig. */
function parse(value: string, language: string): number | null {
  return parseDecimalInput(value, language) ?? null
}

/** Ermittelt die je nach Profil relevanten, bepreisbaren Energieträger. */
function relevantTypes(data: OnboardingData): EnergyType[] {
  const types: EnergyType[] = ['electricity', 'water']
  const gens = data.heatGenerators ?? []
  if (gens.includes('gas_boiler')) types.push('gas')
  if (gens.includes('oil_boiler')) types.push('oil')
  if (gens.includes('pellets')) types.push('pellets')
  if (gens.includes('heat_pump')) types.push('heat_pump')
  return types
}

interface StepPricesProps {
  data: OnboardingData
}

/**
 * Optionaler Onboarding-Schritt: individuelle Verbrauchspreise. Schreibt zentral
 * in den `tariffStore`; leere Felder behalten die Standardwerte. Nutzerwerte
 * überschreiben die Defaults und werden von allen Berechnungen genutzt.
 */
export function StepPrices({ data }: StepPricesProps) {
  const { t, i18n } = useTranslation()
  const setTypePrice = useTariffStore((s) => s.setTypePrice)
  const clearTypePrice = useTariffStore((s) => s.clearTypePrice)
  const markPromptSeen = useTariffStore((s) => s.markPromptSeen)

  const types = relevantTypes(data)

  // Startwerte: bereits gesetzte Nutzerwerte vorbelegen, sonst leer lassen.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const state = useTariffStore.getState()
    const init: Record<string, string> = {}
    for (const type of types) {
      const entry = resolvePrice(state, type)
      init[type] = entry.custom ? String(entry.work) : ''
    }
    return init
  })

  // Grundpreise getrennt: Sie gehen laengst in die Jahreskosten-Schaetzung ein
  // (`estimateAnnualCostEur`), waren aber nirgends korrigierbar – der Nutzer sah
  // eine Zahl, deren zweiten Bestandteil er nicht beeinflussen konnte.
  const [bases, setBases] = useState<Record<string, string>>(() => {
    const state = useTariffStore.getState()
    const init: Record<string, string> = {}
    for (const type of types) {
      const entry = resolvePrice(state, type)
      init[type] = entry.custom ? String(entry.base) : ''
    }
    return init
  })

  // Der Nutzer hat den Schritt gesehen → kein erneuter Strompreis-Hinweis im Monitoring.
  useEffect(() => {
    markPromptSeen()
  }, [markPromptSeen])

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 })

  /** Aktuell wirksamer Arbeitspreis eines Traegers (Eingabe oder Standard). */
  function effectiveWork(type: EnergyType): number {
    const typed = parse(values[type] ?? '', i18n.language)
    return typed ?? resolvePrice(useTariffStore.getState(), type).work
  }

  function effectiveBase(type: EnergyType): number {
    const typed = parse(bases[type] ?? '', i18n.language)
    return typed ?? resolvePrice(useTariffStore.getState(), type).base
  }

  function handleChange(type: EnergyType, raw: string) {
    setValues((v) => ({ ...v, [type]: raw }))
    const parsed = parse(raw, i18n.language)
    // Nur wenn beide Felder leer sind, gelten wieder die Standardwerte.
    if (parsed === null && parse(bases[type] ?? '', i18n.language) === null) {
      clearTypePrice(type)
    } else {
      setTypePrice(type, parsed ?? effectiveWork(type), effectiveBase(type))
    }
  }

  function handleBaseChange(type: EnergyType, raw: string) {
    setBases((v) => ({ ...v, [type]: raw }))
    const parsed = parse(raw, i18n.language)
    if (parsed === null && parse(values[type] ?? '', i18n.language) === null) {
      clearTypePrice(type)
    } else {
      setTypePrice(type, effectiveWork(type), parsed ?? effectiveBase(type))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Wallet className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted">{t('onboarding.prices.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {types.map((type) => {
          const meta = PRICE_META[type]
          if (!meta) return null
          return (
            <div key={type} className="glass rounded-2xl p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <label htmlFor={`price-${type}`} className="text-sm font-medium text-foreground">
                  {t(`monitoring.energyTypes.${type}`)}
                </label>
                <InfoButton text={t(`onboarding.prices.info.${type}`)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={`price-${type}`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  min={0}
                  step="any"
                  value={values[type] ?? ''}
                  onChange={(e) => handleChange(type, e.target.value)}
                  placeholder={`${t('onboarding.prices.standard')}: ${numFmt.format(meta.defaultWork)}`}
                  className="focus-ring w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm tabular-nums text-foreground placeholder:text-muted"
                />
                <span className="shrink-0 text-sm text-muted">{meta.priceUnit}</span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <label
                  htmlFor={`base-${type}`}
                  className="shrink-0 text-xs text-muted"
                >
                  {t('onboarding.prices.basePrice')}
                </label>
                <input
                  id={`base-${type}`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  min={0}
                  step="any"
                  value={bases[type] ?? ''}
                  onChange={(e) => handleBaseChange(type, e.target.value)}
                  placeholder={`${t('onboarding.prices.standard')}: ${numFmt.format(meta.defaultBase)}`}
                  className="focus-ring w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-sm tabular-nums text-foreground placeholder:text-muted"
                />
                <span className="shrink-0 text-xs text-muted">€/Mon.</span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="px-1 text-xs text-muted">{t('onboarding.prices.laterNote')}</p>
    </div>
  )
}
