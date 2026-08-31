import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Trefferzahl – wird nur angezeigt, solange gesucht wird. */
  resultCount?: number
}

/**
 * Suchfeld der Nachschlage-Ansichten.
 *
 * Vorher stand dieselbe Konstruktion zweimal im Code (FAQ und Glossar), in den
 * Mess-Hintergründen fehlte sie ganz. Neu sind drei Kleinigkeiten, die zusammen
 * den Unterschied machen: Es bleibt beim Scrollen oben stehen, es nennt die
 * Trefferzahl, und es lässt sich mit einem Griff leeren.
 *
 * `top-14` ist die Höhe der App-Kopfzeile (`Header`, `h-14`); `glass-bar` ist
 * dieselbe Fläche, die auch die Kopfzeile trägt – so wirkt das Feld beim
 * Scrollen wie deren Fortsetzung und nicht wie ein zweiter, fremder Balken.
 */
export function SearchField({ value, onChange, placeholder, resultCount }: SearchFieldProps) {
  const { t } = useTranslation()
  const searching = value.trim().length > 0

  return (
    <div className="glass-bar sticky top-14 z-10 -mx-4 px-4 py-2.5">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-2/70 px-4 py-2.5">
        <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {searching && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t('education.search.clear')}
            className="focus-ring -mr-1 shrink-0 rounded-full p-1 text-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {searching && resultCount !== undefined && (
        <p aria-live="polite" className="mt-1.5 px-1 text-xs text-muted">
          {t('education.search.results', { count: resultCount })}
        </p>
      )}
    </div>
  )
}
