import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { InfoButton } from '@/components/ui/InfoButton'
import { useTariffStore } from '@/store/tariffStore'

interface TariffCardProps {
  onEdit: () => void
}

/** Karte mit dem aktuellen Strom-Tarif inkl. Badge und Bearbeiten-Button. */
export function TariffCard({ onEdit }: TariffCardProps) {
  const { t } = useTranslation()
  const electricityWorkPrice = useTariffStore((s) => s.electricityWorkPrice)
  const electricityBasePrice = useTariffStore((s) => s.electricityBasePrice)
  const isCustom = useTariffStore((s) => s.isCustom)

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t('monitoring.tariff.currentTariff')}
          </h2>
          <InfoButton text={t('monitoring.tariff.cardInfo')} />
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isCustom ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted'
          }`}
        >
          {isCustom ? t('monitoring.tariff.custom') : t('monitoring.tariff.average')}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted">{t('monitoring.tariff.workPrice')}</p>
          <p className="text-lg font-semibold text-foreground">
            {electricityWorkPrice}{' '}
            <span className="text-sm font-normal text-muted">
              {t('monitoring.tariff.workPriceUnit')}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">{t('monitoring.tariff.basePrice')}</p>
          <p className="text-lg font-semibold text-foreground">
            {electricityBasePrice}{' '}
            <span className="text-sm font-normal text-muted">
              {t('monitoring.tariff.basePriceUnit')}
            </span>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 transition-colors"
      >
        {t('monitoring.tariff.edit')}
      </button>
    </Card>
  )
}
