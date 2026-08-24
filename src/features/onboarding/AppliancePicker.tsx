import { useTranslation } from 'react-i18next'
import { Refrigerator, Snowflake, Columns2, Ban, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SelectChip } from '@/components/ui/SelectChip'
import { OptionChip } from '@/components/ui/OptionChip'
import { APPLIANCE_KINDS, APPLIANCE_ROOMS, toggleAppliance } from './appliances'
import type { ApplianceEntry, ApplianceKind, RoomType } from '@/types'

const KIND_ICONS: Record<ApplianceKind, LucideIcon> = {
  fridge: Refrigerator,
  freezer: Snowflake,
  fridge_freezer: Columns2,
}

interface Props {
  value: ApplianceEntry[]
  /**
   * Auswahl **und** Antwortstatus – beides zusammen, weil „keines" nur als
   * beantwortete leere Liste eine Aussage ist.
   */
  onChange: (next: ApplianceEntry[], answered: boolean) => void
  /** true = die Frage wurde schon beantwortet (auch mit „keines"). */
  answered: boolean
  /** Auswahl einschränken; ohne Angabe stehen alle drei Arten zur Wahl. */
  kinds?: ApplianceKind[]
}

/**
 * Kühl- und Gefriergeräte auswählen – dieselbe Auswahl im Fragebogen wie im
 * Check.
 *
 * Ein Gerät, das nur im Check erfragt würde, fände der Nutzer nie wieder;
 * eines, das nur im Fragebogen stünde, hielte den Check auf. Also beides, mit
 * einem Bauteil: Der Schritt „Ausstattung" zeigt alle Arten, der Check nur die,
 * um die es dort geht.
 */
export function AppliancePicker({ value, onChange, answered, kinds = APPLIANCE_KINDS }: Props) {
  const { t } = useTranslation()
  const none = answered && value.length === 0

  function setRoom(kind: ApplianceKind, room: RoomType) {
    onChange(
      value.map((a) =>
        // Nochmaliges Antippen nimmt den Raum zurück – die Angabe ist optional.
        a.kind === kind ? { ...a, room: a.room === room ? undefined : room } : a,
      ),
      true,
    )
  }

  return (
    <div className="space-y-2">
      {kinds.map((kind) => {
        const entry = value.find((a) => a.kind === kind)
        const Icon = KIND_ICONS[kind]
        return (
          <div
            key={kind}
            className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
              entry ? 'border-primary/40 bg-primary/[0.05]' : 'border-border/60 bg-surface/40'
            }`}
          >
            <button
              type="button"
              onClick={() => onChange(toggleAppliance(value, kind), true)}
              aria-pressed={Boolean(entry)}
              className="focus-ring flex w-full items-center gap-3 px-3.5 py-3 text-left transition-transform active:scale-[0.99]"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  entry ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">
                {t(`onboarding.appliances.kinds.${kind}`)}
              </span>
              <span
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors ${
                  entry ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface/60'
                }`}
              >
                {entry && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>

            {/* Der Standort entscheidet, in welcher Raum-Kachel der Check
                auftaucht – die Gefriertruhe steht selten in der Küche. */}
            {entry && (
              <div className="animate-panel-in border-t border-border/50 px-3.5 pb-3.5 pt-3">
                <p className="mb-2 text-xs font-medium text-muted">
                  {t('onboarding.appliances.roomLabel')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {APPLIANCE_ROOMS.map((room) => (
                    <SelectChip
                      key={room}
                      label={t(`onboarding.step3.roomTypes.${room}`)}
                      selected={entry.room === room}
                      onClick={() => setRoom(kind, room)}
                      className="px-3 py-1.5"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* „Keines" ist eine Antwort, kein Ausweichen: Erst sie nimmt die Checks
          aus Zähler und Nenner – und sie lässt sich hier wieder zurücknehmen. */}
      <div className="flex items-center gap-2.5 pt-1">
        <span className="text-xs font-medium text-muted">{t('onboarding.step6.orNone')}</span>
        <OptionChip
          icon={Ban}
          label={t('onboarding.appliances.none')}
          selected={none}
          // Abwählen führt zurück auf „noch nicht beantwortet" – gedankenlos
          // stehen bleiben soll die Aussage „wir haben keines" nicht.
          onClick={() => onChange([], !none)}
        />
      </div>
    </div>
  )
}
