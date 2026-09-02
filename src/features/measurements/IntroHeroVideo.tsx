import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MediaLightbox } from './MediaLightbox'

/** Seitenverhältnis der Hero-Animationen (Breite / Höhe). */
const HERO_RATIO = '768 / 972'

/**
 * Immersives Hero-Video für die Intro-Phase einer Messung.
 *
 * Kein sichtbarer Rahmen: Die Kanten werden weich ausgeblendet (Masken-Fade),
 * sodass das Video nahtlos mit dem App-Hintergrund verschmilzt. Im Dark-Mode
 * wird die Animation in der Helligkeit invertiert (`invert` + `hue-rotate`),
 * damit der helle Hintergrund dunkel wird und die Strichzeichnung hell – die
 * Grün-Akzente bleiben dabei erhalten.
 *
 * Tippen öffnet das Medium groß in einer Lightbox.
 *
 * **An dieser Stelle steht nie ein leeres Loch.** Ein `<video>` ohne Standbild
 * zeigt schlicht nichts, wenn es nicht spielt – und dafür gibt es mehr Gründe
 * als den Netzfehler: ein Browser ohne H.264 (H.264 ist lizenzpflichtig und
 * fehlt in manchen Chromium- und Firefox-Bauten), ein verweigerter Autostart
 * (Energiesparen, Datensparen) oder `prefers-reduced-motion`. Deshalb drei
 * ineinandergreifende Absicherungen:
 *
 * 1. **Zwei Formate.** MP4/H.264 zuerst (überall hardwarebeschleunigt), dann
 *    WebM/VP9 als lizenzfreier Rückfall. Der Browser wählt anhand von `type`,
 *    ohne die verworfene Datei zu laden.
 * 2. **Standbild.** `poster` füllt die Fläche, bevor das erste Videobild da
 *    ist. Spielt das Video nicht, bleibt das Standbild stehen – die Erklärung
 *    ist damit auch ohne Bewegung vollständig zu sehen.
 * 3. **Bild statt Video.** Scheitern beide Formate, tritt das Standbild als
 *    `<img>` an die Stelle des Videos. Ein `<video>` ohne abspielbare Quelle
 *    zeigt je nach Browser den Poster, ein Fehlersymbol oder nichts; ein Bild
 *    zeigt überall dasselbe.
 *
 * Der Autostart wird zusätzlich aktiv über `play()` angestoßen und die
 * abgelehnte Promise abgefangen: Das `autoplay`-Attribut scheitert lautlos,
 * der Rückfall aufs Standbild bliebe sonst unbemerkt.
 */
interface IntroHeroVideoProps {
  /** Quelle ohne Endung, relativ zur BASE_URL, z. B. "measurements/showerhead".
   *  Erwartet werden `<src>.mp4`, `<src>.webm` und `<src>-poster.webp`. */
  src: string
  /** Beschreibung für Screenreader. Fehlt sie, gilt das Medium als dekorativ. */
  label?: string
  /** Fixe Chrome-Höhe, die von 100dvh abgezogen wird. */
  reservePx?: number
  /** Maximale Hero-Höhe auf großen Displays. */
  maxHeightPx?: number
}

export function IntroHeroVideo({
  src,
  label,
  reservePx = 500,
  maxHeightPx = 340,
}: IntroHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(false)
  const [failed, setFailed] = useState(false)
  // Einmalig beim Mounten auslesen (kein Effekt nötig → keine Folge-Renders).
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const base = `${import.meta.env.BASE_URL}${src}`
  const poster = `${base}-poster.webp`
  // Höhe richtet sich nach der Displayhöhe; Breite folgt dem Verhältnis.
  const height = `clamp(140px, calc(100dvh - ${reservePx}px), ${maxHeightPx}px)`
  const mediaStyle = {
    aspectRatio: HERO_RATIO,
    height,
    width: 'auto',
    maxWidth: '86vw',
  } as const

  /**
   * Holt ein Bild in die stehende Wiedergabe. Ein `<video>`, das nicht spielt,
   * dekodiert von sich aus nicht zuverlässig ein Bild – auf iOS gar nicht; der
   * winzige Sprung nach vorn erzwingt es. Ohne ihn bliebe nach dem Laden der
   * schwarze Rahmen statt des Standbilds stehen.
   */
  const showFirstFrame = useCallback((video: HTMLVideoElement) => {
    if (video.currentTime === 0 && video.duration > 0) {
      video.currentTime = Math.min(0.05, video.duration / 2)
    }
  }, [])

  /**
   * Ausfall erkennen – aber erst den echten. React reicht auch die Fehler der
   * einzelnen `<source>` an den `onError` des `<video>` weiter (es lauscht in
   * der Capture-Phase an der Wurzel). Der erste Fehler bedeutet also nur „dieses
   * Format kann ich nicht", und genau dann soll das nächste an die Reihe kommen.
   * Erst wenn der Browser alle Quellen durch hat, steht `networkState` auf
   * `NETWORK_NO_SOURCE`; solange noch eine aussteht, lädt er weiter (`2`).
   * Ohne diese Unterscheidung würde der verworfene MP4-Versuch den WebM-Rückfall
   * mit abräumen – der Fehler bliebe genau dort, wo er behoben sein soll.
   */
  const handleError = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.error || video.networkState === video.NETWORK_NO_SOURCE) setFailed(true)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (reduceMotion) {
      showFirstFrame(video)
      return
    }
    // Autostart aktiv anstoßen und die Absage abfangen: Verweigert der Browser
    // ihn, zeigen wir das Standbild – besser ein ruhendes Bild als eine leere
    // Fläche.
    void video.play().catch(() => showFirstFrame(video))
  }, [reduceMotion, showFirstFrame])

  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={label ?? t('common.enlarge')}
        className="focus-ring mx-auto block w-fit max-w-full cursor-zoom-in"
      >
        {failed ? (
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            className="hero-video block"
            style={mediaStyle}
          />
        ) : (
          <video
            ref={videoRef}
            className="hero-video block"
            style={mediaStyle}
            poster={poster}
            muted
            loop
            playsInline
            autoPlay={!reduceMotion}
            preload="auto"
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleError}
            aria-hidden="true"
          >
            <source src={`${base}.mp4`} type='video/mp4; codecs="avc1.64001F"' />
            <source src={`${base}.webm`} type='video/webm; codecs="vp9"' />
          </video>
        )}
      </button>

      <MediaLightbox open={zoom} onClose={() => setZoom(false)}>
        {failed ? (
          <img
            src={poster}
            alt={label ?? ''}
            className="max-h-[88vh] w-auto max-w-full rounded-2xl"
          />
        ) : (
          <video
            className="max-h-[88vh] w-auto max-w-full rounded-2xl"
            poster={poster}
            muted
            loop
            playsInline
            autoPlay
            controls
            aria-label={label}
          >
            <source src={`${base}.mp4`} type='video/mp4; codecs="avc1.64001F"' />
            <source src={`${base}.webm`} type='video/webm; codecs="vp9"' />
          </video>
        )}
      </MediaLightbox>
    </>
  )
}
