import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import type { OnboardingData } from '@/types'
import { checkPlausibility, plausibilityKey } from './plausibility'

/**
 * Ruhiger Hinweis, wenn Wohnfläche, Personen und Zimmer nicht zusammenpassen.
 *
 * Kein Modal, kein rotes Feld, keine Sperre – die App weiß nicht, wie jemand
 * wohnt. Sie weiß nur, dass 700 m² für zwei Personen genauso aussieht wie eine
 * Null zu viel, und dass diese eine Zahl jede €- und kWh-Angabe der App trägt.
 *
 * „Passt so" gilt für genau diese Wertekombination: Wer später wirklich vertippt,
 * sieht den Hinweis wieder.
 */
export function PlausibilityNote({ data }: { data: OnboardingData }) {
  const { t } = useTranslation()
  const accepted = useSettingsStore((s) => s.plausibilityAccepted)
  const acceptPlausibility = useSettingsStore((s) => s.acceptPlausibility)

  const hints = checkPlausibility(data)
  const key = plausibilityKey(data)
  if (hints.length === 0 || accepted === key) return null

  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 px-3.5 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        {hints.map((hint) => (
          <p key={hint.id} className="text-sm text-foreground">
            {t(`onboarding.plausibility.${hint.id}`, hint.params)}
          </p>
        ))}
        <button
          type="button"
          onClick={() => acceptPlausibility(key)}
          className="focus-ring mt-1.5 rounded text-sm font-semibold text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
        >
          {t('onboarding.plausibility.accept')}
        </button>
      </div>
    </div>
  )
}
