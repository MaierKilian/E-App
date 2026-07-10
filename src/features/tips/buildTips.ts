import type { LucideIcon } from 'lucide-react'
import {
  Plug,
  Droplets,
  Lightbulb,
  Hourglass,
  Snowflake,
  Thermometer,
  ThermometerSnowflake,
  Sofa,
  Gauge,
  ThermometerSun,
  SlidersHorizontal,
  Wind,
} from 'lucide-react'
import type { OnboardingData } from '@/types'
import type { MeasurementResult, MeasurementRating } from '@/features/measurements/types'
import { resultSavingsEur } from '@/features/measurements/impact'

export type TipCategory = 'heating' | 'electricity' | 'water'

/**
 * Eine konkrete Handlungsempfehlung. Aus Profil + Messergebnissen abgeleitet,
 * nach Wirkung (€/Jahr) sortierbar; qualitative Tipps haben kein `savingEur`.
 *
 * Anders als früher entsteht pro *Befund* ein Tipp (nicht pauschal je Messung):
 * ein zu warmer und ein zu kalter Raum, hohe Luftfeuchte, Zugluft usw. ergeben
 * jeweils eine eigene, passende Empfehlung.
 */
export interface Tip {
  /** Stabile id = i18n-Schlüssel unter tips.items.<id>. */
  id: string
  icon: LucideIcon
  /** Gewerk – steuert die Farbcodierung der Icon-Kachel. */
  category: TipCategory
  /** Geschätzte Jahresersparnis in € (sortiert die Liste); leer = qualitativ. */
  savingEur?: number
  /** Optionales Produkt (Schlüssel in TIP_PRODUCTS). */
  productId?: string
  /** Interpolationswerte für Titel/Begründung (konkrete Messwerte im Text). */
  params?: Record<string, string | number>
}

type Results = Partial<Record<string, MeasurementResult>>

const RATING_ORDER: Record<MeasurementRating, number> = {
  good: 0,
  medium: 1,
  elevated: 2,
  high: 3,
}

// Schwellen für Raumklima-Befunde (an roomClimate.ts angelehnt).
const ROOM_TARGET_C = 20 // Zieltemperatur → darüber gibt es Sparpotenzial
const ROOM_WARM_C = 22 // spürbar zu warm (Optimum-Obergrenze)
const ROOM_COLD_C = 18 // deutlich zu kühl → Auskühl-/Schimmel-Hinweis
const HUMID_MAX = 60 // % – darüber zu feucht
const HUMID_MIN = 40 // % – darunter zu trocken

// Kühlschrank: unter 5 °C unnötig kalt, über 7 °C zu warm für sichere Lagerung.
const FRIDGE_COLD_C = 5
const FRIDGE_WARM_C = 7

/** Alle (Raum-)Ergebnisse einer Messung. */
function resultsForId(results: Results, id: string): MeasurementResult[] {
  const prefix = `${id}@`
  return Object.entries(results)
    .filter(([key, r]) => Boolean(r) && (key === id || key.startsWith(prefix)))
    .map(([, r]) => r as MeasurementResult)
}

/** Summe der Jahresersparnis über alle Raum-Ergebnisse einer Messung. */
function savingForId(results: Results, id: string): number {
  return Math.round(resultsForId(results, id).reduce((sum, r) => sum + resultSavingsEur(r), 0))
}

/** Schlechteste (höchste) Bewertung einer Messung – oder null, wenn ungemessen. */
function worstRating(results: Results, id: string): MeasurementRating | null {
  const rs = resultsForId(results, id)
  if (rs.length === 0) return null
  return rs.reduce<MeasurementRating>(
    (worst, r) => (RATING_ORDER[r.rating] > RATING_ORDER[worst] ? r.rating : worst),
    'good',
  )
}

/** Temperatur eines Raum-Ergebnisses (aus details, sonst Hauptwert). */
function tempOf(r: MeasurementResult): number {
  return r.details?.temperature ?? r.primaryValue
}

/** Größter Standby-Verbraucher aus der `dev{index}_{type}`-Aufschlüsselung. */
function biggestStandbyDevice(r: MeasurementResult | undefined): { type: string; watts: number } | null {
  if (!r?.details) return null
  let best: { type: string; watts: number } | null = null
  for (const [key, watts] of Object.entries(r.details)) {
    const match = /^dev\d+_(.+)$/.exec(key)
    if (match && Number.isFinite(watts) && watts > (best?.watts ?? -1)) {
      best = { type: match[1], watts }
    }
  }
  return best
}

/**
 * Baut die personalisierte Empfehlungsliste. Messbasierte Tipps tragen ihren
 * €-Wert (und stehen oben), qualitative folgen in sinnvoller Reihenfolge.
 * Persona-Gating: fest installierte Maßnahmen nur für Eigentümer.
 */
export function buildTips(data: OnboardingData, results: Results): Tip[] {
  const tips: Tip[] = []

  // --- Strom ----------------------------------------------------------------
  const standby = savingForId(results, 'standby')
  if (standby > 0) {
    const big = biggestStandbyDevice(results['standby'])
    tips.push({
      id: 'standby',
      icon: Plug,
      category: 'electricity',
      savingEur: standby,
      productId: 'smart_plug',
      params: { deviceType: big?.type ?? 'other', watts: Math.round(big?.watts ?? 0) },
    })
  }

  const lightingRs = resultsForId(results, 'lighting')
  const lighting = savingForId(results, 'lighting')
  if (lighting > 0) {
    const bulbs = Math.round(lightingRs.reduce((s, r) => s + (r.details?.totalBulbs ?? 0), 0))
    tips.push({
      id: 'lighting',
      icon: Lightbulb,
      category: 'electricity',
      savingEur: lighting,
      productId: 'led',
      params: { count: bulbs },
    })
  }

  // Kühlschrank: zu kalt → wärmer (Sparen), zu warm → kälter (Lebensmittel).
  const fridgeRs = resultsForId(results, 'fridge')
  const fridgeCold = fridgeRs.filter((r) => tempOf(r) < FRIDGE_COLD_C)
  if (fridgeCold.length) {
    const saving = Math.round(fridgeCold.reduce((s, r) => s + (r.details?.yearlySaving ?? 0), 0))
    tips.push({
      id: 'fridge',
      icon: Snowflake,
      category: 'electricity',
      savingEur: saving > 0 ? saving : undefined,
      productId: 'fridge_thermometer',
      params: { temp: Math.round(tempOf(fridgeCold[0])) },
    })
  }
  const fridgeWarm = fridgeRs.filter((r) => tempOf(r) > FRIDGE_WARM_C)
  if (fridgeWarm.length) {
    tips.push({
      id: 'fridge_warm',
      icon: Snowflake,
      category: 'electricity',
      productId: 'fridge_thermometer',
      params: { temp: Math.round(tempOf(fridgeWarm[0])) },
    })
  }

  const freezer = savingForId(results, 'freezer')
  const freezerIced = resultsForId(results, 'freezer').some((r) => (r.details?.iced ?? 0) === 1)
  if (freezerIced) {
    tips.push({
      id: 'freezer',
      icon: Snowflake,
      category: 'electricity',
      savingEur: freezer > 0 ? freezer : undefined,
    })
  }

  const bl = worstRating(results, 'base_load')
  if (bl && bl !== 'good') {
    const r = resultsForId(results, 'base_load')[0]
    tips.push({
      id: 'base_load',
      icon: Gauge,
      category: 'electricity',
      productId: 'power_meter',
      params: { watts: Math.round(r?.primaryValue ?? 0), eur: Math.round(r?.details?.annualEur ?? 0) },
    })
  }

  // --- Warmwasser / Wasser --------------------------------------------------
  const showerRs = resultsForId(results, 'showerhead')
  const shower = savingForId(results, 'showerhead')
  if (shower > 0) {
    const flow = Math.max(0, ...showerRs.map((r) => r.primaryValue))
    tips.push({
      id: 'showerhead',
      icon: Droplets,
      category: 'water',
      savingEur: shower,
      productId: 'eco_showerhead',
      params: { flow: Math.round(flow * 10) / 10 },
    })
  }

  const hotWaterRs = resultsForId(results, 'hot_water_wait')
  const hotWater = savingForId(results, 'hot_water_wait')
  if (hotWater > 0) {
    const seconds = Math.round(Math.max(0, ...hotWaterRs.map((r) => r.primaryValue)))
    tips.push({
      id: 'hot_water_wait',
      icon: Hourglass,
      category: 'water',
      savingEur: hotWater,
      productId: 'pipe_insulation',
      params: { seconds },
    })
  }

  // --- Heizen / Raumklima ---------------------------------------------------
  const roomTemp = resultsForId(results, 'room_temperature')
  if (roomTemp.length) {
    // Zu warm → senken (mit €-Ersparnis, wo Heizkosten bekannt sind).
    const warmSaving = Math.round(
      roomTemp.reduce((s, r) => s + (tempOf(r) > ROOM_TARGET_C ? r.details?.yearlySaving ?? 0 : 0), 0),
    )
    const anyWarm = roomTemp.some((r) => tempOf(r) > ROOM_WARM_C)
    if (warmSaving > 0) {
      tips.push({ id: 'room_temperature', icon: Thermometer, category: 'heating', savingEur: warmSaving })
    } else if (anyWarm) {
      tips.push({ id: 'room_temperature', icon: Thermometer, category: 'heating' })
    }

    // Zu kalt → nicht auskühlen lassen (Schimmel-/Effizienz-Hinweis).
    if (roomTemp.some((r) => tempOf(r) < ROOM_COLD_C)) {
      tips.push({ id: 'room_cold', icon: ThermometerSnowflake, category: 'heating' })
    }

    // Luftfeuchte (nur wo erfasst).
    if (roomTemp.some((r) => r.details?.humidity !== undefined && r.details.humidity > HUMID_MAX)) {
      tips.push({ id: 'humidity_high', icon: Droplets, category: 'heating', productId: 'hygrometer' })
    }
    if (roomTemp.some((r) => r.details?.humidity !== undefined && r.details.humidity < HUMID_MIN)) {
      tips.push({ id: 'humidity_low', icon: Droplets, category: 'heating', productId: 'hygrometer' })
    }

    // Zugluft (Index >= 1 = spürbar/stark).
    if (roomTemp.some((r) => (r.details?.draft ?? 0) >= 1)) {
      tips.push({ id: 'draft', icon: Wind, category: 'heating', productId: 'draft_seal' })
    }
  }

  const fs = worstRating(results, 'furniture_spacing')
  if (fs && fs !== 'good') {
    tips.push({ id: 'furniture_spacing', icon: Sofa, category: 'heating', productId: 'radiator_reflector' })
  }

  // --- Smart-Home aus dem Profil --------------------------------------------
  const hasRadiator = data.rooms.some((r) => r.heatTransfer === 'radiator')
  const ownsSmartThermostat = data.smartHomeDevices.includes('smart_thermostat')
  if (hasRadiator && !ownsSmartThermostat) {
    tips.push({ id: 'smart_thermostat', icon: ThermometerSun, category: 'heating', productId: 'smart_thermostat' })
  }

  // --- Nur Eigentümer: fest installierte Steuerung --------------------------
  if (data.occupancyStatus === 'owner') {
    tips.push({ id: 'owner_control', icon: SlidersHorizontal, category: 'heating', productId: 'smart_heating' })
  }

  // Nach € absteigend; qualitative (ohne €) stabil danach.
  return tips.sort((a, b) => (b.savingEur ?? -1) - (a.savingEur ?? -1))
}
