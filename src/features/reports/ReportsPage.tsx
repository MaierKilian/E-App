import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, Share2, Check, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { useReportSettingsStore } from '@/store/reportSettingsStore'
import { activeEnergyTypes } from '@/features/monitoring/energyConfig'
import { fmtPeriod } from './pdf/format'
import { canSharePdf, deliverReport } from './pdf/deliver'
import { buildMeasurementsReportData } from './measurementsReportData'
import { buildMonitoringReportData, suggestRangeDays, type RangeDays } from './monitoringReportData'
import type { ReportSections, ReportVariant } from './reportTypes'

/**
 * Berichte: ein Energiebericht als PDF, zusammengesetzt aus den gewählten
 * Abschnitten (Profil, Messungen, Monitoring). Umfang und Zeitraum sind die
 * einzigen weiteren Stellschrauben – alles andere ergibt sich daraus.
 */
export function ReportsPage() {
  const { t, i18n } = useTranslation()

  const profile = useOnboardingStore((s) => s.data)
  const results = useMeasurementsStore((s) => s.results)
  const readingsByType = useReadingsStore((s) => s.readings)
  // Ganzer Tarif-State: der Bericht rechnet Kosten für jeden Träger mit
  // hinterlegtem Preis, nicht nur für Strom.
  const tariff = useTariffStore()
  const settings = useReportSettingsStore()

  const meterTypes = useMemo(() => activeEnergyTypes(profile), [profile])

  // Zeitraum: selbst gewählter Wert gilt, sonst passend zu den vorhandenen
  // Ablesungen ableiten (ein fester Default träfe oft gar keine Daten).
  const autoRange = useMemo(
    () => suggestRangeDays(readingsByType, meterTypes),
    [readingsByType, meterTypes],
  )
  const rangeDays: RangeDays = settings.range === 'auto' ? autoRange : settings.range

  // Beide Auswertungen sind reine Funktionen – einmal berechnet, versorgen sie
  // die Fakten und den Export, sodass die Vorschau dieselben Zahlen zeigt wie
  // das PDF.
  const monitoringData = useMemo(
    () => buildMonitoringReportData({ profile, readingsByType, rangeDays, tariff }),
    [profile, readingsByType, rangeDays, tariff],
  )
  const measurementsData = useMemo(
    () => buildMeasurementsReportData({ results, categories: [] }),
    [results],
  )

  const metersWithData = monitoringData.entries.filter((e) => e.readingCount > 0).length
  const available = {
    // Das Profil steht immer zur Verfügung; die anderen brauchen Daten.
    profile: true,
    measurements: measurementsData.doneCount > 0,
    monitoring: metersWithData > 0,
  }

  // Ein Abschnitt ohne Daten wird nie exportiert, auch wenn er gespeichert ist.
  const sections: ReportSections = {
    profile: settings.sections.profile,
    measurements: settings.sections.measurements && available.measurements,
    monitoring: settings.sections.monitoring && available.monitoring,
  }
  const activeCount =
    Number(sections.profile) + Number(sections.measurements) + Number(sections.monitoring)

  /** Abschnitt umschalten; der letzte aktive bleibt stehen (leerer Bericht). */
  const toggleSection = (key: keyof ReportSections) => {
    if (!available[key]) return
    if (sections[key] && activeCount <= 1) return
    settings.setSections({ ...settings.sections, [key]: !sections[key] })
  }

  return (
    <div className="space-y-5 pb-24">
      <header className="flex items-start gap-4">
        <span className="grid place-items-center w-12 h-12 rounded-2xl bg-primary/10 text-primary shrink-0">
          <FileText className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t('report.title')}</h1>
          <p className="text-muted mt-1 text-sm">{t('report.subtitle')}</p>
        </div>
      </header>

      <ReportSummary
        variant={settings.variant}
        sections={sections}
        monitoring={monitoringData}
        measurements={measurementsData}
        metersWithData={metersWithData}
        objectName={(profile.profileName ?? '').trim() || undefined}
      />

      <Card>
        <SectionLabel>{t('report.builder.variant')}</SectionLabel>
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          <VariantCard
            label={t('report.variant.short')}
            description={t('report.variantDesc.short')}
            selected={settings.variant === 'short'}
            onClick={() => settings.setVariant('short')}
          />
          <VariantCard
            label={t('report.variant.long')}
            description={t('report.variantDesc.long')}
            selected={settings.variant === 'long'}
            onClick={() => settings.setVariant('long')}
          />
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 pt-5">
          <SectionLabel>{t('report.builder.sections')}</SectionLabel>
        </div>
        <SectionRow
          label={t('report.pdf.section.profile')}
          detail={t('report.sectionDetail.profile')}
          checked={sections.profile}
          disabled={sections.profile && activeCount <= 1}
          onToggle={() => toggleSection('profile')}
        />
        <SectionRow
          label={t('report.pdf.section.measurements')}
          detail={
            available.measurements
              ? t('report.facts.measurements', { count: measurementsData.doneCount })
              : t('report.overview.measEmpty')
          }
          checked={sections.measurements}
          disabled={!available.measurements || (sections.measurements && activeCount <= 1)}
          onToggle={() => toggleSection('measurements')}
        />
        <SectionRow
          label={t('report.pdf.section.monitoring')}
          detail={
            available.monitoring
              ? t('report.facts.meters', { count: metersWithData })
              : t('report.overview.monEmpty')
          }
          checked={sections.monitoring}
          disabled={!available.monitoring || (sections.monitoring && activeCount <= 1)}
          onToggle={() => toggleSection('monitoring')}
        >
          {/* Der Zeitraum gehört an das Monitoring – er verändert dessen
              Kennzahlen, nicht den Bericht als Ganzes. */}
          <RangePicker
            value={rangeDays}
            onChange={settings.setRange}
            from={monitoringData.from}
            to={monitoringData.to}
            readingCount={monitoringData.readingCount}
            language={i18n.language}
          />
        </SectionRow>
      </Card>

      <ShareBar
        variant={settings.variant}
        sections={sections}
        monitoring={monitoringData}
        measurements={measurementsData}
        profile={profile}
      />
    </div>
  )
}

// --- Kopfbereich ---------------------------------------------------------

interface SummaryProps {
  variant: ReportVariant
  sections: ReportSections
  monitoring: ReturnType<typeof buildMonitoringReportData>
  measurements: ReturnType<typeof buildMeasurementsReportData>
  metersWithData: number
  objectName?: string
}

/** Papier-Motiv neben den Fakten, die tatsächlich im PDF landen. */
function ReportSummary({
  variant,
  sections,
  monitoring,
  measurements,
  metersWithData,
  objectName,
}: SummaryProps) {
  const { t, i18n } = useTranslation()

  const facts: string[] = []
  if (sections.monitoring) {
    facts.push(t('report.facts.meters', { count: metersWithData }))
    facts.push(t('report.facts.readings', { count: monitoring.readingCount }))
  }
  if (sections.measurements) {
    facts.push(t('report.facts.measurements', { count: measurements.doneCount }))
  }

  const period =
    sections.monitoring && monitoring.from && monitoring.to
      ? fmtPeriod(monitoring.from, monitoring.to, i18n.language)
      : undefined

  return (
    <Card className="!p-4">
      <div className="flex items-center gap-4">
        <ReportPreview variant={variant} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {objectName ?? t('home.profileNameFallback')}
          </p>
          <p className="mt-0.5 text-xs text-muted">{t(`report.variant.${variant}`)} · PDF</p>
          <p className="mt-2 text-xs text-muted">
            {facts.length > 0 ? facts.join(' · ') : t('report.facts.profileOnly')}
          </p>
          {period && <p className="mt-0.5 text-xs text-muted">{period}</p>}
        </div>
      </div>
    </Card>
  )
}

// --- Abschnitte ----------------------------------------------------------

interface SectionRowProps {
  label: string
  detail: string
  checked: boolean
  disabled: boolean
  onToggle: () => void
  children?: ReactNode
}

/**
 * Eine Abschnittszeile mit Häkchen. Ein Abschnitt ohne Daten ist deaktiviert
 * und nennt in der Detailzeile, was fehlt.
 */
function SectionRow({ label, detail, checked, disabled, onToggle, children }: SectionRowProps) {
  return (
    <div className="border-t border-border/60">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled && !checked}
        onClick={onToggle}
        className={`focus-ring flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors ${
          disabled && !checked ? 'cursor-not-allowed opacity-45' : 'active:bg-surface-2/60'
        }`}
      >
        <span
          aria-hidden="true"
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition-colors ${
            checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-surface'
          }`}
        >
          {checked && <Check className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{label}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">{detail}</span>
        </span>
      </button>
      {checked && children && <div className="px-5 pb-4 pl-14">{children}</div>}
    </div>
  )
}

const RANGE_OPTIONS: { key: string; value: RangeDays }[] = [
  { key: 'd7', value: 7 },
  { key: 'd30', value: 30 },
  { key: 'd90', value: 90 },
  { key: 'all', value: null },
]

interface RangePickerProps {
  value: RangeDays
  onChange: (value: RangeDays) => void
  from?: string
  to?: string
  readingCount: number
  language: string
}

/**
 * Zeitraum als zusammenhängender Umschalter: eine Wahl auf einer Skala, nicht
 * vier lose Schaltflächen. Darunter steht, was daraus folgt.
 */
function RangePicker({ value, onChange, from, to, readingCount, language }: RangePickerProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div
        role="radiogroup"
        aria-label={t('report.builder.range')}
        className="flex rounded-2xl border border-border bg-surface-2/50 p-1"
      >
        {RANGE_OPTIONS.map((r) => {
          const selected = value === r.value
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(r.value)}
              className={`focus-ring flex-1 rounded-xl px-1 py-1.5 text-xs font-semibold transition-colors ${
                selected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted'
              }`}
            >
              {t(`report.range.${r.key}`)}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        {from && to
          ? `${fmtPeriod(from, to, language)} · ${t('report.facts.readings', { count: readingCount })}`
          : t('report.facts.rangeEmpty')}
      </p>
    </div>
  )
}

// --- Export --------------------------------------------------------------

/** Zustand der Export-Schaltfläche (steuert Beschriftung und Rückmeldung). */
type ExportStatus = 'idle' | 'busy' | 'done' | 'shared' | 'error'

interface ShareBarProps {
  variant: ReportVariant
  sections: ReportSections
  monitoring: ReturnType<typeof buildMonitoringReportData>
  measurements: ReturnType<typeof buildMeasurementsReportData>
  profile: ReturnType<typeof useOnboardingStore.getState>['data']
}

/** Fixe Leiste mit Teilen-/Download-Schaltfläche und Rückmeldung. */
function ShareBar({ variant, sections, monitoring, measurements, profile }: ShareBarProps) {
  const { t, i18n } = useTranslation()
  const [status, setStatus] = useState<ExportStatus>('idle')

  // Auf dem Telefon ist das System-Teilen der natürliche Weg (Sichern, Mail,
  // Messenger und Vorschau in einem Schritt); sonst bleibt es beim Download.
  const shareable = useMemo(() => canSharePdf(), [])

  const resetTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  const handleExport = async () => {
    window.clearTimeout(resetTimer.current)
    setStatus('busy')
    try {
      const { generateReportPdf } = await import('./generateReportPdf')
      const report = generateReportPdf({
        variant,
        sections,
        t,
        language: i18n.language,
        profile: {
          profileName: profile.profileName,
          buildingType: profile.buildingType,
          livingArea: profile.livingArea,
          buildingYear: profile.buildingYear,
          personsCount: profile.personsCount,
        },
        measurements,
        monitoring,
      })

      const result = await deliverReport(report, t('report.pdf.title'))
      // Abbruch im System-Teilen-Dialog ist kein Fehler und kein Erfolg.
      if (result === 'cancelled') {
        setStatus('idle')
        return
      }
      setStatus(result === 'shared' ? 'shared' : 'done')
      resetTimer.current = window.setTimeout(() => setStatus('idle'), 4000)
    } catch (error) {
      // Ohne sichtbare Meldung würde die Schaltfläche einfach wieder aktiv und
      // der Nutzer stünde ohne PDF und ohne Erklärung da.
      console.error('[reports] PDF-Export fehlgeschlagen', error)
      setStatus('error')
    }
  }

  return (
    <div className="glass-bar fixed inset-x-0 z-30 border-t border-border/60 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 md:pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-3xl px-4 py-3">
        {status === 'error' && (
          <p
            role="alert"
            className="mb-2 flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t('report.builder.exportError')}
          </p>
        )}
        {(status === 'done' || status === 'shared') && (
          <p
            role="status"
            className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t(status === 'shared' ? 'report.builder.shareDone' : 'report.builder.exportDone')}
          </p>
        )}
        <button
          type="button"
          onClick={handleExport}
          disabled={status === 'busy'}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-[transform,background-color] duration-200 active:scale-[0.98] disabled:opacity-60"
        >
          {shareable ? <Share2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
          {status === 'busy'
            ? t('report.builder.exporting')
            : t(shareable ? 'report.builder.share' : 'report.builder.export')}
        </button>
      </div>
    </div>
  )
}

// --- Bausteine -----------------------------------------------------------

/**
 * Kompaktes „Papier"-Motiv des Berichts: Kopfzeile mit Trennlinie, Diagramm,
 * Kennzahl-Kacheln und Tabellenzeilen – in derselben Reihenfolge und in denselben
 * neutralen Tönen wie das erzeugte PDF. Bewusst textlos: bei dieser Größe wäre
 * Text unlesbar, und erfundene Beschriftungen würden mehr versprechen als das
 * PDF hält. Der Langbericht zeigt zusätzlich gestapelte Seiten.
 */
function ReportPreview({ variant }: { variant: ReportVariant }) {
  const long = variant === 'long'

  return (
    <div aria-hidden="true" className="relative w-[76px] shrink-0">
      {long && (
        <>
          <div className="absolute inset-x-2 -bottom-1 top-3 rotate-[6deg] origin-bottom rounded-lg bg-zinc-300/70" />
          <div className="absolute inset-x-1 -bottom-0.5 top-2 rotate-[3deg] origin-bottom rounded-lg bg-zinc-200" />
        </>
      )}

      <div className="relative aspect-[1/1.414] overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_10px_20px_-10px_rgba(20,30,10,0.45)]">
        <div className="px-2 pt-2">
          {/* Kopf: Logo-Andeutung, Titelbalken, feine Trennlinie – wie im PDF. */}
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 shrink-0 rounded-[2px] bg-zinc-800" />
            <span className="h-1.5 w-8 rounded-sm bg-zinc-800" />
          </div>
          <span className="mt-1 block h-[3px] w-10 rounded-sm bg-zinc-300" />
          <span className="mt-1.5 block h-px w-full bg-zinc-200" />

          <div className="mt-1.5 h-[26px] w-full">
            <svg viewBox="0 0 60 26" preserveAspectRatio="none" className="h-full w-full">
              <polyline
                points="0,22 10,18 20,20 30,11 40,13 50,6 60,3"
                fill="none"
                stroke="#27272a"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="mt-1.5 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-[13px] flex-1 rounded-[3px] bg-zinc-100" />
            ))}
          </div>

          <div className="mt-1.5 flex flex-col gap-1">
            {[100, 82, 92, 70].slice(0, long ? 4 : 2).map((w, i) => (
              <span
                key={i}
                className="block h-[3px] rounded bg-zinc-200"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -right-1.5 top-1.5 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[8px] font-bold leading-none text-white shadow-[0_4px_10px_-4px_rgba(0,0,0,0.6)]">
        PDF
      </div>
    </div>
  )
}

interface VariantCardProps {
  label: string
  description: string
  selected: boolean
  onClick: () => void
}

/** Umfang-Auswahl als Karte: der Unterschied steht direkt an der Entscheidung. */
function VariantCard({ label, description, selected, onClick }: VariantCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`focus-ring rounded-2xl border p-3 text-left transition-[transform,background-color,border-color] duration-200 active:scale-[0.98] ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-surface-2/40 hover:bg-surface-2/70'
      }`}
    >
      <span className="flex items-center justify-between gap-1">
        <span className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>
          {label}
        </span>
        {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
      </span>
      <span className="mt-1 block text-xs leading-snug text-muted">{description}</span>
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
  )
}
