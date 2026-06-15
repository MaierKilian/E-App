import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ExternalLink, Sparkles } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { buildTips, type Tip } from './buildTips'
import { TIP_PRODUCTS } from './products'

/** Ehrliche Produktkarte (ohne Sterne) – nur Name, Nutzen, Preis, Kennzeichnung. */
function TipProduct({ productId }: { productId: string }) {
  const { t } = useTranslation()
  const product = TIP_PRODUCTS[productId]
  if (!product) return null
  return (
    <a
      href={product.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="focus-ring block rounded-xl border border-border bg-surface-2/40 p-3 transition-colors hover:bg-surface-2/70"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
          {t('affiliate.adLabel')}
        </span>
        <span className="text-sm font-semibold text-primary">{t(product.priceKey)}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{t(product.nameKey)}</p>
      <p className="text-xs text-muted">{t(product.benefitKey)}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
        {t('affiliate.cta')}
        <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </a>
  )
}

/** Eine Empfehlungs-Karte: Icon, Titel, Begründung, Wirkungs-Badge, optional Produkt. */
function TipCard({ tip }: { tip: Tip }) {
  const { t, i18n } = useTranslation()
  const Icon = tip.icon
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-tight text-foreground">
              {t(`tips.items.${tip.id}.title`)}
            </p>
            {tip.savingEur ? (
              <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
                {t('tips.savingPerYear', { value: eurFmt.format(tip.savingEur) })}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {t('tips.worthIt')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">{t(`tips.items.${tip.id}.reason`)}</p>
        </div>
      </div>

      {tip.productId && <TipProduct productId={tip.productId} />}
    </div>
  )
}

/** Bündelt alle personalisierten Handlungsempfehlungen, nach Wirkung sortiert. */
export function TipsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const data = useOnboardingStore((s) => s.data)
  const results = useMeasurementsStore((s) => s.results)

  const tips = buildTips(data, results)

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('common.back')}
      </button>

      <div>
        <h1 className="text-2xl font-bold">{t('tips.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('tips.subtitle')}</p>
      </div>

      {tips.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">{t('tips.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tips.map((tip) => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </div>
      )}
    </div>
  )
}
