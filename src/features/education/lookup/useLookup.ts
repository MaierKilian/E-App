import { useState } from 'react'
import { topicsOf, type Topic } from './topics'
import { matchesQuery } from './search'

/**
 * Gemeinsamer Zustand der drei Nachschlage-Ansichten: Suchanfrage, Themenfilter
 * und die daraus gefilterte Liste.
 *
 * Bewusst **ohne** `useMemo`: Die längste Liste hat heute 31 Einträge, das
 * Filtern kostet Mikrosekunden. Ein Memo darüber wäre nicht schneller, aber
 * eine Abhängigkeitsliste, die jemand pflegen muss.
 */
export function useLookup<T extends { topic?: Topic }>(
  items: T[],
  searchable: (item: T) => (string | undefined)[],
) {
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState<Topic | null>(null)

  const topics = topicsOf(items)
  const filtered = items.filter(
    (item) =>
      (topic === null || item.topic === topic) && matchesQuery(query, ...searchable(item)),
  )

  return {
    query,
    setQuery,
    topic,
    setTopic,
    topics,
    filtered,
    /** True, sobald die Liste eingeschränkt ist – durch Suche oder Filter. */
    narrowed: query.trim().length > 0 || topic !== null,
    /** Setzt Suche und Filter zurück (Leerzustand-Knopf). */
    reset: () => {
      setQuery('')
      setTopic(null)
    },
  }
}
