import { ImageIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PhotoPlaceholderProps {
  /** Anzahl der anzuzeigenden Foto-Platzhalter. */
  count: number
}

/**
 * Reihe von Glass-Platzhaltern für noch fehlende Versuchsfotos.
 * Jede Box zeigt ein Bild-Icon und den Hinweis „Foto folgt".
 */
export function PhotoPlaceholder({ count }: PhotoPlaceholderProps) {
  const { t } = useTranslation()
  if (count <= 0) return null

  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="glass flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl text-muted"
        >
          <ImageIcon className="h-7 w-7" aria-hidden />
          <span className="text-xs font-medium">{t('education.photoComing')}</span>
        </div>
      ))}
    </div>
  )
}
