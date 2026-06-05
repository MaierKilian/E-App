import { useTranslation } from 'react-i18next'
import { Stepper } from '@/components/ui/Stepper'
import type { OnboardingData, RoomType, RoomEntry } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const ALL_ROOM_TYPES: RoomType[] = [
  'living_room',
  'bedroom',
  'children_room',
  'kitchen',
  'bathroom',
  'toilet',
  'guest_toilet',
  'hallway',
  'office',
  'bureau',
  'staircase',
  'basement',
]

export function Step3Rooms({ data, onChange }: Props) {
  const { t } = useTranslation()

  function isSelected(type: RoomType) {
    return data.rooms.some((r) => r.type === type)
  }

  function getCount(type: RoomType) {
    return data.rooms.find((r) => r.type === type)?.count ?? 1
  }

  function toggleRoom(type: RoomType) {
    if (isSelected(type)) {
      onChange({ rooms: data.rooms.filter((r) => r.type !== type) })
    } else {
      const newEntry: RoomEntry = { type, count: 1, heatTransfer: 'radiator' }
      onChange({ rooms: [...data.rooms, newEntry] })
    }
  }

  function setCount(type: RoomType, count: number) {
    onChange({
      rooms: data.rooms.map((r) => (r.type === type ? { ...r, count } : r)),
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('onboarding.step3.subtitle')}</p>
      {ALL_ROOM_TYPES.map((type) => {
        const selected = isSelected(type)
        return (
          <div
            key={type}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
              selected
                ? 'border-primary bg-primary/10'
                : 'border-border bg-surface'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleRoom(type)}
              className="flex-1 text-left text-sm font-medium text-foreground"
            >
              {t(`onboarding.step3.roomTypes.${type}`)}
            </button>
            {selected && (
              <Stepper
                value={getCount(type)}
                min={1}
                max={10}
                onChange={(v) => setCount(type, v)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
