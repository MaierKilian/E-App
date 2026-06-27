export type Theme = 'light' | 'dark' | 'htw'

export type OnboardingMode = 'quick' | 'detailed'

export type UserGoal =
  | 'save_costs'
  | 'reduce_co2'
  | 'improve_comfort'
  | 'curiosity'
  | 'htw_study'

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

export type EnergyCostRange =
  | 'under_100'
  | '100_200'
  | '200_350'
  | 'over_350'
  | 'unknown'

export type RenovationYear =
  | 'never'
  | 'before_2000'
  | '2000_2010'
  | '2010_2020'
  | 'after_2020'
  | 'unknown'

export type RenovationItem =
  | 'roof_insulation'
  | 'windows'
  | 'heating_system'
  | 'facade'
  | 'basement_ceiling'
  | 'nothing'

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
  heatTransfer: HeatTransferType
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
  energyCostRange: EnergyCostRange
  lastRenovationYear: RenovationYear
  renovationItems: RenovationItem[]
}
