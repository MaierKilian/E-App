import { useTranslation } from 'react-i18next'

/**
 * Lesbarer Text „heute / vor N Tagen abgelesen" (oder null ohne Ablesung).
 *
 * Bewusst in einer eigenen Datei neben `MeterTrend.tsx`: Eine Datei, die neben
 * Komponenten auch Hilfsfunktionen exportiert, bricht das schnelle Neuladen im
 * Entwicklungsmodus (react-refresh).
 */
export function useLastReadingText(days: number | undefined): string | null {
  const { t } = useTranslation()
  if (days === undefined) return null
  if (days === 0) return t('monitoring.overview.readToday')
  return t('monitoring.overview.readDaysAgo', { count: days })
}
