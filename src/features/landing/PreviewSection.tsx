import { useTranslation } from 'react-i18next'
import { Play, Home, Droplet, TrendingDown } from 'lucide-react'

/**
 * Abschnitt ② „So sieht's mit Daten aus" der Landing Page.
 *
 * Zeigt drei kompakte, „echt" wirkende Vorschau-Kacheln (Dashboard,
 * Verbrauchs-Verlauf, Messungs-Ergebnis) und darunter den stärksten
 * Conversion-Hebel: den Aufruf zur interaktiven Beispiel-Wohnung. Rein visuell,
 * ohne Store-Abhängigkeit – die echten Daten erlebt der Besucher erst in der Demo.
 */
export function PreviewSection({ onOpenDemo }: { onOpenDemo: () => void }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-2xl font-bold text-foreground md:text-3xl">
          {t('landing.preview.title')}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-balance text-muted">
          {t('landing.preview.subtitle')}
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <PreviewTile
          title={t('landing.preview.tiles.dashboard.title')}
          desc={t('landing.preview.tiles.dashboard.desc')}
        >
          <DashboardMock label={t('landing.hero.mockLabel')} />
        </PreviewTile>

        <PreviewTile
          title={t('landing.preview.tiles.trend.title')}
          desc={t('landing.preview.tiles.trend.desc')}
        >
          <TrendMock label={t('monitoring.energyTypes.electricity')} />
        </PreviewTile>

        <PreviewTile
          title={t('landing.preview.tiles.measurement.title')}
          desc={t('landing.preview.tiles.measurement.desc')}
        >
          <MeasurementMock title={t('onboardingIntro.showerTitle')} />
        </PreviewTile>
      </div>

      {/* Demo-Aufruf */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onOpenDemo}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-base font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
        >
          <Play className="h-5 w-5" />
          {t('landing.preview.cta')}
        </button>
        <p className="max-w-sm text-center text-xs text-muted">{t('landing.preview.note')}</p>
      </div>
    </section>
  )
}

/** Rahmen einer Vorschau-Kachel: Mock oben, Titel + Beschreibung darunter. */
function PreviewTile({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="glass flex flex-col rounded-3xl p-4">
      <div className="flex h-32 items-center justify-center rounded-2xl bg-surface-2/40 p-3">
        {children}
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted">{desc}</p>
    </div>
  )
}

/** Mini-Abbild der Startseiten-Karte: Fortschrittsring + Jahreskosten. */
function DashboardMock({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="relative shrink-0">
        <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
          <circle cx="22" cy="22" r="19" fill="none" strokeWidth="4" className="stroke-surface-2" />
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={2 * Math.PI * 19}
            strokeDashoffset={2 * Math.PI * 19 * 0.12}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-primary">
          <Home className="h-4 w-4" />
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="text-lg font-bold tabular-nums text-foreground">≈ 1.980 €</p>
      </div>
    </div>
  )
}

/** Mini-Verbrauchskurve mit Träger-Bezeichnung. */
function TrendMock({ label }: { label: string }) {
  return (
    <div className="w-full">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        {label}
      </p>
      <svg viewBox="0 0 200 64" fill="none" preserveAspectRatio="none" className="h-16 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="previewArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f59e0b" stopOpacity="0.28" />
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M4 46 L44 40 L84 44 L124 28 L164 34 L196 16 L196 60 L4 60 Z" fill="url(#previewArea)" />
        <path
          d="M4 46 L44 40 L84 44 L124 28 L164 34 L196 16"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/** Mini-Messergebnis: Duschkopf-Check mit Sparbetrag. */
function MeasurementMock({ title }: { title: string }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
          <Droplet className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted">12 L/min</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
        <TrendingDown className="h-4 w-4" />
        ≈ 120 €/Jahr
      </p>
    </div>
  )
}
