import { useTranslation } from 'react-i18next'
import { Star, ExternalLink, Package } from 'lucide-react'
import type { AffiliateProduct } from '@/features/onboarding/affiliateProducts'

interface AffiliateCardProps {
  product: AffiliateProduct
}

/** Sterne-Bewertung (volle/halbe Sterne) als kleiner, dezenter Platzhalter. */
function Rating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i + 1 <= Math.round(value)
        return (
          <Star
            key={i}
            className={`w-3 h-3 ${
              filled
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted/40'
            }`}
          />
        )
      })}
    </div>
  )
}

/**
 * Premium Produkt-Empfehlungskarte (Amazon-Affiliate, vorerst Platzhalter).
 * Glass-Optik mit sanftem Hover-Lift, klarer CTA und pflichtgemäßer
 * "Anzeige"-Kennzeichnung. Der Link ist als sponsored/noopener gebaut –
 * später muss nur die URL gesetzt werden.
 */
export function AffiliateCard({ product }: AffiliateCardProps) {
  const { t } = useTranslation()

  return (
    <a
      href={product.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="focus-ring group relative flex w-60 shrink-0 snap-start flex-col gap-3 rounded-3xl glass p-3 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 active:scale-[0.98]"
    >
      {/* Pflicht-Kennzeichnung */}
      <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-muted">
        {t('affiliate.adLabel')}
      </span>

      <div className="flex items-center gap-3">
        {/* Produktbild-Platzhalter */}
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-surface-2 to-primary/10 text-muted">
          <Package className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {t(product.nameKey)}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <Rating value={product.rating} />
            <span className="text-[11px] tabular-nums text-muted">
              {product.rating.toFixed(1)}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-primary">
            {t(product.priceKey)}
          </p>
        </div>
      </div>

      <p className="line-clamp-2 text-xs leading-snug text-muted">
        {t(product.benefitKey)}
      </p>

      <span className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity group-hover:opacity-90">
        {t('affiliate.cta')}
        <ExternalLink className="h-4 w-4" />
      </span>
    </a>
  )
}

interface AffiliateRowProps {
  products: AffiliateProduct[]
}

/**
 * Horizontale, snap-scrollbare Karten-Reihe (Karussell) für mehrere Produkte.
 * Bei nur einem Produkt wird dieses voll ausgerichtet.
 */
export function AffiliateRow({ products }: AffiliateRowProps) {
  if (products.length === 0) return null
  return (
    <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
      {products.map((product) => (
        <AffiliateCard key={product.id} product={product} />
      ))}
    </div>
  )
}
