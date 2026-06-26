import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MediaLightbox } from './MediaLightbox'

/**
 * Hero-Motiv für die Intro-Phase bei einem einzelnen, farbigen Bild (z. B. ein
 * Cartoon mit hellem Hintergrund), bei dem sich der Hintergrund nicht per
 * Blend-Mode entfernen lässt.
 *
 * Die Kanten werden weich ausgeblendet, sodass das Bild rahmenlos in den
 * App-Hintergrund übergeht; im Dark-Mode wird es dezent abgedunkelt, damit es
 * nicht grell wirkt. Dezente Ken-Burns-Animation; `prefers-reduced-motion`
 * wird respektiert. Tippen öffnet das Motiv groß in einer Lightbox.
 */
interface IntroHeroPhotoProps {
  /** Bildquelle relativ zur BASE_URL, z. B. "measurements/freezer.webp". */
  src: string
  /** Beschreibung für Screenreader. Fehlt sie, gilt das Bild als dekorativ. */
  label?: string
  /** Seitenverhältnis "B / H" des Motivs. */
  ratio?: string
  /** Tailwind-Breitenbegrenzung (zentriert). */
  widthClassName?: string
}

export function IntroHeroPhoto({
  src,
  label,
  ratio = '941 / 1672',
  widthClassName = 'max-w-[208px]',
}: IntroHeroPhotoProps) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(false)
  const url = `${import.meta.env.BASE_URL}${src}`

  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={label ?? t('common.enlarge')}
        className={`focus-ring relative mx-auto block w-full cursor-zoom-in overflow-hidden rounded-3xl ${widthClassName}`}
      >
        <img
          src={url}
          alt=""
          aria-hidden="true"
          className="hero-photo block w-full"
          style={{ aspectRatio: ratio }}
        />
      </button>

      <MediaLightbox open={zoom} onClose={() => setZoom(false)}>
        <img
          src={url}
          alt={label ?? ''}
          className="max-h-[88vh] w-auto max-w-full rounded-2xl"
        />
      </MediaLightbox>
    </>
  )
}
