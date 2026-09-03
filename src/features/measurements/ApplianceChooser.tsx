import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, Refrigerator } from 'lucide-react'
import { applianceResult, type Results } from './progress'
import { applianceLabel } from './applianceLabel'
import type { ApplianceEntry } from '@/types'

interface Props {
  /** Mess-Id (`fridge` / `freezer`). */
  id: string
  devices: ApplianceEntry[]
  results: Results
}

/**
 * Welches Gerät wird gemessen?
 *
 * Das Gegenstück zur Raum-Auswahl der Pro-Raum-Checks – mit demselben Aufbau
 * und demselben Zweck: Vor Etappe 12b landete jede Messung unter demselben
 * Schlüssel, das zweite Gerät überschrieb also das erste. Ohne Warnung.
 *
 * Erscheint nur bei mehr als einem Gerät; bei genau einem springt der Runner
 * von selbst weiter.
 */
export function ApplianceChooser({ id, devices, results }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          {t('measurements.common.applianceChoose')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('measurements.common.applianceChooseHint')}</p>
      </div>

      <ul className="space-y-2">
        {devices.map((device, i) => {
          // Das Altergebnis zählt für das erste Gerät seiner Art – sonst sähe
          // ein Bestandsnutzer seine Messung als „noch nicht gemessen".
          const done = Boolean(applianceResult(results, id, device.id, i === 0))
          return (
            <li key={device.id}>
              <button
                type="button"
                onClick={() =>
                  navigate(`/measurements/${id}?room=${encodeURIComponent(device.id)}`)
                }
                className="focus-ring glass flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-transform active:scale-[0.99]"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                    done ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted'
                  }`}
                >
                  <Refrigerator className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {applianceLabel(t, device, devices)}
                  </span>
                  <span className="block text-xs text-muted">
                    {t(done ? 'measurements.common.applianceDone' : 'measurements.common.applianceOpen')}
                  </span>
                </span>
                {done ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
