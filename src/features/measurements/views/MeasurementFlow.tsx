import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, Lock, X, Info } from 'lucide-react'
import { stepHref, type MeasurementStep } from '../tasks'
import { getMeasurementModule } from '../registry'

interface Props {
  steps: MeasurementStep[]
  savingsEur: number
}

/** Hängt `begin=1` an (Intro im Runner überspringen – Info kam im Sheet). */
function startHref(step: MeasurementStep): string {
  const href = stepHref(step)
  return `${href}${href.includes('?') ? '&' : '?'}begin=1`
}

/**
 * Geführter Fokus-Flow: oben eine Schritt-Leiste zum Auswählen, darunter die
 * Vorschau des gewählten Checks. Ein Tipp auf die Leiste wechselt nur die
 * Vorschau (springt nicht in die Messung). Erst über das Info-Bottom-Sheet –
 * das die Kurzbeschreibung zeigt – wird die Messung gestartet.
 */
export function MeasurementFlow({ steps, savingsEur }: Props) {
  const { t, i18n } = useTranslation()

  const currentIndex = steps.findIndex((s) => !s.done)
  const current = currentIndex === -1 ? undefined : steps[currentIndex]
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  // Gewählter Check (Standard: nächster offener; sonst der erste).
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
          Horizontal scrollbar, damit sie mit wachsender Anzahl nicht quetscht. */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {t('measurements.flow.allSteps')}
        </p>
        <div className="-mx-1 flex items-center gap-3 overflow-x-auto px-1 pb-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      <SelectedPreview
        step={selectedStep}
        isNext={Boolean(current && current.meta.id === selectedStep.meta.id)}
        onOpen={() => setSheetStep(selectedStep)}
      />

      {sheetStep && <InfoSheet step={sheetStep} onClose={() => setSheetStep(null)} />}
    </div>
  )
}

/** Vorschaukarte des gewählten Checks; öffnet das Info-Sheet. */
function SelectedPreview({
  step,
  isNext,
  onOpen,
}: {
  step: MeasurementStep
  isNext: boolean
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const { meta } = step
  const Icon = meta.icon
  const metaLine = `${t(`measurements.categories.${meta.category}`)} · ${meta.estimatedMinutes} ${t('measurements.minutesUnit')}`

  const badge = isNext
    ? t('measurements.flow.recommended')
    : step.done
      ? t('measurements.flow.doneBadge')
      : t('measurements.flow.openBadge')

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary opacity-[0.1] blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              isNext
                ? 'bg-primary/10 text-primary'
                : step.done
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-surface-2/70 text-muted'
            }`}
          >
            {badge}
          </span>
          {step.perRoom && (
            <span className="rounded-full bg-surface-2/70 px-2.5 py-1 text-[11px] font-medium text-muted tabular-nums">
              {step.done
                ? t('measurements.flow.rooms', {
                    done: step.roomsDone,
                    total: step.roomsTotal,
                  })
                : t('measurements.flow.roomProgress', {
                    current: step.roomsDone + 1,
                    total: step.roomsTotal,
                  })}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold leading-tight text-foreground">
              {t(`measurements.${meta.id}.title`)}
            </p>
            <p className="mt-0.5 text-sm text-muted">{metaLine}</p>
          </div>
        </div>

        <p className="mt-3 text-sm text-foreground">{t(`measurements.${meta.id}.short`)}</p>

        {meta.available ? (
          <button
            type="button"
            onClick={onOpen}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
          >
            <Info className="h-4 w-4" />
            {t('measurements.flow.preview')}
          </button>
        ) : (
          <div className="mt-5 flex items-center justify-center gap-1.5 rounded-2xl bg-surface-2/60 px-5 py-3.5 text-sm font-medium text-muted">
            <Lock className="h-4 w-4" />
            {t('measurements.status.soon')}
          </div>
        )}
      </div>
    </div>
  )
}

/** Bottom-Sheet mit der Kurz-Info/Beschreibung der Messung und Start-Aktion. */
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
        <div className="mb-3 flex items-center justify-between">
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-surface-2" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="focus-ring absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
