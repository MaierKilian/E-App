import { useTranslation } from 'react-i18next'
import { Refrigerator, Snowflake, Columns2, Ban, Check, Plus, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SelectChip } from '@/components/ui/SelectChip'
import { OptionChip } from '@/components/ui/OptionChip'
import {
  APPLIANCE_KINDS,
  APPLIANCE_ROOMS,
  addAppliance,
  removeAppliance,
  updateAppliance,
} from './appliances'
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

  function setRoom(entry: ApplianceEntry, room: RoomType) {
    // Nochmaliges Antippen nimmt den Raum zurück – die Angabe ist optional.
    onChange(updateAppliance(value, entry.id, { room: entry.room === room ? undefined : room }), true)
  }

  function setName(entry: ApplianceEntry, name: string) {
    onChange(updateAppliance(value, entry.id, { name: name.trim() || undefined }), true)
  }

  /**
   * Erstes Antippen legt an, Antippen des Häkchens entfernt – der
   * Umschalt-Charakter bleibt für den häufigen Fall erhalten. Wer zwei Geräte
   * derselben Art hat, nimmt „weiteres Gerät"; alle anderen merken nichts.
   */
  function toggleFirst(kind: ApplianceKind, existing: ApplianceEntry[]) {
    if (existing.length > 0) {
      onChange(
        value.filter((a) => a.kind !== kind),
        true,
      )
      return
    }
    onChange(addAppliance(value, kind), true)
  }

  return (
    <div className="space-y-2">
      {kinds.map((kind) => {
        const entries = value.filter((a) => a.kind === kind)
        const Icon = KIND_ICONS[kind]
        const active = entries.length > 0
        return (
          <div
            key={kind}
            className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
              active ? 'border-primary/40 bg-primary/[0.05]' : 'border-border/60 bg-surface/40'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleFirst(kind, entries)}
              aria-pressed={active}
              className="focus-ring flex w-full items-center gap-3 px-3.5 py-3 text-left transition-transform active:scale-[0.99]"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">
                {t(`onboarding.appliances.kinds.${kind}`)}
                {/* Die Zahl erscheint erst ab dem zweiten Gerät. Ein „×1" an
                    jeder Zeile wäre Lärm für die grosse Mehrheit. */}
                {entries.length > 1 && (
                  <span className="ml-1.5 text-xs font-medium text-muted">×{entries.length}</span>
                )}
              </span>
              <span
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors ${
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface/60'
                }`}
              >
                {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>

            {active && (
              <div className="animate-panel-in space-y-3 border-t border-border/50 px-3.5 pb-3.5 pt-3">
                {entries.map((entry, i) => (
                  <div key={entry.id} className="space-y-2">
                    {/* Kopfzeile je Gerät erst ab dem zweiten: Bei einem Gerät
                        wäre „Gerät 1" eine Nummerierung ohne Gegenstück. */}
                    {entries.length > 1 && (
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={entry.name ?? ''}
                          onChange={(e) => setName(entry, e.target.value)}
                          placeholder={t('onboarding.appliances.namePlaceholder', { n: i + 1 })}
                          aria-label={t('onboarding.appliances.nameLabel')}
                          className="focus-ring min-w-0 flex-1 rounded-xl border border-border/60 bg-surface px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted"
                        />
                        <button
                          type="button"
                          onClick={() => onChange(removeAppliance(value, entry.id), true)}
                          aria-label={t('onboarding.appliances.remove')}
                          className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Der Standort entscheidet, in welcher Raum-Kachel der
                        Check auftaucht – die Gefriertruhe steht selten in der
                        Küche. */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted">
                        {t('onboarding.appliances.roomLabel')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {APPLIANCE_ROOMS.map((room) => (
                          <SelectChip
                            key={room}
                            label={t(`onboarding.step3.roomTypes.${room}`)}
                            selected={entry.room === room}
                            onClick={() => setRoom(entry, room)}
                            className="px-3 py-1.5"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Ein Tipp mehr, und nur für die, die ihn brauchen – der
                    Fragebogen wird dadurch nicht länger. */}
                <button
                  type="button"
                  onClick={() => onChange(addAppliance(value, kind), true)}
                  className="focus-ring flex items-center gap-1.5 rounded-xl px-1 py-1 text-xs font-semibold text-primary transition-transform active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('onboarding.appliances.addAnother')}
                </button>
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
