export type Theme = 'light' | 'dark' | 'htw'

export type OnboardingMode = 'quick' | 'detailed'

export type UserGoal =
  | 'save_costs'
  | 'reduce_co2'
  | 'improve_comfort'
  /** Zählerstände regelmäßig eintragen – führt nach dem Fragebogen ins Monitoring. */
  | 'track_readings'
  | 'curiosity'

export type OccupancyStatus = 'tenant' | 'owner'

export type WindowAge =
  | 'before_1980'
  | '1980_2000'
  | '2000_2015'
  | 'after_2015'
  | 'unknown'

export type VentilationType =
  | 'natural'
  | 'mechanical_hrv'
  | 'mechanical_no_hrv'
  | 'unknown'

export type InsulationState =
  | 'very_good'
  | 'good'
  | 'medium'
  | 'poor'
  | 'unknown'

export type SmartHomeDevice =
  | 'smart_thermostat'
  | 'smart_meter'
  | 'smart_plugs'
  | 'none'

export type RenovationYear =
  | 'never'
  | 'before_2000'
  | '2000_2010'
  | '2010_2020'
  | 'after_2020'
  | 'unknown'

/**
 * Eine Sanierung in einem bestimmten Jahr.
 *
 * Ersetzt das frühere Modell aus **einem** globalen Jahr plus flacher
 * Häkchenliste: Real werden Fenster (z. B. 2005) und Heizung (z. B. 2021)
 * getrennt saniert, und ein Jahr für alles kann das nicht abbilden.
 */
export interface RenovationEvent {
  /** Stabile id für Bearbeitung und Löschen. */
  id: string
  /** Jahr der Maßnahme (vierstellig). */
  year: number
  /** In diesem Jahr durchgeführte Maßnahmen. */
  items: RenovationItem[]
  /** true = aus einem Altprofil abgeleitet, das Jahr ist nur geschätzt. */
  estimated?: boolean
}

export type RenovationItem =
  | 'roof_insulation'
  | 'windows'
  | 'heating_system'
  | 'facade'
  | 'basement_ceiling'
  | 'nothing'

/**
 * Kühl- und Gefriergeräte.
 *
 * `fridge_freezer` ist die verbreitete Kombination in einem Gehäuse – sie zählt
 * für beide Checks, sonst müsste der Nutzer zweimal dasselbe Gerät angeben.
 */
export type ApplianceKind = 'fridge' | 'freezer' | 'fridge_freezer'

export interface ApplianceEntry {
  /**
   * Stabile Kennung, beim Anlegen vergeben und danach unveränderlich.
   *
   * **Bewusst kein Index.** Die Pro-Raum-Checks identifizieren über
   * `type#index` – für Räume geht das gerade noch durch, für Geräte nicht:
   * Löscht man den ersten von zwei Kühlschränken, rutschte `fridge#1` auf
   * `fridge#0` und erbte das Ergebnis des gelöschten Geräts. Der Nutzer sähe
   * eine Messung, die er an einem anderen Gerät gemacht hat.
   *
   * Bestandsgeräte tragen `id = kind` (siehe `migrateOnboardingData`): Weil je
   * Art höchstens ein Eintrag möglich war, ist das eindeutig und kollisionsfrei.
   */
  id: string
  kind: ApplianceKind
  /** Wo es steht – speist die Raum-Zuordnung des Checks. */
  room?: RoomType
  /**
   * Frei wählbarer Name, nötig erst bei zwei Geräten derselben Art im selben
   * Raum („Getränkekühlschrank"). Leer heißt: Raum und Art benennen es.
   */
  name?: string
}

export type BuildingType = 'apartment' | 'house'

export type HeatGeneratorType =
  | 'gas_boiler'
  | 'oil_boiler'
  | 'heat_pump'
  | 'wood_stove'
  | 'pellets'
  | 'solar_thermal'
  | 'unknown'

export type HotWaterType =
  | 'same_as_heating'
  | 'separate_system'
  | 'partially_combined'
  | 'unknown'

export type HeatTransferType = 'radiator' | 'underfloor'

export type RoomType =
  | 'living_room'
  | 'dining_room'
  | 'bedroom'
  | 'children_room'
  | 'office'
  | 'kitchen'
  | 'bathroom'
  | 'toilet'
  | 'hallway'
  | 'utility_room'
  | 'basement'
  | 'staircase'
  | 'attic'

export type InstrumentType =
  | 'temperature_sensor'
  | 'distance_meter'
  | 'co2_sensor'
  | 'humidity_sensor'
  | 'power_meter'
  | 'none'
  | 'unknown'

export type LocationMode = 'manual' | 'automatic' | 'skip'

export interface RoomEntry {
  type: RoomType
  count: number
  /**
   * Wärmeübergabe im Raum. **Optional**, weil „noch nicht beantwortet" ein
   * eigener Zustand sein muss: Vorher stand hier bei jedem neuen Raum
   * `'radiator'`, und der Möbelabstand-Check bewertete stillschweigend
   * Heizkörper – auch in Räumen mit Fußbodenheizung. Fehlt der Wert, fragt der
   * Check einmal nach und schreibt die Antwort zurück.
   */
  heatTransfer?: HeatTransferType
  /** Optionale Wohnfläche dieses Raumtyps in m² (gilt je Raum-Instanz). Fehlt
   *  sie, greift ein typischer Fallback-Wert je Raumtyp. */
  areaSqm?: number
}

export interface InstrumentEntry {
  type: InstrumentType
  /** Gewählte Subtyp/Modell-Schlüssel für dieses Gerät (gerätespezifisch). */
  modelTypes?: string[]
}

export interface OnboardingData {
  profileName: string
  /** Optionales Profilbild als heruntergerechnetes Data-URL (localStorage + Firestore-Sync). */
  profileImage?: string
  personsCount: number
  roomsCount: number
  buildingYear: number
  buildingType: BuildingType
  livingArea: number
  rooms: RoomEntry[]
  heatGenerators: HeatGeneratorType[]
  hotWaterType: HotWaterType
  instruments: InstrumentEntry[]
  locationMode: LocationMode
  postalCode: string
  completed: boolean
  mode: OnboardingMode
  goals: UserGoal[]
  occupancyStatus: OccupancyStatus | null
  floors: number
  windowAge: WindowAge
  hasPV: 'yes' | 'no' | 'planned'
  hasExtraFireplace: boolean
  ventilationType: VentilationType
  insulationState: InsulationState
  smartHomeDevices: SmartHomeDevice[]
  /**
   * Sanierungen als Ereignis-Log, chronologisch aufsteigend.
   *
   * `null` = noch nichts eingetragen, `[]` = ausdrücklich „nie saniert". Der
   * Unterschied zählt: Ohne ihn ließe sich eine unbeantwortete Frage nicht von
   * einem unsanierten Haus unterscheiden.
   */
  renovations: RenovationEvent[] | null
  /** Baujahr je gewähltem Wärmeerzeuger (optional, „weiß nicht" = fehlt). */
  heatGeneratorYears: Partial<Record<HeatGeneratorType, number>>
  /**
   * Vorhandene Kühl- und Gefriergeräte.
   *
   * Zusammen mit {@link OnboardingData.appliancesAnswered}: leer **und**
   * beantwortet heißt ausdrücklich „wir haben keines" – dann fallen die
   * zugehörigen Checks aus Zähler und Nenner. Leer und unbeantwortet heißt nur,
   * dass die Frage noch offen ist; gesperrt wird deswegen nichts.
   */
  appliances: ApplianceEntry[]
  /** true = die Gerätefrage wurde beantwortet (auch mit „keines"). */
  appliancesAnswered: boolean
  /**
   * Abgeleitet aus {@link OnboardingData.renovations} – bleibt für Demo-Profil,
   * Firestore-Sync und die Übersichtsseite erhalten. Nicht direkt bearbeiten.
   */
  lastRenovationYear: RenovationYear
  /** Abgeleitet aus {@link OnboardingData.renovations}. Nicht direkt bearbeiten. */
  renovationItems: RenovationItem[]
}
