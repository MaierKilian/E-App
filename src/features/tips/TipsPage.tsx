import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ExternalLink, Sparkles, ShoppingBag, PiggyBank } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { buildTips, type Tip, type TipCategory } from './buildTips'
import { TIP_PRODUCTS, amazonSearchUrl } from './products'

/** Farbcodierung der Icon-Kachel je Gewerk (Structured-Stil, ruhige Akzente). */
const ACCENT: Record<TipCategory, string> = {
  heating: 'bg-amber-500/15 text-amber-500',
  electricity: 'bg-sky-500/15 text-sky-500',
  water: 'bg-cyan-500/15 text-cyan-500',
}

/** Schlanker, klickbarer Amazon-Suchlink (führt zum Suchbegriff). */
function AmazonButton({ productId }: { productId: string }) {
  const { t } = useTranslation()
  const product = TIP_PRODUCTS[productId]
  if (!product) return null
  return (
    <a
      href={amazonSearchUrl(product.query)}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="focus-ring mt-3 ml-14 flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/30 px-3 py-2 transition-colors hover:bg-surface-2/60"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShoppingBag className="h-4 w-4 text-muted" />
        {t('affiliate.cta')}
      </span>
      <span className="flex items-center gap-1.5 text-xs">
        {product.priceKey && <span className="text-muted">{t(product.priceKey)}</span>}
        <ExternalLink className="h-3.5 w-3.5 text-primary" />
      </span>
    </a>
  )
}

/** Eine Empfehlungs-Karte: farbige Icon-Kachel, Titel, Begründung, Wirkungs-Pill, optional Produkt. */
function TipCard({ tip }: { tip: Tip }) {
  const { t, i18n } = useTranslation()
  const Icon = tip.icon
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${ACCENT[tip.category]}`}>
          <Icon className="h-5.5 w-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-tight text-foreground">
              {t(`tips.items.${tip.id}.title`, tip.params)}
            </p>
            {tip.savingEur ? (
              <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold tabular-nums text-success">
                {t('tips.savingPerYear', { value: eurFmt.format(tip.savingEur) })}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                {t('tips.worthIt')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm leading-snug text-muted">
            {t(`tips.items.${tip.id}.reason`, tip.params)}
          </p>
        </div>
      </div>

      {tip.productId && <AmazonButton productId={tip.productId} />}
    </div>
  )
}

/** Empfehlungen: Spar-Übersicht oben, darunter konkrete Maßnahmen nach Wirkung. */
export function TipsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const data = useOnboardingStore((s) => s.data)
  const results = useMeasurementsStore((s) => s.results)

  const tips = buildTips(data, results)
  const totalEur = tips.reduce((sum, tip) => sum + (tip.savingEur ?? 0), 0)
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const hasProducts = tips.some((tip) => tip.productId)

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

      <h1 className="text-2xl font-bold">{t('tips.title')}</h1>

      {tips.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">{t('tips.empty')}</p>
        </div>
      ) : (
        <>
          {/* Spar-Übersicht */}
          <div className="glass relative overflow-hidden rounded-3xl p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-success opacity-[0.16] blur-3xl"
            />
            <div className="relative flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-success/15 text-success">
                <PiggyBank className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted">
                  {t('tips.potentialLabel')}
                </p>
                {totalEur > 0 ? (
                  <p className="text-3xl font-bold leading-none tabular-nums text-foreground">
                    {t('tips.savingPerYear', { value: eurFmt.format(totalEur) })}
                  </p>
                ) : (
                  <p className="text-3xl font-bold leading-none text-foreground">{tips.length}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {t('tips.countLine', { count: tips.length })}
                </p>
              </div>
            </div>
          </div>

          {/* Maßnahmen-Liste */}
          <div className="space-y-3">
            {tips.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>

          {hasProducts && <p className="px-1 text-[11px] text-muted">{t('tips.adNote')}</p>}
        </>
      )}
    </div>
  )
}
