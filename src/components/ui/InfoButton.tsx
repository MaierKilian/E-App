import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'

interface InfoButtonProps {
  text: string
  title?: string
}

interface PopoverPos {
  top: number
  left: number
  width: number
}

const MARGIN = 16 // Mindestabstand zum Viewport-Rand (entspricht 1rem)

/**
 * Kleiner Info-Button mit Popover.
 * Öffnet bei Klick einen kurzen Erklärtext und schließt bei Klick außerhalb
 * oder mit Escape. Das Popover wird per Portal als fixed-Element gerendert und
 * am Viewport geklemmt, damit es nie über den Bildschirmrand hinausläuft
 * (kein horizontaler Überlauf / kein Auszoomen in mobilem Safari).
 */
export function InfoButton({ text, title }: InfoButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PopoverPos | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  function updatePosition() {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const width = Math.min(256, vw - MARGIN * 2) // max-width: min(16rem, 100vw - 2rem)
    // rechtsbündig am Button ausrichten, dann am Viewport klemmen
    let left = rect.right - width
    left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN))
    const top = rect.bottom + 8
    setPos({ top, left, width })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open])

  useEffect(() => {
    if (!open) return

    function handlePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function handleReflow() {
      updatePosition()
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handleReflow)
    window.addEventListener('scroll', handleReflow, true)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleReflow)
      window.removeEventListener('scroll', handleReflow, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t('common.info')}
        aria-expanded={open}
        className="grid place-items-center w-5 h-5 rounded-full text-muted hover:text-foreground transition-colors"
      >
        <Info className="w-4 h-4" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            className="glass fixed z-50 rounded-2xl p-3 text-sm text-foreground animate-step-in"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {title && <p className="font-semibold mb-1">{title}</p>}
            <p className="text-muted">{text}</p>
          </div>,
          document.body,
        )}
    </>
  )
}
