import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import type { AffiliateProduct } from '@/features/onboarding/affiliateProducts'

interface AffiliateLinkProps {
  product: AffiliateProduct
}

/**
 * Sehr dezente, einzeilige Affiliate-Empfehlung: ein unaufdringlicher Textlink
 * „<Produktname> ansehen ›" mit winziger Pflicht-Kennzeichnung („Anzeige").
 * Bewusst ohne Bild, Karte oder Sterne – nur eine zarte Zeile unter dem
 * Ergebnis/Tipp. Der Link ist als sponsored/noopener gebaut; später muss nur
 * die URL im Produkt gesetzt werden.
 */
export function AffiliateLink({ product }: AffiliateLinkProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <a
        href={product.url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="focus-ring inline-flex items-center gap-0.5 rounded-md font-medium text-muted transition-colors hover:text-primary"
      >
        {t('measurements.affiliateLink', { name: t(product.nameKey) })}
        <ChevronRight className="h-3.5 w-3.5" />
      </a>
      <span className="text-[10px] uppercase tracking-wide text-muted/70">
        {t('affiliate.adLabel')}
      </span>
    </div>
  )
}
