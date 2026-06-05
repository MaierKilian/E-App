import type { MeasurementId } from './types'
import type { MeasurementModule } from './runnerTypes'
import { ShowerheadIntro } from './showerhead/ShowerheadIntro'
import { ShowerheadRun } from './showerhead/ShowerheadRun'
import { ShowerheadResult } from './showerhead/ShowerheadResult'
import { StandbyIntro } from './standby/StandbyIntro'
import { StandbyRun } from './standby/StandbyRun'
import { StandbyResult } from './standby/StandbyResult'

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
  standby: {
    Intro: StandbyIntro,
    Run: StandbyRun,
    Result: StandbyResult,
  },
}

export function getMeasurementModule(id: string): MeasurementModule | undefined {
  return MEASUREMENT_MODULES[id as MeasurementId]
}
