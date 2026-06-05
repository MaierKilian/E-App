import { useTranslation } from 'react-i18next'
import { SelectChip } from '@/components/ui/SelectChip'
import { InfoButton } from '@/components/ui/InfoButton'
import type { OnboardingData, HeatTransferType, VentilationType, InsulationState } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const TRANSFER_TYPES: HeatTransferType[] = ['radiator', 'underfloor']
const VENTILATION_TYPES: VentilationType[] = ['natural', 'mechanical_hrv', 'mechanical_no_hrv', 'unknown']
const INSULATION_STATES: InsulationState[] = ['very_good', 'good', 'medium', 'poor', 'unknown']

export function Step5HeatTransfer({ data, onChange }: Props) {
  const { t } = useTranslation()

  function setTransfer(roomType: string, transfer: HeatTransferType) {
    onChange({
      rooms: data.rooms.map((r) =>
        r.type === roomType ? { ...r, heatTransfer: transfer } : r,
      ),
    })
  }

  if (data.rooms.length === 0) {
    return (
      <p className="text-sm text-muted">{t('onboarding.step5.noRooms')}</p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted">{t('onboarding.step5.subtitle')}</p>
        {data.rooms.map((room) => (
          <div
            key={room.type}
            className="rounded-xl border border-border bg-surface px-4 py-3 space-y-2"
          >
            <p className="text-sm font-medium text-foreground">
              {t(`onboarding.step3.roomTypes.${room.type}`)}
              {room.count > 1 && (
                <span className="text-muted ml-1">×{room.count}</span>
              )}
            </p>
            <div className="flex gap-2">
              {TRANSFER_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTransfer(room.type, type)}
                  className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    room.heatTransfer === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface-2 border-border text-foreground hover:bg-surface'
                  }`}
                >
                  {t(`onboarding.step5.${type}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {t('onboarding.step5.ventilationType')}
          <InfoButton text={t('info.ventilation')} />
        </label>
        <div className="flex flex-wrap gap-2">
          {VENTILATION_TYPES.map((type) => (
            <SelectChip
              key={type}
              label={t(`onboarding.step5.ventilationOptions.${type}`)}
              selected={data.ventilationType === type}
              onClick={() => onChange({ ventilationType: type })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {t('onboarding.step5.insulationState')}
          <InfoButton text={t('info.insulation')} />
        </label>
        <div className="flex flex-wrap gap-2">
          {INSULATION_STATES.map((state) => (
            <SelectChip
              key={state}
              label={t(`onboarding.step5.insulationOptions.${state}`)}
              selected={data.insulationState === state}
              onClick={() => onChange({ insulationState: state })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
