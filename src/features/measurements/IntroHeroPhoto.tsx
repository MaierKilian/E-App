/**
 * Hero-Motiv für die Intro-Phase bei einem einzelnen, farbigen Bild (z. B. ein
 * Cartoon mit hellem Hintergrund), bei dem sich der Hintergrund nicht per
 * Blend-Mode entfernen lässt.
 *
 * Die Kanten werden weich ausgeblendet, sodass das Bild rahmenlos in den
 * App-Hintergrund übergeht; im Dark-Mode wird es dezent abgedunkelt, damit es
 * nicht grell wirkt. Dezente Ken-Burns-Animation; `prefers-reduced-motion`
 * wird respektiert.
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
  const base = import.meta.env.BASE_URL

  return (
    <div className={`relative mx-auto w-full overflow-hidden rounded-3xl ${widthClassName}`}>
      <img
        src={`${base}${src}`}
        alt={label ?? ''}
        aria-hidden={label ? undefined : true}
        className="hero-photo block w-full"
        style={{ aspectRatio: ratio }}
      />
    </div>
  )
}
