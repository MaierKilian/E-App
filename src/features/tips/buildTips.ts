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
  Wind,
} from 'lucide-react'
import type { OnboardingData, RoomType } from '@/types'
import type { MeasurementResult, MeasurementRating } from '@/features/measurements/types'
import { resultSavingsEur } from '@/features/measurements/impact'
import { DEFAULT_COMFORT_BAND } from '@/features/measurements/room_temperature/roomClimate'
import { parseRoomKey } from '@/features/measurements/rooms'

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
  /** Geschätzte Jahresersparnis in € (leer = qualitativ). */
  savingEur?: number
  /** Grober Zeitaufwand in Minuten. */
  effortMinutes: number
  /** Nötige Anschaffung in € (0 = kostet nichts). */
  costEur: number
  /** Interpolationswerte für Titel/Begründung (konkrete Messwerte im Text). */
  params?: Record<string, string | number>
  /**
   * Raumbezug, wo das Ergebnis einen hat. Die Beschriftung entsteht erst in der
   * Ansicht (braucht `t`); ohne sie stünden „Raumtemperatur senken" und „Räume
   * nicht auskühlen lassen" unvermittelt nebeneinander und läsen sich wie ein
   * Widerspruch, statt zwei verschiedene Räume zu meinen.
   */
  room?: { type: RoomType; index: number; total: number }
  /** Zielseite einer weiterführenden Aktion (z. B. eine Messung in der App). */
  linkTo?: string
}

type Results = Partial<Record<string, MeasurementResult>>

const RATING_ORDER: Record<MeasurementRating, number> = {
  good: 0,
  medium: 1,
  elevated: 2,
  high: 3,
}

// Schwellen für Raumklima-Befunde. Das Komfortband ist raumtypabhängig und
// steckt im Ergebnis (bandMin/bandMax) – feste Werte hier hätten z. B. ein
// Schlafzimmer bei 17 °C fälschlich als „zu kalt" gemeldet.
const ROOM_COLD_MARGIN_C = 2 // so weit unter dem Band → Auskühl-/Schimmel-Hinweis
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

/** Beim Messen gespeichertes Komfortband; ältere Ergebnisse nutzen den Default. */
function bandOf(r: MeasurementResult): { min: number; max: number } {
  return {
    min: r.details?.bandMin ?? DEFAULT_COMFORT_BAND.min,
    max: r.details?.bandMax ?? DEFAULT_COMFORT_BAND.max,
  }
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
 * Raumbezug eines Ergebnisses, samt Gesamtzahl gleichartiger Räume (für
 * „Schlafzimmer 2"). Ohne den Bezug wäre bei mehreren Räumen nicht erkennbar,
 * welcher gemeint ist.
 */
function roomOf(
  r: MeasurementResult,
  data: OnboardingData,
): { type: RoomType; index: number; total: number } | undefined {
  if (!r.roomKey) return undefined
  const parsed = parseRoomKey(r.roomKey)
  if (!parsed) return undefined
  const entry = data.rooms.find((room) => room.type === parsed.type)
  return { type: parsed.type, index: parsed.index, total: Math.max(1, entry?.count ?? 1) }
}

/**
 * „Sofort und kostenlos" – Maßnahmen, für die es keinen Grund gibt, sie nicht
 * heute zu erledigen. Sie stehen vor allem anderen, auch vor größeren
 * Ersparnissen: Wer eine Liste aufschlägt, soll zuerst etwas finden, das er
 * ohne Einkauf und ohne Termin abhaken kann.
 */
function isQuickWin(tip: Tip): boolean {
  return tip.costEur === 0 && tip.effortMinutes <= 15
}

/**
 * Reihenfolge der Empfehlungen: erst die Sofortmaßnahmen, dann der Rest –
 * innerhalb beider Gruppen nach Ersparnis, bei Gleichstand nach Kosten und
 * Aufwand. Reine €-Sortierung schob früher „Sofa vom Heizkörper wegrücken"
 * hinter „smarte Thermostate für 120 €".
 */
function compareTips(a: Tip, b: Tip): number {
  const quick = Number(isQuickWin(b)) - Number(isQuickWin(a))
  if (quick !== 0) return quick
  const saving = (b.savingEur ?? 0) - (a.savingEur ?? 0)
  if (saving !== 0) return saving
  if (a.costEur !== b.costEur) return a.costEur - b.costEur
  return a.effortMinutes - b.effortMinutes
}

/**
 * Baut die personalisierte Empfehlungsliste aus Profil und Messergebnissen.
 *
 * Jeder Tipp muss ohne Handwerker umsetzbar sein – die App misst, was ein Laie
 * selbst messen kann, und soll dann nichts empfehlen, wofür er jemanden rufen
 * müsste. Deshalb trägt jeder Tipp seinen Aufwand und seine Kosten mit; danach
 * wird auch sortiert.
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
      effortMinutes: 15,
      costEur: 15,
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
      effortMinutes: 20,
      costEur: 25,
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
      effortMinutes: 2,
      costEur: 0,
      params: { temp: Math.round(tempOf(fridgeCold[0])) },
    })
  }
  const fridgeWarm = fridgeRs.filter((r) => tempOf(r) > FRIDGE_WARM_C)
  if (fridgeWarm.length) {
    tips.push({
      id: 'fridge_warm',
      icon: Snowflake,
      category: 'electricity',
      effortMinutes: 2,
      costEur: 0,
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
      // Kostet nichts, dauert aber einen halben Nachmittag – deshalb keine
      // Sofortmaßnahme.
      effortMinutes: 60,
      costEur: 0,
    })
  }

  // Die Grundlast selbst ist keine Maßnahme, sondern ein Befund: Sie sagt, dass
  // etwas dauerhaft zieht, aber nicht was. Der Tipp führt deshalb in den
  // Standby-Check der App, statt zum Kauf eines Messgeräts zu raten.
  const bl = worstRating(results, 'base_load')
  if (bl && bl !== 'good' && !results['standby']) {
    const r = resultsForId(results, 'base_load')[0]
    tips.push({
      id: 'base_load',
      icon: Gauge,
      category: 'electricity',
      effortMinutes: 20,
      costEur: 15,
      params: { watts: Math.round(r?.primaryValue ?? 0) },
      linkTo: '/measurements/standby',
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
      effortMinutes: 10,
      costEur: 20,
      params: { flow: Math.round(flow * 10) / 10 },
    })
  }

  const hotWaterRs = resultsForId(results, 'hot_water_wait')
  const hotWater = savingForId(results, 'hot_water_wait')
  // Der Tipp haengt am Befund der Messung, nicht mehr am Euro-Betrag: Bei einem
  // Wasserpreis von 0 oder einer Ersparnis unter der Anzeigeschwelle bleibt die
  // gemessene Wassermenge ein gueltiger Grund, den Vorlauf aufzufangen. Eine
  // Wartezeit bis 15 s bewertet die Messung selbst als unauffaellig.
  if (hotWaterRs.length > 0 && worstRating(results, 'hot_water_wait') !== 'good') {
    // Wartezeit und Menge je Zapfung muessen aus DEMSELBEN Ergebnis stammen.
    // Zwei getrennte `Math.max` ueber alle Entnahmestellen ergaben sonst einen
    // Satz, dessen Sekunden vom einen und dessen Liter vom anderen Hahn kamen
    // ("19 s ... 3,5 L") – Zahlen, die zusammen nie gemessen wurden.
    const worst = hotWaterRs.reduce((a, b) => (resultSavingsEur(b) > resultSavingsEur(a) ? b : a))
    const seconds = Math.round(Math.max(0, worst.primaryValue))
    const liters = Math.round(Math.max(0, worst.details?.litersPerDraw ?? 0) * 10) / 10
    // Jahresmenge ueber alle gemessenen Stellen – die gemessene Groesse, die
    // auch dann traegt, wenn der Euro-Betrag unter der Anzeigeschwelle liegt.
    const litersPerYear = Math.round(
      hotWaterRs.reduce((sum, r) => sum + (r.details?.litersPerYear ?? 0), 0),
    )
    tips.push({
      id: 'hot_water_wait',
      icon: Hourglass,
      category: 'water',
      savingEur: hotWater > 0 ? hotWater : undefined,
      effortMinutes: 1,
      costEur: 0,
      params: { seconds, liters, litersPerYear },
    })
  }

  // --- Heizen / Raumklima ---------------------------------------------------
  const roomTemp = resultsForId(results, 'room_temperature')
  let heatingFindings = 0
  if (roomTemp.length) {
    // Zu warm → senken. Der wärmste Raum steht stellvertretend im Text.
    const warmRooms = roomTemp.filter((r) => tempOf(r) > bandOf(r).max)
    if (warmRooms.length) {
      heatingFindings += 1
      const warmest = warmRooms.reduce((a, b) => (tempOf(b) > tempOf(a) ? b : a))
      const warmSaving = Math.round(
        warmRooms.reduce((s, r) => s + (r.details?.yearlySaving ?? 0), 0),
      )
      tips.push({
        id: 'room_temperature',
        icon: Thermometer,
        category: 'heating',
        savingEur: warmSaving > 0 ? warmSaving : undefined,
        effortMinutes: 2,
        costEur: 0,
        params: { temp: Math.round(tempOf(warmest) * 10) / 10 },
        room: roomOf(warmest, data),
      })
    }

    // Zu kalt → nicht auskühlen lassen (Schimmel-/Effizienz-Hinweis).
    const coldRooms = roomTemp.filter((r) => tempOf(r) < bandOf(r).min - ROOM_COLD_MARGIN_C)
    if (coldRooms.length) {
      heatingFindings += 1
      const coldest = coldRooms.reduce((a, b) => (tempOf(b) < tempOf(a) ? b : a))
      tips.push({
        id: 'room_cold',
        icon: ThermometerSnowflake,
        category: 'heating',
        effortMinutes: 5,
        costEur: 0,
        params: { temp: Math.round(tempOf(coldest) * 10) / 10 },
        room: roomOf(coldest, data),
      })
    }

    // Luftfeuchte (nur wo erfasst).
    const humid = roomTemp.filter(
      (r) => r.details?.humidity !== undefined && r.details.humidity > HUMID_MAX,
    )
    if (humid.length) {
      heatingFindings += 1
      const wettest = humid.reduce((a, b) => ((b.details?.humidity ?? 0) > (a.details?.humidity ?? 0) ? b : a))
      tips.push({
        id: 'humidity_high',
        icon: Droplets,
        category: 'heating',
        effortMinutes: 5,
        costEur: 0,
        params: { humidity: Math.round(wettest.details?.humidity ?? 0) },
        room: roomOf(wettest, data),
      })
    }
    const dry = roomTemp.filter(
      (r) => r.details?.humidity !== undefined && r.details.humidity < HUMID_MIN,
    )
    if (dry.length) {
      const driest = dry.reduce((a, b) => ((b.details?.humidity ?? 100) < (a.details?.humidity ?? 100) ? b : a))
      tips.push({
        id: 'humidity_low',
        icon: Droplets,
        category: 'heating',
        effortMinutes: 5,
        costEur: 0,
        params: { humidity: Math.round(driest.details?.humidity ?? 0) },
        room: roomOf(driest, data),
      })
    }

    // Zugluft (Index >= 1 = spürbar/stark).
    const drafty = roomTemp.filter((r) => (r.details?.draft ?? 0) >= 1)
    if (drafty.length) {
      heatingFindings += 1
      tips.push({
        id: 'draft',
        icon: Wind,
        category: 'heating',
        effortMinutes: 20,
        costEur: 8,
        room: roomOf(drafty[0], data),
      })
    }
  }

  const fs = worstRating(results, 'furniture_spacing')
  if (fs && fs !== 'good') {
    heatingFindings += 1
    tips.push({ id: 'furniture_spacing', icon: Sofa, category: 'heating', effortMinutes: 10, costEur: 0 })
  }

  // --- Smart-Home -----------------------------------------------------------
  // Nur empfehlen, wenn beim Heizen überhaupt etwas auffällig war. Sonst wäre es
  // eine Produktempfehlung ohne Anlass – die einzige Bedingung war früher, dass
  // der Nutzer noch keins besitzt.
  const hasRadiator = data.rooms.some((r) => r.heatTransfer === 'radiator')
  const ownsSmartThermostat = data.smartHomeDevices.includes('smart_thermostat')
  if (hasRadiator && !ownsSmartThermostat && heatingFindings > 0) {
    tips.push({
      id: 'smart_thermostat',
      icon: ThermometerSun,
      category: 'heating',
      effortMinutes: 30,
      costEur: 120,
    })
  }

  return tips.sort(compareTips)
}
