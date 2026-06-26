import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MediaLightbox } from './MediaLightbox'

/**
 * Immersives Hero-Video für die Intro-Phase einer Messung.
 *
 * Kein sichtbarer Rahmen: Die Kanten werden weich ausgeblendet (Masken-Fade),
 * sodass das Video nahtlos mit dem App-Hintergrund verschmilzt. Im Dark-Mode
 * wird die Animation in der Helligkeit invertiert (`invert` + `hue-rotate`),
 * damit der helle Hintergrund dunkel wird und die Strichzeichnung hell – die
 * Grün-Akzente bleiben dabei erhalten.
 *
 * Tippen öffnet das Video groß in einer Lightbox. `prefers-reduced-motion`
 * wird respektiert: Dann läuft das Video nicht automatisch.
 */
interface IntroHeroVideoProps {
  /** Quelle relativ zur BASE_URL, z. B. "measurements/showerhead.mp4". */
  src: string
  /** Beschreibung für Screenreader. Fehlt sie, gilt das Video als dekorativ. */
  label?: string
  /** Tailwind-Breitenbegrenzung (zentriert) – steuert indirekt die Höhe. */
  widthClassName?: string
}

export function IntroHeroVideo({ src, label, widthClassName = 'max-w-[184px]' }: IntroHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(false)
  // Einmalig beim Mounten auslesen (kein Effekt nötig → keine Folge-Renders).
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const url = `${import.meta.env.BASE_URL}${src}`

  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={label ?? t('common.enlarge')}
        className={`focus-ring relative mx-auto block w-full cursor-zoom-in ${widthClassName}`}
      >
        <video
          ref={videoRef}
          className="hero-video block w-full"
          style={{ aspectRatio: '768 / 972' }}
          src={url}
          muted
          loop
          playsInline
          autoPlay={!reduceMotion}
          preload="auto"
          aria-hidden="true"
        />
      </button>

      <MediaLightbox open={zoom} onClose={() => setZoom(false)}>
        <video
          className="max-h-[88vh] w-auto max-w-full rounded-2xl"
          src={url}
          muted
          loop
          playsInline
          autoPlay
          controls
          aria-label={label}
        />
      </MediaLightbox>
    </>
  )
}
