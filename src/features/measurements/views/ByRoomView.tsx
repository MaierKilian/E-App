import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DoorOpen } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { MEASUREMENT_CATALOG, appliesToRoom } from '../catalog'
import type { MeasurementResult } from '../types'
import { MeasurementRow } from '../MeasurementRow'

interface ViewProps {
  results: Partial<Record<string, MeasurementResult>>
}

/**
 * Raumweise Ansicht: iteriert über die im Onboarding gewählten Räume und zeigt
 * je Raum die anwendbaren Messungen. Ohne Räume ein Hinweis mit Auswahl-Button.
 */
export function ByRoomView({ results }: ViewProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const editProfile = useOnboardingStore((s) => s.editProfile)
  const rooms = useOnboardingStore((s) => s.data.rooms)

  if (rooms.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-4 rounded-3xl p-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted">
          <DoorOpen className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted">{t('measurements.byRoom.noRooms')}</p>
        <button
          type="button"
          onClick={() => {
            editProfile()
            navigate('/onboarding')
          }}
          className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
        >
          {t('measurements.byRoom.selectRooms')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {rooms.map((room) => {
        const items = MEASUREMENT_CATALOG.filter((m) => appliesToRoom(m, room.type))
        if (items.length === 0) return null
        return (
          <div key={room.type} className="space-y-3">
            <h2 className="px-1 font-semibold text-foreground">
              {t(`onboarding.step3.roomTypes.${room.type}`)}
            </h2>
            <div className="space-y-2">
              {items.map((meta) => (
                <MeasurementRow key={meta.id} meta={meta} result={results[meta.id]} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
