import type { ReactNode } from 'react'
import { InfoButton } from './InfoButton'

interface FieldProps {
  title: string
  /** Optionaler Info-Button-Text (Detail auf Tippen). */
  info?: string
  /** Kurze, immer sichtbare Kontextzeile ("warum frage ich das?"). */
  hint?: string
  children: ReactNode
}

/**
 * Einheitlicher Feld-Kopf für Fragebogen-Abschnitte: Titel, optionaler
 * Info-Button und eine kurze Kontextzeile darunter – damit jede Frage
 * selbsterklärend ist (keine "toten Enden").
 */
export function Field({ title, info, hint, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {info && <InfoButton text={info} />}
      </div>
      {hint && <p className="-mt-1 text-xs leading-snug text-muted">{hint}</p>}
      {children}
    </div>
  )
}
