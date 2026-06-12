import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, Download, RotateCcw, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { LabExperiment } from './educationContent'
import { generateCertificate } from './generateCertificate'

interface QuizProps {
  experiment: LabExperiment
  /** Name fürs Zertifikat – bereits vor dem Test erfasst. */
  name: string
  onName: (value: string) => void
  onBack: () => void
}

/**
 * Vorbereitungstest für einen Laborversuch. Zeigt alle Fragen als kompakte
 * Liste mit Radio-Auswahl, wertet auf Knopfdruck aus und zeigt das Ergebnis
 * (Bestanden/Nicht bestanden) mit PDF-Export und Wiederholen.
 */
export function Quiz({ experiment, name, onName, onBack }: QuizProps) {
  const { t, i18n } = useTranslation()
  const { quiz, passRatio, title, id } = experiment

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

  if (submitted) {
    return (
      <ResultScreen
        passed={passed}
        score={score}
        total={total}
        name={name}
        onName={onName}
        onExport={exportPdf}
        onRetry={retry}
        onBack={onBack}
      />
    )
  }

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
          onClick={() => setSubmitted(true)}
          className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {t('education.quiz.evaluate')}
        </button>
      </div>
    </div>
  )
}

interface ResultScreenProps {
  passed: boolean
  score: number
  total: number
  name: string
  onName: (value: string) => void
  onExport: () => void
  onRetry: () => void
  onBack: () => void
}

function ResultScreen({
  passed,
  score,
  total,
  name,
  onName,
  onExport,
  onRetry,
  onBack,
}: ResultScreenProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="flex flex-col items-center gap-3">
          {passed ? (
            <CheckCircle2 className="h-12 w-12 text-primary" />
          ) : (
            <XCircle className="h-12 w-12 text-muted" />
          )}
          <h2 className="text-xl font-bold">
            {passed ? t('education.quiz.passed') : t('education.quiz.failed')}
          </h2>
          <p className="text-muted">
            {t('education.quiz.score')}: {score}/{total}
          </p>
          <p className="text-sm text-muted">
            {passed ? t('education.quiz.feedbackPassed') : t('education.quiz.feedbackFailed')}
          </p>
        </div>

        <div className="mt-5">
          <input
            type="text"
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder={t('education.quiz.namePlaceholder')}
            className="focus-ring w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted"
          />
        </div>
      </Card>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onExport}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Download className="h-4 w-4" />
          {t('education.quiz.export')}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetry}
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
