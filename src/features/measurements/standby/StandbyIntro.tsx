import { useTranslation } from 'react-i18next'
import { Plug, Power, PencilLine, Wifi } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AffiliateLink } from '@/components/AffiliateLink'
import { getAffiliateProducts } from '@/features/onboarding/affiliateProducts'

const STEP_ICONS: LucideIcon[] = [Plug, Power, PencilLine]

/**
 * Intro des Standby-Checks: Gewerk-Label, Hinweis auf das benötigte
 * Strommessgerät, kompakte 1-2-3-Anleitung, dezente Affiliate-Empfehlung und
 * ein deaktivierter Teaser für ein künftiges smartes Messgerät.
 */
export function StandbyIntro() {
  const { t } = useTranslation()
  const steps = t('measurements.standby.intro.steps', { returnObjects: true }) as string[]
  const product = getAffiliateProducts('power_meter')[0]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {t('measurements.categories.electricity')}
        </p>
        <h2 className="mt-1 text-xl font-bold text-foreground">
          {t('measurements.standby.title')}
        </h2>
        <p className="mt-2 text-sm text-muted">{t('measurements.standby.intro.needs')}</p>
      </div>

      <div className="glass rounded-3xl p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('measurements.standby.intro.stepsTitle')}
        </h3>
        <ol className="space-y-4">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Plug
            return (
              <li key={i} className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-foreground">{step}</span>
              </li>
            )
          })}
        </ol>
      </div>

      {product && <AffiliateLink product={product} />}

      {/* Platzhalter-Teaser: künftig smartes Messgerät koppeln (noch deaktiviert). */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left opacity-60"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-2 text-muted">
          <Wifi className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
          {t('measurements.standby.intro.smartTeaser')}
        </span>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
          {t('measurements.standby.intro.smartSoon')}
        </span>
      </button>
    </div>
  )
}
