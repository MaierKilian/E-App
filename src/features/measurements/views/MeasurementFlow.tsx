import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, X, Info } from 'lucide-react'
import { stepHref, type MeasurementStep } from '../tasks'
import { getMeasurementModule } from '../registry'

interface Props {
  steps: MeasurementStep[]
  savingsEur: number
}

/** Hängt `begin=1` an (Intro im Runner überspringen – Info gibt's per „Mehr Infos"). */
function startHref(step: MeasurementStep): string {
  const href = stepHref(step)
  return `${href}${href.includes('?') ? '&' : '?'}begin=1`
}

/**
 * Geführter Fokus-Flow: oben eine Schritt-Leiste zum Auswählen, darunter eine
 * kompakte Karte des gewählten Checks (Name, Dauer, „Starten"). Ein Tipp auf die
 * Leiste wechselt nur die Auswahl. Die ausführliche Beschreibung kommt erst über
 * „Mehr Infos" als Bottom-Sheet – kein großer Infoscreen beim bloßen Antippen.
 */
export function MeasurementFlow({ steps, savingsEur }: Props) {
  const { t, i18n } = useTranslation()

  const currentIndex = steps.findIndex((s) => !s.done)
  const current = currentIndex === -1 ? undefined : steps[currentIndex]
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  const defaultId = current?.meta.id ?? steps[0]?.meta.id
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultId)
  const [sheetStep, setSheetStep] = useState<MeasurementStep | null>(null)

  if (steps.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 text-center text-sm text-muted">
        {t('measurements.byRoom.noRooms')}
      </div>
    )
  }

  const selectedStep = steps.find((s) => s.meta.id === selectedId) ?? current ?? steps[0]

  return (
    <div className="space-y-4">
      {/* Schritt-Leiste als Auswahl: erledigt · gewählt · offen.
          Horizontal scrollbar (mit py-Platz, damit Ring/Badge nicht abschneiden). */}
      <div>
        <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {t('measurements.flow.allSteps')}
        </p>
        <div className="-mx-2 flex items-center gap-3 overflow-x-auto px-2 py-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {steps.map((step) => {
            const Icon = step.meta.icon
            const isSelected = step.meta.id === selectedStep.meta.id
            return (
              <button
                key={step.meta.id}
                type="button"
                onClick={() => setSelectedId(step.meta.id)}
                aria-label={t(`measurements.${step.meta.id}.title`)}
                aria-pressed={isSelected}
                className={`relative grid h-12 w-12 shrink-0 snap-start place-items-center rounded-2xl transition-transform active:scale-95 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/25'
                    : step.done
                      ? 'bg-emerald-500 text-white'
                      : 'border border-border bg-surface text-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                {step.done && !isSelected && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-background">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {!current && (
        <div className="glass relative flex items-center gap-3 overflow-hidden rounded-2xl p-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-500 opacity-[0.14] blur-3xl"
          />
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <Check className="h-5 w-5" />
          </span>
          <div className="relative">
            <p className="font-semibold text-foreground">{t('measurements.flow.allDoneTitle')}</p>
            {savingsEur > 0 && (
              <p className="text-sm text-muted">
                {t('measurements.flow.allDoneSavings', { value: eurFmt.format(savingsEur) })}
              </p>
            )}
          </div>
        </div>
      )}

      <CompactSelected
        step={selectedStep}
        isNext={Boolean(current && current.meta.id === selectedStep.meta.id)}
        onInfo={() => setSheetStep(selectedStep)}
      />

      {sheetStep && <InfoSheet step={sheetStep} onClose={() => setSheetStep(null)} />}
    </div>
  )
}

/** Kompakte Karte des gewählten Checks: Name, Dauer, „Starten" + „Mehr Infos". */
function CompactSelected({
  step,
  isNext,
  onInfo,
}: {
  step: MeasurementStep
  isNext: boolean
  onInfo: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { meta } = step
  const Icon = meta.icon

  const metaParts = [
    t(`measurements.categories.${meta.category}`),
    `${meta.estimatedMinutes} ${t('measurements.minutesUnit')}`,
  ]
  if (step.perRoom && !step.done) {
    metaParts.push(
      t('measurements.flow.roomProgress', {
        current: step.roomsDone + 1,
        total: step.roomsTotal,
      }),
    )
  }

  const cta =
    step.done && !step.perRoom
      ? t('measurements.common.again')
      : step.perRoom && step.nextRoomName
        ? t('measurements.flow.continueShort')
        : t('measurements.flow.startShort')

  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5.5 w-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-foreground">
              {t(`measurements.${meta.id}.title`)}
            </p>
            {isNext && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {t('measurements.flow.recommended')}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted">{metaParts.join(' · ')}</p>
        </div>
        {meta.available ? (
          <button
            type="button"
            onClick={() => navigate(startHref(step))}
            className="flex shrink-0 items-center gap-1 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.96]"
          >
            {cta}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="shrink-0 rounded-2xl bg-surface-2/60 px-3 py-2.5 text-xs font-medium text-muted">
            {t('measurements.status.soon')}
          </span>
        )}
      </div>

      {meta.available && (
        <button
          type="button"
          onClick={onInfo}
          className="focus-ring mt-2.5 ml-14 inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
          {t('measurements.flow.moreInfo')}
        </button>
      )}
    </div>
  )
}

/** Bottom-Sheet mit der ausführlichen Beschreibung der Messung (auf Wunsch). */
function InfoSheet({ step, onClose }: { step: MeasurementStep; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mod = getMeasurementModule(step.meta.id)
  const Intro = mod?.Intro

  const cta =
    step.done && !step.perRoom
      ? t('measurements.common.again')
      : step.perRoom && step.nextRoomName
        ? t('measurements.flow.continueRoom', { room: step.nextRoomName })
        : t('measurements.flow.start')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
      />
      <div className="glass relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 pb-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="focus-ring absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {Intro ? <Intro /> : null}

        <button
          type="button"
          onClick={() => navigate(startHref(step))}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
        >
          {cta}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
