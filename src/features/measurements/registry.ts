import type { MeasurementId } from './types'
import type { MeasurementModule } from './runnerTypes'
import { ShowerheadIntro } from './showerhead/ShowerheadIntro'
import { ShowerheadRun } from './showerhead/ShowerheadRun'
import { ShowerheadResult } from './showerhead/ShowerheadResult'
import { HotWaterWaitIntro } from './hot_water_wait/HotWaterWaitIntro'
import { HotWaterWaitRun } from './hot_water_wait/HotWaterWaitRun'
import { HotWaterWaitResult } from './hot_water_wait/HotWaterWaitResult'
import { StandbyIntro } from './standby/StandbyIntro'
import { StandbyRun } from './standby/StandbyRun'
import { StandbyResult } from './standby/StandbyResult'
import { RoomTemperatureIntro } from './room_temperature/RoomTemperatureIntro'
import { RoomTemperatureRun } from './room_temperature/RoomTemperatureRun'
import { RoomTemperatureResult } from './room_temperature/RoomTemperatureResult'
import { FurnitureSpacingIntro } from './furniture_spacing/FurnitureSpacingIntro'
import { FurnitureSpacingRun } from './furniture_spacing/FurnitureSpacingRun'
import { FurnitureSpacingResult } from './furniture_spacing/FurnitureSpacingResult'
import { BaseLoadIntro } from './base_load/BaseLoadIntro'
import { BaseLoadRun } from './base_load/BaseLoadRun'
import { BaseLoadResult } from './base_load/BaseLoadResult'
import { LightingIntro } from './lighting/LightingIntro'
import { LightingRun } from './lighting/LightingRun'
import { LightingResult } from './lighting/LightingResult'
import { FridgeIntro } from './fridge/FridgeIntro'
import { FridgeRun } from './fridge/FridgeRun'
import { FridgeResult } from './fridge/FridgeResult'
import { FreezerIntro } from './freezer/FreezerIntro'
import { FreezerRun } from './freezer/FreezerRun'
import { FreezerResult } from './freezer/FreezerResult'

/**
 * Registry der durchführbaren Messungen: id → {Intro, Run, Result}.
 * Weitere Messungen werden hier ergänzt, sobald ihre Komponenten existieren und
 * sie im Katalog auf `available: true` stehen.
 */
export const MEASUREMENT_MODULES: Partial<Record<MeasurementId, MeasurementModule>> = {
  showerhead: {
    Intro: ShowerheadIntro,
    Run: ShowerheadRun,
    Result: ShowerheadResult,
  },
  hot_water_wait: {
    Intro: HotWaterWaitIntro,
    Run: HotWaterWaitRun,
    Result: HotWaterWaitResult,
  },
  standby: {
    Intro: StandbyIntro,
    Run: StandbyRun,
    Result: StandbyResult,
  },
  room_temperature: {
    Intro: RoomTemperatureIntro,
    Run: RoomTemperatureRun,
    Result: RoomTemperatureResult,
  },
  furniture_spacing: {
    Intro: FurnitureSpacingIntro,
    Run: FurnitureSpacingRun,
    Result: FurnitureSpacingResult,
  },
  base_load: {
    Intro: BaseLoadIntro,
    Run: BaseLoadRun,
    Result: BaseLoadResult,
  },
  lighting: {
    Intro: LightingIntro,
    Run: LightingRun,
    Result: LightingResult,
  },
  fridge: {
    Intro: FridgeIntro,
    Run: FridgeRun,
    Result: FridgeResult,
  },
  freezer: {
    Intro: FreezerIntro,
    Run: FreezerRun,
    Result: FreezerResult,
  },
}

export function getMeasurementModule(id: string): MeasurementModule | undefined {
  return MEASUREMENT_MODULES[id as MeasurementId]
}
