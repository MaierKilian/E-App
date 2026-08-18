import type { TFunction } from 'i18next'

/**
 * Intervall lesbar machen: Minuten unterhalb einer Stunde, dann Stunden, Tage,
 * Monate, Jahre.
 *
 * Diese Angabe steht auf den Bewertungsknöpfen und in der Tempo-Auswahl. Sie ist
 * der wichtigste Satz Text im ganzen Trainer: Sie macht aus dem abstrakten
 * Algorithmus eine nachprüfbare Aussage („Gewusst → in 5 Tagen").
 */
export function formatInterval(days: number, t: TFunction): string {
  if (days < 1 / 24)
    return t('education.flashcards.inMinutes', { count: Math.max(1, Math.round(days * 1440)) })
  if (days < 1) return t('education.flashcards.inHours', { count: Math.max(1, Math.round(days * 24)) })
  if (days < 30) return t('education.flashcards.inDays', { count: Math.round(days) })
  if (days < 365) return t('education.flashcards.inMonths', { count: Math.round(days / 30) })
  return t('education.flashcards.inYears', { count: Math.round((days / 365) * 10) / 10 })
}
