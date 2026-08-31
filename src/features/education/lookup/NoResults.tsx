import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Leerzustand einer Suche.
 *
 * Vorher stand hier ein grauer Satz („Keine passende Frage gefunden."), der den
 * Suchenden mit seiner Sackgasse allein ließ. Jetzt nennt er den Suchbegriff –
 * damit ist ein Tippfehler sofort sichtbar – und bietet den Weg zurück an.
 */
export function NoResults({ query, onReset }: { query: string; onReset: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="px-6 py-10 text-center">
      <SearchX aria-hidden className="mx-auto h-6 w-6 text-muted" />
      <p className="mt-3 text-sm font-medium text-foreground">
        {t('education.search.noResults', { query: query.trim() })}
      </p>
      <p className="mt-1 text-xs text-muted">{t('education.search.noResultsHint')}</p>
      <button
        type="button"
        onClick={onReset}
        className="focus-ring mt-4 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2"
      >
        {t('education.search.reset')}
      </button>
    </div>
  )
}
