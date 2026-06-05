export type Theme = 'light' | 'dark' | 'htw'

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
  | 'bedroom'
  | 'children_room'
  | 'kitchen'
  | 'bathroom'
  | 'toilet'
  | 'guest_toilet'
  | 'hallway'
  | 'office'
  | 'bureau'
  | 'staircase'
  | 'basement'

export type InstrumentType =
  | 'temperature_sensor'
  | 'distance_meter'
  | 'co2_sensor'
  | 'humidity_sensor'
  | 'power_meter'
  | 'none'
  | 'unknown'

export type TemperatureSensorSubType =
  | 'contact'
  | 'room'
  | 'infrared'

export type LocationMode = 'manual' | 'automatic' | 'skip'

export interface RoomEntry {
  type: RoomType
  count: number
  heatTransfer: HeatTransferType
}

export interface InstrumentEntry {
  type: InstrumentType
  temperatureSubTypes?: TemperatureSensorSubType[]
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
  completed: boolean
}
