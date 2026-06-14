import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PiggyBank, ListChecks, Rocket, ChevronRight, ChevronLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'

const SLIDE_ICONS: LucideIcon[] = [PiggyBank, ListChecks, Rocket]

interface Slide {
  title: string
  body: string
}

/**
 * Kurze Erst-Einführung (Value-Onboarding) beim allererste Start: 3 Screens
 * mit dem Nutzen der App, dann Übergang ins Energieprofil. Überspringbar und
 * über das Einstellungs-Menü ("Einführung erneut ansehen") wiederholbar.
 * Solides Vollbild-Overlay (kein fragiles Glass-Overlay).
 */
export function OnboardingIntro() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const introSeen = useSettingsStore((s) => s.introSeen)
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)
  const [index, setIndex] = useState(0)

  if (introSeen) return null

  const slides = t('onboardingIntro.slides', { returnObjects: true }) as Slide[]
  const total = slides.length
  const isLast = index === total - 1
  const slide = slides[index]
  const Icon = SLIDE_ICONS[index] ?? PiggyBank

  function finish(goToProfile: boolean) {
    setIntroSeen(true)
    if (goToProfile) navigate('/onboarding')
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={slide.title}
    >
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={() => finish(false)}
          className="focus-ring rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('onboardingIntro.skip')}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="mb-8 grid h-24 w-24 place-items-center rounded-3xl bg-primary/10 text-primary">
          <Icon className="h-11 w-11" />
        </span>
        <h2 className="text-2xl font-bold leading-tight text-foreground">{slide.title}</h2>
        <p className="mt-3 max-w-sm text-muted">{slide.body}</p>
      </div>

      <div className="px-8 pb-10">
        <div className="mb-6 flex justify-center gap-2">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === index ? 'w-6 bg-primary' : 'w-2 bg-surface-2'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex((i) => i - 1)}
              aria-label={t('onboardingIntro.back')}
              className="focus-ring grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-foreground transition-transform active:scale-[0.97]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? finish(true) : setIndex((i) => i + 1))}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
          >
            {isLast ? t('onboardingIntro.start') : t('onboardingIntro.next')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
