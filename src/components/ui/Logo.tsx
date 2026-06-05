interface LogoProps {
  className?: string
}

/**
 * E-App-Markenzeichen: drei versetzte, gerundete Balken.
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
      <rect x="18" y="15" width="32" height="12" rx="6" transform="rotate(-15 34 21)" />
      <rect x="8" y="27" width="32" height="12" rx="6" transform="rotate(-15 24 33)" />
      <rect x="25" y="29" width="32" height="12" rx="6" transform="rotate(-15 41 35)" />
    </svg>
  )
}
