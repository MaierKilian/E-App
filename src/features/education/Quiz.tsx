import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, CheckCircle2, Download, RotateCcw, X, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useProgressStore } from '@/store/progressStore'
import type { LabExperiment, QuizQuestion } from './educationContent'
import { generateCertificate } from './generateCertificate'

interface QuizProps {
  experiment: LabExperiment
  /** Name fürs Zertifikat – bereits vor dem Test erfasst. */
  name: string
  onName: (value: string) => void
  onBack: () => void
}

/**
 * Vorbereitungstest für einen Laborversuch. Fragen mit Radio-Auswahl, danach
 * Auswertung mit Sofort-Feedback je Frage (richtig/falsch + Erklärung),
 * Ergebnis (Bestanden/Nicht bestanden), PDF-Export und Wiederholen.
 * Das Ergebnis wird im Fortschritts-Store gespeichert.
 */
export function Quiz({ experiment, name, onName, onBack }: QuizProps) {
  const { t, i18n } = useTranslation()
  const { quiz, passRatio, title, id } = experiment
  const recordQuiz = useProgressStore((s) => s.recordQuiz)

  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const allAnswered = quiz.every((q) => answers[q.id] !== undefined)

  const score = useMemo(
    () => quiz.reduce((acc, q) => (answers[q.id] === q.correct ? acc + 1 : acc), 0),
    [answers, quiz],
  )
  const total = quiz.length
  const passed = score / total >= passRatio

  function select(questionId: string, optionIndex: number) {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  function evaluate() {
    recordQuiz(id, { score, total, passed })
    setSubmitted(true)
  }

  function retry() {
    setAnswers({})
    setSubmitted(false)
  }

  async function exportPdf() {
    await generateCertificate({
      experimentId: id,
      experimentTitle: title,
      name,
      score,
      total,
      passed,
      t,
      language: i18n.language,
    })
  }

  // --- Auswertungsansicht: Ergebnis + Lösungen + Aktionen ---
  if (submitted) {
    return (
      <div className="space-y-4">
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3">
            {passed ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            ) : (
              <XCircle className="h-12 w-12 text-muted" />
            )}
            <h2 className="text-xl font-bold">
              {passed ? t('education.quiz.passed') : t('education.quiz.failed')}
            </h2>
            <p className="text-sm text-muted">
              {t('education.quiz.score')}: <span className="font-semibold text-foreground">{score}/{total}</span>
            </p>
            <p className="text-sm text-muted">
              {passed ? t('education.quiz.feedbackPassed') : t('education.quiz.feedbackFailed')}
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t('education.quiz.solutions')}
          </h3>
          {quiz.map((q, index) => (
            <ReviewCard key={q.id} q={q} index={index} chosen={answers[q.id]} />
          ))}
        </div>

        <Card>
          <label htmlFor="quiz-name-result" className="mb-2 block text-sm font-medium text-foreground">
            {t('education.quiz.nameLabel')}
          </label>
          <input
            id="quiz-name-result"
            type="text"
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder={t('education.quiz.namePlaceholder')}
            className="focus-ring w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted"
          />
        </Card>

        <div className="space-y-3">
          <button
            type="button"
            onClick={exportPdf}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" />
            {t('education.quiz.export')}
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={retry}
              className="focus-ring glass flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              {t('education.quiz.retry')}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="focus-ring glass flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('education.quiz.back')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Fragenansicht ---
  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {quiz.map((q, index) => (
          <li key={q.id}>
            <Card>
              <p className="mb-3 text-sm font-semibold">
                <span className="text-muted">
                  {t('education.quiz.question')} {index + 1} {t('education.quiz.of')} {total}
                </span>
                <br />
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, optIndex) => {
                  const checked = answers[q.id] === optIndex
                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() => select(q.id, optIndex)}
                      aria-pressed={checked}
                      className={`focus-ring flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm transition-colors ${
                        checked
                          ? 'bg-primary text-primary-foreground'
                          : 'glass text-foreground hover:bg-surface-2/70'
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                          checked ? 'border-primary-foreground' : 'border-muted'
                        }`}
                      >
                        {checked && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </span>
                      <span>{opt}</span>
                    </button>
                  )
                })}
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="focus-ring glass flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('education.quiz.back')}
        </button>
        <button
          type="button"
          disabled={!allAnswered}
          onClick={evaluate}
          className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {t('education.quiz.evaluate')}
        </button>
      </div>
    </div>
  )
}

/** Eine ausgewertete Frage: markiert richtige/falsche Antwort + Erklärung. */
function ReviewCard({ q, index, chosen }: { q: QuizQuestion; index: number; chosen?: number }) {
  const { t } = useTranslation()
  const correct = chosen === q.correct

  return (
    <Card>
      <p className="mb-3 flex items-start gap-2 text-sm font-semibold">
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
            correct ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
          }`}
        >
          {correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        </span>
        <span>
          <span className="text-muted">
            {t('education.quiz.question')} {index + 1}
          </span>
          <br />
          {q.question}
        </span>
      </p>
      <div className="space-y-1.5">
        {q.options.map((opt, optIndex) => {
          const isCorrect = optIndex === q.correct
          const isChosenWrong = optIndex === chosen && !isCorrect
          return (
            <div
              key={optIndex}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                isCorrect
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                  : isChosenWrong
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : 'text-muted'
              }`}
            >
              {isCorrect ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : isChosenWrong ? (
                <X className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{opt}</span>
            </div>
          )
        })}
      </div>
      {q.explanation && (
        <p className="mt-3 rounded-xl bg-surface-2/60 px-3 py-2 text-sm text-foreground">
          {q.explanation}
        </p>
      )}
    </Card>
  )
}
