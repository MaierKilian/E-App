import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, Ruler, Gauge, Layers, ChevronLeft, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SelectChip } from '@/components/ui/SelectChip'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { activeEnergyTypes } from '@/features/monitoring/energyConfig'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import type { MeasurementCategory } from '@/features/measurements/catalog'
import type { EnergyType } from '@/store/readingsStore'
import { buildMeasurementsReportData } from './measurementsReportData'
import { buildMonitoringReportData, type RangeDays } from './monitoringReportData'
import {
  defaultContentOptions,
  type ReportType,
  type ReportVariant,
  type ReportContentOptions,
} from './reportTypes'

/**
 * Berichte-Bereich: Übersicht mit drei Berichtstypen (Messungen, Monitoring,
 * Gesamt). Tap öffnet den In-Page-Builder (Variante, Inhalte, Zeitraum,
 * Auswahl) und exportiert ein grafisch aufbereitetes PDF.
 */
export function ReportsPage() {
  const { t } = useTranslation()
  const [active, setActive] = useState<ReportType | null>(null)

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

      {active === null ? (
        <ReportOverview onSelect={setActive} />
      ) : (
        <ReportBuilder type={active} onBack={() => setActive(null)} />
      )}
    </div>
  )
}

const TYPE_META: Record<ReportType, LucideIcon> = {
  measurements: Ruler,
  monitoring: Gauge,
  total: Layers,
}

const TYPE_ORDER: ReportType[] = ['measurements', 'monitoring', 'total']

interface OverviewProps {
  onSelect: (type: ReportType) => void
}

/** Übersicht: drei Berichts-Kacheln. */
function ReportOverview({ onSelect }: OverviewProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      {TYPE_ORDER.map((type) => {
        const Icon = TYPE_META[type]
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className="focus-ring glass w-full rounded-3xl p-4 text-left transition-transform duration-200 active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <span className="grid place-items-center w-11 h-11 rounded-2xl bg-primary/10 text-primary shrink-0">
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-foreground">
                  {t(`report.types.${type}.title`)}
                </h2>
                <p className="text-sm text-muted mt-0.5">{t(`report.types.${type}.description`)}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

const RANGE_OPTIONS: { key: string; value: RangeDays }[] = [
  { key: 'd7', value: 7 },
  { key: 'd30', value: 30 },
  { key: 'd90', value: 90 },
  { key: 'all', value: null },
]

interface BuilderProps {
  type: ReportType
  onBack: () => void
}

/** Builder: Variante, Inhalte, Zeitraum, Auswahl + Vorschau + Export. */
function ReportBuilder({ type, onBack }: BuilderProps) {
  const { t, i18n } = useTranslation()

  const profile = useOnboardingStore((s) => s.data)
  const results = useMeasurementsStore((s) => s.results)
  const readingsByType = useReadingsStore((s) => s.readings)
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [variant, setVariant] = useState<ReportVariant>('short')
  const [options, setOptions] = useState<ReportContentOptions>(() => defaultContentOptions('short'))
  const [rangeDays, setRangeDays] = useState<RangeDays>(30)
  const [meters, setMeters] = useState<EnergyType[]>([])
  const [categories, setCategories] = useState<MeasurementCategory[]>([])
  const [busy, setBusy] = useState(false)

  const showMonitoring = type === 'monitoring' || type === 'total'
  const showMeasurements = type === 'measurements' || type === 'total'

  const meterTypes = useMemo(() => activeEnergyTypes(profile), [profile])
  const catTypes = useMemo(
    () => Array.from(new Set(MEASUREMENT_CATALOG.map((m) => m.category))),
    [],
  )

  const changeVariant = (v: ReportVariant) => {
    setVariant(v)
    setOptions(defaultContentOptions(v))
  }

  const toggleOption = (key: keyof ReportContentOptions) =>
    setOptions((o) => ({ ...o, [key]: !o[key] }))

  const toggleMeter = (m: EnergyType) =>
    setMeters((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))

  const toggleCategory = (c: MeasurementCategory) =>
    setCategories((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))

  const handleExport = async () => {
    setBusy(true)
    try {
      if (type === 'measurements') {
        const data = buildMeasurementsReportData({ results, categories })
        const { generateMeasurementsPdf } = await import('./generateMeasurementsPdf')
        generateMeasurementsPdf({ variant, options, t, language: i18n.language, data })
      } else if (type === 'monitoring') {
        const data = buildMonitoringReportData({
          profile,
          readingsByType,
          rangeDays,
          workPriceCt,
          types: meters,
        })
        const { generateMonitoringPdf } = await import('./generateMonitoringPdf')
        generateMonitoringPdf({ variant, options, t, language: i18n.language, data })
      } else {
        const mData = buildMeasurementsReportData({ results, categories })
        const monData = buildMonitoringReportData({
          profile,
          readingsByType,
          rangeDays,
          workPriceCt,
          types: meters,
        })
        const { generateGesamtPdf } = await import('./generateGesamtPdf')
        generateGesamtPdf({
          variant,
          options,
          t,
          language: i18n.language,
          profile: {
            profileName: profile.profileName,
            buildingType: profile.buildingType,
            livingArea: profile.livingArea,
            buildingYear: profile.buildingYear,
            personsCount: profile.personsCount,
          },
          measurements: mData,
          monitoring: monData,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="focus-ring inline-flex items-center gap-1 rounded-xl px-2 py-1 -ml-2 text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('report.builder.back')}
      </button>

      <div>
        <h2 className="text-lg font-bold">{t(`report.types.${type}.title`)}</h2>
        <p className="text-sm text-muted">{t(`report.types.${type}.description`)}</p>
      </div>

      <Card>
        <SectionLabel>{t('report.builder.variant')}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <SelectChip
            label={t('report.variant.short')}
            selected={variant === 'short'}
            onClick={() => changeVariant('short')}
          />
          <SelectChip
            label={t('report.variant.long')}
            selected={variant === 'long'}
            onClick={() => changeVariant('long')}
          />
        </div>
      </Card>

      <Card>
        <SectionLabel>{t('report.builder.contents')}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {showMonitoring && (
            <>
              <ToggleChip
                label={t('report.contents.charts')}
                active={options.charts}
                onClick={() => toggleOption('charts')}
              />
              <ToggleChip
                label={t('report.contents.kpis')}
                active={options.kpis}
                onClick={() => toggleOption('kpis')}
              />
              <ToggleChip
                label={t('report.contents.comparison')}
                active={options.comparison}
                onClick={() => toggleOption('comparison')}
              />
              <ToggleChip
                label={t('report.contents.history')}
                active={options.history}
                onClick={() => toggleOption('history')}
              />
            </>
          )}
          {showMeasurements && (
            <>
              <ToggleChip
                label={t('report.contents.savings')}
                active={options.savings}
                onClick={() => toggleOption('savings')}
              />
              <ToggleChip
                label={t('report.contents.tips')}
                active={options.tips}
                onClick={() => toggleOption('tips')}
              />
              <ToggleChip
                label={t('report.contents.openMeasurements')}
                active={options.openMeasurements}
                onClick={() => toggleOption('openMeasurements')}
              />
            </>
          )}
        </div>
      </Card>

      {showMonitoring && (
        <Card>
          <SectionLabel>{t('report.builder.range')}</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((r) => (
              <SelectChip
                key={r.key}
                label={t(`report.range.${r.key}`)}
                selected={rangeDays === r.value}
                onClick={() => setRangeDays(r.value)}
              />
            ))}
          </div>
        </Card>
      )}

      {showMonitoring && meterTypes.length > 0 && (
        <Card>
          <SectionLabel>{t('report.builder.meters')}</SectionLabel>
          <p className="mb-3 text-xs text-muted">{t('report.builder.allHint')}</p>
          <div className="flex flex-wrap gap-2">
            {meterTypes.map((m) => (
              <SelectChip
                key={m}
                label={t(`monitoring.energyTypes.${m}`)}
                selected={meters.length === 0 || meters.includes(m)}
                onClick={() => toggleMeter(m)}
              />
            ))}
          </div>
        </Card>
      )}

      {showMeasurements && (
        <Card>
          <SectionLabel>{t('report.builder.categories')}</SectionLabel>
          <p className="mb-3 text-xs text-muted">{t('report.builder.allHint')}</p>
          <div className="flex flex-wrap gap-2">
            {catTypes.map((c) => (
              <SelectChip
                key={c}
                label={t(`measurements.categories.${c}`)}
                selected={categories.length === 0 || categories.includes(c)}
                onClick={() => toggleCategory(c)}
              />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionLabel>{t('report.builder.previewTitle')}</SectionLabel>
        <ul className="space-y-1.5">
          {buildPreviewLines(t, type, variant, options).map((line) => (
            <li key={line} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="min-w-0">{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-[transform,background-color] duration-200 active:scale-[0.98] disabled:opacity-60"
      >
        <Download className="w-5 h-5" />
        {t('report.builder.export')}
      </button>
    </div>
  )
}

/** Baut die Vorschau-Zeilen aus der aktuellen Auswahl. */
function buildPreviewLines(
  t: (k: string) => string,
  type: ReportType,
  variant: ReportVariant,
  options: ReportContentOptions,
): string[] {
  const lines: string[] = [
    `${t('report.builder.variant')}: ${t(`report.variant.${variant}`)}`,
  ]
  const add = (k: keyof ReportContentOptions, label: string) => {
    if (options[k]) lines.push(label)
  }
  if (type === 'monitoring' || type === 'total') {
    add('charts', t('report.contents.charts'))
    add('kpis', t('report.contents.kpis'))
    add('comparison', t('report.contents.comparison'))
    add('history', t('report.contents.history'))
  }
  if (type === 'measurements' || type === 'total') {
    add('savings', t('report.contents.savings'))
    add('tips', t('report.contents.tips'))
    add('openMeasurements', t('report.contents.openMeasurements'))
  }
  return lines
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{children}</h3>
  )
}

interface ToggleChipProps {
  label: string
  active: boolean
  onClick: () => void
}

/** Toggle-Chip für an-/abwählbare Inhalte (mit Häkchen wenn aktiv). */
function ToggleChip({ label, active, onClick }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-medium transition-[transform,background-color,color] duration-200 active:scale-[0.94] ${
        active
          ? 'bg-primary text-primary-foreground border border-primary'
          : 'glass text-muted hover:bg-surface-2/70'
      }`}
    >
      {active && <Check className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}
