import { useTranslation } from 'react-i18next'
import { Flame, Grip } from 'lucide-react'
import { Stepper } from '@/components/ui/Stepper'
import { DecimalField } from '@/components/ui/DecimalField'
import { RoomTypePicker } from '../RoomTypePicker'
import { resolveRoomArea } from '@/features/measurements/room_temperature/roomAreas'
import type { OnboardingData, RoomType, RoomEntry, HeatTransferType } from '@/types'

const TRANSFERS: { value: HeatTransferType; icon: typeof Flame }[] = [
  { value: 'radiator', icon: Flame },
  { value: 'underfloor', icon: Grip },
]

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

  function getTransfer(type: RoomType): HeatTransferType | undefined {
    return data.rooms.find((r) => r.type === type)?.heatTransfer
  }

  function setArea(type: RoomType, value: number | undefined) {
    const areaSqm = value !== undefined && value > 0 ? value : undefined
    onChange({
      rooms: data.rooms.map((r) => (r.type === type ? { ...r, areaSqm } : r)),
    })
  }

  function setTransfer(type: RoomType, heatTransfer: HeatTransferType) {
    onChange({
      rooms: data.rooms.map((r) => (r.type === type ? { ...r, heatTransfer } : r)),
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

            {/* Die Wärmeübergabe stand vorher in einem eigenen Schritt als
                Tabelle über alle Raumtypen. Hier steht sie beim Raum, den sie
                beschreibt – und der Möbelabstand-Check braucht sie ohnehin
                raumweise. Keine Vorauswahl: „noch nicht beantwortet" ist ein
                eigener Zustand, sonst behauptete die App Heizkörper. */}
            {/* Untereinander, nicht nebeneinander: Die Kachel ist eine von zwei
                Spalten und innen nur rund 127 px breit – „Heizkörper" und
                „Fußboden" brauchen nebeneinander gut 170 px. Zwei flex-1-Knöpfe
                schrumpfen nicht unter ihre Mindestbreite, also stand der zweite
                über den Kachelrand hinaus. Gestapelt hat jeder die volle Breite,
                unabhängig davon, wie lang die Beschriftung übersetzt ist. */}
            <div className="flex w-full flex-col gap-1">
              {TRANSFERS.map(({ value, icon: Icon }) => {
                const active = getTransfer(type) === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTransfer(type, value)}
                    aria-pressed={active}
                    className={`focus-ring flex w-full min-w-0 items-center justify-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium transition-[background-color,color] ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-2/70 text-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{t(`onboarding.step5.${value}Short`)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      />
    </div>
  )
}
