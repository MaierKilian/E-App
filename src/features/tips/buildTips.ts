import type { LucideIcon } from 'lucide-react'
import { Plug, Droplets, Lightbulb, Hourglass, Snowflake, Thermometer, Sofa, Gauge, ThermometerSun, SlidersHorizontal } from 'lucide-react'
import type { OnboardingData } from '@/types'
import type { MeasurementResult, MeasurementRating } from '@/features/measurements/types'
import { resultSavingsEur } from '@/features/measurements/impact'

/**
 * Eine konkrete Handlungsempfehlung. Aus Profil + Messergebnissen abgeleitet,
 * nach Wirkung (€/Jahr) sortierbar; qualitative Tipps haben kein `savingEur`.
 */
export interface Tip {
  /** Stabile id = i18n-Schlüssel unter tips.items.<id>. */
  id: string
  icon: LucideIcon
  /** Geschätzte Jahresersparnis in € (sortiert die Liste); leer = qualitativ. */
  savingEur?: number
  /** Optionales Produkt (Schlüssel in TIP_PRODUCTS). */
  productId?: string
}

type Results = Partial<Record<string, MeasurementResult>>

const RATING_ORDER: Record<MeasurementRating, number> = {
  good: 0,
  medium: 1,
  elevated: 2,
  high: 3,
}

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

/**
 * Baut die personalisierte Empfehlungsliste. Messbasierte Tipps tragen ihren
 * €-Wert (und stehen oben), qualitative folgen in sinnvoller Reihenfolge.
 * Persona-Gating: fest installierte Maßnahmen nur für Eigentümer.
 */
export function buildTips(data: OnboardingData, results: Results): Tip[] {
  const tips: Tip[] = []

  // 1) Messbasiert (mit €-Ersparnis) – konkrete Spar-Maßnahmen
  const standby = savingForId(results, 'standby')
  if (standby > 0) tips.push({ id: 'standby', icon: Plug, savingEur: standby, productId: 'smart_plug' })

  const shower = savingForId(results, 'showerhead')
  if (shower > 0)
    tips.push({ id: 'showerhead', icon: Droplets, savingEur: shower, productId: 'eco_showerhead' })

  const lighting = savingForId(results, 'lighting')
  if (lighting > 0) tips.push({ id: 'lighting', icon: Lightbulb, savingEur: lighting })

  const hotWater = savingForId(results, 'hot_water_wait')
  if (hotWater > 0) tips.push({ id: 'hot_water_wait', icon: Hourglass, savingEur: hotWater })

  const fridge = savingForId(results, 'fridge')
  if (fridge > 0) tips.push({ id: 'fridge', icon: Snowflake, savingEur: fridge })

  const freezer = savingForId(results, 'freezer')
  if (freezer > 0) tips.push({ id: 'freezer', icon: Snowflake, savingEur: freezer })

  // 2) Qualitativ (Verhalten) – aus auffälligen Messungen
  const rt = worstRating(results, 'room_temperature')
  if (rt && rt !== 'good') tips.push({ id: 'room_temperature', icon: Thermometer })

  const fs = worstRating(results, 'furniture_spacing')
  if (fs && fs !== 'good') tips.push({ id: 'furniture_spacing', icon: Sofa })

  const bl = worstRating(results, 'base_load')
  if (bl && bl !== 'good') tips.push({ id: 'base_load', icon: Gauge })

  // 3) Smart-Home aus dem Profil
  const hasRadiator = data.rooms.some((r) => r.heatTransfer === 'radiator')
  const ownsSmartThermostat = data.smartHomeDevices.includes('smart_thermostat')
  if (hasRadiator && !ownsSmartThermostat) {
    tips.push({ id: 'smart_thermostat', icon: ThermometerSun })
  }

  // 4) Nur Eigentümer: fest installierte Steuerung
  if (data.occupancyStatus === 'owner') {
    tips.push({ id: 'owner_control', icon: SlidersHorizontal })
  }

  // Nach € absteigend; qualitative (ohne €) stabil danach.
  return tips.sort((a, b) => (b.savingEur ?? -1) - (a.savingEur ?? -1))
}
