import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  Play,
  TrendingDown,
  Gauge,
  LineChart,
  PiggyBank,
  FileText,
  Lock,
  Check,
  Users,
  GraduationCap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useSettingsStore } from '@/store/settingsStore'
import { enterDemo } from '@/features/demo/enterDemo'
import { track } from '@/features/analytics/analytics'
import { PreviewSection } from './PreviewSection'
import { GuidedSection } from './GuidedSection'

/**
 * Öffentliche Landing Page (Route „/") für Erst-Besucher.
 *
 * Ziel: in Sekunden überzeugen – was die App kann, wofür sie gut ist und wie es
 * aussieht, wenn schon Daten drin sind. Bewusst OHNE die App-Chrome (Header /
 * BottomNav); eigene schlanke Topbar. Wiederkehrer werden bereits in `App.tsx`
 * an dieser Seite vorbei aufs Onboarding/Dashboard geleitet.
 *
 * Aufbau folgt `docs/landing-concept.md`:
 *   ① Hero (mit Vertrauens-Signalen) · ② „So läuft eine Messung ab" ·
 *   ③ „So sieht's mit Daten aus" · ④ Capabilities · ⑤ CTA
 * Erst der Weg (② zeigt den geführten Dreischritt einer echten Messung), dann
 * das Ergebnis (③) – die Reihenfolge beantwortet „kann ich das?" vor „lohnt es sich?".
 */
/**
 * @param preview  Vorschau aus den Einstellungen (nicht der echte Erst-Besuch):
 *   unterdrückt das `landing_view`-Analytics-Ereignis, damit die Conversion-
 *   Kennzahl nur reale Erst-Aufrufe zählt.
 */
export function LandingPage({ preview = false }: { preview?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)

  // Ein „landing_view" je echtem Aufruf der Landing Page (Conversion-Basiswert).
  useEffect(() => {
    if (!preview) void track('landing_view')
  }, [preview])

  // Beim Verlassen der Landing gilt die Einführung als gesehen: die Landing
  // übernimmt die Rolle des Value-Intros. Dadurch überspringt der normale Flow
  // das alte Overlay (dessen Verbleib ist eine spätere Entscheidung).
  // `location` verortet den geklickten CTA (hero / closing / preview).
  function startOnboarding(location: string) {
    void track('landing_cta_start', { location })
    setIntroSeen(true)
    navigate('/onboarding')
  }

  function goToLogin() {
    setIntroSeen(true)
    navigate('/login', { state: { from: '/onboarding' } })
  }

  // Demo direkt und nahtlos laden – ein Klick genügt, kein Reload, keine
  // Zwischenabfrage (der Button ist bereits die bewusste Entscheidung).
  function openDemo(location: string) {
    void track('landing_cta_demo', { location })
    enterDemo()
    navigate('/onboarding')
  }

  return (
    <div className="relative min-h-[100dvh] text-foreground">
      <div className="app-backdrop" aria-hidden="true" />

      {/* Schlanke Topbar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <span className="flex items-center gap-2 font-semibold">
          {/* Logo dekorativ – der Text „E-App" liefert bereits den Namen. */}
          <span aria-hidden="true">
            <Logo className="h-6 w-6" />
          </span>
          <span>E-App</span>
        </span>
        <button
          type="button"
          onClick={goToLogin}
          className="focus-ring rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('landing.nav.signIn')}
        </button>
      </header>

      {/* ① Hero – zweispaltig auf Desktop (Text links, App-Mock rechts) */}
      <section className="mx-auto grid w-full max-w-5xl items-center gap-8 px-5 pb-12 pt-6 md:grid-cols-2 md:gap-12 md:pb-16 md:pt-12">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h1 className="max-w-2xl text-balance text-[1.75rem] font-bold leading-[1.15] text-foreground md:text-5xl">
            {t('landing.hero.title')}
          </h1>
          <p className="mt-3.5 max-w-xl text-balance text-base text-muted md:mt-4 md:text-lg">
            {t('landing.hero.subtitle')}
          </p>

          <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row md:mt-8 md:w-auto">
            <button
              type="button"
              onClick={() => startOnboarding('hero')}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
            >
              {t('landing.hero.ctaStart')}
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openDemo('hero')}
              className="focus-ring flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-6 py-3.5 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
            >
              <Play className="h-4 w-4" />
              {t('landing.hero.ctaDemo')}
            </button>
          </div>

          {/* Vertrauen – direkt unter den CTAs statt als eigener Abschnitt:
              beantwortet die „Kostet das was? Wo bleiben meine Daten?"-Frage
              genau dort, wo sie aufkommt (und spart eine Sektion). */}
          {/* Bewusst 2×2 statt einer Wrap-Zeile: vier Signale nebeneinander passen
              in keine Hero-Spalte und brechen sonst unruhig auf 3 + 1 um. */}
          <div className="mt-5 grid w-full max-w-xs grid-cols-2 gap-x-3 gap-y-2 sm:max-w-sm md:mt-6">
            <TrustChip icon={Lock} label={t('landing.trust.local')} />
            <TrustChip icon={Check} label={t('landing.trust.free')} />
            <TrustChip icon={Users} label={t('landing.trust.everyone')} />
            <TrustChip icon={GraduationCap} label={t('landing.trust.learning')} />
          </div>
        </div>

        <HeroMock />
      </section>

      {/* ② „So läuft eine Messung ab" – erst der Weg … */}
      <GuidedSection />

      {/* ③ „So sieht's mit Daten aus" – … dann das Ergebnis. */}
      <PreviewSection onOpenDemo={() => openDemo('preview')} />

      {/* ④ Was du machen kannst */}
      <section className="mx-auto w-full max-w-5xl px-5 py-12 md:py-16">
        <h2 className="text-center text-balance text-xl font-bold text-foreground md:text-3xl">
          {t('landing.features.title')}
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:mt-10 md:gap-4 lg:grid-cols-4">
          <Feature icon={Gauge} title={t('landing.features.measure.title')} desc={t('landing.features.measure.desc')} />
          <Feature icon={LineChart} title={t('landing.features.track.title')} desc={t('landing.features.track.desc')} />
          <Feature icon={PiggyBank} title={t('landing.features.save.title')} desc={t('landing.features.save.desc')} />
          <Feature icon={FileText} title={t('landing.features.report.title')} desc={t('landing.features.report.desc')} />
        </div>
      </section>

      {/* ⑤ Abschluss-CTA */}
      <section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-4 text-center md:pb-20 md:pt-8">
        <h2 className="mx-auto max-w-xl text-balance text-xl font-bold text-foreground md:text-3xl">
          {t('landing.closing.title')}
        </h2>
        <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:justify-center md:mt-8">
          <button
            type="button"
            onClick={() => startOnboarding('closing')}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
          >
            {t('landing.closing.ctaStart')}
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openDemo('closing')}
            className="focus-ring flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-6 py-3.5 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
          >
            <Play className="h-4 w-4" />
            {t('landing.closing.ctaDemo')}
          </button>
        </div>
        <p className="mt-6 text-sm text-muted">
          {t('landing.closing.signInPrompt')}{' '}
          <button
            type="button"
            onClick={goToLogin}
            className="focus-ring rounded font-semibold text-primary underline-offset-2 hover:underline"
          >
            {t('landing.closing.signIn')}
          </button>
        </p>
      </section>
    </div>
  )
}

/**
 * Eine Capability-Kachel (Abschnitt ③): Icon, Titel, Beschreibung.
 *
 * Auf dem Handy bewusst als flache Zeile (Icon links, Text rechts) – vier
 * gestapelte Hochkant-Karten hätten die Seite unnötig lang gemacht. Ab `sm`
 * wieder als Karte im Raster.
 */
function Feature({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="glass flex items-start gap-3.5 rounded-2xl p-4 sm:flex-col sm:gap-0 sm:rounded-3xl sm:p-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11 sm:rounded-2xl">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 sm:mt-4">
        <h3 className="font-semibold leading-snug text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted">{desc}</p>
      </div>
    </div>
  )
}

/**
 * Ein Vertrauens-Signal im Hero: Icon + kurzer Text, bewusst ohne Pillen-Rahmen.
 * Vier umrandete Chips direkt unter den Buttons hätten mit den CTAs konkurriert.
 */
function TrustChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      {label}
    </span>
  )
}

/**
 * Leichtgewichtiges, „echt" wirkendes Dashboard-Mock für den Hero.
 *
 * Bewusst kein Rendern der echten Komponenten (keine Store-Abhängigkeit) – nur
 * ein visuelles Abbild der Energie-Status-Karte mit klarer „Beispiel"-Kennung
 * und einer sich aufbauenden Verbrauchskurve (wiederverwendete intro-*-
 * Animationen, respektieren `prefers-reduced-motion`).
 */
function HeroMock() {
  const { t, i18n } = useTranslation()
  const eur = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })

  return (
    <div className="intro-rise mx-auto w-full max-w-sm md:mx-0 md:ml-auto">
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        {/* Dezenter Akzent-Schimmer wie in der echten Energie-Karte */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl"
        />

        <p className="relative text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t('landing.hero.mockLabel')}
        </p>

        <div className="relative mt-1.5 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-foreground">
            ≈ {eur.format(1980)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingDown className="h-3.5 w-3.5" />
            8 %
          </span>
        </div>

        {/* Verbrauchskurve */}
        <svg
          viewBox="0 0 240 96"
          fill="none"
          preserveAspectRatio="none"
          className="relative mt-4 h-24 w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f59e0b" stopOpacity="0.28" />
              <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="intro-area"
            style={{ animationDelay: '0.55s' }}
            d="M6 70 L52 58 L98 64 L144 44 L190 48 L234 22 L234 90 L6 90 Z"
            fill="url(#heroArea)"
          />
          <path
            className="intro-draw"
            style={{ animationDelay: '0.2s' }}
            d="M6 70 L52 58 L98 64 L144 44 L190 48 L234 22"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            className="intro-dot"
            style={{ animationDelay: '0.95s' }}
            cx="234"
            cy="22"
            r="4.5"
            fill="#f59e0b"
          />
        </svg>

        {/* Träger-Legende – spiegelt die echte Kachel-Reihe wider */}
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <MockCarrier color="#f59e0b" label={t('monitoring.energyTypes.electricity')} value={`≈ ${eur.format(1240)}`} />
          <MockCarrier color="#ef4444" label={t('monitoring.energyTypes.gas')} value={`≈ ${eur.format(560)}`} />
          <MockCarrier color="#38bdf8" label={t('monitoring.energyTypes.water')} value={`≈ ${eur.format(180)}`} />
        </div>
      </div>
    </div>
  )
}

/** Eine Mini-Kachel der Hero-Mock-Legende (Träger + Beispielkosten). */
function MockCarrier({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-2/40 px-2 py-2.5">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted">{label}</span>
      </span>
      {/* `whitespace-nowrap`: auf schmalen Handys sonst Umbruch zwischen ≈ und Betrag. */}
      <span className="mt-1 block whitespace-nowrap text-[13px] font-bold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  )
}
