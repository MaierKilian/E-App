import { useTranslation } from 'react-i18next'
import { Flame, Grip, Plus, RadioTower, Snowflake, Trees, X } from 'lucide-react'
import { DecimalField } from '@/components/ui/DecimalField'
import { RoomTypePicker } from '../RoomTypePicker'
import { newRoomId } from '@/features/measurements/rooms'
import { resolveRoomArea } from '@/features/measurements/room_temperature/roomAreas'
import type {
  OnboardingData,
  RoomType,
  RoomEntry,
  RoomInstanceEntry,
  HeatTransferType,
} from '@/types'

/**
 * Fünf Antworten seit dem 05.09.2026.
 *
 * Vorher gab es nur Heizkörper und Fußbodenheizung – wer Infrarotplatten oder
 * einen Kachelofen hat, musste eins von beiden behaupten, um weiterzukommen.
 * Und für Keller, Dachboden und Treppenhaus war **jede** der zwei Antworten
 * falsch: „unbeheizt" fehlte, obwohl die Angabe Pflicht ist.
 */
const TRANSFERS: { value: HeatTransferType; icon: typeof Flame }[] = [
  { value: 'radiator', icon: Flame },
  { value: 'underfloor', icon: Grip },
  { value: 'infrared', icon: RadioTower },
  { value: 'stove', icon: Trees },
  { value: 'none', icon: Snowflake },
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

  function instancesOf(type: RoomType): RoomInstanceEntry[] {
    return data.rooms.find((r) => r.type === type)?.instances ?? []
  }

  /** Räume einer Art ersetzen – leere Liste heißt: Raumart abgewählt. */
  function setInstances(type: RoomType, instances: RoomInstanceEntry[]) {
    const rooms: RoomEntry[] =
      instances.length === 0
        ? data.rooms.filter((r) => r.type !== type)
        : data.rooms.some((r) => r.type === type)
          ? data.rooms.map((r) => (r.type === type ? { ...r, instances } : r))
          : [...data.rooms, { type, instances }]
    onChange({ rooms })
  }

  function toggleRoom(type: RoomType) {
    // Ohne Wärmeübergabe: Sie steht gleich darunter – und wenn sie
    // unbeantwortet bleibt, fragt der Möbelabstand-Check nach, der sie
    // tatsächlich braucht.
    setInstances(type, isSelected(type) ? [] : [{ id: newRoomId(type) }])
  }

  function patch(type: RoomType, id: string, partial: Partial<RoomInstanceEntry>) {
    setInstances(
      type,
      instancesOf(type).map((inst) => (inst.id === id ? { ...inst, ...partial } : inst)),
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t('onboarding.step3.subtitle')}</p>
      <RoomTypePicker
        isSelected={isSelected}
        onPick={toggleRoom}
        renderDetails={(type) => {
          const instances = instancesOf(type)
          const many = instances.length > 1
          return (
            <div className="mt-2 space-y-2.5">
              {instances.map((inst, i) => (
                <div
                  key={inst.id}
                  className={`flex flex-col items-center gap-2 ${
                    // Ab dem zweiten Raum eine sichtbare Trennung: Sonst
                    // verschwimmen zwei Flächenfelder untereinander zu einem
                    // Formular ohne erkennbare Zugehörigkeit.
                    i > 0 ? 'border-t border-border/50 pt-2.5' : ''
                  }`}
                >
                  {/* Namensfeld und Löschen erst ab dem zweiten Raum. Bei einem
                      Kinderzimmer wäre „Kinderzimmer 1" eine Nummerierung ohne
                      Gegenstück – dieselbe Regel wie bei den Geräten. */}
                  {many && (
                    <div className="flex w-full items-center gap-1">
                      <input
                        type="text"
                        value={inst.name ?? ''}
                        onChange={(e) => patch(type, inst.id, { name: e.target.value })}
                        placeholder={t('onboarding.step3.namePlaceholder', { n: i + 1 })}
                        aria-label={t('onboarding.step3.nameLabel')}
                        className="focus-ring min-w-0 flex-1 rounded-lg border border-border/60 bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setInstances(
                            type,
                            instances.filter((x) => x.id !== inst.id),
                          )
                        }
                        aria-label={t('onboarding.step3.removeRoom')}
                        className="focus-ring grid h-6 w-6 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <DecimalField
                      value={inst.areaSqm}
                      placeholder={String(
                        Math.round(resolveRoomArea(data.rooms, data.livingArea, inst.id).areaSqm),
                      )}
                      onChange={(v) =>
                        patch(type, inst.id, { areaSqm: v !== undefined && v > 0 ? v : undefined })
                      }
                      aria-label={t('onboarding.step3.areaLabel')}
                      className="focus-ring w-14 rounded-lg border border-border bg-surface px-2 py-1 text-center text-sm text-foreground"
                    />
                    {t('onboarding.step3.areaUnit')}
                  </label>

                  {/* Die Wärmeübergabe stand vorher in einem eigenen Schritt als
                      Tabelle über alle Raumtypen. Hier steht sie bei dem Raum,
                      den sie beschreibt – und der Möbelabstand-Check braucht sie
                      ohnehin je Raum. Keine Vorauswahl: „noch nicht
                      beantwortet" ist ein eigener Zustand, sonst behauptete die
                      App Heizkörper. */}
                  {/* Untereinander, nicht nebeneinander: Die Kachel ist eine von
                      zwei Spalten und innen nur rund 127 px breit – „Heizkörper"
                      und „Fußboden" brauchen nebeneinander gut 170 px. Zwei
                      flex-1-Knöpfe schrumpfen nicht unter ihre Mindestbreite,
                      also stand der zweite über den Kachelrand hinaus.
                      Gestapelt hat jeder die volle Breite, unabhängig davon, wie
                      lang die Beschriftung übersetzt ist. Mit fünf Antworten
                      gilt das erst recht – nebeneinander wäre keine lesbar. */}
                  <div className="flex w-full flex-col gap-1">
                    {TRANSFERS.map(({ value, icon: Icon }) => {
                      const active = inst.heatTransfer === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patch(type, inst.id, { heatTransfer: value })}
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
              ))}

              {/* Ersetzt den früheren Stepper: Die Anzahl ist die Länge der
                  Liste. Ein Stepper könnte die Räume nur zählen, nicht
                  benennen – und beim Runterzählen wäre nie klar, welcher der
                  beiden verschwindet. */}
              <button
                type="button"
                onClick={() =>
                  setInstances(type, [...instances, { id: newRoomId(type) }])
                }
                className="focus-ring flex w-full items-center justify-center gap-1 rounded-lg px-1 py-1 text-[11px] font-semibold text-primary transition-transform active:scale-[0.98]"
              >
                <Plus className="h-3 w-3" />
                {t('onboarding.step3.addRoom')}
              </button>
            </div>
          )
        }}
      />
    </div>
  )
}
