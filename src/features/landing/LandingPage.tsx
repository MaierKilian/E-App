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
import { PreviewSection } from './PreviewSection'

/**
 * Öffentliche Landing Page (Route „/") für Erst-Besucher.
 *
 * Ziel: in Sekunden überzeugen – was die App kann, wofür sie gut ist und wie es
 * aussieht, wenn schon Daten drin sind. Bewusst OHNE die App-Chrome (Header /
 * BottomNav); eigene schlanke Topbar. Wiederkehrer werden bereits in `App.tsx`
 * an dieser Seite vorbei aufs Onboarding/Dashboard geleitet.
 *
 * Aufbau folgt `docs/landing-concept.md`:
 *   ① Hero · ② „So sieht's mit Daten aus" · ③ Capabilities · ④ Vertrauen · ⑤ CTA
 * In diesem Schritt ist nur das Gerüst + Hero angelegt; die weiteren Abschnitte
 * und die i18n-Anbindung folgen in den nächsten Schritten.
 */
export function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)

  // Beim Verlassen der Landing gilt die Einführung als gesehen: die Landing
  // übernimmt die Rolle des Value-Intros. Dadurch überspringt der normale Flow
  // das alte Overlay (dessen Verbleib ist eine spätere Entscheidung).
  function startOnboarding() {
    setIntroSeen(true)
    navigate('/onboarding')
  }

  function goToLogin() {
    setIntroSeen(true)
    navigate('/login', { state: { from: '/onboarding' } })
  }

  // Demo lädt über den vorhandenen `?demo`-Mechanismus (DemoLoader). Ein voller
  // Seitenwechsel ist nötig, weil DemoLoader den Query-Parameter nur beim Mount
  // liest. Feinschliff (nahtloses Laden) folgt in einem späteren Schritt.
  function openDemo() {
    window.location.assign(`${import.meta.env.BASE_URL}?demo`)
  }

  return (
    <div className="relative min-h-[100dvh] text-foreground">
      <div className="app-backdrop" aria-hidden="true" />

      {/* Schlanke Topbar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <span className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
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
      <section className="mx-auto grid w-full max-w-5xl items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-2 md:gap-12 md:pt-16">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h1 className="max-w-2xl text-balance text-3xl font-bold leading-tight text-foreground md:text-5xl">
            {t('landing.hero.title')}
          </h1>
          <p className="mt-4 max-w-xl text-balance text-base text-muted md:text-lg">
            {t('landing.hero.subtitle')}
          </p>

          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row md:w-auto">
            <button
              type="button"
              onClick={startOnboarding}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
            >
              {t('landing.hero.ctaStart')}
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openDemo}
              className="focus-ring flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-6 py-3.5 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
            >
              <Play className="h-4 w-4" />
              {t('landing.hero.ctaDemo')}
            </button>
          </div>
        </div>

        <HeroMock />
      </section>

      {/* ② „So sieht's mit Daten aus" */}
      <PreviewSection onOpenDemo={openDemo} />

      {/* ③ Was du machen kannst */}
      <section className="mx-auto w-full max-w-5xl px-5 py-16">
        <h2 className="text-center text-balance text-2xl font-bold text-foreground md:text-3xl">
          {t('landing.features.title')}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={Gauge} title={t('landing.features.measure.title')} desc={t('landing.features.measure.desc')} />
          <Feature icon={LineChart} title={t('landing.features.track.title')} desc={t('landing.features.track.desc')} />
          <Feature icon={PiggyBank} title={t('landing.features.save.title')} desc={t('landing.features.save.desc')} />
          <Feature icon={FileText} title={t('landing.features.report.title')} desc={t('landing.features.report.desc')} />
        </div>
      </section>

      {/* ④ Vertrauen / Für wen */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-4">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <TrustChip icon={Lock} label={t('landing.trust.local')} />
          <TrustChip icon={Check} label={t('landing.trust.free')} />
          <TrustChip icon={Users} label={t('landing.trust.everyone')} />
          <TrustChip icon={GraduationCap} label={t('landing.trust.learning')} />
        </div>
      </section>

      {/* ⑤ Abschluss-CTA */}
      <section className="mx-auto w-full max-w-3xl px-5 py-20 text-center">
        <h2 className="mx-auto max-w-xl text-balance text-2xl font-bold text-foreground md:text-3xl">
          {t('landing.closing.title')}
        </h2>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={startOnboarding}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
          >
            {t('landing.closing.ctaStart')}
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={openDemo}
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

/** Eine Capability-Kachel (Abschnitt ③): Icon, Titel, Beschreibung. */
function Feature({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="glass flex flex-col rounded-3xl p-5">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted">{desc}</p>
    </div>
  )
}

/** Ein Vertrauens-Chip (Abschnitt ④): Icon + kurzer Text als Pille. */
function TrustChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3.5 py-2 text-xs font-medium text-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
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
    <div className="rounded-2xl border border-border/60 bg-surface-2/40 p-2.5">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted">{label}</span>
      </span>
      <span className="mt-1 block text-sm font-bold tabular-nums text-foreground">{value}</span>
    </div>
  )
}
