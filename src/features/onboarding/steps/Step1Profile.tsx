import { useTranslation } from 'react-i18next'
import { Stepper } from '@/components/ui/Stepper'
import { SelectChip } from '@/components/ui/SelectChip'
import { InfoButton } from '@/components/ui/InfoButton'
import type { OnboardingData, UserGoal, OccupancyStatus } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  detailed?: boolean
}

const GOALS: UserGoal[] = ['save_costs', 'reduce_co2', 'improve_comfort', 'curiosity', 'htw_study']
const OCCUPANCY_STATUSES: OccupancyStatus[] = ['tenant', 'owner']

export function Step1Profile({ data, onChange, detailed = false }: Props) {
  const { t } = useTranslation()

  function toggleGoal(goal: UserGoal) {
    const current = data.goals
    if (current.includes(goal)) {
      onChange({ goals: current.filter((g) => g !== goal) })
    } else {
      onChange({ goals: [...current, goal] })
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {t('onboarding.step1.profileName')}
        </label>
        <input
          type="text"
          value={data.profileName}
          onChange={(e) => onChange({ profileName: e.target.value })}
          placeholder={t('onboarding.step1.profileNamePlaceholder')}
          className="focus-ring w-full px-4 py-3 rounded-2xl glass text-foreground placeholder:text-muted transition-colors"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
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

      {!detailed && (
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-medium text-foreground">
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
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {t('onboarding.step1.goals')}
              <InfoButton text={t('info.goals')} />
            </label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((goal) => (
                <SelectChip
                  key={goal}
                  label={t(`onboarding.step1.goalOptions.${goal}`)}
                  selected={data.goals.includes(goal)}
                  onClick={() => toggleGoal(goal)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {t('onboarding.step1.occupancyStatus')}
              <InfoButton text={t('info.occupancy')} />
            </label>
            <div className="flex gap-2">
              {OCCUPANCY_STATUSES.map((status) => (
                <SelectChip
                  key={status}
                  label={t(`onboarding.step1.occupancyOptions.${status}`)}
                  selected={data.occupancyStatus === status}
                  onClick={() => onChange({ occupancyStatus: status })}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
