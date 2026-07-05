import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Droplet, TrendingUp, Lightbulb, ChevronRight, ChevronLeft, UserPlus, TrendingDown } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useUser } from '@/store/authStore'

interface Slide {
  title: string
  body: string
}

/**
 * Erst-Einführung beim allerersten Start („Value-Onboarding"): drei Wert-Beats,
 * die den Nutzen *zeigen* statt ihn nur zu behaupten – Beispiel-Duschkopftest,
 * eine entstehende Verbrauchskurve und das Sparpotenzial. Alle Beispiel-Werte
 * sind klar als „Beispiel" gekennzeichnet. Überspringbar und über das
 * Einstellungs-Menü wiederholbar. Solides Vollbild-Overlay.
 */
export function OnboardingIntro() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const introSeen = useSettingsStore((s) => s.introSeen)
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)
  const user = useUser()
  const [index, setIndex] = useState(0)

  if (introSeen) return null

  const slides = t('onboardingIntro.slides', { returnObjects: true }) as Slide[]
  const total = slides.length
  const isLast = index === total - 1
  const slide = slides[index]

  function finish(goToProfile: boolean) {
    setIntroSeen(true)
    if (goToProfile) navigate('/onboarding')
  }

  function goToLogin() {
    setIntroSeen(true)
    navigate('/login', { state: { from: '/onboarding' } })
  }

  // Auf dem letzten Slide bekommt ein noch nicht angemeldeter Nutzer die Wahl
  // zwischen Anmelden/Registrieren und „als Gast fortfahren".
  const showAuthChoice = isLast && !user

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={slide.title}
    >
      {/* Fixe Kopfzeile */}
      <div className="flex h-14 shrink-0 items-center justify-end px-4">
        <button
          type="button"
          onClick={() => finish(false)}
          className="focus-ring rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('onboardingIntro.skip')}
        </button>
      </div>

      {/* Inhalt: Wert-Illustration + Titel + Text, mittig */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <BeatIllustration index={index} />
        <div>
          <h2 className="text-2xl font-bold leading-tight text-foreground text-balance">
            {slide.title}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-muted">{slide.body}</p>
        </div>
      </div>

      {/* Fixe Fußzeile – Punkte + Buttons */}
      <div className="shrink-0 px-8 pb-10">
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

        {showAuthChoice ? (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={goToLogin}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4" />
              {t('onboardingIntro.signIn')}
            </button>
            <button
              type="button"
              onClick={() => finish(true)}
              className="focus-ring w-full rounded-2xl border border-border bg-surface px-5 py-3.5 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
            >
              {t('onboardingIntro.guest')}
            </button>
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="focus-ring mx-auto block rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                {t('onboardingIntro.back')}
              </button>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}

/** „Beispiel"-Pille für die illustrativen Werte. */
function ExampleBadge() {
  const { t } = useTranslation()
  return (
    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
      {t('onboardingIntro.example')}
    </span>
  )
}

/** Wert-Illustration je Beat (0 Duschkopf, 1 Verlaufskurve, 2 Sparpotenzial). */
function BeatIllustration({ index }: { index: number }) {
  const { t } = useTranslation()

  if (index === 1) {
    return (
      <div className="glass w-full max-w-[17rem] rounded-3xl p-5 text-left">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            {t('onboardingIntro.chartMeter')}
          </span>
          <ExampleBadge />
        </div>
        <svg viewBox="0 0 240 96" fill="none" preserveAspectRatio="none" className="h-24 w-full">
          <defs>
            <linearGradient id="introArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f59e0b" stopOpacity="0.28" />
              <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M6 74 L60 62 L114 66 L168 40 L234 20 L234 90 L6 90 Z" fill="url(#introArea)" />
          <path
            d="M6 74 L60 62 L114 66 L168 40 L234 20"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="234" cy="20" r="4.5" fill="#f59e0b" />
        </svg>
      </div>
    )
  }

  if (index === 2) {
    return (
      <div className="glass w-full max-w-[17rem] rounded-3xl p-5 text-center">
        <div className="mb-2 flex justify-center">
          <ExampleBadge />
        </div>
        <p className="text-xs uppercase tracking-wide text-muted">
          {t('onboardingIntro.savingsLabel')}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">
          {t('onboardingIntro.savings')}
        </p>
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-surface-2/50 p-2.5 text-left">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Lightbulb className="h-4 w-4" />
          </span>
          <p className="text-xs font-semibold text-foreground">{t('onboardingIntro.measures')}</p>
        </div>
      </div>
    )
  }

  // index 0 – Duschkopftest
  return (
    <div className="glass w-full max-w-[17rem] rounded-3xl p-5 text-left">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Droplet className="h-3.5 w-3.5" />
          </span>
          {t('onboardingIntro.showerTitle')}
        </span>
        <ExampleBadge />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold leading-none tabular-nums text-foreground">12</span>
        <span className="mb-1 text-sm text-muted">{t('onboardingIntro.lpm')}</span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="w-20 shrink-0">{t('onboardingIntro.showerYou')}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full w-full rounded-full bg-rose-500" />
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="w-20 shrink-0">{t('onboardingIntro.showerEco')}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full w-1/2 rounded-full bg-emerald-500" />
          </span>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
        <TrendingDown className="h-4 w-4" />
        {t('onboardingIntro.showerSave')}
      </p>
    </div>
  )
}
