import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  /** Seitentitel – wird als einziges `h1` der Seite gesetzt. */
  title: string
  /** Kurze Einordnung unter dem Titel. Bei den Haupt-Tabs immer gesetzt. */
  subtitle?: string
  /** Bedienelement rechts neben dem Titel (z. B. das Ansichts-Menü). */
  actions?: ReactNode
  /** Zurück-Zeile über dem Titel – nur für Unterseiten. */
  back?: { label: string; onClick: () => void }
}

/**
 * Einheitliche Kopfzeile aller Seiten.
 *
 * Vorher baute jede Seite ihren Titel selbst, wodurch vier Schriftgrößen
 * (`text-2xl` bis `text-base`), mal mit und mal ohne Untertitel, Icon oder
 * Sticky-Leiste nebeneinander existierten. Diese Komponente ist die eine
 * Stelle, an der Größe, Gewicht und Abstände festgelegt sind – neue Seiten
 * erben das Aussehen, statt es erneut zu erfinden.
 *
 * Bewusst **ohne** Icon-Slot: die untere Navigationsleiste zeigt das Symbol
 * des aktiven Tabs bereits an, ein zweites im Titel wäre eine Dopplung.
 *
 * Ausnahme im Bestand ist der Zuhause-Tab: dort führt die Wohnungs-Karte die
 * Seite an (Dashboard-Muster), er nutzt diese Kopfzeile daher nicht.
 */
export function PageHeader({ title, subtitle, actions, back }: PageHeaderProps) {
  const heading = (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-bold text-foreground">{title}</h1>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {/* Der Untertitel laeuft ueber die volle Breite – neben `actions`
          eingeklemmt wuerde er sonst schon bei kurzen Saetzen umbrechen. */}
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </>
  )

  // Ohne eigenen Aussenabstand: jede Seite liegt in einem space-y-Container,
  // dessen Rhythmus sonst doppelt zaehlen wuerde.
  return (
    <div>
      {back && (
        <button
          type="button"
          onClick={back.onClick}
          className="focus-ring -ml-1 mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {back.label}
        </button>
      )}
      {heading}
    </div>
  )
}
