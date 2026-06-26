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
 */
interface IntroHeroImageProps {
  /** Helle Variante (heller Hintergrund) – Light/HTW. Relativ zur BASE_URL. */
  srcLight: string
  /** Dunkle Variante (dunkler Hintergrund) – Dark. Relativ zur BASE_URL. */
  srcDark: string
  /** Beschreibung für Screenreader. Fehlt sie, gilt das Bild als dekorativ. */
  label?: string
}

const RATIO = '1086 / 1449'

export function IntroHeroImage({ srcLight, srcDark, label }: IntroHeroImageProps) {
  const base = import.meta.env.BASE_URL

  return (
    <div className="relative mx-auto w-full max-w-[248px] overflow-hidden rounded-3xl">
      <img
        src={`${base}${srcLight}`}
        alt={label ?? ''}
        aria-hidden={label ? undefined : true}
        className="hero-illustration hero-illustration-light block w-full"
        style={{ aspectRatio: RATIO }}
      />
      <img
        src={`${base}${srcDark}`}
        alt=""
        aria-hidden="true"
        className="hero-illustration hero-illustration-dark block w-full"
        style={{ aspectRatio: RATIO }}
      />
    </div>
  )
}
