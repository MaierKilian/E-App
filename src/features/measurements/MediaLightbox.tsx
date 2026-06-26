import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

interface MediaLightboxProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Vollbild-Lightbox für Hero-Medien: dunkler, geblurter Hintergrund, das Medium
 * groß zentriert. Schließt per X-Button, Klick auf den Hintergrund oder Escape.
 */
export function MediaLightbox({ open, onClose, children }: MediaLightboxProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Hintergrund-Scrollen während der Lightbox unterbinden.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-step-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="focus-ring absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="flex max-h-[88vh] max-w-[94vw] items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
