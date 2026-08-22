import { useTranslation } from 'react-i18next'
import { Lightbulb, CheckCircle2 } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { ResultHero } from '../ResultHero'
import { roomInstances, roomLabel } from '../rooms'
import { openRoomKeys, rankOpenRooms, roomPriority } from './lighting'
import type { ResultProps } from '../runnerTypes'

/**
 * Ergebnis des LED-Checks: eine Aufgabenliste, keine Rechnung.
 *
 * Die Reihenfolge ist die eigentliche Leistung – sie entsteht aus dem Raumtyp
 * und kostet den Nutzer keine einzige Eingabe. Der Euro-Betrag fehlt bewusst:
 * Er hing an einer geratenen Brenndauer und hätte hier nichts entschieden, was
 * nicht ohnehin feststeht.
 */
export function LightingResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const instances = roomInstances(rooms)

  const openKeys = openRoomKeys(result.details)
  const ranked = rankOpenRooms(instances, openKeys)
  const checkedRooms = result.details?.checkedRooms ?? 0

  if (ranked.length === 0) {
    return (
      <div className="space-y-4">
        <ResultHero
          rating="good"
          icon={CheckCircle2}
          badgeLabel={t('measurements.lighting.result.doneBadge')}
          summary={t('measurements.lighting.result.doneSummary', { count: checkedRooms })}
        />
        <div className="glass rounded-3xl p-4 text-sm text-foreground">
          {t('measurements.lighting.result.doneTip')}
        </div>
      </div>
    )
  }

  const first = ranked[0]

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        value={String(ranked.length)}
        unit={t('measurements.lighting.unit', { count: ranked.length })}
        badgeLabel={t('measurements.lighting.result.badge')}
        summary={t('measurements.lighting.result.summary', {
          room: roomLabel(t, first),
        })}
      />

      <div className="glass rounded-3xl p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">
          {t('measurements.lighting.result.orderTitle')}
        </p>
        <ol className="space-y-2.5">
          {ranked.map((inst, i) => (
            <li key={inst.key} className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {roomLabel(t, inst)}
              </span>
              <span className="shrink-0 text-[11px] text-muted">
                {t(`measurements.lighting.result.priority.${roomPriority(inst.type)}`)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="glass rounded-3xl p-4">
        <div className="mb-2 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            {t('measurements.lighting.result.worthTitle')}
          </p>
        </div>
        <p className="text-sm text-muted">{t('measurements.lighting.result.worth')}</p>
      </div>
    </div>
  )
}
