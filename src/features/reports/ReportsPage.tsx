import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Download,
  Ruler,
  Gauge,
  Layers,
  ChevronLeft,
  ChevronDown,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
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
import { fmtDateShort } from './pdf/format'
import { buildMeasurementsReportData } from './measurementsReportData'
import {
  buildMonitoringReportData,
  suggestRangeDays,
  type RangeDays,
} from './monitoringReportData'
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
      {/* Große Kopfzeile nur in der Übersicht – im Builder wäre sie redundant
          (dort gibt es „Zurück“ + Titel) und würde unnötig Platz kosten. */}
      {active === null && (
        <header className="flex items-start gap-4">
          <span className="grid place-items-center w-12 h-12 rounded-2xl bg-primary/10 text-primary shrink-0">
            <FileText className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{t('report.title')}</h1>
            <p className="text-muted mt-1 text-sm">{t('report.subtitle')}</p>
          </div>
        </header>
      )}

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

/** Inhalts-Schalter, die im jeweiligen Abschnitt überhaupt eine Wirkung haben. */
const MONITORING_KEYS = ['charts', 'readingCurve', 'kpis', 'comparison', 'history'] as const
const MEASUREMENT_KEYS = ['savings', 'tips', 'openMeasurements'] as const

interface BuilderProps {
  type: ReportType
  onBack: () => void
}

/** Zustand der Export-Schaltfläche (steuert Label und Rückmeldung). */
type ExportStatus = 'idle' | 'busy' | 'done' | 'error'

/** Builder: Variante, Inhalte, Zeitraum, Auswahl + Vorschau + Export. */
function ReportBuilder({ type, onBack }: BuilderProps) {
  const { t, i18n } = useTranslation()

  const profile = useOnboardingStore((s) => s.data)
  const results = useMeasurementsStore((s) => s.results)
  const readingsByType = useReadingsStore((s) => s.readings)
  // Ganzer Tarif-State: der Bericht rechnet Kosten für jeden Träger mit
  // hinterlegtem Preis, nicht nur für Strom.
  const tariff = useTariffStore()

  const showMonitoring = type === 'monitoring' || type === 'total'
  const showMeasurements = type === 'measurements' || type === 'total'

  const meterTypes = useMemo(() => activeEnergyTypes(profile), [profile])
  const catTypes = useMemo(
    () => Array.from(new Set(MEASUREMENT_CATALOG.map((m) => m.category))),
    [],
  )

  const [variant, setVariant] = useState<ReportVariant>('short')
  const [options, setOptions] = useState<ReportContentOptions>(() => defaultContentOptions('short'))
  // Selbst gesetzte Inhalts-Häkchen überleben einen Variantenwechsel; alle
  // übrigen folgen weiter den Defaults der jeweiligen Variante.
  const [touched, setTouched] = useState<Set<keyof ReportContentOptions>>(() => new Set())
  // Zeitraum passend zu den vorhandenen Ablesungen vorbelegen – ein fester
  // 30-Tage-Default träfe bei unregelmäßiger Ablesung oft gar keine Daten.
  const [rangeDays, setRangeDays] = useState<RangeDays>(() =>
    suggestRangeDays(readingsByType, meterTypes),
  )
  // Auswahl ist explizit: anfangs alles gewählt, Tippen wählt ab. Mindestens
  // ein Eintrag bleibt stehen (sonst wäre der Bericht leer).
  const [meters, setMeters] = useState<EnergyType[]>(() => meterTypes)
  const [categories, setCategories] = useState<MeasurementCategory[]>(() => catTypes)
  const [status, setStatus] = useState<ExportStatus>('idle')
  // Erweiterte Optionen (Inhalte, Zeitraum, Zähler, Gewerke) standardmäßig
  // eingeklappt – der Standard ist bewusst schlank (nur Umfang + Export).
  const [advanced, setAdvanced] = useState(false)

  // Der Vergleich braucht ein gleich langes Fenster davor – bei „Alle" gibt es keins.
  const comparisonAvailable = rangeDays !== null

  const changeVariant = (v: ReportVariant) => {
    setVariant(v)
    setOptions((prev) => {
      const next = defaultContentOptions(v)
      for (const key of touched) next[key] = prev[key]
      return next
    })
  }

  const toggleOption = (key: keyof ReportContentOptions) => {
    setTouched((cur) => new Set(cur).add(key))
    setOptions((o) => ({ ...o, [key]: !o[key] }))
  }

  const toggleMeter = (m: EnergyType) =>
    setMeters((cur) =>
      cur.includes(m) ? (cur.length > 1 ? cur.filter((x) => x !== m) : cur) : [...cur, m],
    )

  const toggleCategory = (c: MeasurementCategory) =>
    setCategories((cur) =>
      cur.includes(c) ? (cur.length > 1 ? cur.filter((x) => x !== c) : cur) : [...cur, c],
    )

  // Objektname für Kopfzeile und Dateiname des PDF.
  const objectName = (profile.profileName ?? '').trim() || undefined

  // Beide Auswertungen sind reine Funktionen – einmal berechnet, versorgen sie
  // die Fakten-Zeile und den Export, statt beim Tippen auf „Exportieren" neu
  // zu laufen. So zeigt die Vorschau garantiert dieselben Zahlen wie das PDF.
  const monitoringData = useMemo(
    () =>
      showMonitoring
        ? buildMonitoringReportData({ profile, readingsByType, rangeDays, tariff, types: meters })
        : undefined,
    [showMonitoring, profile, readingsByType, rangeDays, tariff, meters],
  )
  const measurementsData = useMemo(
    () => (showMeasurements ? buildMeasurementsReportData({ results, categories }) : undefined),
    [showMeasurements, results, categories],
  )

  // Inhalts-Schalter, die für diesen Berichtstyp gelten und aktuell wirksam
  // sind (der Vorperioden-Vergleich braucht einen festen Zeitraum).
  const relevantKeys = useMemo<(keyof ReportContentOptions)[]>(() => {
    const keys: (keyof ReportContentOptions)[] = []
    if (showMonitoring) keys.push(...MONITORING_KEYS)
    if (showMeasurements) keys.push(...MEASUREMENT_KEYS)
    return keys.filter((k) => k !== 'comparison' || comparisonAvailable)
  }, [showMonitoring, showMeasurements, comparisonAvailable])

  // Was der Langbericht gegenüber dem Kurzbericht zusätzlich enthält – das ist
  // die eigentliche Entscheidung hinter „Umfang".
  const longExtras = useMemo(() => {
    const short = defaultContentOptions('short')
    const long = defaultContentOptions('long')
    return relevantKeys.filter((k) => long[k] && !short[k]).map((k) => t(`report.contents.${k}`))
  }, [relevantKeys, t])

  // Fakten über das, was tatsächlich im PDF landet.
  const facts = useMemo(() => {
    const parts: string[] = []
    if (monitoringData) {
      const withData = monitoringData.entries.filter((e) => e.readingCount > 0).length
      if (withData > 0) parts.push(t('report.facts.meters', { count: withData }))
      if (monitoringData.readingCount > 0) {
        parts.push(t('report.facts.readings', { count: monitoringData.readingCount }))
      }
    }
    if (measurementsData && measurementsData.doneCount > 0) {
      parts.push(t('report.facts.measurements', { count: measurementsData.doneCount }))
    }
    return parts
  }, [monitoringData, measurementsData, t])

  const period =
    monitoringData?.from && monitoringData.to
      ? t('report.facts.period', {
          from: fmtDateShort(monitoringData.from, i18n.language),
          to: fmtDateShort(monitoringData.to, i18n.language),
        })
      : undefined

  // Zusammenfassung für den zugeklappten „Anpassen"-Bereich: der aktuelle
  // Stand soll ablesbar sein, ohne aufzuklappen.
  const customizeSummary = useMemo(() => {
    const parts: string[] = []
    const active = relevantKeys.filter((k) => options[k]).length
    parts.push(
      active === relevantKeys.length
        ? t('report.builder.summaryAllContents')
        : t('report.builder.summaryContents', { selected: active, total: relevantKeys.length }),
    )
    if (showMonitoring) {
      // „Alle" allein waere zwischen den anderen Teilen nicht als Zeitraum
      // erkennbar – hier deshalb ausgeschrieben.
      parts.push(
        rangeDays === null
          ? t('report.builder.summaryAllRange')
          : t(`report.range.d${rangeDays}`),
      )
      if (meterTypes.length > 1) {
        parts.push(
          meters.length === meterTypes.length
            ? t('report.builder.summaryAllMeters')
            : meters.map((m) => t(`monitoring.energyTypes.${m}`)).join(', '),
        )
      }
    }
    if (showMeasurements && catTypes.length > 1) {
      parts.push(
        categories.length === catTypes.length
          ? t('report.builder.summaryAllCategories')
          : categories.map((c) => t(`measurements.categories.${c}`)).join(', '),
      )
    }
    return parts.join(' · ')
  }, [
    relevantKeys,
    options,
    showMonitoring,
    showMeasurements,
    rangeDays,
    meters,
    meterTypes,
    categories,
    catTypes,
    t,
  ])

  // „Erstellt"-Meldung nach kurzer Zeit wieder ausblenden.
  const resetTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  const handleExport = async () => {
    window.clearTimeout(resetTimer.current)
    setStatus('busy')
    try {
      if (type === 'measurements' && measurementsData) {
        const { generateMeasurementsPdf } = await import('./generateMeasurementsPdf')
        generateMeasurementsPdf({
          variant,
          options,
          t,
          language: i18n.language,
          data: measurementsData,
          objectName,
        })
      } else if (type === 'monitoring' && monitoringData) {
        const { generateMonitoringPdf } = await import('./generateMonitoringPdf')
        generateMonitoringPdf({
          variant,
          options,
          t,
          language: i18n.language,
          data: monitoringData,
          objectName,
        })
      } else if (measurementsData && monitoringData) {
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
          measurements: measurementsData,
          monitoring: monitoringData,
        })
      }
      setStatus('done')
      resetTimer.current = window.setTimeout(() => setStatus('idle'), 4000)
    } catch (error) {
      // Ohne sichtbare Meldung würde der Button einfach wieder aktiv werden
      // und der Nutzer stünde ohne PDF und ohne Erklärung da.
      console.error('[reports] PDF-Export fehlgeschlagen', error)
      setStatus('error')
    }
  }

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

      <h2 className="text-lg font-bold">{t(`report.types.${type}.title`)}</h2>

      {/* Kopf: kleines Papier-Motiv neben den Fakten, die wirklich im PDF
          landen – Objekt, Umfang, Datenmenge, Zeitraum. */}
      <Card className="!p-4">
        <div className="flex items-center gap-4">
          <ReportPreview variant={variant} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {objectName ?? t('home.profileNameFallback')}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {t(`report.variant.${variant}`)} · PDF
            </p>
            <p className="mt-2 text-xs text-muted">
              {facts.length > 0 ? facts.join(' · ') : t('report.facts.noData')}
            </p>
            {period && <p className="mt-0.5 text-xs text-muted">{period}</p>}
          </div>
        </div>
      </Card>

      {/* Umfang – die eine sichtbare Entscheidung. Der Rest hat sinnvolle
          Defaults und liegt unter „Anpassen“. */}
      <Card>
        <SectionLabel>{t('report.builder.variant')}</SectionLabel>
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          <VariantCard
            label={t('report.variant.short')}
            description={t('report.variantDesc.short')}
            selected={variant === 'short'}
            onClick={() => changeVariant('short')}
          />
          <VariantCard
            label={t('report.variant.long')}
            description={t('report.variantDesc.long')}
            extra={
              longExtras.length > 0
                ? t('report.variantExtra', { items: longExtras.join(', ') })
                : undefined
            }
            selected={variant === 'long'}
            onClick={() => changeVariant('long')}
          />
        </div>
      </Card>

      {/* Anpassen – erweiterte Optionen, standardmäßig eingeklappt */}
      <div className="glass rounded-2xl">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="focus-ring flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {t('report.builder.customize')}
            </span>
            {/* Aktueller Stand ohne Aufklappen ablesbar. */}
            <span className="mt-0.5 block truncate text-xs text-muted">{customizeSummary}</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted transition-transform ${advanced ? 'rotate-180' : ''}`}
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
                    <ToggleChip label={t('report.contents.readingCurve')} active={options.readingCurve} onClick={() => toggleOption('readingCurve')} />
                    <ToggleChip label={t('report.contents.kpis')} active={options.kpis} onClick={() => toggleOption('kpis')} />
                    <ToggleChip
                      label={t('report.contents.comparison')}
                      active={options.comparison && comparisonAvailable}
                      disabled={!comparisonAvailable}
                      onClick={() => toggleOption('comparison')}
                    />
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
              {showMonitoring && !comparisonAvailable && (
                <p className="mt-2 text-xs text-muted">{t('report.builder.comparisonHint')}</p>
              )}
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
                      selected={meters.includes(m)}
                      onClick={() => toggleMeter(m)}
                    />
                  ))}
                </div>
                {meters.length === 1 && (
                  <p className="mt-2 text-xs text-muted">{t('report.builder.minSelectionHint')}</p>
                )}
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
                      selected={categories.includes(c)}
                      onClick={() => toggleCategory(c)}
                    />
                  ))}
                </div>
                {categories.length === 1 && (
                  <p className="mt-2 text-xs text-muted">{t('report.builder.minSelectionHint')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixe Export-Leiste – immer erreichbar */}
      <div className="glass-bar fixed inset-x-0 z-30 border-t border-border/60 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 md:pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {/* Rückmeldung direkt über dem Button – ein still fehlgeschlagener
              Export wäre sonst nicht von einem erfolgreichen zu unterscheiden. */}
          {status === 'error' && (
            <p
              role="alert"
              className="mb-2 flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t('report.builder.exportError')}
            </p>
          )}
          {status === 'done' && (
            <p
              role="status"
              className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t('report.builder.exportDone')}
            </p>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={status === 'busy'}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition-[transform,background-color] duration-200 active:scale-[0.98] disabled:opacity-60"
          >
            <Download className="w-5 h-5" />
            {status === 'busy' ? t('report.builder.exporting') : t('report.builder.export')}
          </button>
        </div>
      </div>
    </div>
  )
}

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
      {/* Gestapelte Seiten – deuten Mehrseitigkeit an (nur beim Langbericht). */}
      {long && (
        <>
          <div className="absolute inset-x-2 -bottom-1 top-3 rotate-[6deg] origin-bottom rounded-lg bg-zinc-300/70" />
          <div className="absolute inset-x-1 -bottom-0.5 top-2 rotate-[3deg] origin-bottom rounded-lg bg-zinc-200" />
        </>
      )}

      {/* Vorderseite */}
      <div className="relative aspect-[1/1.414] overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_10px_20px_-10px_rgba(20,30,10,0.45)]">
        <div className="px-2 pt-2">
          {/* Kopf: Logo-Andeutung, Titelbalken, feine Trennlinie – wie im PDF. */}
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 shrink-0 rounded-[2px] bg-zinc-800" />
            <span className="h-1.5 w-8 rounded-sm bg-zinc-800" />
          </div>
          <span className="mt-1 block h-[3px] w-10 rounded-sm bg-zinc-300" />
          <span className="mt-1.5 block h-px w-full bg-zinc-200" />

          {/* Diagramm */}
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

          {/* Kennzahl-Kacheln */}
          <div className="mt-1.5 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-[13px] flex-1 rounded-[3px] bg-zinc-100" />
            ))}
          </div>

          {/* Tabellenzeilen */}
          <div className="mt-1.5 flex flex-col gap-1">
            {[100, 82, 92, 70].slice(0, long ? 4 : 2).map((w, i) => (
              <span key={i} className="block h-[3px] rounded bg-zinc-200" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* PDF-Badge */}
      <div className="absolute -right-1.5 top-1.5 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[8px] font-bold leading-none text-white shadow-[0_4px_10px_-4px_rgba(0,0,0,0.6)]">
        PDF
      </div>
    </div>
  )
}

interface VariantCardProps {
  label: string
  description: string
  /** Was diese Variante zusätzlich enthält (nur beim Langbericht sinnvoll). */
  extra?: string
  selected: boolean
  onClick: () => void
}

/**
 * Umfang-Auswahl als Karte statt als Chip: der Unterschied zwischen Kurz- und
 * Langbericht steht damit direkt an der Entscheidung.
 */
function VariantCard({ label, description, extra, selected, onClick }: VariantCardProps) {
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
      {extra && <span className="mt-1 block text-xs leading-snug text-muted">{extra}</span>}
    </button>
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
  /** Inhalt ist in der aktuellen Konstellation nicht verfügbar. */
  disabled?: boolean
}

/** Toggle-Chip für an-/abwählbare Inhalte (mit Häkchen wenn aktiv). */
function ToggleChip({ label, active, onClick, disabled = false }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`focus-ring inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-medium transition-[transform,background-color,color] duration-200 ${
        disabled
          ? 'glass cursor-not-allowed text-muted opacity-45'
          : active
            ? 'bg-primary text-primary-foreground border border-primary active:scale-[0.94]'
            : 'glass text-muted hover:bg-surface-2/70 active:scale-[0.94]'
      }`}
    >
      {active && !disabled && <Check className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}
