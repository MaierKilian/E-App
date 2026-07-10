import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MediaLightbox } from './MediaLightbox'

/**
 * Immersive Hero-Illustration für die Intro-Phase einer Messung – das Pendant
 * zu {@link IntroHeroVideo} für statische Bilder.
 *
 * Es werden zwei Theme-Varianten geladen (helles bzw. dunkles Motiv); je nach
 * aktivem Theme wird die passende eingeblendet (CSS). Der jeweilige Eigen-
 * Hintergrund (weiß bzw. schwarz) wird per Blend-Mode entfernt, sodass die
 * Illustration nahtlos auf dem App-Hintergrund schwebt. Eine dezente
 * Ken-Burns-Animation lässt das Standbild „leben"; `prefers-reduced-motion`
 * wird respektiert (Animation aus).
 *
 * Die Größe passt sich der Displayhöhe an: Hero-Höhe = clamp(min, 100dvh −
 * Reserve, max). Auf großen Screens groß, auf kleinen automatisch kleiner –
 * immer ohne Scrollen. Die Breite folgt dem Seitenverhältnis (object-contain,
 * daher nie verzerrt). Tippen öffnet das Motiv groß in einer Lightbox.
 */
interface IntroHeroImageProps {
  /** Helle Variante (heller Hintergrund) – Light/HTW. Relativ zur BASE_URL. */
  srcLight: string
  /** Dunkle Variante (dunkler Hintergrund) – Dark. Relativ zur BASE_URL. */
  srcDark: string
  /** Beschreibung für Screenreader. Fehlt sie, gilt das Bild als dekorativ. */
  label?: string
  /** Seitenverhältnis "B / H" des Motivs. */
  ratio?: string
  /**
   * Beide Varianten entfernen ihren Eigen-Hintergrund per Blend (darken/lighten),
   * sodass das Motiv den Theme-Hintergrund annimmt und sich dessen Farbton
   * anpasst. `lineart` (Default): reine Schwarz/Weiß-Strichzeichnung. `photo`:
   * flache Illustration mit grünen Akzenten und eigener Hell-/Dunkel-Version.
   */
  variant?: 'lineart' | 'photo'
  /** Fixe Chrome-Höhe (Titel, Schritte, Button, Tab-Leiste …), die von 100dvh
   *  abgezogen wird. Größer = kleineres Hero (z. B. wenn zusätzlich ein
   *  Hinweisblock darunter steht). */
  reservePx?: number
  /** Maximale Hero-Breite auf großen Displays (begrenzt indirekt die Höhe). */
  maxWidthPx?: number
}

export function IntroHeroImage({
  srcLight,
  srcDark,
  label,
  ratio = '1086 / 1449',
  variant = 'lineart',
  reservePx = 500,
  maxWidthPx = 400,
}: IntroHeroImageProps) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(false)
  const base = import.meta.env.BASE_URL
  const urlLight = `${base}${srcLight}`
  const urlDark = `${base}${srcDark}`
  const cls = variant === 'photo' ? 'hero-photopair' : 'hero-illustration'
  // Höhe richtet sich nach der Displayhöhe (100dvh − Reserve), gedeckelt so,
  // dass die Breite maxWidthPx nicht übersteigt. Breite folgt dem Verhältnis.
  const [rw, rh] = ratio.split('/').map((n) => parseFloat(n))
  // Höhe durch Breiten-Deckel begrenzt, aber zusätzlich absolut gedeckelt, damit
  // nahezu quadratische Motive nicht zu hoch werden.
  const maxHeightPx = Math.min(Math.round(maxWidthPx / (rw / rh)), 330)
  const height = `clamp(140px, calc(100dvh - ${reservePx}px), ${maxHeightPx}px)`
  const imgStyle = {
    aspectRatio: ratio,
    height,
    width: 'auto',
    maxWidth: `min(${maxWidthPx}px, 86vw)`,
  } as const

  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={label ?? t('common.enlarge')}
        className={`focus-ring mx-auto block w-fit max-w-full cursor-zoom-in overflow-hidden rounded-3xl`}
      >
        <img
          src={urlLight}
          alt=""
          aria-hidden="true"
          className={`${cls} ${cls}-light block`}
          style={imgStyle}
        />
        <img
          src={urlDark}
          alt=""
          aria-hidden="true"
          className={`${cls} ${cls}-dark block`}
          style={imgStyle}
        />
      </button>

      <MediaLightbox open={zoom} onClose={() => setZoom(false)}>
        <img
          src={urlLight}
          alt={label ?? ''}
          className="lightbox-img-light max-h-[88vh] w-auto max-w-full rounded-2xl"
        />
        <img
          src={urlDark}
          alt={label ?? ''}
          className="lightbox-img-dark max-h-[88vh] w-auto max-w-full rounded-2xl"
        />
      </MediaLightbox>
    </>
  )
}
