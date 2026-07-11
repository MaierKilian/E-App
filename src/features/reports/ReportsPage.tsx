import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, Ruler, Gauge, Layers, ChevronLeft, ChevronDown, Check, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SelectChip } from '@/components/ui/SelectChip'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { activeEnergyTypes } from '@/features/monitoring/energyConfig'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { anyResultFor } from '@/features/measurements/rooms'
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

/** Je Berichtstyp ein eigenes Icon und ein eigener Akzentton – damit auf den
 *  ersten Blick erkennbar ist, welche Karte welcher Bericht ist. */
const TYPE_META: Record<ReportType, { icon: LucideIcon; accent: string }> = {
  measurements: { icon: Ruler, accent: '#0ea5e9' },
  monitoring: { icon: Gauge, accent: '#8b5cf6' },
  total: { icon: Layers, accent: 'var(--color-primary)' },
}

const TYPE_ORDER: ReportType[] = ['measurements', 'monitoring', 'total']

interface OverviewProps {
  onSelect: (type: ReportType) => void
}

/** Stilisiertes Mini-Vorschau-„Seitenbild" je Berichtstyp (kein echtes PDF).
 *  Jeder Typ zeigt ein eigenes Motiv im jeweiligen Akzentton: Messungen Balken,
 *  Monitoring eine Linie, Gesamt beides – so sind die Karten unterscheidbar. */
function ReportThumb({ type, accent, dim }: { type: ReportType; accent: string; dim?: boolean }) {
  const line = (
    <svg viewBox="0 0 40 16" className="h-4 w-full">
      <polyline
        points="0,12 8,8 16,10 24,4 32,6 40,2"
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
  const bars = (
    <div className="flex h-4 items-end gap-0.5">
      {[7, 11, 5, 9].map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm"
          style={{ height: h, background: accent, opacity: 0.6 }}
        />
      ))}
    </div>
  )
  return (
    <div
      aria-hidden="true"
      className={`relative h-[4.75rem] w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface shadow-sm ${
        dim ? 'opacity-50' : ''
      }`}
    >
      <div className="h-3 w-full" style={{ background: accent, opacity: 0.85 }} />
      <div className="space-y-1 p-1.5">
        {type === 'measurements' && bars}
        {type === 'monitoring' && line}
        {type === 'total' && (
          <>
            {line}
            {bars}
          </>
        )}
        <div className="h-1 w-10 rounded bg-surface-2" />
        {type !== 'total' && <div className="h-1 w-8 rounded bg-surface-2" />}
        <div className="h-1 w-9 rounded bg-surface-2" />
      </div>
    </div>
  )
}

/** Übersicht: drei Berichts-Kacheln mit Mini-Vorschau, Inhalts-Chips, Status. */
function ReportOverview({ onSelect }: OverviewProps) {
  const { t } = useTranslation()
  const profile = useOnboardingStore((s) => s.data)
  const results = useMeasurementsStore((s) => s.results)
  const readingsByType = useReadingsStore((s) => s.readings)

  const available = MEASUREMENT_CATALOG.filter((m) => m.available)
  const measDone = available.filter((m) => anyResultFor(results, m.id)).length
  const meterTypes = activeEnergyTypes(profile)
  const metersWithData = meterTypes.filter((tp) => (readingsByType[tp]?.length ?? 0) > 0).length

  // Gesamt ist immer möglich (Profil ist enthalten); die anderen brauchen Daten.
  const enabledFor = (type: ReportType): boolean => {
    if (type === 'measurements') return measDone > 0
    if (type === 'monitoring') return metersWithData > 0
    return true
  }

  function statusFor(type: ReportType): string {
    if (type === 'measurements') {
      return measDone > 0
        ? t('report.overview.measStatus', { done: measDone, total: available.length })
        : t('report.overview.measEmpty')
    }
    if (type === 'monitoring') {
      return metersWithData > 0
        ? t('report.overview.monStatus', { count: metersWithData })
        : t('report.overview.monEmpty')
    }
    return measDone > 0 || metersWithData > 0
      ? t('report.overview.totalReady')
      : t('report.overview.totalEmpty')
  }

  return (
    <div className="space-y-3">
      {TYPE_ORDER.map((type) => {
        const { icon: Icon, accent } = TYPE_META[type]
        const recommended = type === 'total'
        const enabled = enabledFor(type)

        const inner = (
          <div className="flex items-center gap-4">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                recommended ? 'bg-primary text-primary-foreground' : ''
              }`}
              style={recommended ? undefined : { background: `${accent}1a`, color: accent }}
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {t(`report.types.${type}.title`)}
                </h2>
                {recommended && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    <Sparkles className="h-3 w-3" />
                    {t('report.overview.recommended')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{statusFor(type)}</p>
            </div>
            <ReportThumb type={type} accent={accent} dim={!enabled} />
          </div>
        )

        if (!enabled) {
          return (
            <div
              key={type}
              aria-disabled="true"
              className="glass w-full cursor-default rounded-3xl p-4 opacity-60"
            >
              {inner}
            </div>
          )
        }

        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={`focus-ring glass w-full rounded-3xl p-4 text-left transition-transform duration-200 active:scale-[0.99] ${
              recommended ? 'ring-1 ring-primary/40' : ''
            }`}
          >
            {inner}
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
  // Erweiterte Optionen (Inhalte, Zeitraum, Zähler, Gewerke) standardmäßig
  // eingeklappt – der Standard ist bewusst schlank (nur Umfang + Export).
  const [advanced, setAdvanced] = useState(false)

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

  const needsSelection = (showMonitoring && meterTypes.length > 0) || showMeasurements

  return (
    <div className="space-y-3 pb-24">
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

      {/* Umfang – die eine sichtbare Entscheidung. Der Rest hat sinnvolle
          Defaults und liegt unter „Anpassen“. */}
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
        <p className="mt-3 text-xs text-muted">{t('report.builder.variantHint')}</p>
      </Card>

      {/* Anpassen – erweiterte Optionen, standardmäßig eingeklappt */}
      <div className="glass rounded-2xl">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="focus-ring flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-foreground"
        >
          {t('report.builder.customize')}
          <ChevronDown
            className={`h-4 w-4 text-muted transition-transform ${advanced ? 'rotate-180' : ''}`}
          />
        </button>

        {advanced && (
          <div className="space-y-4 px-4 pb-4">
            <div>
              <SectionLabel>{t('report.builder.contents')}</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {showMonitoring && (
                  <>
                    <ToggleChip label={t('report.contents.charts')} active={options.charts} onClick={() => toggleOption('charts')} />
                    <ToggleChip label={t('report.contents.kpis')} active={options.kpis} onClick={() => toggleOption('kpis')} />
                    <ToggleChip label={t('report.contents.comparison')} active={options.comparison} onClick={() => toggleOption('comparison')} />
                    <ToggleChip label={t('report.contents.history')} active={options.history} onClick={() => toggleOption('history')} />
                  </>
                )}
                {showMeasurements && (
                  <>
                    <ToggleChip label={t('report.contents.savings')} active={options.savings} onClick={() => toggleOption('savings')} />
                    <ToggleChip label={t('report.contents.tips')} active={options.tips} onClick={() => toggleOption('tips')} />
                    <ToggleChip label={t('report.contents.openMeasurements')} active={options.openMeasurements} onClick={() => toggleOption('openMeasurements')} />
                  </>
                )}
              </div>
            </div>

            {showMonitoring && (
              <div>
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
              </div>
            )}

            {showMonitoring && meterTypes.length > 0 && (
              <div>
                <SectionLabel>{t('report.builder.meters')}</SectionLabel>
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
              </div>
            )}

            {showMeasurements && (
              <div>
                <SectionLabel>{t('report.builder.categories')}</SectionLabel>
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
              </div>
            )}

            {needsSelection && <p className="text-xs text-muted">{t('report.builder.allHint')}</p>}
          </div>
        )}
      </div>

      {/* Fixe Export-Leiste – immer erreichbar */}
      <div className="glass-bar fixed inset-x-0 z-30 border-t border-border/60 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 md:pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl px-4 py-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-[transform,background-color] duration-200 active:scale-[0.98] disabled:opacity-60"
          >
            <Download className="w-5 h-5" />
            {t('report.builder.export')}
          </button>
        </div>
      </div>
    </div>
  )
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
