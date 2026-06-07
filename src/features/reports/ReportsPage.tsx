import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, User, Ruler, Gauge } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SelectChip } from '@/components/ui/SelectChip'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { buildReportData } from './reportData'
import type { ReportVariant } from './generatePdf'

/**
 * Berichte-Bereich: erzeugt aus Profil, Messungen und Monitoring einen
 * Kurz- oder Langbericht und exportiert ihn als PDF (jsPDF).
 * Minimalistisch: Varianten-Auswahl, kompakte Vorschau, Export-Button.
 */
export function ReportsPage() {
  const { t, i18n } = useTranslation()
  const [variant, setVariant] = useState<ReportVariant>('short')

  const profile = useOnboardingStore((s) => s.data)
  const measurementResults = useMeasurementsStore((s) => s.results)
  const readingsByType = useReadingsStore((s) => s.readings)
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const data = useMemo(
    () => buildReportData({ profile, measurementResults, readingsByType, workPriceCt }),
    [profile, measurementResults, readingsByType, workPriceCt],
  )

  const measurementCount = data.measurements.length
  const meterCount = data.monitoring.filter((m) => m.latestValue !== undefined).length

  const handleExport = async () => {
    // jsPDF wird erst beim Export geladen (hält das Haupt-Bundle schlank).
    const { generateReportPdf } = await import('./generatePdf')
    generateReportPdf({ variant, t, language: i18n.language, data })
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-4">
        <span className="grid place-items-center w-12 h-12 rounded-2xl bg-primary/10 text-primary shrink-0">
          <FileText className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t('report.title')}</h1>
          <p className="text-muted mt-1 text-sm">{t('report.subtitle')}</p>
        </div>
      </header>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          {t('report.variantTitle')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <SelectChip
            label={t('report.variant.short')}
            selected={variant === 'short'}
            onClick={() => setVariant('short')}
          />
          <SelectChip
            label={t('report.variant.long')}
            selected={variant === 'long'}
            onClick={() => setVariant('long')}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          {t('report.previewTitle')}
        </h2>
        <ul className="space-y-2.5">
          <PreviewRow
            icon={User}
            label={t('report.include.profile')}
            value={
              data.profileShort.profileName?.trim() || t('report.counts.profileReady')
            }
          />
          <PreviewRow
            icon={Ruler}
            label={t('report.include.measurements')}
            value={t('report.counts.measurements', { count: measurementCount })}
          />
          <PreviewRow
            icon={Gauge}
            label={t('report.include.monitoring')}
            value={t('report.counts.meters', { count: meterCount })}
          />
        </ul>
      </Card>

      <button
        type="button"
        onClick={handleExport}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-[transform,background-color] duration-200 active:scale-[0.98]"
      >
        <Download className="w-5 h-5" />
        {t('report.export')}
      </button>
    </div>
  )
}

interface PreviewRowProps {
  icon: LucideIcon
  label: string
  value: string
}

/** Eine Zeile der Berichts-Vorschau: Icon, Beschriftung und Kennzahl. */
function PreviewRow({ icon: Icon, label, value }: PreviewRowProps) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid place-items-center w-9 h-9 rounded-xl bg-surface-2 text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
      <span className="shrink-0 text-sm text-muted tabular-nums">{value}</span>
    </li>
  )
}
