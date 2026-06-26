import { useEffect, useRef, useState } from 'react'

/**
 * Dezent gerahmtes Hero-Video für die Intro-Phase einer Messung.
 *
 * Das Video sitzt in einem theme-adaptiven Glas-Rahmen (passt sich automatisch
 * an Light / Dark / HTW an), hinterlegt mit einem weichen Eco-Grün-Glow im Stil
 * der App-Hintergrund-„Blobs". So wirkt jede Media-Quelle – unabhängig von ihrem
 * eigenen Hintergrund – in allen Themes wie ein bewusst platziertes Element.
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
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const url = `${import.meta.env.BASE_URL}${src}`

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      {/* Weicher, theme-adaptiver Eco-Glow hinter der Karte. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-5 -z-10 rounded-[2.5rem] blur-2xl"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 35%, color-mix(in srgb, var(--success) 32%, transparent), transparent 70%)',
        }}
      />
      {/* Glas-Rahmen: passt Rand/Tönung automatisch ans aktive Theme an. */}
      <div className="glass overflow-hidden rounded-3xl p-1.5">
        <video
          ref={videoRef}
          className="block w-full rounded-[1.35rem] object-cover"
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
    </div>
  )
}
