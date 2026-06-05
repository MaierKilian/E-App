import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'

interface InfoButtonProps {
  text: string
  title?: string
}

/**
 * Kleiner Info-Button mit Popover.
 * Öffnet bei Klick einen kurzen Erklärtext und schließt bei Klick außerhalb.
 */
export function InfoButton({ text, title }: InfoButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t('common.info')}
        aria-expanded={open}
        className="grid place-items-center w-5 h-5 rounded-full text-muted hover:text-foreground transition-colors"
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute z-30 top-7 left-0 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg text-sm text-foreground">
          {title && <p className="font-semibold mb-1">{title}</p>}
          <p className="text-muted">{text}</p>
        </div>
      )}
    </div>
  )
}
