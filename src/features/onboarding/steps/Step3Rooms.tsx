import { useTranslation } from 'react-i18next'
import { Stepper } from '@/components/ui/Stepper'
import { DecimalField } from '@/components/ui/DecimalField'
import { RoomTypePicker } from '../RoomTypePicker'
import { resolveRoomArea } from '@/features/measurements/room_temperature/roomAreas'
import type { OnboardingData, RoomType, RoomEntry } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

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
      // Ohne Wärmeübergabe: Sie wird im Hüllen-Schritt gefragt – und wenn der
      // übersprungen wurde, vom Möbelabstand-Check, der sie tatsächlich braucht.
      const newEntry: RoomEntry = { type, count: 1 }
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

  function getArea(type: RoomType): number | undefined {
    return data.rooms.find((r) => r.type === type)?.areaSqm
  }

  function setArea(type: RoomType, value: number | undefined) {
    const areaSqm = value !== undefined && value > 0 ? value : undefined
    onChange({
      rooms: data.rooms.map((r) => (r.type === type ? { ...r, areaSqm } : r)),
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t('onboarding.step3.subtitle')}</p>
      <RoomTypePicker
        isSelected={isSelected}
        onPick={toggleRoom}
        renderDetails={(type) => (
          <div className="mt-2 flex flex-col items-center gap-2">
            <Stepper
              value={getCount(type)}
              min={0}
              max={10}
              size="sm"
              onChange={(v) => setCount(type, v)}
            />
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <DecimalField
                value={getArea(type)}
                placeholder={String(
                  Math.round(resolveRoomArea(data.rooms, data.livingArea, type).areaSqm),
                )}
                onChange={(v) => setArea(type, v)}
                aria-label={t('onboarding.step3.areaLabel')}
                className="focus-ring w-14 rounded-lg border border-border bg-surface px-2 py-1 text-center text-sm text-foreground"
              />
              {t('onboarding.step3.areaUnit')}
            </label>
          </div>
        )}
      />
    </div>
  )
}
