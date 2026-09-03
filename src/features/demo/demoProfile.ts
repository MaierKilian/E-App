import type { OnboardingData } from '@/types'
import type { MeasurementResult } from '@/features/measurements/types'
import type { MeterReading } from '@/store/readingsStore'
import { instanceKey } from '@/features/measurements/rooms'

/**
 * Fertig befüllte Beispiel-Wohnung für den Demo-Modus (`?demo`).
 *
 * Erzeugt einen vollständigen Store-Schnappschuss (Onboarding, Messungen,
 * Zählerstände, Tarife …) einer realistischen Muster-Wohnung: sinnvoll
 * ausgefüllter Fragebogen, viele abgeschlossene Checks und ~18 Monate
 * regelmäßiger Ablesungen für Strom, Gas und Wasser. Die Daten werden bei
 * jedem Aufruf relativ zum heutigen Datum gebaut, damit die Verläufe aktuell
 * wirken. Rein clientseitig – kein Konto, kein Firestore.
 */

const READING_MONTHS = 18

/** Datum vor `monthsAgo` Monaten (fester Ablese-Tag), lokale Zeit. */
function monthDate(monthsAgo: number, day = 3): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, 9, 0, 0)
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const iso = (d: Date) => d.toISOString()

/**
 * Baut monatliche, aufsteigende Zählerstände (älteste zuerst).
 * `consumption(month)` liefert den Verbrauch bis zur jeweiligen Ablesung
 * (month = 0..11), sodass sich saisonale Muster abbilden lassen.
 */
function buildReadings(prefix: string, startValue: number, consumption: (month: number) => number): MeterReading[] {
  const list: MeterReading[] = []
  let value = startValue
  for (let k = 0; k < READING_MONTHS; k++) {
    const d = monthDate(READING_MONTHS - 1 - k)
    if (k > 0) value += consumption(d.getMonth())
    list.push({ id: `demo-${prefix}-${k}`, date: ymd(d), value: Math.round(value), createdAt: iso(d) })
  }
  return list
}

// Strom: Grundlast + leichter Winter-Aufschlag.
const electricity = buildReadings('el', 24_820, (m) => {
  const winter = [11, 0, 1].includes(m) ? 55 : [10, 2].includes(m) ? 28 : [5, 6, 7].includes(m) ? -28 : 0
  return 272 + winter
})

// Gas: stark saisonal (Heizung im Winter, Warmwasser im Sommer).
const GAS_BY_MONTH = [232, 208, 150, 92, 46, 27, 22, 25, 41, 96, 162, 224] // Jan..Dez, m³
const gas = buildReadings('gas', 8_240, (m) => GAS_BY_MONTH[m])

// Wasser: relativ konstant.
const water = buildReadings('wa', 436, (m) => 9 + (m % 3))

/** Ergebnis-Helfer: verteilt die „completedAt" über die letzten Wochen. */
function result(
  id: MeasurementResult['id'],
  rating: MeasurementResult['rating'],
  primaryValue: number,
  unit: string,
  daysAgo: number,
  extra?: { roomKey?: string; details?: Record<string, number> },
): MeasurementResult {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return {
    id,
    rating,
    primaryValue,
    unit,
    completedAt: d.toISOString(),
    ...(extra?.roomKey ? { roomKey: extra.roomKey } : {}),
    ...(extra?.details ? { details: extra.details } : {}),
  }
}

// Viele abgeschlossene Checks – ganzhaus- und raumbezogen.
const RESULTS: MeasurementResult[] = [
  result('showerhead', 'medium', 11.4, 'L/min', 34, { details: { liters: 1.9, seconds: 10 } }),
  result('hot_water_wait', 'medium', 24, 's', 33, { details: { seconds: 24 } }),
  result('base_load', 'elevated', 132, 'W', 20, { details: { watts: 132 } }),
  result('standby', 'high', 31, 'W', 19, { details: { watts: 31 } }),
  result('fridge', 'good', 0.82, 'kWh/Tag', 27, { details: { kwhPerDay: 0.82, watts: 34 } }),
  // Gefrier-Check: flächig dünn vereist. Hauptwert ist der Anteil am
  // Verbrauch – der frühere kWh/Tag-Wert stammte noch aus einer Zeit, in der
  // der Check etwas anderes gemessen hat als heute.
  result('freezer', 'elevated', 12, '%', 26, {
    details: { iced: 1, frostStage: 2, extraPercent: 12, method: 1, savingEstimated: 1 },
  }),
  result('room_temperature', 'good', 21.5, '°C', 12, { roomKey: 'living_room#0', details: { celsius: 21.5 } }),
  result('room_temperature', 'good', 18.5, '°C', 12, { roomKey: 'bedroom#0', details: { celsius: 18.5 } }),
  result('room_temperature', 'medium', 22.5, '°C', 11, { roomKey: 'children_room#0', details: { celsius: 22.5 } }),
  result('furniture_spacing', 'medium', 4, 'cm', 10, { roomKey: 'living_room#0', details: { centimeters: 4 } }),
  // LED-Check: ein Ergebnis fuer die Wohnung, je Raum eine Ja/Nein-Antwort.
  result('lighting', 'high', 3, '', 8, {
    details: {
      'room:living_room#0': 1,
      'room:kitchen#0': 1,
      'room:bedroom#0': 0,
      'room:children_room#0': 0,
      'room:bathroom#0': 0,
      'room:hallway#0': 1,
      openRooms: 3,
      checkedRooms: 6,
    },
  }),
]

const measurementResults: Record<string, MeasurementResult> = {}
for (const r of RESULTS) {
  measurementResults[instanceKey(r.id, r.roomKey)] = r
}

const onboardingData: OnboardingData = {
  profileName: 'Familie Berger',
  profileImage: '',
  personsCount: 3,
  roomsCount: 4,
  buildingYear: 1962,
  buildingType: 'apartment',
  livingArea: 85,
  rooms: [
    { type: 'living_room', count: 1, heatTransfer: 'radiator', areaSqm: 26 },
    { type: 'bedroom', count: 1, heatTransfer: 'radiator', areaSqm: 16 },
    { type: 'children_room', count: 1, heatTransfer: 'radiator', areaSqm: 12 },
    { type: 'kitchen', count: 1, heatTransfer: 'radiator', areaSqm: 11 },
    { type: 'bathroom', count: 1, heatTransfer: 'radiator', areaSqm: 6 },
    { type: 'hallway', count: 1, heatTransfer: 'radiator', areaSqm: 8 },
  ],
  heatGenerators: ['gas_boiler'],
  hotWaterType: 'same_as_heating',
  instruments: [
    { type: 'power_meter' },
    { type: 'temperature_sensor' },
    { type: 'distance_meter' },
  ],
  locationMode: 'manual',
  postalCode: '10405',
  completed: true,
  mode: 'detailed',
  goals: ['save_costs', 'reduce_co2'],
  occupancyStatus: 'tenant',
  floors: 1,
  windowAge: '1980_2000',
  hasPV: 'no',
  hasExtraFireplace: false,
  ventilationType: 'natural',
  insulationState: 'medium',
  smartHomeDevices: ['smart_meter'],
  // Ereignis-Log ist die Eingabe; die Altfelder darunter sind die Ableitung.
  renovations: [{ id: 'demo-2006', year: 2006, items: ['windows'] }],
  heatGeneratorYears: { gas_boiler: 2004 },
  // Kühl-Gefrier-Kombination in der Küche – bedient beide Checks, so wie die
  // Beispiel-Wohnung sie auch beide zeigt.
  appliances: [{ id: 'fridge_freezer', kind: 'fridge_freezer', room: 'kitchen' }],
  appliancesAnswered: true,
  lastRenovationYear: '2000_2010',
  renovationItems: ['windows'],
}

/** Vollständiger Store-Schnappschuss der Beispiel-Wohnung (STORES-Format). */
export function buildDemoSnapshot(): Record<string, unknown> {
  return {
    onboarding: {
      data: onboardingData,
      currentStep: -1,
      flowMode: 'linear',
      editReturnTo: null,
    },
    measurements: {
      results: measurementResults,
      skipped: [],
      measurementsView: 'recommended',
    },
    readings: {
      readings: { electricity, gas, water },
      reminderFrequency: 'monthly',
    },
    tariff: {
      electricityWorkPrice: 36,
      electricityBasePrice: 13,
      isCustom: true,
      promptSeen: true,
      prices: {
        gas: { work: 1.25, base: 14, custom: true },
        water: { work: 4.8, base: 0, custom: true },
      },
    },
    progress: { quizResults: {} },
    drafts: { drafts: {} },
  }
}
