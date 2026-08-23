import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, History } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { useChangelogStore } from '@/store/changelogStore'
import { deliverReport } from '@/features/reports/pdf/deliver'
import { buildChangelogPdf } from './pdf'

/**
 * Änderungsprotokoll: Übersicht aller neuen bzw. veränderten Funktionen,
 * nach Datum gruppiert, mit PDF-Export für die Ablage außerhalb der App.
 */
export function ChangelogPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const entries = useChangelogStore((s) => s.entries)

  const dates = [...new Set(entries.map((e) => e.date))]
  const dateFmt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'long' })

  async function handleDownload() {
    const report = buildChangelogPdf(entries, t, i18n.resolvedLanguage ?? 'de')
    await deliverReport(report, t('changelog.title'))
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader
        title={t('changelog.title')}
        subtitle={t('changelog.subtitle')}
        back={{ label: t('common.back'), onClick: () => navigate(-1) }}
      />

      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={entries.length === 0}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {t('changelog.downloadPdf')}
      </button>

      {entries.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <History className="h-6 w-6 text-muted" />
          <p className="text-sm text-muted">{t('changelog.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {dates.map((date) => (
            <div key={date} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {dateFmt.format(new Date(`${date}T00:00:00`))}
              </h2>
              <div className="space-y-3">
                {entries
                  .filter((e) => e.date === date)
                  .map((entry) => (
                    <Card key={entry.id} className="p-4">
                      <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
                      <p className="mt-1 text-sm text-muted">{entry.description}</p>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
