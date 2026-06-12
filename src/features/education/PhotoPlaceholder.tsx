interface ExperimentPhotosProps {
  /** Echte Versuchsfotos (URLs). Solange keine vorhanden sind, wird nichts angezeigt. */
  photos?: string[]
  /** Beschriftung für die Galerie (z. B. Versuchstitel). */
  alt?: string
}

/**
 * Galerie der Versuchsfotos. Bewusst zurückhaltend: Sind noch keine echten
 * Fotos hinterlegt, rendert die Komponente nichts (statt leerer „Foto folgt"-
 * Platzhalter, die unfertig wirken).
 */
export function PhotoPlaceholder({ photos, alt }: ExperimentPhotosProps) {
  if (!photos || photos.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={alt ? `${alt} – Foto ${index + 1}` : `Foto ${index + 1}`}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
      ))}
    </div>
  )
}
