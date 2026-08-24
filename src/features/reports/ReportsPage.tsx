import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Share2, Check, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { useReportSettingsStore } from '@/store/reportSettingsStore'
import { boardEnergyTypes } from '@/features/monitoring/energyConfig'
import { fmtPeriod } from './pdf/format'
import { canSharePdf, deliverReport } from './pdf/deliver'
import { buildTips } from '@/features/tips/buildTips'
import { tipsByMeasurement } from '@/features/tips/tipsForReport'
import { buildMeasurementsReportData } from './measurementsReportData'
import { buildMonitoringReportData, suggestRangeDays, type RangeDays } from './monitoringReportData'
import type { ReportSections } from './reportTypes'

/**
 * Berichte: ein Energiebericht als PDF, zusammengesetzt aus den gewählten
 * Abschnitten – Messungen, Monitoring oder beides. Der Zeitraum des Monitorings
 * ist die einzige weitere Stellschraube; einen Umfang (kurz/lang) gibt es
 * bewusst nicht mehr.
 */
export function ReportsPage() {
  const { t } = useTranslation()

  const profile = useOnboardingStore((s) => s.data)
  const results = useMeasurementsStore((s) => s.results)
  const readingsByType = useReadingsStore((s) => s.readings)
  // Ganzer Tarif-State: der Bericht rechnet Kosten für jeden Träger mit
  // hinterlegtem Preis, nicht nur für Strom.
  const tariff = useTariffStore()
  const settings = useReportSettingsStore()

  // Auch selbst angelegte Zähler stehen im Bericht zur Wahl, nicht nur die vom
  // Profil vorgeschlagenen.
  const meterTypes = useMemo(
    () => boardEnergyTypes(profile, readingsByType),
    [profile, readingsByType],
  )

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
    // `rooms` benennt die Einzelergebnisse raumbezogener Messungen im Bericht.
    () => buildMeasurementsReportData({ results, categories: [], rooms: profile.rooms }),
    [results, profile.rooms],
  )

  const metersWithData = monitoringData.entries.filter((e) => e.readingCount > 0).length
  const available = {
    measurements: measurementsData.doneCount > 0,
    monitoring: metersWithData > 0,
  }

  // Ein Abschnitt ohne Daten wird nie exportiert, auch wenn er gespeichert ist.
  const sections: ReportSections = {
    measurements: settings.sections.measurements && available.measurements,
    monitoring: settings.sections.monitoring && available.monitoring,
  }
  const activeCount = Number(sections.measurements) + Number(sections.monitoring)

  /** Abschnitt umschalten; der letzte aktive bleibt stehen (leerer Bericht). */
  const toggleSection = (key: keyof ReportSections) => {
    if (!available[key]) return
    if (sections[key] && activeCount <= 1) return
    settings.setSections({ ...settings.sections, [key]: !sections[key] })
  }

  return (
    // Ziel ist ein Bildschirm ohne Scrollen: Titel einzeilig, Umfang in der
    // Kopfkarte, enge Abstände.
    <div className="space-y-2.5 pb-24">
      <PageHeader title={t('report.title')} subtitle={t('report.subtitle')} />

      <ReportSummary
        sections={sections}
        monitoring={monitoringData}
        measurements={measurementsData}
        metersWithData={metersWithData}
        objectName={(profile.profileName ?? '').trim() || undefined}
      />

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 pt-4">
          <SectionLabel>{t('report.builder.sections')}</SectionLabel>
        </div>
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
          <RangePicker value={rangeDays} onChange={settings.setRange} />
        </SectionRow>
      </Card>

      <ShareBar
        sections={sections}
        monitoring={monitoringData}
        measurements={measurementsData}
        profile={profile}
        // Ohne Messungen und ohne Ablesungen gäbe es nichts zu berichten – die
        // Gebäudedaten allein sind kein Bericht mehr.
        canExport={activeCount > 0}
      />
    </div>
  )
}

// --- Kopfbereich ---------------------------------------------------------

interface SummaryProps {
  sections: ReportSections
  monitoring: ReturnType<typeof buildMonitoringReportData>
  measurements: ReturnType<typeof buildMeasurementsReportData>
  metersWithData: number
  objectName?: string
}

/**
 * Kopfkarte: Papier-Motiv und die Fakten, die tatsächlich im PDF landen.
 */
function ReportSummary({
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
        <ReportPreview />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {objectName ?? t('home.profileNameFallback')}
          </p>
          <p className="mt-1 text-xs text-muted">
            {facts.length > 0 ? facts.join(' · ') : t('report.facts.noData')}
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
        className={`focus-ring flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
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
        <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
        <span className="shrink-0 truncate text-xs text-muted">{detail}</span>
      </button>
      {checked && children && <div className="px-5 pb-3 pl-14">{children}</div>}
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
}

/**
 * Zeitraum als zusammenhängender Umschalter: eine Wahl auf einer Skala, nicht
 * vier lose Schaltflächen. Was daraus folgt – Zähler, Ablesungen, Datumsbereich –
 * steht bereits in der Kopfkarte und wird hier nicht wiederholt.
 */
function RangePicker({ value, onChange }: RangePickerProps) {
  const { t } = useTranslation()

  return (
    <Segmented
      ariaLabel={t('report.builder.range')}
      options={RANGE_OPTIONS.map((r) => ({ key: r.key, label: t(`report.range.${r.key}`) }))}
      value={RANGE_OPTIONS.find((r) => r.value === value)?.key ?? 'all'}
      onChange={(key) => onChange(RANGE_OPTIONS.find((r) => r.key === key)?.value ?? null)}
    />
  )
}

// --- Export --------------------------------------------------------------

/** Zustand der Export-Schaltfläche (steuert Beschriftung und Rückmeldung). */
type ExportStatus = 'idle' | 'busy' | 'done' | 'shared' | 'error'

interface ShareBarProps {
  sections: ReportSections
  monitoring: ReturnType<typeof buildMonitoringReportData>
  measurements: ReturnType<typeof buildMeasurementsReportData>
  profile: ReturnType<typeof useOnboardingStore.getState>['data']
  /** Gibt es überhaupt einen Abschnitt mit Daten? */
  canExport: boolean
}

/** Fixe Leiste mit Teilen-/Download-Schaltfläche und Rückmeldung. */
function ShareBar({
  sections,
  monitoring,
  measurements,
  profile,
  canExport,
}: ShareBarProps) {
  const { t, i18n } = useTranslation()
  // Für die Empfehlungen im Bericht: dieselben Rohergebnisse, aus denen auch
  // der Tipps-Bereich der App seine Vorschläge baut.
  const results = useMeasurementsStore((s) => s.results)
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
        sections,
        t,
        language: i18n.language,
        objectName: profile.profileName,
        measurements,
        monitoring,
        // Dieselben Empfehlungen wie im Tipps-Bereich der App – der Bericht
        // führte sonst ein zweites, fast leeres Tipp-System. Ohne Zählerstand-
        // Kontext: Der Bericht ordnet Empfehlungen ihrer Messung zu, und der
        // Verbrauchstrend gehört zu keiner.
        tipsByMeasurement: tipsByMeasurement(buildTips(profile, results), t, i18n.language),
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
        {!canExport && status === 'idle' && (
          <p className="mb-2 text-center text-sm text-muted">{t('report.builder.emptyHint')}</p>
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
          disabled={status === 'busy' || !canExport}
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
 * PDF hält. Als SVG mit viewBox gezeichnet, damit das Motiv bei jeder Größe
 * vollständig bleibt. Die gestapelten Seiten stehen für den mehrseitigen
 * Bericht.
 */
function ReportPreview() {
  const rows = [84, 68, 76, 58]

  return (
    <div aria-hidden="true" className="relative w-[56px] shrink-0">
      <div className="absolute inset-x-1.5 -bottom-1 top-2 rotate-[6deg] origin-bottom rounded-md bg-zinc-300/70" />
      <div className="absolute inset-x-1 -bottom-0.5 top-1.5 rotate-[3deg] origin-bottom rounded-md bg-zinc-200" />

      <div className="relative overflow-hidden rounded-md border border-black/10 bg-white shadow-[0_10px_20px_-10px_rgba(20,30,10,0.45)]">
        <svg viewBox="0 0 100 141" className="block w-full">
          {/* Kopf: Logo-Andeutung, Titelbalken, Untertitel, Trennlinie. */}
          <rect x="8" y="10" width="8" height="8" rx="1.5" fill="#27272a" />
          <rect x="20" y="11" width="34" height="6" rx="1.5" fill="#27272a" />
          <rect x="8" y="24" width="30" height="4" rx="1" fill="#d4d4d8" />
          <rect x="8" y="33" width="84" height="1" fill="#e4e4e7" />

          {/* Diagramm */}
          <polyline
            points="8,58 22,50 36,54 50,42 64,45 78,34 92,30"
            fill="none"
            stroke="#27272a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Kennzahl-Kacheln */}
          {[8, 37, 66].map((x) => (
            <rect key={x} x={x} y="68" width="26" height="16" rx="2.5" fill="#f4f4f5" />
          ))}

          {/* Tabellenzeilen */}
          {rows.map((w, i) => (
            <rect key={i} x="8" y={94 + i * 9} width={w} height="3" rx="1.5" fill="#e4e4e7" />
          ))}
        </svg>
      </div>

      <div className="absolute -right-1 -top-1 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[7px] font-bold leading-none text-white shadow-[0_4px_10px_-4px_rgba(0,0,0,0.6)]">
        PDF
      </div>
    </div>
  )
}

interface SegmentedOption {
  key: string
  label: string
}

interface SegmentedProps {
  ariaLabel: string
  options: SegmentedOption[]
  value: string
  onChange: (key: string) => void
}

/**
 * Zusammenhängender Umschalter für genau eine Wahl aus wenigen Möglichkeiten.
 * Ein Element statt mehrerer freistehender Schaltflächen.
 */
function Segmented({ ariaLabel, options, value, onChange }: SegmentedProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex rounded-2xl border border-border bg-surface-2/50 p-1"
    >
      {options.map((o) => {
        const selected = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.key)}
            className={`focus-ring flex-1 rounded-xl px-1 py-1.5 text-xs font-semibold transition-colors ${
              selected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
  )
}
