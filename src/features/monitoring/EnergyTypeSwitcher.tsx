import { useTranslation } from 'react-i18next'
import { Zap, Droplet, Flame, Fuel, Trees } from 'lucide-react'
import type { ComponentType } from 'react'
import type { EnergyType } from '@/store/readingsStore'

interface EnergyTypeSwitcherProps {
  value: EnergyType
  onChange: (type: EnergyType) => void
  /** Aktuell auswählbare Energieträger. Alle übrigen erscheinen als „bald". */
  available?: EnergyType[]
}

const ICONS: Record<EnergyType, ComponentType<{ className?: string }>> = {
  electricity: Zap,
  water: Droplet,
  gas: Flame,
  oil: Fuel,
  pellets: Trees,
}

const ORDER: EnergyType[] = ['electricity', 'water', 'gas', 'oil', 'pellets']

/**
 * Kompakte Pillen-Auswahl der Energieträger im Glass-Stil.
 * Nur die in `available` gelisteten Typen sind wählbar; die übrigen erscheinen
 * deaktiviert mit einem dezenten „bald"-Hinweis. Mobile-first, scrollbar ohne
 * harten Überlauf.
 */
export function EnergyTypeSwitcher({
  value,
  onChange,
  available = ['electricity'],
}: EnergyTypeSwitcherProps) {
  const { t } = useTranslation()

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex w-max gap-2">
        {ORDER.map((type) => {
          const Icon = ICONS[type]
          const enabled = available.includes(type)
          const selected = enabled && value === type
          return (
            <button
              key={type}
              type="button"
              disabled={!enabled}
              aria-pressed={selected}
              onClick={() => enabled && onChange(type)}
              className={`focus-ring flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-200 ${
                selected
                  ? 'bg-primary text-primary-foreground border border-primary shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_35%,transparent)] active:scale-[0.94]'
                  : enabled
                    ? 'glass text-foreground hover:bg-surface-2/70 active:scale-[0.94]'
                    : 'glass text-muted opacity-50 cursor-not-allowed'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">
                {t(`monitoring.energyTypes.${type}`)}
              </span>
              {!enabled && (
                <span className="rounded-full bg-surface-2/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {t('monitoring.soonBadge')}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
