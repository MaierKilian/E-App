import { useTranslation } from 'react-i18next'
import { Zap, ClipboardList, Check } from 'lucide-react'
import type { OnboardingData } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

interface ModeCardProps {
  selected: boolean
  onClick: () => void
  title: string
  pill: string
  desc: string
  includes: string[]
  icon: React.ReactNode
  recommended?: boolean
  recommendedLabel?: string
}

function ModeCard({
  selected,
  onClick,
  title,
  pill,
  desc,
  includes,
  icon,
  recommended,
  recommendedLabel,
}: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`focus-ring w-full text-left rounded-3xl p-5 transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.985] ${
        selected
          ? 'bg-primary/[0.08] border border-primary shadow-[0_6px_24px_color-mix(in_srgb,var(--primary)_20%,transparent)]'
          : 'glass border border-transparent hover:bg-surface-2/60'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`flex-shrink-0 grid h-11 w-11 place-items-center rounded-2xl transition-colors ${
            selected ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>{title}</p>
            {recommended && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                {recommendedLabel}
              </span>
            )}
            <span
              aria-hidden="true"
              className={`ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
              }`}
            >
              {selected && <Check className="h-4 w-4" />}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                selected ? 'bg-primary/15 text-primary' : 'bg-surface-2 text-muted'
              }`}
            >
              {pill}
            </span>
            <span className="text-xs text-muted">{desc}</span>
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-2 pl-[3.625rem]">
        {includes.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-foreground/90">
            <Check
              className={`h-4 w-4 shrink-0 ${selected ? 'text-primary' : 'text-muted'}`}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}

export function Step0Mode({ data, onChange }: Props) {
  const { t } = useTranslation()
  const quickIncludes = t('onboarding.step0.quickIncludes', { returnObjects: true }) as string[]
  const detailedIncludes = t('onboarding.step0.detailedIncludes', { returnObjects: true }) as string[]

  return (
    <div className="space-y-3.5">
      <ModeCard
        selected={data.mode === 'quick'}
        onClick={() => onChange({ mode: 'quick' })}
        title={t('onboarding.step0.quick')}
        pill={t('onboarding.step0.quickPill')}
        desc={t('onboarding.step0.quickDesc')}
        includes={quickIncludes}
        icon={<Zap className="h-5 w-5" />}
      />
      <ModeCard
        selected={data.mode === 'detailed'}
        onClick={() => onChange({ mode: 'detailed' })}
        title={t('onboarding.step0.detailed')}
        pill={t('onboarding.step0.detailedPill')}
        desc={t('onboarding.step0.detailedDesc')}
        includes={detailedIncludes}
        icon={<ClipboardList className="h-5 w-5" />}
        recommended
        recommendedLabel={t('onboarding.step0.recommended')}
      />
    </div>
  )
}
