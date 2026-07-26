import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SettingsRowProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  /** Zielroute – rendert die Zeile als Navigations-Link (mit Chevron). */
  to?: string
  /** Klick-Handler – rendert die Zeile als Button. */
  onClick?: () => void
  /**
   * Rechter Inhalt. Ohne Angabe zeigen interaktive Zeilen ein Chevron; mit
   * `right={null}` lässt sich das gezielt unterdrücken (z. B. „Abmelden").
   */
  right?: ReactNode
  /** Rot eingefärbtes Icon für destruktive Aktionen (z. B. Zurücksetzen). */
  danger?: boolean
}

/**
 * Einzelne Zeile innerhalb einer `SettingsSection`: Icon · Titel (+ optionaler
 * Untertitel) · rechter Inhalt. Je nach Prop wird sie als `Link`, `button` oder
 * statischer Info-Eintrag gerendert. Trennlinien entstehen automatisch, wenn
 * mehrere Zeilen in derselben Karte stehen.
 */
export function SettingsRow({ icon: Icon, title, subtitle, to, onClick, right, danger }: SettingsRowProps) {
  const interactive = Boolean(to || onClick)
  const base = 'flex w-full items-center gap-3 border-t border-border px-3 py-3 text-left first:border-t-0'

  const inner = (
    <>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
          danger ? 'bg-rose-500/10 text-rose-600' : 'bg-primary/10 text-primary'
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[11px] text-muted">{subtitle}</span>}
      </span>
      {right !== undefined ? right : interactive ? <ChevronRight className="h-4 w-4 shrink-0 text-muted" /> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={`${base} transition-colors hover:bg-surface-2`}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} transition-colors hover:bg-surface-2`}>
        {inner}
      </button>
    )
  }
  return <div className={base}>{inner}</div>
}
