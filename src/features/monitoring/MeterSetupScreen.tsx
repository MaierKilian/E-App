import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gauge, Fuel, X, AlertTriangle } from 'lucide-react'
import { useReadingsStore, type EnergyType, type ReadingMode } from '@/store/readingsStore'
import { parseDecimalInput, formatDecimalInput } from '@/lib/decimalInput'
import { defaultMeterMode, meterMode } from './counterSeries'
import { ENERGY_META } from './energyConfig'

interface MeterSetupScreenProps {
  type: EnergyType
  /** Schließt den Screen; `saved` unterscheidet Speichern von Abbrechen. */
  onClose: (saved: boolean) => void
  /** true = der Zähler wird gerade erst angelegt (kein Abbruch-Hinweis nötig). */
  isNew?: boolean
}

/**
 * Einrichtung eines bevorratbaren Zählers: Zählwerk oder Vorrat, dazu das
 * optionale Fassungsvermögen.
 *
 * Der Umschalter ist der heikle Teil. Ein Moduswechsel deutet **alle**
 * gespeicherten Stände um – aufsteigende Zählerstände als fallende Füllstände
 * zu lesen ergibt keinen sinnvollen Verlauf. Deshalb wird die Zahl der
 * betroffenen Ablesungen genannt und das Verwerfen ausdrücklich angeboten,
 * statt still das eine oder das andere zu tun.
 */
export function MeterSetupScreen({ type, onClose, isNew = false }: MeterSetupScreenProps) {
  const { t, i18n } = useTranslation()
  const config = useReadingsStore((s) => s.meters[type])
  const readings = useReadingsStore((s) => s.readings[type])
  const setMeterMode = useReadingsStore((s) => s.setMeterMode)
  const setCapacity = useReadingsStore((s) => s.setCapacity)
  const removeType = useReadingsStore((s) => s.removeType)

  const meta = ENERGY_META[type]
  const count = readings?.length ?? 0
  // Vorbelegung: die hinterlegte Wahl, sonst der Standard für die Neuanlage –
  // aber **nie** ein Wechsel für einen Zähler, der schon läuft. Wer bereits
  // Stände erfasst hat, sieht seinen gegenwärtigen Modus vorausgewählt und
  // muss den Wechsel selbst antippen.
  const current = config
    ? meterMode(config)
    : count > 0
      ? 'counter'
      : defaultMeterMode(type)
  const [mode, setMode] = useState<ReadingMode>(current)
  const [capacityText, setCapacityText] = useState(() =>
    formatDecimalInput(config?.capacity, i18n.language),
  )
  // Nur ein echter Wechsel bei vorhandenen Ablesungen deutet etwas um. Beim
  // erstmaligen Einrichten gibt es nichts umzudeuten.
  const switching = count > 0 && mode !== meterMode(config)
  const parsedCapacity = parseDecimalInput(capacityText, i18n.language)

  function save(discard: boolean) {
    if (discard) {
      // Erst löschen, dann konfigurieren: `removeType` nimmt die Konfiguration
      // mit, eine umgekehrte Reihenfolge verwürfe den gerade gesetzten Modus.
      removeType(type)
    }
    setMeterMode(type, mode)
    setCapacity(
      type,
      mode === 'level' && parsedCapacity !== undefined && parsedCapacity > 0
        ? parsedCapacity
        : undefined,
    )
    onClose(true)
  }

  return (
    <div
      className="glass z-50 flex flex-col gap-5 overflow-y-auto p-5 animate-step-in"
      style={{ position: 'fixed', inset: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            {t('monitoring.tank.setupTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t(`monitoring.energyTypes.${type}`)}</p>
        </div>
        <button
          type="button"
          onClick={() => onClose(false)}
          aria-label={t('common.close')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="text-sm text-muted">{t('monitoring.tank.setupIntro')}</p>

      <div className="flex flex-col gap-2.5">
        <ModeCard
          icon={Gauge}
          active={mode === 'counter'}
          accent={meta.accent}
          title={t('monitoring.tank.modeCounter')}
          hint={t('monitoring.tank.modeCounterHint')}
          onSelect={() => setMode('counter')}
        />
        <ModeCard
          icon={Fuel}
          active={mode === 'level'}
          accent={meta.accent}
          title={t('monitoring.tank.modeLevel')}
          hint={t('monitoring.tank.modeLevelHint')}
          onSelect={() => setMode('level')}
        />
      </div>

      {mode === 'level' && (
        <div className="space-y-1.5">
          <label htmlFor="meter-capacity" className="text-sm font-medium text-foreground">
            {t('monitoring.tank.capacity')}{' '}
            <span className="font-normal text-muted">
              ({t('monitoring.tank.capacityOptional')})
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="meter-capacity"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={capacityText}
              placeholder={t('monitoring.tank.capacityPlaceholder')}
              onChange={(e) => setCapacityText(e.target.value)}
              className="w-40 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-sm text-muted">{meta.unit}</span>
          </div>
          <p className="text-xs text-muted">{t('monitoring.tank.capacityHint')}</p>
        </div>
      )}

      {switching && (
        <div className="rounded-2xl border border-border bg-surface-2/60 p-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t('monitoring.tank.switchWarnTitle')}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {mode === 'level'
              ? t('monitoring.tank.switchWarnToLevel', { count })
              : t('monitoring.tank.switchWarnToCounter', { count })}
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={() => save(false)}
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {switching ? t('monitoring.tank.switchKeep') : t('monitoring.odometer.save')}
        </button>
        {switching && (
          <button
            type="button"
            onClick={() => save(true)}
            className="w-full rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-2/70"
          >
            {t('monitoring.tank.switchDiscard')}
          </button>
        )}
        {!isNew && (
          <button
            type="button"
            onClick={() => onClose(false)}
            className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            {t('monitoring.odometer.cancel')}
          </button>
        )}
      </div>
    </div>
  )
}

interface ModeCardProps {
  icon: typeof Gauge
  active: boolean
  accent: string
  title: string
  hint: string
  onSelect: () => void
}

function ModeCard({ icon: Icon, active, accent, title, hint, onSelect }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="focus-ring flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors"
      style={{
        borderColor: active ? accent : 'var(--border)',
        background: active ? `${accent}14` : 'transparent',
      }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{ background: `${accent}1f`, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted">{hint}</span>
      </span>
    </button>
  )
}
