import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlayCircle, Timer, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Abschnitt „So läuft eine Messung ab" der Landing Page.
 *
 * Beantwortet die Frage, die zwischen Versprechen und Ergebnis offen blieb:
 * *Kann ich das überhaupt – brauche ich Werkzeug, Vorwissen, Geduld?* Statt sie
 * zu behaupten („einfache Checks"), zeigt der Abschnitt den echten Dreischritt
 * des Runners – bewusst mit dessen eigener Sprache (Info · Messen · Ergebnis,
 * vgl. `measurements.common.phase*`) und dem echten Erklär-Video, das in der
 * Messung selbst läuft. Ein konkretes Beispiel (Duschkopf) statt einer Liste
 * aller neun Checks: „kann ich das?" beantwortet ein Fall besser als ein Katalog.
 */
export function GuidedSection() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-12 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-xl font-bold text-foreground md:text-3xl">
          {t('landing.guided.title')}
        </h2>
        <p className="mx-auto mt-2.5 max-w-xl text-balance text-sm text-muted md:mt-3 md:text-base">
          {t('landing.guided.subtitle')}
        </p>
      </div>

      {/* Drei Schritte – auf dem Handy untereinander, ab `sm` als Spur. */}
      <ol className="mt-6 grid gap-3 sm:grid-cols-3 md:mt-10 md:gap-4">
        <Step
          index={1}
          icon={PlayCircle}
          title={t('landing.guided.steps.info.title')}
          desc={t('landing.guided.steps.info.desc')}
        >
          <StepVideo
            label={t('measurements.showerhead.intro.videoAlt')}
            steps={t('measurements.showerhead.intro.steps', { returnObjects: true }) as string[]}
          />
        </Step>

        <Step
          index={2}
          icon={Timer}
          title={t('landing.guided.steps.run.title')}
          desc={t('landing.guided.steps.run.desc')}
        >
          <StopwatchMock label={t('landing.guided.mock.stopwatchLabel')} />
        </Step>

        <Step
          index={3}
          icon={TrendingDown}
          title={t('landing.guided.steps.result.title')}
          desc={t('landing.guided.steps.result.desc')}
        >
          <ResultMock
            rating={t('measurements.ratings.high')}
            saving={t('landing.guided.mock.savingLabel')}
          />
        </Step>
      </ol>

      <p className="mt-6 text-center text-xs text-muted md:mt-8">{t('landing.guided.note')}</p>
    </section>
  )
}

/**
 * Eine Schritt-Karte: Mock und nummerierter Titel + Beschreibung.
 *
 * Auf dem Handy als Zeile (Mock links, Text rechts) – drei gestapelte
 * Hochkant-Karten hätten den Abschnitt fast einen Bildschirm lang gemacht und
 * die gerade gewonnene Kürze wieder aufgebraucht. Ab `sm` als Karte im Raster.
 */
function Step({
  index,
  icon: Icon,
  title,
  desc,
  children,
}: {
  index: number
  icon: LucideIcon
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <li className="glass flex items-center gap-3.5 rounded-2xl p-3.5 sm:flex-col sm:items-stretch sm:gap-0 sm:rounded-3xl sm:p-4">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2/40 p-2 sm:h-32 sm:w-full sm:p-3">
        {children}
      </div>
      <div className="min-w-0 sm:mt-3.5">
        <h3 className="flex items-center gap-2 font-semibold leading-snug text-foreground">
          {/* Die Ziffer trägt die Aussage „geführt" – daher sichtbar, nicht nur als Reihenfolge. */}
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold tabular-nums text-primary">
            {index}
          </span>
          <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted">{desc}</p>
      </div>
    </li>
  )
}

/**
 * Das echte Erklär-Video des Duschkopf-Tests (`public/measurements/showerhead.*`,
 * je ~450 KB) – dasselbe, das in der Messung selbst läuft. Es liegt in zwei
 * Formaten vor: MP4/H.264 zuerst, WebM/VP9 für Browser ohne das
 * lizenzpflichtige H.264.
 *
 * Geladen wird es erst, wenn der Abschnitt in Sichtweite kommt: Auf der
 * Startseite darf ein Video, das die meisten Besucher nie sehen, nicht das
 * Mobilfunk-Volumen belasten. `prefers-reduced-motion` unterdrückt den Autostart;
 * dann bleibt das erste Bild als Standbild stehen.
 *
 * Darunter liegt als Rückfallebene die echte 1-2-3-Anleitung des Duschkopf-Tests
 * (dieselben Strings wie im Runner). Sichtbar wird das Video erst, wenn es
 * wirklich abspielbar ist – solange es lädt, fehlt oder der Browser den Codec
 * nicht kann, steht dort die Anleitung statt einer leeren Fläche. Die Aussage
 * des Schritts („Anleitung") trägt damit auch ohne Video.
 */
function StepVideo({ label, steps }: { label: string; steps: string[] }) {
  const holderRef = useRef<HTMLDivElement>(null)
  // Ohne IntersectionObserver (sehr alte Browser) direkt laden statt nie.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')
  const [playable, setPlayable] = useState(false)
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const el = holderRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={holderRef} className="flex h-full w-full items-center justify-center gap-2.5">
      {/* Das Video ist hochkant (768×972) und füllt daher nur einen schmalen
          Streifen der Kachel – die Anleitung daneben nutzt den Rest. Beide
          Zustände tragen für sich: fehlt das Video (Codec, langsame Leitung,
          noch nicht geladen), rückt die Anleitung einfach in die Mitte. */}
      {visible && (
        <video
          className={`hero-video h-full w-auto shrink-0 ${playable ? 'block' : 'hidden'}`}
          style={{ aspectRatio: '768 / 972' }}
          poster={`${import.meta.env.BASE_URL}measurements/showerhead-poster.webp`}
          muted
          loop
          playsInline
          autoPlay={!reduceMotion}
          preload="metadata"
          aria-label={label}
          onCanPlay={() => setPlayable(true)}
        >
          {/* MP4/H.264 zuerst, WebM/VP9 als lizenzfreier Rueckfall fuer
              Browser ohne H.264. */}
          <source
            src={`${import.meta.env.BASE_URL}measurements/showerhead.mp4`}
            type='video/mp4; codecs="avc1.64001F"'
          />
          <source
            src={`${import.meta.env.BASE_URL}measurements/showerhead.webm`}
            type='video/webm; codecs="vp9"'
          />
        </video>
      )}

      {/* In der schmalen Handy-Zeile ist für die Schritt-Texte kein Platz – dort
          steht ersatzweise das Play-Zeichen für „hier läuft ein Erklär-Video". */}
      {!playable && <PlayCircle className="h-8 w-8 text-muted sm:hidden" aria-hidden="true" />}

      <ol className="hidden min-w-0 space-y-1.5 sm:block">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2 text-[10px] leading-tight text-muted">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold tabular-nums text-primary">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * Mini-Abbild der Mess-Phase: mitlaufende Stoppuhr und Start/Stopp-Knopf.
 * Bewusst statisch – die Aussage ist „die App stoppt für dich", nicht die Zahl.
 */
function StopwatchMock({ label }: { label: string }) {
  return (
    <div className="w-full text-center">
      {/* Das Label braucht Breite – in der schmalen Handy-Zeile trägt die Uhrzeit
          allein die Aussage, ab `sm` kommt die Beschriftung dazu. */}
      <p className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted sm:block">
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums text-foreground sm:mt-1 sm:text-3xl">00:12</p>
      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground sm:mt-2.5 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" aria-hidden="true" />
        Stopp
      </span>
    </div>
  )
}

/** Mini-Abbild der Ergebnis-Phase: Einordnung (Rating) + Sparbetrag. */
function ResultMock({ rating, saving }: { rating: string; saving: string }) {
  return (
    <div className="w-full text-center">
      <p className="whitespace-nowrap text-xl font-bold tabular-nums text-foreground sm:text-3xl">
        12 <span className="text-xs font-semibold text-muted sm:text-base">L/min</span>
      </p>
      <span className="mt-1 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 sm:mt-1.5 sm:px-2.5 sm:text-[11px]">
        {rating}
      </span>
      {/* Der Sparbetrag ist die Pointe – in der Handy-Zeile ohne Icon und
          gekürzt, damit er nicht umbricht. */}
      <p className="mt-1 flex items-center justify-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-emerald-600 dark:text-emerald-400 sm:mt-2.5 sm:text-sm">
        <TrendingDown className="hidden h-4 w-4 sm:block" />
        {saving}
      </p>
    </div>
  )
}
