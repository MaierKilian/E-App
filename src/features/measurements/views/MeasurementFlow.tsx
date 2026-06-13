import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, Sparkles, Lock } from 'lucide-react'
import { stepHref, type MeasurementStep } from '../tasks'

interface Props {
  steps: MeasurementStep[]
  savingsEur: number
}

/**
 * Geführter Fokus-Flow: zeigt groß den aktuellen (nächsten offenen) Schritt mit
 * klarer Aktion, darunter eine Schritt-Leiste als Überblick/Sprungmarken.
 * Pro-Raum-Messungen sind als ein Schritt mit Raum-Fortschritt gruppiert.
 */
export function MeasurementFlow({ steps, savingsEur }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  if (steps.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 text-center text-sm text-muted">
        {t('measurements.byRoom.noRooms')}
      </div>
    )
  }

  const currentIndex = steps.findIndex((s) => !s.done)
  const current = currentIndex === -1 ? undefined : steps[currentIndex]
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-4">
      {current ? (
        <FocusCard step={current} index={currentIndex} total={steps.length} />
      ) : (
        <div className="glass relative overflow-hidden rounded-3xl p-6 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-500 opacity-[0.14] blur-3xl"
          />
          <div className="relative flex flex-col items-center gap-2">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <Check className="h-7 w-7" />
            </span>
            <h3 className="text-lg font-bold text-foreground">
              {t('measurements.flow.allDoneTitle')}
            </h3>
            {savingsEur > 0 && (
              <p className="text-sm text-muted">
                {t('measurements.flow.allDoneSavings', { value: eurFmt.format(savingsEur) })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Schritt-Leiste: Überblick + Sprungmarken */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {steps.map((step, i) => {
          const Icon = step.meta.icon
          const isCurrent = i === currentIndex
          return (
            <button
              key={step.meta.id}
              type="button"
              onClick={() => navigate(stepHref(step))}
              aria-label={t(`measurements.${step.meta.id}.title`)}
              className={`relative flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl p-2 text-center transition-colors ${
                isCurrent ? 'glass ring-2 ring-primary/60' : 'glass'
              }`}
            >
              <span
                className={`relative grid h-9 w-9 place-items-center rounded-xl ${
                  step.done
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : isCurrent
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-2 text-muted'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {step.done && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </span>
              <span className="line-clamp-1 text-[10px] font-medium text-muted">
                {t(`measurements.${step.meta.id}.title`)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Große Karte des aktuellen Schritts mit klarer Aktion. */
function FocusCard({ step, index, total }: { step: MeasurementStep; index: number; total: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { meta } = step
  const Icon = meta.icon
  const clickable = meta.available
  const metaLine = `${t(`measurements.categories.${meta.category}`)} · ${meta.estimatedMinutes} ${t('measurements.minutesUnit')}`

  const cta =
    step.perRoom && step.nextRoomName
      ? t('measurements.flow.continueRoom', { room: step.nextRoomName })
      : t('measurements.flow.start')

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary opacity-[0.1] blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t('measurements.flow.stepOf', { current: index + 1, total })}
          </span>
          {step.perRoom && (
            <span className="rounded-full bg-surface-2/70 px-2.5 py-1 text-[11px] font-medium text-muted tabular-nums">
              {t('measurements.flow.rooms', { done: step.roomsDone, total: step.roomsTotal })}
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

        {clickable ? (
          <button
            type="button"
            onClick={() => navigate(stepHref(step))}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
          >
            {cta}
            <ChevronRight className="h-4 w-4" />
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
