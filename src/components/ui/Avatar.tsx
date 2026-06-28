import { User } from 'lucide-react'

interface AvatarProps {
  /** Profilbild als Data-/Bild-URL. Fehlt es, werden Initialen bzw. ein Icon gezeigt. */
  src?: string
  /** Name für die Initialen-Variante und das Alt-Attribut. */
  name?: string
  /** Pixelgröße (Breite = Höhe). */
  size?: number
  className?: string
}

function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Runder Profil-Avatar mit gestufter Fallback-Logik: zeigt das hinterlegte Bild,
 * sonst die Namens-Initialen und als letzten Ausweg ein generisches Personen-Icon.
 */
export function Avatar({ src, name, size = 40, className = '' }: AvatarProps) {
  const style = { width: size, height: size }
  const ini = initials(name)

  if (src) {
    return (
      <img
        src={src}
        alt={name?.trim() || 'Profilbild'}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <span
      style={style}
      className={`grid shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary ${className}`}
    >
      {ini ? (
        <span style={{ fontSize: Math.round(size * 0.4) }}>{ini}</span>
      ) : (
        <User style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </span>
  )
}
