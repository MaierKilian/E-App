import { useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * Welche Leiste `--bottom-bar-h` gerade gesetzt hat.
 *
 * Im Normalfall gibt es je Seite höchstens eine Aktionsleiste. Beim
 * Seitenwechsel kann die neue aber vor der alten montiert werden – ohne diese
 * Notiz räumte das Aufräumen der alten Leiste den Wert der neuen weg und die
 * schwebenden Elemente fielen zurück auf die Navigationsleiste.
 */
let owner: HTMLElement | null = null

/**
 * Feste Aktionsleiste am unteren Bildschirmrand (Glass-Stil).
 *
 * Sitzt auf der mobilen Navigationsleiste auf (`--bottom-nav-total`) und meldet
 * ihre eigene Höhe an `--bottom-bar-h`. Nur dadurch weicht der Cookie-Hinweis
 * nach oben aus, statt die Leiste zu verdecken – er rechnet seinen Abstand über
 * `--floating-bottom` daraus (siehe index.css).
 *
 * Die Höhe wird gemessen und nicht angenommen, weil sie sich im Betrieb ändert:
 * Die Berichte-Leiste blendet über dem Knopf Status- und Fehlerzeilen ein.
 */
export function BottomBar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--bottom-bar-h', `${el.offsetHeight}px`)

    owner = el
    update()
    // In jsdom gibt es keinen ResizeObserver – dort genügt die einmalige Messung.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)

    return () => {
      observer?.disconnect()
      if (owner === el) {
        owner = null
        root.style.removeProperty('--bottom-bar-h')
      }
    }
  }, [])

  return (
    <div
      ref={ref}
      className="glass-bar fixed inset-x-0 bottom-[var(--bottom-nav-total)] z-30 border-t border-border/60 md:pb-[env(safe-area-inset-bottom)]"
    >
      {children}
    </div>
  )
}
