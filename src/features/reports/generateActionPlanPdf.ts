import type { TFunction } from 'i18next'
import type { PdfKit, ChecklistItem } from './pdf/pdfKit'
import { buildActionPlanData, goalLine } from './actionPlanData'
import { tipTitle } from '@/features/tips/tipsForReport'
import { displaySavingEur, savingRange } from '@/features/measurements/savingsDisplay'
import type { Tip } from '@/features/tips/buildTips'
import type { UserGoal } from '@/types'

/**
 * Der Handlungsplan des Energieberichts. Wird von {@link generateReportPdf} in
 * ein bestehendes Dokument geschrieben.
 *
 * Zwei Gruppen wie auf der Tipps-Seite, in der Reihenfolge von `buildTips`.
 * Als abhakbare Liste, nicht als Fließtext: Ein Plan, den man nicht abhaken
 * kann, ist eine Aufzählung.
 */

export interface GenerateActionPlanArgs {
  t: TFunction
  language: string
  /** Offene Empfehlungen in der Reihenfolge der App (erledigte sind schon raus). */
  tips: Tip[]
  goals: readonly UserGoal[] | undefined
}

/**
 * Die Marke rechts an jeder Zeile: der Euro-Betrag, wo die Messung ihn noch
 * behauptet, sonst der Aufwand. Nie beides – die Zeile hat dafür keine Breite,
 * und der Betrag ist die Aussage, wo es einen gibt.
 */
function tag(tip: Tip, t: TFunction, language: string): string {
  const eur = displaySavingEur(tip.savingEur)
  if (eur !== undefined) {
    const r = savingRange(eur)
    const fmt = new Intl.NumberFormat(language, { maximumFractionDigits: 0 })
    return t('tips.savingRangeShort', { low: fmt.format(r.low), high: fmt.format(r.high) })
  }
  return tip.costEur === 0
    ? t('tips.effortFree', { minutes: tip.effortMinutes })
    : t('tips.effortCost', { minutes: tip.effortMinutes, cost: tip.costEur })
}

export function fillActionPlan(
  kit: PdfKit,
  { t, language, tips, goals }: GenerateActionPlanArgs,
): void {
  const data = buildActionPlanData(tips, goals)

  // Kein leeres Kapitel: Wer alles abgearbeitet hat, soll das lesen und nicht
  // vor einer leeren Seite stehen.
  if (data.empty) {
    kit.subtle(t('tips.allHandled'))
    return
  }

  const line = goalLine(data, t)
  if (line) kit.subtle(line)
  kit.gap(10)

  for (const group of data.groups) {
    const heading = group.savingRange
      ? `${t(group.titleKey)} · ${t('tips.savingRange', {
          low: new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(
            group.savingRange.low,
          ),
          high: new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(
            group.savingRange.high,
          ),
        })}`
      : t(group.titleKey)
    kit.subHead(heading, { keepWith: 60 })

    const items: ChecklistItem[] = group.tips.map((tip) => ({
      title: tipTitle(tip, t, language),
      tag: tag(tip, t, language),
    }))
    kit.checklist(items)
    kit.gap(12)
  }
}
