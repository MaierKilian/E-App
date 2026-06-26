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
 * Tippen öffnet das Motiv groß in einer Lightbox.
 */
interface IntroHeroImageProps {
  /** Helle Variante (heller Hintergrund) – Light/HTW. Relativ zur BASE_URL. */
  srcLight: string
  /** Dunkle Variante (dunkler Hintergrund) – Dark. Relativ zur BASE_URL. */
  srcDark: string
  /** Beschreibung für Screenreader. Fehlt sie, gilt das Bild als dekorativ. */
  label?: string
  /** Seitenverhältnis "B / H" des Motivs. Default 3:4-artig. */
  ratio?: string
  /** Tailwind-Breitenbegrenzung (zentriert). Hohe Motive schmaler halten. */
  widthClassName?: string
  /**
   * `lineart` (Default): Schwarz/Weiß-Strichzeichnung – Hintergrund wird per
   * Blend (darken/lighten) entfernt. `photo`: farbiges Motiv mit echter Hell-
   * und Dunkel-Version – kein Blend, nur Theme-Swap + weiche Kanten.
   */
  variant?: 'lineart' | 'photo'
}

export function IntroHeroImage({
  srcLight,
  srcDark,
  label,
  ratio = '1086 / 1449',
  widthClassName = 'max-w-[248px]',
  variant = 'lineart',
}: IntroHeroImageProps) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(false)
  const base = import.meta.env.BASE_URL
  const urlLight = `${base}${srcLight}`
  const urlDark = `${base}${srcDark}`
  const cls = variant === 'photo' ? 'hero-photopair' : 'hero-illustration'

  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={label ?? t('common.enlarge')}
        className={`focus-ring relative mx-auto block w-full cursor-zoom-in overflow-hidden rounded-3xl ${widthClassName}`}
      >
        <img
          src={urlLight}
          alt=""
          aria-hidden="true"
          className={`${cls} ${cls}-light block w-full`}
          style={{ aspectRatio: ratio }}
        />
        <img
          src={urlDark}
          alt=""
          aria-hidden="true"
          className={`${cls} ${cls}-dark block w-full`}
          style={{ aspectRatio: ratio }}
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
