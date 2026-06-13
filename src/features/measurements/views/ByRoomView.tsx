import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DoorOpen, Home } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { MEASUREMENT_CATALOG, appliesToRoom } from '../catalog'
import type { MeasurementResult } from '../types'
import { roomInstances, roomLabel } from '../rooms'
import { GroupTileGrid, type TileGroup, type TileItem } from './GroupTileGrid'

interface ViewProps {
  results: Partial<Record<string, MeasurementResult>>
}

/**
 * Raumweise Ansicht als Kachel-Grid: je Raum-Instanz eine Kachel; Pro-Raum-
 * Messungen erhalten ein eigenes Ergebnis je Raum. Ganz-Haus-Messungen (z. B.
 * Standby) stehen in einer eigenen „Ganzes Zuhause"-Gruppe.
 */
export function ByRoomView({ results }: ViewProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const editProfile = useOnboardingStore((s) => s.editProfile)
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const skippedRooms = useMeasurementsStore((s) => s.skippedRooms)
  const toggleSkippedRoom = useMeasurementsStore((s) => s.toggleSkippedRoom)

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

  // Eine Gruppe je Raum-Instanz; Pro-Raum-Messungen mit raumspezifischem Schlüssel.
  const roomGroups: TileGroup[] = roomInstances(rooms)
    .map((inst) => ({
      key: inst.key,
      label: roomLabel(t, inst),
      icon: DoorOpen,
      items: MEASUREMENT_CATALOG.filter((m) => appliesToRoom(m, inst.type)).map<TileItem>((meta) => ({
        meta,
        roomKey: meta.perRoom ? inst.key : undefined,
      })),
    }))
    .filter((g) => g.items.length > 0)

  // Ganz-Haus-Messungen als eigene Gruppe.
  const homeItems = MEASUREMENT_CATALOG.filter((m) => m.wholeHome).map<TileItem>((meta) => ({ meta }))
  const homeGroup: TileGroup[] =
    homeItems.length > 0
      ? [{ key: '__home__', label: t('measurements.byRoom.wholeHome'), icon: Home, items: homeItems }]
      : []

  const groups = [...homeGroup, ...roomGroups]

  const skip = {
    skipped: new Set<string>(skippedRooms),
    onToggle: (key: string) => toggleSkippedRoom(key),
  }

  return <GroupTileGrid groups={groups} results={results} skip={skip} />
}
