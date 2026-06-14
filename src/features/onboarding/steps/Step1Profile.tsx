import { useTranslation } from 'react-i18next'
import {
  Tag,
  PiggyBank,
  Leaf,
  ThermometerSun,
  Sparkles,
  GraduationCap,
  Key,
  Home,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Stepper } from '@/components/ui/Stepper'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
import { InfoButton } from '@/components/ui/InfoButton'
import type { OnboardingData, UserGoal, OccupancyStatus } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  detailed?: boolean
}

const GOALS: UserGoal[] = ['save_costs', 'reduce_co2', 'improve_comfort', 'curiosity', 'htw_study']
const GOAL_ICONS: Record<UserGoal, LucideIcon> = {
  save_costs: PiggyBank,
  reduce_co2: Leaf,
  improve_comfort: ThermometerSun,
  curiosity: Sparkles,
  htw_study: GraduationCap,
}

const OCCUPANCY_STATUSES: OccupancyStatus[] = ['tenant', 'owner']
const OCCUPANCY_ICONS: Record<OccupancyStatus, LucideIcon> = {
  tenant: Key,
  owner: Home,
}

export function Step1Profile({ data, onChange, detailed = false }: Props) {
  const { t } = useTranslation()

  function toggleGoal(goal: UserGoal) {
    const current = data.goals
    onChange({
      goals: current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal],
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Field title={t('onboarding.step1.profileName')} hint={t('onboarding.step1.profileNameHint')}>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={data.profileName}
              onChange={(e) => onChange({ profileName: e.target.value })}
              placeholder={t('onboarding.step1.profileNamePlaceholder')}
              className="focus-ring w-full rounded-2xl glass py-3 pl-10 pr-4 text-foreground placeholder:text-muted transition-colors"
            />
          </div>
        </Field>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {t('onboarding.step1.persons')}
            <InfoButton text={t('info.persons')} />
          </label>
          <Stepper
            value={data.personsCount}
            min={1}
            max={10}
            onChange={(v) => onChange({ personsCount: v })}
          />
        </div>
        <p className="text-xs text-muted">{t('onboarding.step1.personsHint')}</p>
      </div>

      {!detailed && (
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-semibold text-foreground">
            {t('onboarding.step1.rooms')}
          </label>
          <Stepper
            value={data.roomsCount}
            min={1}
            max={20}
            onChange={(v) => onChange({ roomsCount: v })}
          />
        </div>
      )}

      {detailed && (
        <>
          <Field
            title={t('onboarding.step1.goals')}
            info={t('info.goals')}
            hint={t('onboarding.step1.goalsHint')}
          >
            <div className="flex flex-wrap gap-2">
              {GOALS.map((goal) => (
                <OptionChip
                  key={goal}
                  icon={GOAL_ICONS[goal]}
                  label={t(`onboarding.step1.goalOptions.${goal}`)}
                  selected={data.goals.includes(goal)}
                  onClick={() => toggleGoal(goal)}
                />
              ))}
            </div>
          </Field>

          <Field
            title={t('onboarding.step1.occupancyStatus')}
            info={t('info.occupancy')}
            hint={t('onboarding.step1.statusHint')}
          >
            <div className="flex gap-2">
              {OCCUPANCY_STATUSES.map((status) => (
                <OptionChip
                  key={status}
                  icon={OCCUPANCY_ICONS[status]}
                  label={t(`onboarding.step1.occupancyOptions.${status}`)}
                  selected={data.occupancyStatus === status}
                  onClick={() => onChange({ occupancyStatus: status })}
                />
              ))}
            </div>
          </Field>
        </>
      )}
    </div>
  )
}
