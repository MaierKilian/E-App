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
  TrendingUp,
  Wind,
  Flame,
} from 'lucide-react'
import type { OnboardingData, RoomType, UserGoal } from '@/types'
import type { MeasurementResult, MeasurementRating } from '@/features/measurements/types'
import type { EnergyType, MeterReading } from '@/store/readingsStore'
import { resultSavingsEur } from '@/features/measurements/impact'
import { isMeasuredSaving } from '@/features/measurements/savingsDisplay'
import { DEFAULT_COMFORT_BAND } from '@/features/measurements/room_temperature/roomClimate'
import { parseRoomKey, roomInstances } from '@/features/measurements/rooms'
import {
  isCurrentLightingResult,
  openRoomKeys,
  rankOpenRooms,
} from '@/features/measurements/lighting/lighting'
import { ENERGY_META } from '@/features/monitoring/energyConfig'
import { boilerAgeYears } from '@/features/onboarding/renovationProjection'

/**
 * Ab diesem Alter lohnt sich beim Gas-/Oelkessel die Frage nach dem Austausch.
 * Uebliche Nutzungsdauer liegt bei 20–25 Jahren; ab 20 ist das Thema real.
 */
const BOILER_OLD_YEARS = 20
import { sortByDate, yearOverYearTrend } from '@/features/monitoring/readings'

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
  /** Stabile id – merkt sich „erledigt"/„ausgeblendet" und trägt den i18n-Schlüssel. */
  id: string
  /**
   * Abweichender i18n-Schlüssel unter `tips.items.<textId>`. Nötig, wo mehrere
   * Tipps denselben Text mit anderen Werten teilen – etwa ein steigender
   * Verbrauch, den es je Energieträger einmal geben kann.
   */
  textId?: string
  icon: LucideIcon
  /** Gewerk – steuert die Farbcodierung der Icon-Kachel. */
  category: TipCategory
  /**
   * Jahresersparnis in €.
   *
   * Nur gesetzt, wo die Rechnung ohne geschätzte Nutzungshäufigkeit auskommt
   * (siehe `isMeasuredSaving`). Wo sie das nicht tut, steht statt einer
   * Euro-Behauptung die tatsächlich gemessene Menge in {@link Tip.quantity}.
   */
  savingEur?: number
  /**
   * Gemessene Jahreswirkung als Ersatz (oder Ergänzung) zum Euro-Betrag:
   * Liter Wasser, Prozent Heizenergie, kWh Mehrverbrauch. `key` ist ein
   * vollständiger i18n-Schlüssel unter `tips.quantity.*`.
   */
  quantity?: { key: string; params: Record<string, string | number> }
  /**
   * Messung, aus der die Empfehlung folgt, samt Zeitpunkt der jüngsten
   * Ablesung. Macht die Herkunft sichtbar und den Weg zurück begehbar: Der
   * Messwert steht zwar im Begründungstext, aber ohne diesen Bezug ist nicht
   * erkennbar, woher er stammt und wie alt er ist. Tipps ohne Messbezug
   * (Verbrauchstrend aus Zählerständen) lassen das Feld leer.
   */
  source?: { measurementId: string; measuredAt: string }
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

/**
 * Was die Empfehlungen ausser Profil und Messungen noch auswerten.
 *
 * Die Zaehlerstaende sind die einzige Datenquelle der App, in der echter
 * Verbrauch ueber die Zeit steht. Ohne sie blieb der auffaelligste Wert der
 * App – ein Verbrauch, der gegenueber dem Vorjahr deutlich steigt – ohne jede
 * Empfehlung.
 */
export interface TipContext {
  /** Zählerstände je Energieträger. */
  readings?: Partial<Record<EnergyType, MeterReading[]>>
  /** €-Preis je Zähler-Einheit; ohne Preis entfällt der Kostenanteil im Text. */
  eurPerUnit?: Partial<Record<EnergyType, number>>
}

/** Ab dieser Steigerung gegenüber dem Vorjahr lohnt der Hinweis (darunter: Rauschen). */
const CONSUMPTION_RISE_MIN = 0.1

/** Gewerk je Energieträger – steuert Farbe und Einsortierung des Trend-Tipps. */
const CARRIER_CATEGORY: Partial<Record<EnergyType, TipCategory>> = {
  electricity: 'electricity',
  heat_pump: 'electricity',
  gas: 'heating',
  oil: 'heating',
  pellets: 'heating',
  water: 'water',
}

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

/**
 * Herkunft einer Empfehlung: die Messung und ihre jüngste Ablesung.
 *
 * Bei Pro-Raum-Messungen zählt das neueste Raum-Ergebnis – es beantwortet die
 * Frage „wie aktuell ist das?" richtig, während das älteste den Befund
 * veralteter aussehen ließe, als er ist.
 */
function sourceFor(results: Results, id: string): Tip['source'] {
  const rs = resultsForId(results, id)
  if (rs.length === 0) return undefined
  const latest = rs.reduce((a, b) => (b.completedAt > a.completedAt ? b : a))
  return { measurementId: id, measuredAt: latest.completedAt }
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

/**
 * Größter Standby-Verbraucher aus der Geräte-Aufschlüsselung.
 *
 * Zwei Formate (siehe StandbyResult.decodeDevices): aktuell `dev{index}` mit
 * der Bezeichnung in `labels`, alt `dev{index}_{type}` mit dem Gerätetyp als
 * einziger Beschriftung. Der Tipp benennt das Gerät, also muss er beide lesen –
 * sonst hieße der größte Posten nach dem Umstieg auf Namen immer „Sonstiges".
 */
function biggestStandbyDevice(
  r: MeasurementResult | undefined,
): { name?: string; type?: string; watts: number } | null {
  if (!r?.details) return null
  let best: { name?: string; type?: string; watts: number } | null = null
  for (const [key, watts] of Object.entries(r.details)) {
    if (!Number.isFinite(watts) || watts <= (best?.watts ?? -1)) continue

    const current = /^dev\d+$/.exec(key)
    if (current) {
      best = { name: r.labels?.[key]?.trim() || undefined, watts }
      continue
    }
    const legacy = /^dev\d+_(.+)$/.exec(key)
    if (legacy) best = { type: legacy[1], watts }
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
 *
 * Exportiert, weil die Empfehlungsseite dieselbe Grenze zieht: Sie trennt die
 * offene Liste sichtbar in „sofort machbar" und „braucht etwas Vorbereitung".
 * Sonst gäbe es die Unterscheidung zwar in der Sortierung, aber nirgends zu
 * sehen – die Reihenfolge wirkte willkürlich.
 */
export function isQuickWin(tip: Tip): boolean {
  return tip.costEur === 0 && tip.effortMinutes <= 15
}

/**
 * Gewicht eines Gewerks je Ziel – die Stelle, an der die Ziel-Frage endlich
 * etwas bewirkt. Sie wurde seit jeher erhoben und nirgends gelesen.
 *
 * `save_costs` und `curiosity` bleiben leer: Die vorhandene €-Sortierung
 * *ist* die Antwort auf „Kosten sparen", und für Neugier gibt es keine
 * sachliche Reihenfolge, die besser wäre als die bisherige. Ohne Ziel ändert
 * sich damit nichts.
 */
const GOAL_CATEGORY_BONUS: Record<UserGoal, Partial<Record<TipCategory, number>>> = {
  save_costs: {},
  reduce_co2: { heating: 2, electricity: 1 }, // Wärme trägt den größten CO₂-Hebel
  improve_comfort: { heating: 2 }, // Raumklima und Zugluft zuerst
  curiosity: {},
}

/** Höchster Bonus über alle gewählten Ziele – Ziele addieren sich nicht. */
function goalBonus(tip: Tip, goals: readonly UserGoal[] | undefined): number {
  let best = 0
  for (const goal of goals ?? []) {
    const bonus = GOAL_CATEGORY_BONUS[goal]?.[tip.category] ?? 0
    if (bonus > best) best = bonus
  }
  return best
}

/**
 * Reihenfolge der Empfehlungen: erst die Sofortmaßnahmen, dann das Ziel des
 * Nutzers, dann Ersparnis, Kosten und Aufwand. Reine €-Sortierung schob früher
 * „Sofa vom Heizkörper wegrücken" hinter „smarte Thermostate für 120 €".
 *
 * **Das Ziel steht hinter den Sofortmaßnahmen, nicht davor.** Der Grund für
 * deren Vorrang („wer eine Liste aufschlägt, soll zuerst etwas finden, das er
 * ohne Einkauf und Termin abhaken kann") gilt unabhängig vom Ziel; das Ziel
 * entscheidet *innerhalb* der Gruppen. Es zählt vor allem bei `improve_comfort`:
 * Ein zugiger Raum hat oft gar kein `savingEur` und rutschte in reiner
 * €-Sortierung ans Ende – ausgerechnet bei dem Nutzer, der die App wegen des
 * Komforts geöffnet hat.
 */
function compareTips(a: Tip, b: Tip, goals?: readonly UserGoal[]): number {
  const quick = Number(isQuickWin(b)) - Number(isQuickWin(a))
  if (quick !== 0) return quick
  const goal = goalBonus(b, goals) - goalBonus(a, goals)
  if (goal !== 0) return goal
  const saving = (b.savingEur ?? 0) - (a.savingEur ?? 0)
  if (saving !== 0) return saving
  if (a.costEur !== b.costEur) return a.costEur - b.costEur
  return a.effortMinutes - b.effortMinutes
}

/** Ziele, die die Reihenfolge tatsächlich verändern – für die Anzeige. */
export function sortingGoals(goals: readonly UserGoal[] | undefined): UserGoal[] {
  return (goals ?? []).filter((g) => Object.keys(GOAL_CATEGORY_BONUS[g] ?? {}).length > 0)
}

/**
 * Baut die personalisierte Empfehlungsliste aus Profil, Messergebnissen und
 * Zählerständen.
 *
 * Jeder Tipp muss ohne Handwerker umsetzbar sein – die App misst, was ein Laie
 * selbst messen kann, und soll dann nichts empfehlen, wofür er jemanden rufen
 * müsste. Deshalb trägt jeder Tipp seinen Aufwand und seine Kosten mit; danach
 * wird auch sortiert.
 *
 * **Euro-Beträge nur, wo die Rechnung sie hergibt.** Ein `savingEur` entsteht
 * ausschließlich aus gemessenen Größen mal Preis. Beruht die Ersparnis auf
 * einer angenommenen Nutzungshäufigkeit oder einem geschätzten Verbrauch, trägt
 * der Tipp stattdessen die gemessene Menge (`quantity`) – Liter, Prozent, kWh.
 * Eine Zahl, deren größte Unsicherheit in einer erfundenen Häufigkeit steckt,
 * ist in einer Vorführung nicht zu verteidigen; eine gemessene Wassermenge ist es.
 */
export function buildTips(
  data: OnboardingData,
  results: Results,
  context: TipContext = {},
): Tip[] {
  const tips: Tip[] = []

  // --- Strom ----------------------------------------------------------------
  const standby = savingForId(results, 'standby')
  if (standby > 0) {
    const big = biggestStandbyDevice(results['standby'])
    tips.push({
      id: 'standby',
      // Mit Bezeichnung nennt der Tipp das Gerät beim Namen; ohne (Altergebnis
      // oder namenlos erfasst) bleibt es beim Gerätetyp-Text.
      ...(big?.name ? { textId: 'standby_named' } : {}),
      source: sourceFor(results, 'standby'),
      icon: Plug,
      category: 'electricity',
      savingEur: standby,
      effortMinutes: 15,
      costEur: 15,
      params: big?.name
        ? { deviceName: big.name, watts: Math.round(big.watts) }
        : { deviceType: big?.type ?? 'other', watts: Math.round(big?.watts ?? 0) },
    })
  }

  // LED: Der Check liefert keinen Euro-Betrag, sondern die Raeume, in denen noch
  // alte Lampen haengen – in der Reihenfolge, in der sich der Tausch lohnt. Der
  // erste Raum traegt die Empfehlung, die Anzahl steht im Text.
  const lightingResult = resultsForId(results, 'lighting').find((r) =>
    isCurrentLightingResult(r.details),
  )
  if (lightingResult) {
    const openRooms = rankOpenRooms(roomInstances(data.rooms), openRoomKeys(lightingResult.details))
    if (openRooms.length > 0) {
      const first = openRooms[0]
      tips.push({
        id: 'lighting',
        source: sourceFor(results, 'lighting'),
        icon: Lightbulb,
        category: 'electricity',
        effortMinutes: 20,
        costEur: 25,
        params: { count: openRooms.length },
        room: { type: first.type, index: first.index, total: first.total },
      })
    }
  }

  // Kühlschrank: zu kalt → wärmer (Sparen), zu warm → kälter (Lebensmittel).
  const fridgeRs = resultsForId(results, 'fridge')
  const fridgeCold = fridgeRs.filter((r) => tempOf(r) < FRIDGE_COLD_C)
  if (fridgeCold.length) {
    tips.push({
      id: 'fridge',
      source: sourceFor(results, 'fridge'),
      icon: Snowflake,
      category: 'electricity',
      // Kein Euro-Betrag. Der Kühlschrank-Check rechnet keinen: Er misst die
      // Temperatur und leitet daraus einen Prozentwert ab (`savingPct`). Der
      // frühere Euro-Betrag steckte einen pauschalen Jahresverbrauch von
      // 150 kWh in die Rechnung – eine Konstante, die nichts über dieses Gerät
      // aussagt. Hier stand bis zuletzt Code, der `yearlySaving` aus den
      // Details addierte; erreichbar war er nur noch über Altergebnisse.
      effortMinutes: 2,
      costEur: 0,
      params: { temp: Math.round(tempOf(fridgeCold[0])) },
    })
  }
  const fridgeWarm = fridgeRs.filter((r) => tempOf(r) > FRIDGE_WARM_C)
  if (fridgeWarm.length) {
    tips.push({
      id: 'fridge_warm',
      source: sourceFor(results, 'fridge'),
      icon: Snowflake,
      category: 'electricity',
      effortMinutes: 2,
      costEur: 0,
      params: { temp: Math.round(tempOf(fridgeWarm[0])) },
    })
  }

  const freezerRs = resultsForId(results, 'freezer')
  const freezer = savingForId(results, 'freezer')
  const freezerIced = freezerRs.some((r) => (r.details?.iced ?? 0) === 1)
  const freezerMeasured = freezerRs.every((r) => isMeasuredSaving(r.details))
  if (freezerIced) {
    tips.push({
      id: 'freezer',
      source: sourceFor(results, 'freezer'),
      icon: Snowflake,
      category: 'electricity',
      savingEur: freezerMeasured && freezer > 0 ? freezer : undefined,
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
      source: sourceFor(results, 'base_load'),
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
    // Kein Euro-Betrag: Er laeuft ueber angenommene Duschdauer, Warmwasseranteil
    // und Temperaturhub. Die eingesparte Wassermenge folgt dagegen direkt aus dem
    // gemessenen Durchfluss – das ist die Zahl, die die Empfehlung traegt.
    const litersSaved = Math.round(
      showerRs.reduce((sum, r) => sum + (r.details?.litersSavedPerYear ?? 0), 0),
    )
    tips.push({
      id: 'showerhead',
      source: sourceFor(results, 'showerhead'),
      icon: Droplets,
      category: 'water',
      quantity:
        litersSaved > 0
          ? { key: 'tips.quantity.waterSaved', params: { liters: litersSaved } }
          : undefined,
      effortMinutes: 10,
      costEur: 20,
      params: { flow: Math.round(flow * 10) / 10 },
    })
  }

  const hotWaterRs = resultsForId(results, 'hot_water_wait')
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
      source: sourceFor(results, 'hot_water_wait'),
      icon: Hourglass,
      category: 'water',
      // Kein Euro-Betrag: Die Zapfhaeufigkeit ist ein typischer Wert je Person,
      // keine Messung. Die Jahresmenge dagegen folgt aus der gestoppten
      // Wartezeit und dem Durchfluss der Entnahmestelle.
      quantity:
        litersPerYear > 0
          ? { key: 'tips.quantity.waterWasted', params: { liters: litersPerYear } }
          : undefined,
      effortMinutes: 1,
      costEur: 0,
      params: { seconds, liters, litersPerYear },
    })
  }

  // --- Heizen / Raumklima ---------------------------------------------------
  const roomTemp = resultsForId(results, 'room_temperature')
  if (roomTemp.length) {
    // Zu warm → senken. Der wärmste Raum steht stellvertretend im Text.
    const warmRooms = roomTemp.filter((r) => tempOf(r) > bandOf(r).max)
    if (warmRooms.length) {
      const warmest = warmRooms.reduce((a, b) => (tempOf(b) > tempOf(a) ? b : a))
      // Kein Euro-Betrag: Die 6 %/°C sind eine Faustregel fuer die gesamte
      // beheizte Flaeche, und der Raumanteil wird nach Grundflaeche verteilt,
      // waehrend die Heizlast an der Huellflaeche haengt. Was das Modell
      // wirklich behauptet, ist die relative Einsparung – die steht hier.
      const warmPercent = Math.round(
        Math.max(0, ...warmRooms.map((r) => r.details?.savingPercent ?? 0)),
      )
      tips.push({
        id: 'room_temperature',
        source: sourceFor(results, 'room_temperature'),
        icon: Thermometer,
        category: 'heating',
        quantity:
          warmPercent > 0
            ? { key: 'tips.quantity.heatingPercent', params: { percent: warmPercent } }
            : undefined,
        effortMinutes: 2,
        costEur: 0,
        params: { temp: Math.round(tempOf(warmest) * 10) / 10 },
        room: roomOf(warmest, data),
      })
    }

    // Zu kalt → nicht auskühlen lassen (Schimmel-/Effizienz-Hinweis).
    const coldRooms = roomTemp.filter((r) => tempOf(r) < bandOf(r).min - ROOM_COLD_MARGIN_C)
    if (coldRooms.length) {
      const coldest = coldRooms.reduce((a, b) => (tempOf(b) < tempOf(a) ? b : a))
      tips.push({
        id: 'room_cold',
        source: sourceFor(results, 'room_temperature'),
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
      const wettest = humid.reduce((a, b) => ((b.details?.humidity ?? 0) > (a.details?.humidity ?? 0) ? b : a))
      tips.push({
        id: 'humidity_high',
        source: sourceFor(results, 'room_temperature'),
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
        source: sourceFor(results, 'room_temperature'),
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
      tips.push({
        id: 'draft',
        source: sourceFor(results, 'room_temperature'),
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
    tips.push({
      id: 'furniture_spacing',
      source: sourceFor(results, 'furniture_spacing'),
      icon: Sofa,
      category: 'heating',
      effortMinutes: 10,
      costEur: 0,
    })
  }

  // --- Zählerstände ---------------------------------------------------------
  // Der einzige Befund, der aus echtem Verbrauch über die Zeit entsteht statt
  // aus einer Momentaufnahme. Die Mehrmenge und ihre Kosten folgen unmittelbar
  // aus abgelesenen Zählerständen mal Preis – damit ist es zugleich die am
  // besten belegte Zahl der ganzen Liste.
  for (const [key, list] of Object.entries(context.readings ?? {})) {
    const type = key as EnergyType
    const category = CARRIER_CATEGORY[type]
    if (!category || !list?.length) continue
    const trend = yearOverYearTrend(sortByDate(list))
    if (!trend || trend.direction !== 'up') continue
    const pct = trend.changePct
    if (pct === undefined || pct < CONSUMPTION_RISE_MIN) continue

    // Aus Tagesmittel und Änderung die Mehrmenge des letzten Jahres ableiten.
    const currentYear = trend.perDay * 365
    const extra = currentYear - currentYear / (1 + pct)
    const price = context.eurPerUnit?.[type]
    const extraCost = price !== undefined && price > 0 ? Math.round(extra * price) : undefined

    tips.push({
      id: `consumption_up_${type}`,
      textId: 'consumption_up',
      icon: TrendingUp,
      category,
      quantity: {
        key: extraCost !== undefined ? 'tips.quantity.moreWithCost' : 'tips.quantity.more',
        params: {
          amount: Math.round(extra),
          unit: ENERGY_META[type].unit,
          cost: extraCost ?? 0,
        },
      },
      // Kostenlos und in einer Viertelstunde angegangen – der Befund gehört nach
      // vorn, nicht hinter das Wegrücken eines Sofas.
      effortMinutes: 10,
      costEur: 0,
      params: {
        // `carrier` wird im Text über $t(monitoring.energyTypes.{{carrier}})
        // aufgelöst – so steht dort „Strom" statt „electricity".
        carrier: type,
        percent: Math.round(pct * 100),
        amount: Math.round(extra),
        unit: ENERGY_META[type].unit,
      },
      linkTo: `/monitoring/${type}`,
    })
  }

  // --- Heizung ---------------------------------------------------------------
  // Ein alter Gas- oder Oelkessel ist der groesste Einzelhebel eines Hauses –
  // und der einzige Tipp hier, der ohne Messung auskommt: Das Alter allein
  // genuegt. Bewusst mit hohem Aufwand und hohen Kosten hinterlegt, damit er in
  // der Gruppe „Braucht etwas Vorbereitung" landet und keine Sofortmassnahme
  // verdraengt.
  const boilerAge = boilerAgeYears(data)
  if (boilerAge !== undefined && boilerAge >= BOILER_OLD_YEARS) {
    tips.push({
      id: 'old_boiler',
      icon: Flame,
      category: 'heating',
      effortMinutes: 240,
      costEur: 8000,
      params: { years: boilerAge },
    })
  }

  return tips.sort((a, b) => compareTips(a, b, data.goals))
}
