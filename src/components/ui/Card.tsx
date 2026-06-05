import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Glass-Look mit Transluzenz, Blur und Innen-Highlight. Standard: an. */
  glass?: boolean
}

/** Wiederverwendbare Inhaltskarte mit einheitlichem Rand und Hintergrund. */
export function Card({ children, className = '', glass = true }: CardProps) {
  const base = glass
    ? 'glass rounded-3xl p-5'
    : 'rounded-3xl border border-border bg-surface p-5'
  return <div className={`${base} ${className}`}>{children}</div>
}
