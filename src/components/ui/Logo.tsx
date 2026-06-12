interface LogoProps {
  className?: string
}

/**
 * E-App-Markenzeichen: drei dicke, schräg ansteigende Balken im versetzten
 * Treppen-Muster (oben, Mitte-links, unten-rechts), ca. 21° geneigt.
 * Nutzt `currentColor`, passt sich also automatisch an Theme/Text an
 * (schwarz im Light-, weiß im Dark-, grün im HTW-Mode über text-Utilities).
 */
export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="currentColor"
      role="img"
      aria-label="E-App"
    >
      <rect x="17" y="9.5" width="34" height="13" rx="6" transform="rotate(-21 34 16)" />
      <rect x="6" y="25.5" width="34" height="13" rx="6" transform="rotate(-21 23 32)" />
      <rect x="25" y="41.5" width="34" height="13" rx="6" transform="rotate(-21 42 48)" />
    </svg>
  )
}
