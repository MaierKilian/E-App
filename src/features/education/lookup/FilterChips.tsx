import { useTranslation } from 'react-i18next'
import type { Topic } from './topics'

interface FilterChipsProps {
  topics: Topic[]
  /** `null` = „Alle". */
  active: Topic | null
  onChange: (topic: Topic | null) => void
}

/**
 * Themen-Filter über einer Nachschlage-Liste.
 *
 * Bewusst leiser gezeichnet als der Bereichs-Umschalter darüber (FAQ · Glossar
 * · Messungen): Zwei gleich laute Chip-Reihen übereinander wären nicht
 * auseinanderzuhalten. Der Umschalter wechselt den Bereich, diese Leiste
 * filtert nur innerhalb davon – das soll man sehen.
 *
 * Ohne belegte Themen rendert die Leiste nichts (siehe `topicsOf`).
 */
export function FilterChips({ topics, active, onChange }: FilterChipsProps) {
  const { t } = useTranslation()
  if (topics.length === 0) return null

  const chip = (label: string, selected: boolean, onClick: () => void, key: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`focus-ring shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        selected
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border text-muted hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div
      role="group"
      aria-label={t('education.filter.label')}
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1"
    >
      {chip(t('education.filter.all'), active === null, () => onChange(null), 'all')}
      {topics.map((topic) =>
        chip(t(`education.topics.${topic}`), active === topic, () => onChange(topic), topic),
      )}
    </div>
  )
}
