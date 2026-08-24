import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Home,
  AppWindow,
  Flame,
  Building2,
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  TrendingDown,
  ArrowUpRight,
  Gauge,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { Slider } from '@/components/ui/Slider'
import { useOnboardingStore } from '@/store/onboardingStore'
import { ONBOARDING_SECTIONS, sectionsFor } from '../sections'
import { estimateEnvelope } from '@/features/home/estimateEnergy'
import {
  RENOVATION_PARTS,
  addRenovationYear,
  boilerAgeYears,
  sortRenovations,
} from '../renovationProjection'
import type { OnboardingData, RenovationEvent, RenovationItem } from '@/types'

interface Props {
  data: OnboardingData
}

const ITEM_ICONS: Record<RenovationItem, LucideIcon> = {
  roof_insulation: Home,
  windows: AppWindow,
  heating_system: Flame,
  facade: Building2,
  basement_ceiling: Layers,
  nothing: Layers,
}

/** Erstes sinnvolles Jahr für eine neue Karte: heute, aber nie vor dem Baujahr. */
function suggestYear(data: OnboardingData): number {
  const now = new Date().getFullYear()
  return Math.max(data.buildingYear > 0 ? data.buildingYear : 1850, now)
}

/**
 * Sanierungen als Zeitstrahl statt als ein globales Jahr.
 *
 * Vorher: eine grobe Spanne („2000–2010") plus eine flache Häkchenliste – und
 * beides ging in keine Rechnung ein. Real werden Fenster 2005 und die Heizung
 * 2021 saniert; ein Jahr für alles kann das nicht abbilden.
 *
 * Jede Karte ist ein Jahr mit den Maßnahmen dieses Jahres. Daraus projiziert
 * `renovationProjection` den Bauteil-Zustand, mit dem die Effizienz-Einordnung
 * rechnet – ein Ort zum Eintragen, zwei Sichten darauf.
 */
export function StepRenovationLog({ data }: Props) {
  const { t } = useTranslation()
  const setRenovations = useOnboardingStore((s) => s.setRenovations)
  const events = data.renovations
  const [openId, setOpenId] = useState<string | null>(null)

  function update(next: RenovationEvent[] | null) {
    setRenovations(next === null ? null : sortRenovations(next))
  }

  function handleAdd() {
    const { events: next, id } = addRenovationYear(events, suggestYear(data))
    update(next)
    // Ein bereits erfasstes Jahr ergibt kein Duplikat – dann klappt genau die
    // vorhandene Karte auf.
    setOpenId(id)
  }

  function setYear(id: string, year: number) {
    update((events ?? []).map((e) => (e.id === id ? { ...e, year, estimated: false } : e)))
  }

  function toggleItem(id: string, item: RenovationItem) {
    update(
      (events ?? []).map((e) =>
        e.id === id
          ? {
              ...e,
              items: e.items.includes(item)
                ? e.items.filter((i) => i !== item)
                : [...e.items, item],
            }
          : e,
      ),
    )
  }

  function remove(id: string) {
    update((events ?? []).filter((e) => e.id !== id))
  }

  const currentYear = new Date().getFullYear()
  const neverRenovated = events !== null && events.length === 0

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('onboarding.renovationLog.subtitle')}</p>

      {(events ?? []).map((event) => {
        const isOpen = openId === event.id
        const tooEarly = data.buildingYear > 0 && event.year < data.buildingYear
        return (
          <div key={event.id} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : event.id)}
                aria-expanded={isOpen}
                className="focus-ring min-w-0 flex-1 rounded text-left"
              >
                <span className="block text-lg font-bold tabular-nums text-foreground">
                  {event.estimated
                    ? t('onboarding.renovationLog.aboutYear', { year: event.year })
                    : event.year}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {event.items.length > 0
                    ? event.items
                        .map((i) => t(`onboarding.step7renovation.renovationItemOptions.${i}`))
                        .join(', ')
                    : t('onboarding.renovationLog.noItems')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => remove(event.id)}
                aria-label={t('onboarding.renovationLog.remove')}
                className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {isOpen && (
              <div className="animate-panel-in mt-4 space-y-4 border-t border-border/50 pt-4">
                <Slider
                  value={event.year}
                  min={data.buildingYear > 0 ? Math.min(data.buildingYear, event.year) : 1850}
                  max={currentYear}
                  onChange={(v) => setYear(event.id, v)}
                />
                {/* Ein Sanierungsjahr vor dem Baujahr ist ein Tippfehler –
                    gesagt, nicht verhindert: Manche Baujahre im Profil sind
                    selbst nur geschätzt. */}
                {tooEarly && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t('onboarding.renovationLog.beforeBuildingYear', {
                      year: data.buildingYear,
                    })}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {RENOVATION_PARTS.map((item) => (
                    <OptionChip
                      key={item}
                      icon={ITEM_ICONS[item]}
                      label={t(`onboarding.step7renovation.renovationItemOptions.${item}`)}
                      selected={event.items.includes(item)}
                      onClick={() => toggleItem(event.id, item)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Immer erreichbar, direkt am Listenende – nicht in einem Menü. */}
      <button
        type="button"
        onClick={handleAdd}
        className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        {t('onboarding.renovationLog.add')}
      </button>

      {/* „Nie saniert" ist ein eigener Zustand, nicht dasselbe wie „noch nichts
          eingetragen" – sonst bliebe die Frage für immer offen. */}
      <button
        type="button"
        onClick={() => update(neverRenovated ? null : [])}
        aria-pressed={neverRenovated}
        className={`focus-ring w-full rounded-2xl px-5 py-2.5 text-sm font-medium transition-colors ${
          neverRenovated ? 'bg-primary text-primary-foreground' : 'text-muted hover:text-foreground'
        }`}
      >
        {t('onboarding.renovationLog.never')}
      </button>

      <GeneratorAgeNote data={data} />
      <EfficiencyEstimate data={data} />
    </div>
  )
}

/**
 * Das Erzeuger-Alter erscheint hier als abgeleiteter Eintrag, nicht als zweite
 * Eingabe: Erfasst wird es im Heizungs-Schritt. Ein Wert, zwei Ansichten – sonst
 * entstünde genau die Doppelerfassung, die dieses Modell vermeiden soll.
 */
function GeneratorAgeNote({ data }: { data: OnboardingData }) {
  const { t } = useTranslation()
  const setStep = useOnboardingStore((s) => s.setStep)
  const flowMode = useOnboardingStore((s) => s.flowMode)
  const age = boilerAgeYears(data)
  if (age === undefined) return null

  // Der Bearbeitungsmodus springt in die volle Abschnittsliste, der lineare
  // Durchlauf in die des gewählten Modus – dieselbe Zuordnung wie in
  // `OnboardingPage`, sonst landet der Sprung im falschen Schritt.
  const list = flowMode === 'edit' ? ONBOARDING_SECTIONS : sectionsFor(data.mode)
  const heatingStep = list.findIndex((s) => s.id === 'heating')

  return (
    <div className="rounded-2xl bg-surface-2/50 p-3">
      <p className="flex items-start gap-1.5 text-sm text-foreground">
        <Flame className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {t('onboarding.renovationLog.generatorAge', { years: age })}
      </p>
      {heatingStep >= 0 && (
        <button
          type="button"
          onClick={() => setStep(heatingStep)}
          className="focus-ring mt-1.5 inline-flex items-center gap-1 rounded-lg pl-5.5 text-xs font-semibold text-primary transition-colors hover:underline"
        >
          {t('onboarding.renovationLog.toHeating')}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/**
 * Qualitative Hüllen-Einordnung. Zeigt bewusst KEINE absolute Zahl oder
 * Energieausweis-Klasse, sondern eine grobe Skala, die relative Wirkung der
 * Sanierungen und den größten offenen Hebel – plus ehrliche Rahmung und den
 * Verweis auf echte Zählerstände. Siehe docs/renovation-redesign.md.
 */
function EfficiencyEstimate({ data }: { data: OnboardingData }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const est = estimateEnvelope(data)

  return (
    <div className="glass rounded-3xl p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Gauge className="h-3.5 w-3.5" />
        {t('onboarding.step7renovation.estimate.title')}
      </p>

      {/* Grobe Skala mit Marker – nur wenn das Baujahr eine Basis liefert. */}
      {est.position !== null ? (
        <div className="mt-3">
          <div className="relative h-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500">
            <span
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-foreground shadow"
              style={{ left: `${est.position * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>{t('onboarding.step7renovation.estimate.scaleEfficient')}</span>
            <span>{t('onboarding.step7renovation.estimate.scaleNeedy')}</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {t('onboarding.step7renovation.estimate.needYear')}
        </p>
      )}

      {/* Relative Wirkung der Sanierungen. */}
      <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {est.savingsPct > 0 ? (
          <>
            <TrendingDown className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {t('onboarding.step7renovation.estimate.savings', { pct: est.savingsPct })}
          </>
        ) : (
          <span className="text-muted">
            {t('onboarding.step7renovation.estimate.noSavings')}
          </span>
        )}
      </p>

      {/* Größter Hebel bzw. „rundum saniert". */}
      {est.nextLever ? (
        <div className="mt-3 rounded-2xl bg-surface-2/50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
            {t('onboarding.step7renovation.estimate.nextLever', {
              item: t(`onboarding.step7renovation.renovationItemOptions.${est.nextLever}`),
              pct: est.nextLeverPct,
            })}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t('onboarding.step7renovation.estimate.funding')}
          </p>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {t('onboarding.step7renovation.estimate.allDone')}
        </p>
      )}

      {/* Ehrliche Rahmung + Verzahnung mit echten Verbrauchsdaten. */}
      <p className="mt-3 text-xs text-muted">
        {t('onboarding.step7renovation.estimate.disclaimer')}
      </p>
      <button
        type="button"
        onClick={() => navigate('/monitoring')}
        className="focus-ring mt-2 inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-primary transition-colors hover:underline"
      >
        {t('onboarding.step7renovation.estimate.toMeter')}
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
