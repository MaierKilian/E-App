import { useTranslation } from 'react-i18next'
import { SelectChip } from '@/components/ui/SelectChip'
import type {
  OnboardingData,
  GaEcosystem,
  GaUseCase,
  GaBudget,
  GaInstall,
  GaDevice,
  GaRoomEntry,
  RoomType,
} from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  /** Zum Zimmer-Abschnitt springen (Hub-Index 2), falls keine Räume vorliegen. */
  onGoToRooms?: () => void
}

const ECOSYSTEMS: GaEcosystem[] = [
  'homematic_ip',
  'zigbee',
  'hue',
  'alexa',
  'google_home',
  'homekit',
  'matter',
  'ikea',
  'none',
]
const HUB_OPTIONS = ['yes', 'no', 'unknown'] as const
const USE_CASES: GaUseCase[] = ['energy', 'comfort', 'security', 'shading', 'presence']
const BUDGETS: GaBudget[] = ['under_200', '200_500', '500_1500', 'over_1500', 'unknown']
const INSTALLS: GaInstall[] = ['diy', 'professional', 'unknown']
const DEVICES: GaDevice[] = ['lights', 'switches', 'sockets', 'blinds', 'thermostats', 'sensors']

/** Mehrfachauswahl mit exklusiver 'none'-Option (für Ökosysteme). */
function toggleEcosystem(current: GaEcosystem[], value: GaEcosystem): GaEcosystem[] {
  if (value === 'none') {
    return current.includes('none') ? [] : ['none']
  }
  const withoutNone = current.filter((e) => e !== 'none')
  return withoutNone.includes(value)
    ? withoutNone.filter((e) => e !== value)
    : [...withoutNone, value]
}

function toggleInList<T>(current: T[], value: T): T[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}

/** Kompakte Zeile mit Label + horizontal scrollbaren/umbrechenden Auswahlchips. */
function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

/** Eine Raum-Karte mit den smart auszustattenden Gewerken. */
function GaRoomCard({
  roomType,
  count,
  selected,
  onToggle,
}: {
  roomType: RoomType
  count: number
  selected: GaDevice[]
  onToggle: (device: GaDevice) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl glass px-3.5 py-3 space-y-2.5">
      <p className="text-sm font-medium text-foreground">
        {t(`onboarding.step3.roomTypes.${roomType}`)}
        {count > 1 && <span className="text-muted ml-1">×{count}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {DEVICES.map((device) => (
          <SelectChip
            key={device}
            label={t(`onboarding.ga.deviceOptions.${device}`)}
            selected={selected.includes(device)}
            onClick={() => onToggle(device)}
            className="px-3 py-1.5"
          />
        ))}
      </div>
    </div>
  )
}

export function StepBuildingAutomation({ data, onChange, onGoToRooms }: Props) {
  const { t } = useTranslation()
  const ga = data.buildingAutomation

  function patch(partial: Partial<OnboardingData['buildingAutomation']>) {
    onChange({ buildingAutomation: { ...ga, ...partial } })
  }

  function devicesForRoom(roomType: RoomType): GaDevice[] {
    return ga.rooms.find((r) => r.roomType === roomType)?.devices ?? []
  }

  function toggleRoomDevice(roomType: RoomType, device: GaDevice) {
    const existing = ga.rooms.find((r) => r.roomType === roomType)
    let nextRooms: GaRoomEntry[]
    if (!existing) {
      nextRooms = [...ga.rooms, { roomType, devices: [device] }]
    } else {
      const devices = toggleInList(existing.devices, device)
      nextRooms = ga.rooms.map((r) => (r.roomType === roomType ? { ...r, devices } : r))
    }
    patch({ rooms: nextRooms })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{t('onboarding.ga.subtitle')}</p>

      <ChipGroup label={t('onboarding.ga.ecosystem')}>
        {ECOSYSTEMS.map((eco) => (
          <SelectChip
            key={eco}
            label={t(`onboarding.ga.ecosystemOptions.${eco}`)}
            selected={ga.ecosystems.includes(eco)}
            onClick={() => patch({ ecosystems: toggleEcosystem(ga.ecosystems, eco) })}
          />
        ))}
      </ChipGroup>

      <ChipGroup label={t('onboarding.ga.hub')}>
        {HUB_OPTIONS.map((opt) => (
          <SelectChip
            key={opt}
            label={t(`onboarding.ga.hubOptions.${opt}`)}
            selected={ga.hasHub === opt}
            onClick={() => patch({ hasHub: opt })}
          />
        ))}
      </ChipGroup>

      <ChipGroup label={t('onboarding.ga.useCases')}>
        {USE_CASES.map((uc) => (
          <SelectChip
            key={uc}
            label={t(`onboarding.ga.useCaseOptions.${uc}`)}
            selected={ga.useCases.includes(uc)}
            onClick={() => patch({ useCases: toggleInList(ga.useCases, uc) })}
          />
        ))}
      </ChipGroup>

      <ChipGroup label={t('onboarding.ga.budget')}>
        {BUDGETS.map((b) => (
          <SelectChip
            key={b}
            label={t(`onboarding.ga.budgetOptions.${b}`)}
            selected={ga.budget === b}
            onClick={() => patch({ budget: b })}
          />
        ))}
      </ChipGroup>

      <ChipGroup label={t('onboarding.ga.install')}>
        {INSTALLS.map((i) => (
          <SelectChip
            key={i}
            label={t(`onboarding.ga.installOptions.${i}`)}
            selected={ga.install === i}
            onClick={() => patch({ install: i })}
          />
        ))}
      </ChipGroup>

      <div className="space-y-2.5">
        <label className="block text-sm font-medium text-foreground">
          {t('onboarding.ga.roomsTitle')}
        </label>
        {data.rooms.length === 0 ? (
          <div className="rounded-2xl glass px-3.5 py-4 space-y-3">
            <p className="text-sm text-muted">{t('onboarding.ga.noRooms')}</p>
            {onGoToRooms && (
              <button
                type="button"
                onClick={onGoToRooms}
                className="focus-ring w-full px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold transition-transform active:scale-[0.98]"
              >
                {t('onboarding.ga.selectRoomsCta')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.rooms.map((room) => (
              <GaRoomCard
                key={room.type}
                roomType={room.type}
                count={room.count}
                selected={devicesForRoom(room.type)}
                onToggle={(device) => toggleRoomDevice(room.type, device)}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted">{t('onboarding.ga.recommendationNote')}</p>
    </div>
  )
}
