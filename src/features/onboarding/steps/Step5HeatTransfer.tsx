import { useTranslation } from 'react-i18next'
import type { OnboardingData, HeatTransferType } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const TRANSFER_TYPES: HeatTransferType[] = ['radiator', 'underfloor']

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
  )
}
