import { useRef, useState } from 'react'

/**
 * Immersives Hero-Video für die Intro-Phase einer Messung.
 *
 * Kein sichtbarer Rahmen: Die Kanten werden weich ausgeblendet (Masken-Fade),
 * sodass das Video nahtlos mit dem App-Hintergrund verschmilzt. Im Dark-Mode
 * wird die Animation in der Helligkeit invertiert (`invert` + `hue-rotate`),
 * damit der helle Hintergrund dunkel wird und die Strichzeichnung hell – die
 * Grün-Akzente bleiben dabei erhalten. So wirkt es in Light / Dark / HTW
 * gleichermaßen eingebettet.
 *
 * `prefers-reduced-motion` wird respektiert: Dann läuft das Video nicht
 * automatisch, sondern zeigt nur das erste Bild.
 */
interface IntroHeroVideoProps {
  /** Quelle relativ zur BASE_URL, z. B. "measurements/showerhead.mp4". */
  src: string
  /** Beschreibung für Screenreader. Fehlt sie, gilt das Video als dekorativ. */
  label?: string
}

export function IntroHeroVideo({ src, label }: IntroHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Einmalig beim Mounten auslesen (kein Effekt nötig → keine Folge-Renders).
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const url = `${import.meta.env.BASE_URL}${src}`

  return (
    <div className="relative mx-auto w-full max-w-[248px]">
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
        aria-label={label}
        aria-hidden={label ? undefined : true}
      />
    </div>
  )
}
