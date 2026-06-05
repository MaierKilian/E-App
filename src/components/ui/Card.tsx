import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

/** Wiederverwendbare Inhaltskarte mit einheitlichem Rand und Hintergrund. */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 ${className}`}>
      {children}
    </div>
  )
}
