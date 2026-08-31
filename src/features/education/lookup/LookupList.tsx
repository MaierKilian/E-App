import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Highlight } from './Highlight'

/**
 * Rahmen einer Nachschlage-Liste: **eine** Glass-Fläche mit Haarlinien
 * zwischen den Zeilen.
 *
 * Vorher trug jeder Eintrag eine eigene `Card` mit 12 px Abstand zur nächsten.
 * Bei zwölf Fragen waren das zwölf gleich schwere Blöcke ohne Hierarchie, und
 * pro Bildschirm passten sechs Einträge. Als zusammenhängende Liste sind es
 * rund zehn – und das Auge liest eine Liste statt zwölf Einzelkarten.
 */
export function LookupList({ children }: { children: ReactNode }) {
  return <div className="glass overflow-hidden rounded-3xl">{children}</div>
}

interface LookupRowProps {
  title: string
  /**
   * Vorschauzeile, solange die Zeile zugeklappt ist. Beim Aufklappen
   * ausgeblendet – der volle Text beginnt ohnehin mit demselben Satz.
   */
  teaser?: string
  /** Kleine Zusatzangabe rechts neben dem Titel (z. B. eine Einheit). */
  meta?: string
  /** Symbol links vor dem Titel. */
  leading?: ReactNode
  /** Aktuelle Suchanfrage – hebt die Fundstelle in Titel und Vorschau hervor. */
  query?: string
  /**
   * Fließtext, der **immer** sichtbar ist – zugeklappt auf zwei Zeilen
   * beschnitten, aufgeklappt vollständig.
   *
   * Der Unterschied zu {@link LookupRowProps.teaser}: Eine Vorschau ist eine
   * Ankündigung des Inhalts, dieser Text **ist** der Inhalt. Das Glossar
   * braucht das – ein Nachschlagewerk, in dem man jede Definition erst
   * aufklappen muss, schlägt man nicht nach, sondern arbeitet man durch.
   */
  body?: string
  /** Anker für Verweise auf genau diese Zeile (`<a href="#…">`). */
  anchorId?: string
  /** Zeile beim ersten Rendern schon aufgeklappt – für Sprünge auf den Anker. */
  defaultOpen?: boolean
  /**
   * Von außen gesteuerter Zustand. Gesetzt, wenn die Liste selbst entscheidet,
   * welche Zeile offen ist (das Glossar lässt nur eine gleichzeitig zu).
   * Ohne diese beiden Angaben verwaltet die Zeile ihren Zustand selbst.
   */
  open?: boolean
  onToggle?: () => void
  children: ReactNode
}

/**
 * Eine auf-/zuklappbare Zeile innerhalb einer {@link LookupList}.
 *
 * Die Vorschauzeile ist der eigentliche Gewinn: Vorher musste jeder Eintrag
 * angetippt werden, um zu beurteilen, ob er die Frage beantwortet.
 */
export function LookupRow({
  title,
  teaser,
  meta,
  leading,
  query = '',
  body,
  anchorId,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  children,
}: LookupRowProps) {
  const { t } = useTranslation()
  const [selfOpen, setSelfOpen] = useState(defaultOpen)
  const open = controlledOpen ?? selfOpen
  const toggle = onToggle ?? (() => setSelfOpen((v) => !v))
  const panelId = useId()

  return (
    // `scroll-mt-28` haelt die Zeile beim Sprung auf den Anker unter der
    // klebenden Kopfzeile samt Suchfeld, statt hinter ihr zu verschwinden.
    <div id={anchorId} className="scroll-mt-28 border-t border-border/60 first:border-t-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="focus-ring flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        {leading && <span className="mt-0.5 shrink-0">{leading}</span>}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 text-sm font-semibold text-foreground">
              <Highlight text={title} query={query} />
            </span>
            {meta && (
              <span className="shrink-0 font-mono text-[11px] text-muted">{meta}</span>
            )}
          </span>
          {teaser && !open && (
            // Zwei Zeilen, nicht eine: Eine einzelne Zeile bricht bei dieser
            // Breite nach rund fuenf Woertern ab („Die App hilft dir, mit
            // einfachen, gefuehrten Mes…") und sagt damit weniger, als sie
            // Platz kostet. Zwei Zeilen tragen einen ganzen Gedanken.
            <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">
              <Highlight text={teaser} query={query} />
            </span>
          )}
          {body && (
            <span
              // `block` und `line-clamp-2` setzen beide `display` – zusammen
              // gewinnt `block`, und der Text wird nie beschnitten. Deshalb
              // schliessen sich die beiden hier gegenseitig aus.
              className={`mt-1 text-xs leading-relaxed text-muted ${
                open ? 'block' : 'line-clamp-2'
              }`}
            >
              <Highlight text={body} query={query} />
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
        <span className="sr-only">{open ? t('education.collapse') : t('education.expand')}</span>
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4 text-sm leading-relaxed text-foreground">
          {children}
        </div>
      )}
    </div>
  )
}
