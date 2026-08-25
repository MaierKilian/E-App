import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  ChevronDown,
  Sparkles,
  PiggyBank,
  Check,
  X,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Ruler,
  Target,
} from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useTipsStore } from '@/store/tipsStore'
import { useTipContext } from './useTipContext'
import { roomLabel } from '@/features/measurements/rooms'
import { displaySavingEur, savingRange } from '@/features/measurements/savingsDisplay'
import { buildTips, isQuickWin, sortingGoals, type Tip, type TipCategory } from './buildTips'

/** Farbcodierung der Icon-Kachel je Gewerk (Structured-Stil, ruhige Akzente). */
const ACCENT: Record<TipCategory, string> = {
  heating: 'bg-amber-500/15 text-amber-500',
  electricity: 'bg-sky-500/15 text-sky-500',
  water: 'bg-cyan-500/15 text-cyan-500',
}

/**
 * „heute" bzw. „vor N Tagen" – der Null-Fall bewusst als eigener Schlüssel.
 * Deutsch und Englisch kennen keine Plural-Kategorie „zero", ein
 * `_zero`-Suffix wäre also von einem Sonderverhalten von i18next abhängig.
 */
function sourceWhen(t: TFunction, days: number): string {
  return days === 0 ? t('tips.sourceToday') : t('tips.sourceDaysAgo', { count: days })
}

/** Volle Tage seit einem ISO-Zeitpunkt, nie negativ. */
function daysSince(iso: string, now = Date.now()): number {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 0
  return Math.max(0, Math.floor((now - then) / 86_400_000))
}

/**
 * Formatiert die Zahlen eines Tipps für die Zielsprache. Ohne das steht im
 * deutschen Text „23.4 °C" – i18next interpoliert Zahlen unverändert.
 */
function localizeParams(
  params: Record<string, string | number> | undefined,
  language: string,
): Record<string, string | number> {
  if (!params) return {}
  const fmt = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => [
      k,
      // `count` waehlt bei i18next die Pluralform und muss dafuer eine Zahl
      // bleiben – als lokalisierter String faellt die Wahl aus und i18next gibt
      // den rohen Schluessel aus. Alle anderen Zahlen werden lokalisiert, weil
      // i18next sie sonst roh durchreicht („23.4 °C" statt „23,4 °C").
      k === 'count' || typeof v !== 'number' ? v : fmt.format(v),
    ]),
  )
}

/**
 * Aufwand und Kosten als ein Satz. „Lohnt sich" stand vorher auf jedem Tipp
 * ohne €-Wert und sagte damit über keinen etwas aus – hier steht, worauf man
 * sich einlässt, bevor man tippt.
 */
function useEffortLabel(tip: Tip): string {
  const { t, i18n } = useTranslation()
  // Vierstellige Beträge brauchen den Tausenderpunkt, sonst liest sich der
  // Heizungstausch als „ab 8000 €".
  const cost = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }).format(
    tip.costEur,
  )
  if (tip.effortMinutes >= 60) {
    const hours = Math.round(tip.effortMinutes / 60)
    // Die Stunden-Variante hieß bisher immer „kostenlos" – bis zum
    // Heizungstausch gab es keinen langen Tipp, der etwas kostet.
    return tip.costEur > 0
      ? t('tips.effortHoursCost', { hours, cost })
      : t('tips.effortHours', { hours })
  }
  return tip.costEur > 0
    ? t('tips.effortCost', { minutes: tip.effortMinutes, cost })
    : t('tips.effortFree', { minutes: tip.effortMinutes })
}

interface TipCardProps {
  tip: Tip
  done?: boolean
  /**
   * Größter *angezeigter* €-Hebel unter den offenen Tipps – Bezugsgröße des
   * relativen Wirkungsbalkens. Tipps unterhalb der Anzeigeschwelle zählen nicht
   * mit, sie bekommen ohnehin keinen Balken.
   */
  maxSaving?: number
  /** Hebt den wirksamsten offenen Tipp visuell als „Top-Tipp" hervor. */
  top?: boolean
  onToggleDone: (id: string) => void
  onDismiss: (id: string) => void
}

/**
 * Eine Empfehlungs-Karte im ruhigen Checklisten-Stil:
 * Icon-Kachel + Titel + Wirkungs-Pill, darunter Begründung und (bei €-Tipps)
 * ein relativer Wirkungsbalken. Aktionen bewusst zurückhaltend – ein einzelner
 * „Erledigt"-Toggle, „Ausblenden" nur als dezentes „×" in der Ecke.
 */
function TipCard({ tip, done = false, maxSaving = 0, top = false, onToggleDone, onDismiss }: TipCardProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const Icon = tip.icon
  const effortLabel = useEffortLabel(tip)
  // Raumbezogene Tipps nennen ihren Raum. Ohne ihn lesen sich „Raumtemperatur
  // senken" und „Raum nicht auskühlen lassen" nebeneinander wie ein
  // Widerspruch, statt zwei verschiedene Räume zu meinen.
  const room = tip.room ? roomLabel(t, tip.room) : undefined
  // Zahlen vor der Interpolation lokalisieren – i18next reicht sie sonst roh
  // durch, und „23.4 °C" ist im Deutschen falsch geschrieben.
  const params = localizeParams(tip.params, i18n.language)
  // Mehrere Tipps koennen sich einen Text teilen (ein steigender Verbrauch je
  // Energietraeger); `textId` benennt dann den gemeinsamen Schluessel.
  const textId = tip.textId ?? tip.id
  const reasonKey = `tips.items.${textId}.${room ? 'reason' : 'reasonNoRoom'}`
  const reason = t(reasonKey, { ...params, room, defaultValue: '' }) ||
    t(`tips.items.${textId}.reason`, { ...params, room })
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  // Unterhalb der Anzeigeschwelle steht kein Euro-Betrag – und dann auch kein
  // Wirkungsbalken, der einen Vergleich nahelegt, den die Zahl nicht traegt.
  // Die Begruendung des Tipps nennt in dem Fall die gemessene Groesse.
  const shownSaving = displaySavingEur(tip.savingEur)
  const barPct =
    shownSaving && maxSaving > 0 ? Math.max(10, Math.round((shownSaving / maxSaving) * 100)) : 0
  const range = shownSaving ? savingRange(shownSaving) : null
  // Wo kein belastbarer Euro-Betrag steht, tritt die gemessene Menge an seine
  // Stelle: Liter, Prozent, kWh. Beides teilt sich dieselbe Zeile – es ist
  // dieselbe Aussage, nur in der Einheit, die die Messung wirklich hergibt.
  const impactText = range
    ? t('tips.savingRange', { low: eurFmt.format(range.low), high: eurFmt.format(range.high) })
    : tip.quantity
      ? t(tip.quantity.key, localizeParams(tip.quantity.params, i18n.language))
      : ''

  return (
    <div
      className={`glass relative rounded-2xl p-4 transition-opacity ${done ? 'opacity-55' : ''} ${
        top ? 'ring-1 ring-success/30' : ''
      }`}
    >
      {/* Ausblenden – zurückhaltend als „×" oben rechts (nur bei offenen Tipps). */}
      {!done && (
        <button
          type="button"
          onClick={() => onDismiss(tip.id)}
          aria-label={t('tips.dismiss')}
          className="focus-ring absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-muted/60 transition-colors hover:bg-surface-2/70 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-3 pr-8">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${ACCENT[tip.category]}`}>
          <Icon className="h-5.5 w-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          {top && (
            <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success">
              <Sparkles className="h-3 w-3" />
              {t('tips.topTip')}
            </p>
          )}
          {/* Titel über die volle Breite. Neben dem Aufwand-Chip blieben auf
              einem schmalen Telefon keine 160 px übrig – „Raumtemperatur"
              brach dort mitten im Wort um. */}
          <p
            className={`break-words font-semibold leading-tight text-foreground ${
              done ? 'line-through' : ''
            }`}
          >
            {t(`tips.items.${textId}.title`, params)}
          </p>
          {/* Aufwand + Kosten auf jedem Tipp – die Frage, die vor dem Anfangen
              zählt. Die €-Schätzung steht unten am Wirkungsbalken. */}
          <span className="mt-1.5 inline-flex items-center rounded-full bg-surface-2/70 px-2.5 py-1 text-[11px] font-medium text-foreground/70 ring-1 ring-inset ring-black/5 dark:ring-white/10">
            {effortLabel}
          </span>
          <p className="mt-1 text-sm leading-snug text-muted">{reason}</p>

          {/* Weiterführende Aktion, wo der Tipp in der App weitergeht. */}
          {tip.linkTo && !done && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => navigate(tip.linkTo as string)}
                className="focus-ring inline-flex items-center gap-1 rounded-full text-sm font-medium text-foreground underline-offset-2 hover:underline"
              >
                {t(`tips.items.${textId}.action`)}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Wirkungsbalken + grobe €-Spanne – ruhig statt plakativ, klar als
              Schätzung erkennbar (kein centgenauer €-Klotz mehr). */}
          {!done && impactText && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-success/60 to-success"
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-success">
                {impactText}
              </span>
            </div>
          )}

          {/* Woher die Empfehlung kommt – und der Weg zurück zur Messung.
              Der Messwert steht zwar im Text, aber ohne diesen Bezug ist nicht
              erkennbar, aus welcher Messung er stammt und wie alt er ist. */}
          {tip.source && (
            <button
              type="button"
              onClick={() => navigate(`/measurements/${tip.source?.measurementId}`)}
              className="focus-ring mt-2.5 -ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-[11px] text-muted transition-colors hover:text-foreground"
            >
              <Ruler className="h-3 w-3 shrink-0" />
              {t('tips.source', {
                measurement: tip.source.measurementId,
                when: sourceWhen(t, daysSince(tip.source.measuredAt)),
              })}
              <ArrowRight className="h-3 w-3 shrink-0" />
            </button>
          )}

          {/* Einzelner, ruhiger Erledigt-Toggle (kein zweiter lauter Button mehr). */}
          <button
            type="button"
            onClick={() => onToggleDone(tip.id)}
            aria-pressed={done}
            className="focus-ring group mt-3 -ml-1 inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition-colors"
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-full border-2 transition-colors ${
                done
                  ? 'border-success bg-success text-white'
                  : 'border-muted/40 text-transparent group-hover:border-success/60'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className={done ? 'text-muted' : 'text-foreground/70'}>
              {done ? t('tips.reopen') : t('tips.markDone')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Eine Aufwandsgruppe der offenen Empfehlungen samt Überschrift und Anzahl. */
function TipGroup({
  title,
  tips,
  maxSaving,
  topId,
  onToggleDone,
  onDismiss,
}: {
  title: string
  tips: Tip[]
  maxSaving: number
  topId?: string
  onToggleDone: (id: string) => void
  onDismiss: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {title} · {tips.length}
      </p>
      {tips.map((tip) => (
        <TipCard
          key={tip.id}
          tip={tip}
          maxSaving={maxSaving}
          top={tip.id === topId}
          onToggleDone={onToggleDone}
          onDismiss={onDismiss}
        />
      ))}
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
  const editSection = useOnboardingStore((s) => s.editSection)
  const results = useMeasurementsStore((s) => s.results)
  const doneIds = useTipsStore((s) => s.doneIds)
  const dismissedIds = useTipsStore((s) => s.dismissedIds)
  const toggleDone = useTipsStore((s) => s.toggleDone)
  const dismiss = useTipsStore((s) => s.dismiss)
  const restore = useTipsStore((s) => s.restore)

  const allTips = buildTips(data, results, useTipContext())
  const active = allTips.filter((tip) => !doneIds.includes(tip.id) && !dismissedIds.includes(tip.id))
  // Dieselbe Grenze, nach der auch sortiert wird (siehe `compareTips`) – die
  // Gruppen bilden die bestehende Reihenfolge ab, sie ordnen nicht um.
  const quickWins = active.filter(isQuickWin)
  const prepared = active.filter((tip) => !isQuickWin(tip))
  const done = allTips.filter((tip) => doneIds.includes(tip.id))
  const dismissed = allTips.filter((tip) => dismissedIds.includes(tip.id))

  // Nur Betraege ueber der Anzeigeschwelle zaehlen – in der Summe wie in den
  // Karten. Frueher floss jeder Kleinbetrag mit einem Mindestwert von 5 € ein;
  // vier belanglose Tipps ergaben so ein "Sparpotenzial" von 20–40 €, das die
  // Rechnung nie hergab.
  const shownSavings = active
    .map((tip) => displaySavingEur(tip.savingEur))
    .filter((eur): eur is number => eur !== undefined)
  const openEur = shownSavings.reduce((sum, eur) => sum + eur, 0)
  const maxSaving = shownSavings.reduce((max, eur) => Math.max(max, eur), 0)
  // Gesamt-Spanne = Summe der Einzel-Spannen (die Teile ergeben das Ganze).
  const heroRange = shownSavings.reduce(
    (acc, eur) => {
      const r = savingRange(eur)
      return { low: acc.low + r.low, high: acc.high + r.high }
    },
    { low: 0, high: 0 },
  )
  // „Fang hier an": der erste der sortierten Liste. Früher war es der Tipp mit
  // dem höchsten €-Wert – der kann jetzt weiter unten stehen, weil Sofort- und
  // Gratis-Maßnahmen vorgehen.
  const topId = active[0]?.id
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  // Nur Ziele nennen, die die Reihenfolge wirklich verändert haben. „Sortiert
  // nach deinem Ziel: Kosten sparen" wäre eine Behauptung ohne Deckung – für
  // dieses Ziel ist die €-Sortierung ohnehin die Voreinstellung.
  const goalNames = sortingGoals(data.goals).map((g) => t(`onboarding.step1.goalOptions.${g}`))

  // Fortschritt: Anteil erledigter Maßnahmen an allen (offen + erledigt).
  const totalTracked = active.length + done.length
  const progressPct = totalTracked > 0 ? Math.round((done.length / totalTracked) * 100) : 0

  return (
    <div className="space-y-5">
      <PageHeader title={t('tips.title')} back={{ label: t('common.back'), onClick: () => navigate(-1) }} />

      {allTips.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">{t('tips.empty')}</p>
        </div>
      ) : (
        <>
          {/* Spar-Übersicht mit Fortschritt */}
          <div className="glass relative overflow-hidden rounded-3xl p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-success opacity-[0.16] blur-3xl"
            />
            <div className="relative flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-success/15 text-success">
                <PiggyBank className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-muted">{t('tips.potentialLabel')}</p>
                {openEur > 0 ? (
                  <>
                    <p className="text-3xl font-bold leading-tight tabular-nums text-foreground">
                      {t('tips.savingRangeShort', {
                        low: eurFmt.format(heroRange.low),
                        high: eurFmt.format(heroRange.high),
                      })}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-muted">{t('tips.estimateNote')}</p>
                  </>
                ) : (
                  <>
                    {/* Ohne belastbaren Euro-Betrag zeigt die Kachel den
                        Fortschritt statt der Anzahl offener Maßnahmen: Die
                        Anzahl steht zwei Zeilen tiefer schon als
                        Abschnittstitel, und unter „Sparpotenzial" gelesen wäre
                        sie ohnehin eine Zahl, die etwas anderes behauptet. */}
                    <p className="text-3xl font-bold leading-none tabular-nums text-foreground">
                      {t('tips.progressHeadline', { done: done.length, total: totalTracked })}
                    </p>
                    <p className="mt-1 text-xs text-muted">{t('tips.progressCaption')}</p>
                  </>
                )}
              </div>
            </div>

            {/* Fortschrittsbalken – belohnt umgesetzte Maßnahmen. */}
            {totalTracked > 0 && (
              <div className="relative mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-success/70 to-success transition-[width] duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {openEur > 0 && (
                  <p className="mt-1.5 text-[11px] font-medium text-muted">
                    {t('tips.implementedLine', { done: done.length, total: totalTracked })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Ohne diese Zeile wirkt die Reihenfolge willkürlich – und die
              Ziel-Frage bliebe für den Nutzer folgenlos, obwohl sie es
              technisch nicht mehr ist. */}
          {goalNames.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-1 text-xs text-muted">
              <Target className="h-3.5 w-3.5 shrink-0 text-primary" />
              {t('tips.sortedByGoal', { goals: goalNames.join(' · ') })}
              <button
                type="button"
                onClick={() => {
                  editSection(0, '/tips')
                  navigate('/onboarding')
                }}
                className="focus-ring rounded font-semibold text-primary transition-colors hover:underline"
              >
                {t('tips.changeGoal')}
              </button>
            </p>
          )}

          {/* Offene Maßnahmen – nach Aufwand gruppiert, sobald es beide Sorten
              gibt. Die Sortierung stellt Sofortmaßnahmen ohnehin nach vorn;
              erst die Überschriften machen sichtbar, warum ein 8.000-€-Tipp
              hinter „Sofa wegrücken" steht. Gibt es nur eine Sorte, bliebe eine
              einzelne Gruppenüberschrift ohne Gegenstück – dann die schlichte
              Liste wie bisher. */}
          {active.length > 0 ? (
            <div className="space-y-3">
              {quickWins.length > 0 && prepared.length > 0 ? (
                <>
                  <TipGroup
                    title={t('tips.groupQuick')}
                    tips={quickWins}
                    maxSaving={maxSaving}
                    topId={topId}
                    onToggleDone={toggleDone}
                    onDismiss={dismiss}
                  />
                  <TipGroup
                    title={t('tips.groupPrepared')}
                    tips={prepared}
                    maxSaving={maxSaving}
                    topId={topId}
                    onToggleDone={toggleDone}
                    onDismiss={dismiss}
                  />
                </>
              ) : (
                <>
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('tips.openSection')} · {active.length}
                  </p>
                  {active.map((tip) => (
                    <TipCard
                      key={tip.id}
                      tip={tip}
                      maxSaving={maxSaving}
                      top={tip.id === topId}
                      onToggleDone={toggleDone}
                      onDismiss={dismiss}
                    />
                  ))}
                </>
              )}
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
