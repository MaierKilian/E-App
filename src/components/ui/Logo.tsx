interface LogoProps {
  className?: string
}

const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`

/**
 * E-App-Markenzeichen: das echte Logo (drei versetzte, schräge Balken im
 * Treppen-Muster) wird als Masken-Bild eingebunden und mit `currentColor`
 * eingefärbt. Dadurch ist die Darstellung pixelgenau zum Original und passt
 * sich automatisch ans Theme an (schwarz im Light-, weiß im Dark-, grün im
 * HTW-Mode über text-Utilities).
 */
export function Logo({ className }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="E-App"
      className={className}
      style={{
        display: 'inline-block',
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${LOGO_URL})`,
        maskImage: `url(${LOGO_URL})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  )
}
