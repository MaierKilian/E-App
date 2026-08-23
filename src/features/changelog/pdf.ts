import { PdfKit } from '@/features/reports/pdf/pdfKit'
import type { ReportDocument } from '@/features/reports/pdf/deliver'
import type { ChangelogEntry } from '@/store/changelogStore'

/** Baut das PDF-Dokument des Änderungsprotokolls aus den vorhandenen Einträgen. */
export function buildChangelogPdf(
  entries: ChangelogEntry[],
  t: (key: string) => string,
  language: string,
): ReportDocument {
  const kit = new PdfKit()
  const today = new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(new Date())

  kit.masthead({
    title: t('changelog.title'),
    subtitle: t('changelog.subtitle'),
    date: today,
  })

  // Nach Datum gruppiert, neueste zuerst – die Reihenfolge der Einträge
  // selbst ist bereits neueste zuerst (siehe `addChangelogEntry`).
  const dates = [...new Set(entries.map((e) => e.date))]
  const dateFmt = new Intl.DateTimeFormat(language, { dateStyle: 'long' })

  for (const date of dates) {
    const group = entries.filter((e) => e.date === date)
    kit.subHead(dateFmt.format(new Date(`${date}T00:00:00`)))
    for (const entry of group) {
      kit.chartCaption(entry.title)
      kit.subtle(entry.description)
      kit.gap(6)
    }
  }

  if (entries.length === 0) {
    kit.subtle(t('changelog.empty'))
  }

  kit.finalizeFooters(
    (n, total) => `${n} / ${total}`,
    t('changelog.pdfFootnote'),
  )

  return { doc: kit.doc, fileName: t('changelog.pdfFileName') }
}
