import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronDown,
  Sparkles,
  PiggyBank,
  Check,
  X,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useTipsStore } from '@/store/tipsStore'
import { buildTips, type Tip, type TipCategory } from './buildTips'

/** Farbcodierung der Icon-Kachel je Gewerk (Structured-Stil, ruhige Akzente). */
const ACCENT: Record<TipCategory, string> = {
  heating: 'bg-amber-500/15 text-amber-500',
  electricity: 'bg-sky-500/15 text-sky-500',
  water: 'bg-cyan-500/15 text-cyan-500',
}

interface TipCardProps {
  tip: Tip
  done?: boolean
  onToggleDone: (id: string) => void
  onDismiss: (id: string) => void
}

/** Eine Empfehlungs-Karte: Icon-Kachel, Titel, Begründung, Wirkungs-Pill, Aktionen. */
function TipCard({ tip, done = false, onToggleDone, onDismiss }: TipCardProps) {
  const { t, i18n } = useTranslation()
  const Icon = tip.icon
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className={`glass rounded-2xl p-4 transition-opacity ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${ACCENT[tip.category]}`}>
          <Icon className="h-5.5 w-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-semibold leading-tight text-foreground ${done ? 'line-through' : ''}`}>
              {t(`tips.items.${tip.id}.title`, tip.params)}
            </p>
            {tip.savingEur ? (
              <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold tabular-nums text-success">
                {t('tips.savingPerYear', { value: eurFmt.format(tip.savingEur) })}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                {t('tips.worthIt')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm leading-snug text-muted">
            {t(`tips.items.${tip.id}.reason`, tip.params)}
          </p>
        </div>
      </div>

      {/* Aktionen */}
      <div className="mt-3 ml-14 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggleDone(tip.id)}
          aria-pressed={done}
          className={`focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
            done
              ? 'bg-surface-2/60 text-muted hover:bg-surface-2'
              : 'bg-success/10 text-success hover:bg-success/20'
          }`}
        >
          {done ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {done ? t('tips.reopen') : t('tips.markDone')}
        </button>
        {!done && (
          <button
            type="button"
            onClick={() => onDismiss(tip.id)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2/60"
          >
            <X className="h-4 w-4" />
            {t('tips.dismiss')}
          </button>
        )}
      </div>
    </div>
  )
}

/** Ein-/ausklappbarer Abschnitt (für Erledigt / Ausgeblendet). */
function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex w-full items-center justify-between rounded-xl px-1 py-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <span>
          {title} · {count}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  )
}

/** Empfehlungen: Spar-Übersicht oben, offene Maßnahmen, dann Erledigt/Ausgeblendet. */
export function TipsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const data = useOnboardingStore((s) => s.data)
  const results = useMeasurementsStore((s) => s.results)
  const doneIds = useTipsStore((s) => s.doneIds)
  const dismissedIds = useTipsStore((s) => s.dismissedIds)
  const toggleDone = useTipsStore((s) => s.toggleDone)
  const dismiss = useTipsStore((s) => s.dismiss)
  const restore = useTipsStore((s) => s.restore)

  const allTips = buildTips(data, results)
  const active = allTips.filter((tip) => !doneIds.includes(tip.id) && !dismissedIds.includes(tip.id))
  const done = allTips.filter((tip) => doneIds.includes(tip.id))
  const dismissed = allTips.filter((tip) => dismissedIds.includes(tip.id))

  const openEur = active.reduce((sum, tip) => sum + (tip.savingEur ?? 0), 0)
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('common.back')}
      </button>

      <h1 className="text-2xl font-bold">{t('tips.title')}</h1>

      {allTips.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">{t('tips.empty')}</p>
        </div>
      ) : (
        <>
          {/* Spar-Übersicht */}
          <div className="glass relative overflow-hidden rounded-3xl p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-success opacity-[0.16] blur-3xl"
            />
            <div className="relative flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-success/15 text-success">
                <PiggyBank className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted">{t('tips.potentialLabel')}</p>
                {openEur > 0 ? (
                  <p className="text-3xl font-bold leading-none tabular-nums text-foreground">
                    {t('tips.savingPerYear', { value: eurFmt.format(openEur) })}
                  </p>
                ) : (
                  <p className="text-3xl font-bold leading-none text-foreground">{active.length}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {t('tips.countLine', { count: active.length })}
                  {done.length > 0 && ` · ${t('tips.doneLine', { count: done.length })}`}
                </p>
              </div>
            </div>
          </div>

          {/* Offene Maßnahmen */}
          {active.length > 0 ? (
            <div className="space-y-3">
              {active.map((tip) => (
                <TipCard key={tip.id} tip={tip} onToggleDone={toggleDone} onDismiss={dismiss} />
              ))}
            </div>
          ) : (
            <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <p className="text-sm text-muted">{t('tips.allHandled')}</p>
            </div>
          )}

          {/* Erledigt */}
          {done.length > 0 && (
            <CollapsibleSection title={t('tips.doneSection')} count={done.length}>
              {done.map((tip) => (
                <TipCard key={tip.id} tip={tip} done onToggleDone={toggleDone} onDismiss={dismiss} />
              ))}
            </CollapsibleSection>
          )}

          {/* Ausgeblendet */}
          {dismissed.length > 0 && (
            <CollapsibleSection title={t('tips.hiddenSection')} count={dismissed.length}>
              {dismissed.map((tip) => {
                const Icon = tip.icon
                return (
                  <div key={tip.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${ACCENT[tip.category]}`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted">
                      {t(`tips.items.${tip.id}.title`, tip.params)}
                    </p>
                    <button
                      type="button"
                      onClick={() => restore(tip.id)}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {t('tips.restore')}
                    </button>
                  </div>
                )
              })}
            </CollapsibleSection>
          )}
        </>
      )}
    </div>
  )
}
