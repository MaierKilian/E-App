import { useTranslation } from 'react-i18next'
import { Zap, ClipboardList } from 'lucide-react'
import type { OnboardingData, OnboardingMode } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

interface ModeCardProps {
  mode: OnboardingMode
  selected: boolean
  onClick: () => void
  title: string
  desc: string
  icon: React.ReactNode
}

function ModeCard({ selected, onClick, title, desc, icon }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring w-full text-left rounded-3xl px-5 py-4 transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.98] flex gap-4 items-start ${
        selected
          ? 'bg-primary/10 border border-primary shadow-[0_4px_18px_color-mix(in_srgb,var(--primary)_22%,transparent)]'
          : 'glass hover:bg-surface-2/60'
      }`}
    >
      <div
        className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          selected ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className={`font-semibold text-sm ${selected ? 'text-primary' : 'text-foreground'}`}>
          {title}
        </p>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
    </button>
  )
}

export function Step0Mode({ data, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <ModeCard
        mode="quick"
        selected={data.mode === 'quick'}
        onClick={() => onChange({ mode: 'quick' })}
        title={t('onboarding.step0.quick')}
        desc={t('onboarding.step0.quickDesc')}
        icon={<Zap className="w-4 h-4" />}
      />
      <ModeCard
        mode="detailed"
        selected={data.mode === 'detailed'}
        onClick={() => onChange({ mode: 'detailed' })}
        title={t('onboarding.step0.detailed')}
        desc={t('onboarding.step0.detailedDesc')}
        icon={<ClipboardList className="w-4 h-4" />}
      />
    </div>
  )
}
