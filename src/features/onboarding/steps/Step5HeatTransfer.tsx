import { useTranslation } from 'react-i18next'
import {
  Heater,
  Grip,
  Wind,
  Recycle,
  Fan,
  HelpCircle,
  ShieldCheck,
  Shield,
  ShieldAlert,
  ShieldX,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
import { getRoomIcon } from '../roomIcons'
import type {
  OnboardingData,
  HeatTransferType,
  VentilationType,
  InsulationState,
} from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const TRANSFER_TYPES: HeatTransferType[] = ['radiator', 'underfloor']
const TRANSFER_ICONS: Record<HeatTransferType, LucideIcon> = {
  radiator: Heater,
  underfloor: Grip,
}

const VENTILATION_TYPES: VentilationType[] = [
  'natural',
  'mechanical_hrv',
  'mechanical_no_hrv',
  'unknown',
]
const VENTILATION_ICONS: Record<VentilationType, LucideIcon> = {
  natural: Wind,
  mechanical_hrv: Recycle,
  mechanical_no_hrv: Fan,
  unknown: HelpCircle,
}

const INSULATION_STATES: InsulationState[] = ['very_good', 'good', 'medium', 'poor', 'unknown']
const INSULATION_ICONS: Record<InsulationState, LucideIcon> = {
  very_good: ShieldCheck,
  good: Shield,
  medium: ShieldAlert,
  poor: ShieldX,
  unknown: HelpCircle,
}

export function Step5HeatTransfer({ data, onChange }: Props) {
  const { t } = useTranslation()

  function setTransfer(roomType: string, transfer: HeatTransferType) {
    onChange({
      rooms: data.rooms.map((r) => (r.type === roomType ? { ...r, heatTransfer: transfer } : r)),
    })
  }

  if (data.rooms.length === 0) {
    return <p className="text-sm text-muted">{t('onboarding.step5.noRooms')}</p>
  }

  return (
    <div className="space-y-6">
      <Field title={t('onboarding.step5.heatTransferTitle')} hint={t('onboarding.step5.roomsHint')}>
        <div className="space-y-2">
          {data.rooms.map((room) => {
            const RoomIcon = getRoomIcon(room.type)
            return (
              <div
                key={room.type}
                className="glass flex items-center justify-between gap-2 rounded-2xl px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <RoomIcon className="h-4.5 w-4.5 shrink-0 text-primary" />
                  <span className="truncate text-sm font-medium text-foreground">
                    {t(`onboarding.step3.roomTypes.${room.type}`)}
                    {room.count > 1 && <span className="ml-1 text-muted">×{room.count}</span>}
                  </span>
                </span>
                <div className="flex shrink-0 gap-1">
                  {TRANSFER_TYPES.map((type) => {
                    const Icon = TRANSFER_ICONS[type]
                    const active = room.heatTransfer === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTransfer(room.type, type)}
                        aria-pressed={active}
                        className={`focus-ring inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-[transform,background-color] active:scale-95 ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface-2/70 text-foreground hover:bg-surface-2'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {t(`onboarding.step5.${type}Short`)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Field>

      <Field
        title={t('onboarding.step5.ventilationType')}
        info={t('info.ventilation')}
      >
        <div className="flex flex-wrap gap-2">
          {VENTILATION_TYPES.map((type) => (
            <OptionChip
              key={type}
              icon={VENTILATION_ICONS[type]}
              label={t(`onboarding.step5.ventilationOptions.${type}`)}
              selected={data.ventilationType === type}
              onClick={() => onChange({ ventilationType: type })}
            />
          ))}
        </div>
      </Field>

      <Field
        title={t('onboarding.step5.insulationState')}
        info={t('info.insulation')}
        hint={t('onboarding.step5.insulationHint')}
      >
        <div className="flex flex-wrap gap-2">
          {INSULATION_STATES.map((state) => (
            <OptionChip
              key={state}
              icon={INSULATION_ICONS[state]}
              label={t(`onboarding.step5.insulationOptions.${state}`)}
              selected={data.insulationState === state}
              onClick={() => onChange({ insulationState: state })}
            />
          ))}
        </div>
      </Field>
    </div>
  )
}
