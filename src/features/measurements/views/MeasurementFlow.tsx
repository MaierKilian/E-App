import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, Lock } from 'lucide-react'
import { stepHref, type MeasurementStep } from '../tasks'

interface Props {
  steps: MeasurementStep[]
  savingsEur: number
}

/**
 * „Empfohlen"-Ansicht als Messplan: ein hervorgehobener „Als Nächstes"-Hero für
 * den nächsten offenen Schritt, darunter die restlichen Schritte als benannte
 * Liste mit Status. Ein Tipp führt zur jeweiligen Messung (mit ihrer Info-Seite).
 */
export function MeasurementFlow({ steps, savingsEur }: Props) {
  const { t, i18n } = useTranslation()

  const currentIndex = steps.findIndex((s) => !s.done)
  const current = currentIndex === -1 ? undefined : steps[currentIndex]
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  if (steps.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 text-center text-sm text-muted">
        {t('measurements.byRoom.noRooms')}
      </div>
    )
  }

  // Schritte außer dem Hero aufteilen: noch offen vs. abgeschlossen
  const otherSteps = steps.filter((s) => s.meta.id !== current?.meta.id)
  const pendingSteps = otherSteps.filter((s) => !s.done)
  const doneSteps = otherSteps.filter((s) => s.done)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t('measurements.flow.planTitle')}</h2>
        <p className="text-sm text-muted">{t('measurements.flow.planSubtitle')}</p>
      </div>

      {current ? (
        <NextHero step={current} />
      ) : (
        <div className="glass relative overflow-hidden rounded-3xl p-6 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-success opacity-[0.14] blur-3xl"
          />
          <div className="relative flex flex-col items-center gap-2">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-success/15 text-success">
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

      {pendingSteps.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('measurements.flow.moreSteps')}
          </p>
          {pendingSteps.map((step) => (
            <StepRow key={step.meta.id} step={step} />
          ))}
        </div>
      )}

      {doneSteps.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('measurements.flow.completedSectionTitle')}
          </p>
          {doneSteps.map((step) => (
            <StepRow key={step.meta.id} step={step} inCompletedSection />
          ))}
        </div>
      )}
    </div>
  )
}

/** Bildet die Meta-Zeile „Gewerk · Dauer (· Raum-Fortschritt)". */
function useMetaLine(step: MeasurementStep): string {
  const { t } = useTranslation()
  const parts = [
    t(`measurements.categories.${step.meta.category}`),
    `${step.meta.estimatedMinutes} ${t('measurements.minutesUnit')}`,
  ]
  if (step.perRoom && !step.done) {
    parts.push(
      t('measurements.flow.roomProgress', {
        current: step.roomsDone + 1,
        total: step.roomsTotal,
      }),
    )
  }
  return parts.join(' · ')
}

/** Hervorgehobener „Als Nächstes"-Block mit klarer Start-Aktion. */
function NextHero({ step }: { step: MeasurementStep }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { meta } = step
  const Icon = meta.icon
  const metaLine = useMetaLine(step)

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5 ring-2 ring-primary/30">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-primary opacity-[0.12] blur-3xl"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {t('measurements.flow.nextUp')}
          </span>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </span>
        </div>

        <h3 className="mt-3 text-2xl font-bold leading-tight text-foreground">
          {t(`measurements.${meta.id}.title`)}
        </h3>
        <p className="mt-1 text-sm font-medium text-muted">{metaLine}</p>
        <p className="mt-2 text-sm text-foreground">{t(`measurements.${meta.id}.short`)}</p>

        {meta.available ? (
          <button
            type="button"
            onClick={() => navigate(stepHref(step))}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
          >
            {t('measurements.flow.startMeasurement')}
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

/** Eine Zeile der Messplan-Liste: Icon, Name, Meta, Status. */
function StepRow({ step, inCompletedSection = false }: { step: MeasurementStep; inCompletedSection?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { meta } = step
  const Icon = meta.icon
  const metaLine = useMetaLine(step)

  const leading = step.done ? (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
      <Check className="h-5 w-5" />
    </span>
  ) : (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
        meta.available ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted'
      }`}
    >
      <Icon className="h-5 w-5" />
    </span>
  )

  const trailing = step.done ? (
    inCompletedSection ? (
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
    ) : (
      <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
        {t('measurements.flow.completed')}
      </span>
    )
  ) : meta.available ? (
    <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
  ) : (
    <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
      {t('measurements.status.soon')}
    </span>
  )

  const inner = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight text-foreground">
          {t(`measurements.${meta.id}.title`)}
        </p>
        <p className="mt-0.5 text-xs text-muted">{metaLine}</p>
      </div>
      {trailing}
    </>
  )

  if (!meta.available) {
    return <div className="glass flex items-center gap-3 rounded-2xl p-3 opacity-70">{inner}</div>
  }

  return (
    <button
      type="button"
      onClick={() => navigate(stepHref(step))}
      className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-transform active:scale-[0.99]"
    >
      {inner}
    </button>
  )
}
