import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { EnergyType } from '@/store/readingsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { sortByDate, daysSinceLastReading } from '@/features/monitoring/readings'

/**
 * Hinweis auf eine überfällige Ablesung, mit direktem Weg zum Eintragen.
 *
 * Die Fälligkeit berechnete die App längst (`dueTypes`), nur der
 * Startbildschirm wusste nichts davon – der stärkste ungenutzte Haken: ohne ihn
 * ist der Startbildschirm eine Anzeige, mit ihm ein Werkzeug. Und jede Ablesung
 * macht alle anderen Zahlen der App besser.
 *
 * Bewusst als schmale Zeile, nicht als weitere Karte: er soll auffallen,
 * solange etwas zu tun ist, und nicht mit der Bühne um Aufmerksamkeit ringen.
 */
export function DueReadingBanner({ types }: { types: EnergyType[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const readingsByType = useReadingsStore((s) => s.readings)

  const type = types[0]
  const days = daysSinceLastReading(sortByDate(readingsByType[type] ?? []))
  const name = t(`monitoring.energyTypes.${type}`)

  return (
    <button
      type="button"
      onClick={() => navigate(`/monitoring/${type}`)}
      className="focus-ring flex w-full items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-left text-background transition-transform active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          {days === undefined
            ? t('home.stage.dueUnknown', { name })
            : t('home.stage.dueDays', { name, count: days })}
        </span>
        {types.length > 1 && (
          <span className="block text-xs opacity-70">
            {t('home.stage.dueMore', { count: types.length - 1 })}
          </span>
        )}
      </span>
      <span className="shrink-0 text-sm font-bold">{t('home.stage.dueCta')}</span>
    </button>
  )
}
