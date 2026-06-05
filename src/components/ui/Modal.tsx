import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Einfaches, zentriertes Modal mit Overlay.
 * Schließt bei Klick auf das Overlay, über den X-Button oder die Escape-Taste.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const { t } = useTranslation()
  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="glass-floating w-full max-w-md rounded-3xl p-5 animate-step-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid place-items-center w-7 h-7 rounded-lg text-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
