import { useTranslation } from 'react-i18next'
import { Stepper } from '@/components/ui/Stepper'
import { getRoomIcon } from '../roomIcons'
import type { OnboardingData, RoomType, RoomEntry } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

/** Raumtypen, nach Bereichen gruppiert – erleichtert die Auswahl. */
const ROOM_GROUPS: { id: string; types: RoomType[] }[] = [
  { id: 'living', types: ['living_room', 'dining_room', 'bedroom', 'children_room', 'office'] },
  { id: 'functional', types: ['kitchen', 'bathroom', 'toilet', 'hallway', 'utility_room'] },
  { id: 'secondary', types: ['basement', 'staircase', 'attic'] },
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
    if (count <= 0) {
      onChange({ rooms: data.rooms.filter((r) => r.type !== type) })
    } else {
      onChange({
        rooms: data.rooms.map((r) => (r.type === type ? { ...r, count } : r)),
      })
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t('onboarding.step3.subtitle')}</p>
      {ROOM_GROUPS.map((group) => (
        <div key={group.id} className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t(`onboarding.step3.groups.${group.id}`)}
          </h3>
          <div className="grid grid-cols-2 gap-2.5 items-start">
            {group.types.map((type) => {
              const selected = isSelected(type)
              const RoomIcon = getRoomIcon(type)
              return (
                <div
                  key={type}
                  className={`rounded-2xl px-3 py-2.5 transition-[transform,background-color,box-shadow] active:scale-[0.98] ${
                    selected
                      ? 'bg-primary/10 border border-primary shadow-[0_3px_14px_color-mix(in_srgb,var(--primary)_18%,transparent)]'
                      : 'glass'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleRoom(type)}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-2 text-left text-sm font-medium leading-tight ${
                      selected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    <RoomIcon className={`h-4 w-4 shrink-0 ${selected ? 'text-primary' : 'text-muted'}`} />
                    <span className="truncate">{t(`onboarding.step3.roomTypes.${type}`)}</span>
                  </button>
                  {selected && (
                    <div className="mt-2 flex justify-center">
                      <Stepper
                        value={getCount(type)}
                        min={0}
                        max={10}
                        size="sm"
                        onChange={(v) => setCount(type, v)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
