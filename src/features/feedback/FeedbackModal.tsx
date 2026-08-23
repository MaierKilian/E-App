import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Frown, Meh, Smile, CheckCircle2, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { OptionChip } from '@/components/ui/OptionChip'
import { useFeedbackStore, type FeedbackSource } from '@/store/feedbackStore'
import { useUser } from '@/store/authStore'
import { track } from '@/features/analytics/analytics'
import {
  CATEGORIES,
  FEEDBACK_TEXT_LIMIT,
  SENTIMENTS,
  submitFeedback,
  type FeedbackCategory,
  type Sentiment,
} from './submitFeedback'

const SENTIMENT_ICONS: Record<Sentiment, LucideIcon> = {
  bad: Frown,
  neutral: Meh,
  good: Smile,
}

/** Ab hier wird der Zeichenzähler eingeblendet (vorher nur Ballast). */
const COUNTER_THRESHOLD = FEEDBACK_TEXT_LIMIT - 200

type Phase = 'form' | 'sending' | 'done' | 'error'

/**
 * Inhalt des Feedback-Fensters. Steckt bewusst in einer eigenen Komponente:
 * `Modal` rendert seine Kinder nur im geöffneten Zustand, dadurch startet das
 * Formular bei jedem Öffnen von selbst leer – ganz ohne Zurücksetz-Effekt.
 */
function FeedbackForm({ source, presetSentiment, screenshot, onClose, onSubmitted }: FeedbackFormProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const user = useUser()
  const markSubmitted = useFeedbackStore((s) => s.markSubmitted)

  // Kommt der Aufruf von der Nachfrage-Karte, ist dort schon ein Gesicht
  // getippt worden – diese Auswahl wird übernommen statt neu abgefragt.
  const [sentiment, setSentiment] = useState<Sentiment | null>(presetSentiment)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [text, setText] = useState('')
  const [contactOk, setContactOk] = useState(false)
  // Screenshot ist standardmäßig dabei (der ganze Zweck der Aufnahme), aber
  // abwählbar – ein Bildschirmfoto ist sensibler als Route/Version/Gerät und
  // verdient eine eigene, sichtbare Entscheidung statt automatisch mitzulaufen.
  const [includeScreenshot, setIncludeScreenshot] = useState(true)
  const [phase, setPhase] = useState<Phase>('form')
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void track('feedback_opened', { source })
  }, [source])

  // Nach der Stimmungswahl in den Freitext springen – aber nur mit Maus/Trackpad.
  //
  // Auf dem Handy war genau das störend: Ein Tipp auf ein Gesicht riss sofort
  // die Tastatur hoch, schob das halbe Formular aus dem Bild und ließ den
  // Absenden-Knopf hinter der Browser-Leiste verschwinden. Dort ist ein
  // gesparter Tipp den Sprung nicht wert; am Schreibtisch kostet der Fokus
  // dagegen nichts und spart einen Klick.
  useEffect(() => {
    if (!sentiment) return
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (finePointer) textRef.current?.focus()
  }, [sentiment])

  // Nach dem Abschicken von selbst schließen – die Bestätigung ist kurz, ein
  // zusätzlicher Klick wäre nur Arbeit ohne Aussage.
  useEffect(() => {
    if (phase !== 'done') return
    const timer = window.setTimeout(onClose, 2200)
    return () => window.clearTimeout(timer)
  }, [phase, onClose])

  async function handleSubmit() {
    if (!sentiment || phase === 'sending') return
    setPhase('sending')
    try {
      await submitFeedback({
        sentiment,
        category,
        text,
        source,
        route: location.pathname,
        contactOk,
        screenshot: includeScreenshot ? screenshot : null,
      })
      markSubmitted()
      void track('feedback_submitted', {
        sentiment,
        category: category ?? 'none',
        hasText: text.trim().length > 0,
        contactOk,
      })
      setPhase('done')
      onSubmitted()
    } catch {
      // Der genaue Fehler hilft dem Nutzer nicht weiter – wichtig ist, dass der
      // Text erhalten bleibt und ein zweiter Versuch möglich ist.
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted">
          {contactOk ? t('feedback.thanksBodyContact') : t('feedback.thanksBody')}
        </p>
      </div>
    )
  }

  const remaining = FEEDBACK_TEXT_LIMIT - text.length

  return (
    <div className="space-y-4">
      {/* Stimmung – der einzige Pflichtschritt. Beschriftet, weil drei nackte
          Gesichter offen lassen, was das mittlere bedeutet. */}
      <div className="grid grid-cols-3 gap-2">
        {SENTIMENTS.map((value) => {
          const Icon = SENTIMENT_ICONS[value]
          const active = sentiment === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSentiment(value)}
              aria-pressed={active}
              aria-label={t(`feedback.sentiment.${value}`)}
              className={`focus-ring flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 transition-[transform,background-color,color] duration-200 active:scale-95 ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted hover:bg-surface-2 hover:text-foreground'
              }`}
            >
              <Icon className="h-7 w-7" strokeWidth={active ? 2.2 : 1.6} />
              <span className="text-[11px] font-medium leading-none">
                {t(`feedback.sentimentShort.${value}`)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Einordnung – optional, ein Klick, spart beim Auswerten viel. */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((value) => (
          <OptionChip
            key={value}
            label={t(`feedback.category.${value}`)}
            selected={category === value}
            onClick={() => setCategory((prev) => (prev === value ? null : value))}
          />
        ))}
      </div>

      {/* Die eigentliche Frage. Sie richtet sich nach der Stimmung: „Was hat
          dich gestört?" bringt bei einem zufriedenen Nutzer nichts, und eine
          allgemeine Frage bringt bei niemandem etwas. */}
      <div className="space-y-1.5">
        <label htmlFor="feedback-text" className="block text-sm font-semibold text-foreground">
          {sentiment ? t(`feedback.ask.${sentiment}`) : t('feedback.ask.none')}
        </label>
        <textarea
          id="feedback-text"
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, FEEDBACK_TEXT_LIMIT))}
          rows={4}
          disabled={!sentiment}
          placeholder={sentiment ? t(`feedback.placeholder.${sentiment}`) : ''}
          className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        />
        {remaining <= FEEDBACK_TEXT_LIMIT - COUNTER_THRESHOLD && (
          <p className="text-right text-[11px] text-muted">
            {t('feedback.remaining', { count: remaining })}
          </p>
        )}
      </div>

      {/* Screenshot: nur anbieten, wenn die Aufnahme (im Hintergrund beim
          Öffnen gestartet) tatsächlich vorliegt – sonst gäbe es nichts zum
          Abwählen. Eigene, sichtbare Zustimmung statt automatisch mitzulaufen:
          ein Bildschirmfoto ist sensibler als Route/Version/Gerät. */}
      {screenshot && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-surface-2/40 px-3 py-2.5">
          <input
            type="checkbox"
            checked={includeScreenshot}
            onChange={(e) => setIncludeScreenshot(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
          />
          <img
            src={screenshot}
            alt=""
            className="h-11 w-11 shrink-0 rounded-md border border-border object-cover"
          />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-foreground">
              {t('feedback.screenshot.label')}
            </span>
            <span className="block text-[11px] leading-snug text-muted">
              {t('feedback.screenshot.hint')}
            </span>
          </span>
        </label>
      )}

      {/* Rückfragen: nur für Angemeldete – bei Gästen gibt es keine Adresse. */}
      {user?.email && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-surface-2/40 px-3 py-2.5">
          <input
            type="checkbox"
            checked={contactOk}
            onChange={(e) => setContactOk(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
          />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-foreground">
              {t('feedback.contact.label')}
            </span>
            <span className="block text-[11px] leading-snug text-muted">
              {t('feedback.contact.hint', { email: user.email })}
            </span>
          </span>
        </label>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        {t('feedback.contextHint')}
      </p>

      {phase === 'error' && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
          {t('feedback.error')}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!sentiment || phase === 'sending'}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {phase === 'sending' ? t('feedback.sending') : t('feedback.submit')}
      </button>
    </div>
  )
}

interface FeedbackFormProps {
  source: FeedbackSource
  /** Vorgewählte Stimmung (von der Nachfrage-Karte), sonst null. */
  presetSentiment: Sentiment | null
  /** Screenshot des Bildschirms beim Öffnen, oder null solange er (noch) fehlt. */
  screenshot: string | null
  onClose: () => void
  /** Meldet den Erfolg nach oben, damit die Überschrift mitwechselt. */
  onSubmitted: () => void
}

/**
 * Das Feedback-Fenster. Genau ein Exemplar hängt im `Layout`; geöffnet wird es
 * über `useFeedbackStore().openFeedback(source)` – aus der Kopfzeile, dem
 * Konto-Menü, den Einstellungen oder (Phase 2) einer automatischen Nachfrage.
 *
 * Aufbau in drei Schritten, siehe docs/feedback-concept.md §3: Stimmung (ein
 * Klick, allein schon auswertbar) → optionale Einordnung → Freitext unter einer
 * Frage, die sich nach der Stimmung richtet.
 */
export function FeedbackModal() {
  const { t } = useTranslation()
  const open = useFeedbackStore((s) => s.open)
  const source = useFeedbackStore((s) => s.source)
  const presetSentiment = useFeedbackStore((s) => s.presetSentiment)
  const screenshot = useFeedbackStore((s) => s.screenshot)
  const closeFeedback = useFeedbackStore((s) => s.closeFeedback)
  const [submitted, setSubmitted] = useState(false)

  // Beim Schließen zurücksetzen – nicht beim Öffnen. Jeder Weg aus dem Fenster
  // läuft hier durch, dadurch startet das nächste Öffnen sauber, ohne dass ein
  // Effekt Zustand zurückdrehen muss.
  function handleClose() {
    setSubmitted(false)
    closeFeedback()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={submitted ? t('feedback.thanksTitle') : t('feedback.title')}
    >
      <FeedbackForm
        source={source}
        presetSentiment={presetSentiment}
        screenshot={screenshot}
        onClose={handleClose}
        onSubmitted={() => setSubmitted(true)}
      />
    </Modal>
  )
}
