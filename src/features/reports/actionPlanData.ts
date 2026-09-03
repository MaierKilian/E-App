import type { TFunction } from 'i18next'
import { isQuickWin, sortingGoals, type Tip } from '@/features/tips/buildTips'
import { displaySavingEur, savingRange } from '@/features/measurements/savingsDisplay'
import type { UserGoal } from '@/types'

/**
 * Der Handlungsplan: was der Bericht zu tun empfiehlt, in der Reihenfolge der
 * App.
 *
 * Der Bericht sagte bislang, wie es steht, aber nicht, was zu tun ist. Die
 * Tipps-Seite konnte beides längst – nach Aufwand gruppiert, nach den genannten
 * Interessen sortiert. Im PDF kam davon nichts an.
 *
 * **Es wird nichts nachgebaut.** Die Reihenfolge liefert `buildTips`, die
 * Gruppengrenze `isQuickWin`, die Anzeigeschwelle `displaySavingEur` – dieselben
 * Funktionen wie auf dem Bildschirm. Ein Bericht, der anders ordnet als die
 * App, wäre ein zweites Urteil über dieselbe Lage.
 */

export interface ActionPlanGroup {
  /** i18n-Schlüssel der Gruppenüberschrift. */
  titleKey: string
  tips: Tip[]
  /**
   * Summe der anzeigbaren Ersparnisse dieser Gruppe, als Spanne.
   *
   * `undefined`, wenn kein einziger Tipp der Gruppe einen Betrag trägt, den
   * seine Messung noch behauptet – dann steht dort keine Zahl statt einer Null.
   */
  savingRange?: { low: number; high: number }
}

export interface ActionPlanData {
  groups: ActionPlanGroup[]
  /** Ziele, die die Reihenfolge tatsächlich verändert haben. Für den Kapitelkopf. */
  goals: UserGoal[]
  /** Keine offenen Empfehlungen – das Kapitel würdigt das, statt leer zu bleiben. */
  empty: boolean
}

/**
 * Summe der Einzel-Spannen: Die Teile ergeben das Ganze.
 *
 * Beträge unter der Anzeigeschwelle fallen heraus, wie überall sonst auch –
 * vier belanglose Tipps ergäben sonst ein „Sparpotenzial", das die Rechnung
 * nie hergab.
 */
function sumRange(tips: Tip[]): { low: number; high: number } | undefined {
  const shown = tips
    .map((tip) => displaySavingEur(tip.savingEur))
    .filter((eur): eur is number => eur !== undefined)
  if (shown.length === 0) return undefined
  return shown.reduce(
    (acc, eur) => {
      const r = savingRange(eur)
      return { low: acc.low + r.low, high: acc.high + r.high }
    },
    { low: 0, high: 0 },
  )
}

/**
 * @param tips Die **offenen** Empfehlungen in der Reihenfolge von `buildTips` –
 *   also ohne erledigte und ausgeblendete. Sie werden hier nicht umsortiert.
 */
export function buildActionPlanData(
  tips: Tip[],
  goals: readonly UserGoal[] | undefined,
): ActionPlanData {
  const quick = tips.filter(isQuickWin)
  const prepared = tips.filter((tip) => !isQuickWin(tip))

  const groups: ActionPlanGroup[] = []
  if (quick.length > 0) {
    groups.push({ titleKey: 'tips.groupQuick', tips: quick, savingRange: sumRange(quick) })
  }
  if (prepared.length > 0) {
    groups.push({
      titleKey: 'tips.groupPrepared',
      tips: prepared,
      savingRange: sumRange(prepared),
    })
  }

  return { groups, goals: sortingGoals(goals), empty: tips.length === 0 }
}

/**
 * „Sortiert nach deinem Ziel: Kosten sparen".
 *
 * Derselbe Satz wie auf der Tipps-Seite (`tips.sortedByGoal`) – ohne ihn wirkt
 * die Reihenfolge im PDF willkürlich. Nur Ziele, die die Reihenfolge wirklich
 * verändert haben: „Sortiert nach Kosten sparen" wäre eine Behauptung ohne
 * Deckung, für dieses Ziel ist die €-Sortierung ohnehin die Voreinstellung.
 */
export function goalLine(data: ActionPlanData, t: TFunction): string | undefined {
  if (data.goals.length === 0) return undefined
  const names = data.goals.map((g) => t(`onboarding.step1.goalOptions.${g}`))
  return t('tips.sortedByGoal', { goals: names.join(', ') })
}
