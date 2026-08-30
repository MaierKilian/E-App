import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Plus, Sun, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useWidgetOrderStore } from '@/store/widgetOrderStore'
import { ENERGY_META, ALL_ENERGY_TYPES, boardEnergyTypes } from './energyConfig'
import { sortByDate } from './readings'
import { dueTypes } from './due'
import { AddReadingScreen } from './AddReadingScreen'
import { MeterSetupScreen } from './MeterSetupScreen'
import { WidgetBoard } from './WidgetBoard'
import { isTankType } from './counterSeries'

/**
 * Führt die gespeicherte Wunsch-Reihenfolge mit den aktuell sichtbaren Zählern
 * zusammen: bekannte Typen in der gewählten Reihenfolge, danach neu
 * hinzugekommene Energieträger. Entfernte Typen fallen automatisch weg.
 */
function mergeOrder(saved: EnergyType[], active: EnergyType[]): EnergyType[] {
  const activeSet = new Set(active)
  const known = saved.filter((type) => activeSet.has(type))
  const missing = active.filter((type) => !known.includes(type))
  return [...known, ...missing]
}

/**
 * Monitoring-Übersicht (Dashboard): prägnanter Kopf, dann das anordenbare
 * Widget-Board – ein großes Hero-Widget (Position 0) und darunter das Raster
 * der übrigen Energieträger. Widgets lassen sich per Gedrückt-halten-und-ziehen
 * frei umsortieren; die Reihenfolge wird pro Wohnprofil gespeichert. Jede Karte
 * zeigt Stand, Mini-Verlauf und Trend; Tap öffnet die Detailseite.
 */
export function MonitoringPage() {
  const { t } = useTranslation()
  const data = useOnboardingStore((s) => s.data)
  const readingsByType = useReadingsStore((s) => s.readings)
  const meters = useReadingsStore((s) => s.meters)
  const frequency = useReadingsStore((s) => s.reminderFrequency)
  const savedOrder = useWidgetOrderStore((s) => s.order)
  const setOrder = useWidgetOrderStore((s) => s.setOrder)
  const hidden = useWidgetOrderStore((s) => s.hidden)
  const showType = useWidgetOrderStore((s) => s.showType)
  const pvPromptDismissed = useSettingsStore((s) => s.pvPromptDismissed)
  const dismissPvPrompt = useSettingsStore((s) => s.dismissPvPrompt)
  const navigate = useNavigate()
  const [now] = useState(() => Date.now())
  // Direkteingabe: ohne Umweg über die Detailseite den Zählerstand erfassen.
  const [addType, setAddType] = useState<EnergyType | null>(null)
  // Ein bevorratbarer Träger wird vor der ersten Eingabe eingerichtet: Ohne die
  // Frage „Zähler oder Vorrat?" landete ein Öltank im Zählwerk-Modell.
  const [setupType, setSetupType] = useState<EnergyType | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Auf dem Board stehen die vorgeschlagenen Träger und alles, wofür schon
  // abgelesen wurde – ein selbst angelegter Zähler verschwindet nicht wieder.
  const types = useMemo(
    () => boardEnergyTypes(data, readingsByType, hidden),
    [data, readingsByType, hidden],
  )
  const order = useMemo(() => mergeOrder(savedOrder, types), [savedOrder, types])
  const due = useMemo(
    () => new Set(dueTypes(data, readingsByType, frequency, now, hidden)),
    [data, readingsByType, frequency, now, hidden],
  )

  const addMeta = addType ? ENERGY_META[addType] : null
  const addLatest = addType ? sortByDate(readingsByType[addType] ?? []).at(-1) : undefined
  const addConfig = addType ? meters[addType] : undefined
  const addIsLevel = addConfig?.mode === 'level'

  /**
   * Öffnet die Eingabe – bei einem noch nicht eingerichteten bevorratbaren
   * Träger zuerst die Modus-Wahl. Nach dem Einrichten geht es in die passende
   * Eingabemaske weiter.
   */
  function startAdd(type: EnergyType) {
    const isNewTank =
      isTankType(type) &&
      meters[type] === undefined &&
      (readingsByType[type]?.length ?? 0) === 0
    if (isNewTank) setSetupType(type)
    else setAddType(type)
  }

  // Angegebene PV-Anlage, aber nie ein Erzeugungswert: Die Profilangabe erinnert
  // daran, statt – wie früher – den Zähler überhaupt erst freizuschalten.
  const showPvPrompt =
    data.hasPV === 'yes' && !pvPromptDismissed && (readingsByType.pv?.length ?? 0) === 0

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('monitoring.overview.title')}
        subtitle={t('monitoring.overview.subtitle')}
      />

      {due.size > 0 && (
        <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-foreground">
          <span className="grid place-items-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </span>
          {t('monitoring.overview.dueBanner', { count: due.size })}
        </div>
      )}

      {showPvPrompt && (
        <div className="glass flex items-start gap-2.5 rounded-2xl px-4 py-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10">
            <Sun className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {t('monitoring.overview.pvPrompt')}
            </p>
            <button
              type="button"
              onClick={() => startAdd('pv')}
              className="focus-ring mt-1 rounded text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              {t('monitoring.overview.pvPromptCta')}
            </button>
          </div>
          <button
            type="button"
            onClick={dismissPvPrompt}
            aria-label={t('common.close')}
            className="focus-ring -mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {order.length > 0 && (
        <WidgetBoard
          order={order}
          due={due}
          now={now}
          onReorder={setOrder}
          onAdd={startAdd}
        />
      )}

      {/* Jeder Träger, den die App kennt, ist von hier aus erfassbar – auch
          einer, den das Profil nicht nahelegt. */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        {t('monitoring.overview.addMeter')}
      </button>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('monitoring.overview.addMeterTitle')}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {ALL_ENERGY_TYPES.map((type) => {
            const meta = ENERGY_META[type]
            const Icon = meta.icon
            const known = types.includes(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setPickerOpen(false)
                  // Wer einen entfernten Zähler erneut wählt, will ihn zurück –
                  // ohne das hier bliebe er trotz neuer Ablesung unsichtbar.
                  showType(type)
                  if (known) navigate(`/monitoring/${type}`)
                  else startAdd(type)
                }}
                className="glass focus-ring flex items-center gap-2.5 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-foreground transition-transform active:scale-[0.98]"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: `${meta.accent}1f`, color: meta.accent }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {/* Umbrechen statt kürzen: „Wärmepumpe" und „Solarthermie"
                    passen in zwei Spalten nicht in eine Zeile, und ein
                    abgeschnittener Trägername ist hier nicht zu gebrauchen. */}
                <span className="min-w-0">
                  <span className="block leading-tight">
                    {t(`monitoring.energyTypes.${type}`)}
                  </span>
                  {known && (
                    <span className="mt-0.5 block text-[11px] font-normal leading-tight text-muted">
                      {t('monitoring.overview.addMeterKnown')}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </Modal>

      {order.length >= 2 && (
        <p className="text-center text-xs text-muted">{t('monitoring.overview.reorderHint')}</p>
      )}

      {setupType && (
        <MeterSetupScreen
          type={setupType}
          isNew
          onClose={(saved) => {
            const next = setupType
            setSetupType(null)
            // Abbrechen heißt abbrechen: Ohne Einrichtung wird auch nichts
            // eingetragen, sonst entstünde still ein Zähler im falschen Modell.
            if (saved) setAddType(next)
          }}
        />
      )}

      {addType && addMeta && (
        <AddReadingScreen
          type={addType}
          unit={addMeta.unit}
          typeLabel={t(`monitoring.energyTypes.${addType}`)}
          accent={addMeta.accent}
          icon={addMeta.icon}
          defaultValue={addLatest ? (addIsLevel ? addLatest.value : Math.trunc(addLatest.value)) : 0}
          level={addIsLevel}
          capacity={addConfig?.capacity}
          onClose={() => setAddType(null)}
        />
      )}
    </div>
  )
}
