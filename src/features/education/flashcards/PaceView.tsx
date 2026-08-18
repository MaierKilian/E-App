import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useFlashcardStore } from '@/store/flashcardStore'
import { formatInterval } from './intervalText'
import { useNow } from './useFlashcards'
import { currentPreset, isUnlimitedReviews, paramsFromPreset, type PresetId } from './engine/params'
import { getScheduler } from './engine/scheduler'
import { newCardState, type CardState } from './engine/types'

/** Reihenfolge von locker nach intensiv. */
const ORDER: PresetId[] = ['relaxed', 'standard', 'intensive', 'sprint']

/**
 * Lerntempo wählen.
 *
 * Der Wiederholungs-Algorithmus hat rund zwanzig Parameter. Statt sie einzeln
 * anzubieten, gibt es vier benannte Stufen – und zu jeder die KONKRETE Folge:
 * wie viele Karten am Tag, und wann eine gewusste Karte wiederkommt. Diese
 * Angabe ist nicht getextet, sondern mit dem echten Verfahren gerechnet. Wer
 * einmal sieht, dass „Locker" 20 Tage und „Intensiv" 8 Tage bedeutet, versteht
 * die Wahl ohne Erklärtext.
 */
export function PaceView() {
  const { t } = useTranslation()
  const now = useNow()
  const params = useFlashcardStore((s) => s.params)
  const applyPreset = useFlashcardStore((s) => s.applyPreset)
  const active = currentPreset(params)

  // Beispielkarte: seit zehn Tagen fällig, sicher gelernt. An ihr lässt sich
  // ablesen, wie weit die Presets die Intervalle auseinanderziehen.
  const sample = useMemo<CardState>(
    () => ({
      ...newCardState('beispiel'),
      status: 'young',
      reps: 4,
      intervalDays: 10,
      stability: 10,
      difficulty: 5,
      lastReviewed: now - 10 * 86_400_000,
    }),
    [now],
  )

  return (
    <div className="space-y-6">
      <Link
        to="/lernen"
        className="focus-ring flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('education.flashcards.todayTitle')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{t('education.flashcards.pace.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('education.flashcards.pace.intro')}</p>
      </div>

      <div className="space-y-3">
        {ORDER.map((id) => {
          const preset = paramsFromPreset(id)
          const nextInterval = getScheduler(preset.algorithm).preview(sample, now, preset)[3]
          const selected = id === active
          return (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              aria-pressed={selected}
              className="focus-ring block w-full text-left"
            >
              <Card
                className={`space-y-3 transition-colors ${
                  selected ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {t(`education.flashcards.pace.presets.${id}.name`)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {t(`education.flashcards.pace.presets.${id}.when`)}
                    </p>
                  </div>
                  {selected ? (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="h-6 w-6 shrink-0 rounded-full border border-border" aria-hidden />
                  )}
                </div>

                {/*
                 * Bewusst zwei Sätze statt einer Kachelreihe: Drei Zahlen
                 * nebeneinander schneiden auf dem Handy die Beschriftung ab, und
                 * die entscheidende Aussage geht darin unter. Oben steht deshalb
                 * die Folge für den Lernenden, darunter die Tagesmenge.
                 */}
                <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
                  <p className="text-sm font-semibold">
                    {t('education.flashcards.pace.factInterval', {
                      interval: formatInterval(nextInterval, t),
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {isUnlimitedReviews(preset)
                      ? t('education.flashcards.pace.factVolumeUnlimited', {
                          count: preset.newCardsPerDay,
                        })
                      : t('education.flashcards.pace.factVolume', {
                          news: preset.newCardsPerDay,
                          reviews: preset.maxReviewsPerDay,
                        })}
                  </p>
                </div>
              </Card>
            </button>
          )
        })}
      </div>

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold">{t('education.flashcards.pace.explainTitle')}</h2>
        <p className="text-xs leading-relaxed text-muted">
          {t('education.flashcards.pace.explainBody')}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          {t('education.flashcards.pace.explainSafe')}
        </p>
      </Card>
    </div>
  )
}
