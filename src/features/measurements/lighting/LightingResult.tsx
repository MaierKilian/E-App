import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ShoppingBag } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useOnboardingStore } from '@/store/onboardingStore'
import { ResultHero } from '../ResultHero'
import { roomInstances, roomLabel, roomLabelIn } from '../rooms'
import { openRoomKeys, rankOpenRooms, roomPriority } from './lighting'
import type { ResultProps } from '../runnerTypes'

/**
 * Ergebnis des LED-Checks: eine Aufgabenliste, keine Rechnung.
 *
 * Die Reihenfolge ist die eigentliche Leistung – sie entsteht aus dem Raumtyp
 * und kostet den Nutzer keine einzige Eingabe. Der Euro-Betrag fehlt bewusst:
 * Er hing an einer geratenen Brenndauer und hätte hier nichts entschieden, was
 * nicht ohnehin feststeht.
 *
 * Der Schirm hält sich kurz, damit die Liste ohne Scrollen sichtbar ist: Was
 * beim Kauf zu beachten ist, braucht man erst im Laden – das steht deshalb
 * hinter einem Knopf und nicht zwischen Ergebnis und „Speichern".
 */
export function LightingResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const instances = roomInstances(rooms)
  const [buyingOpen, setBuyingOpen] = useState(false)

  const ranked = rankOpenRooms(instances, openRoomKeys(result.details))
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

  return (
    <div className="space-y-3">
      {/* Ohne grosse Zahl: Die Anzahl steht schon in der nummerierten Liste
          darunter, und die Reihenfolge ist das Ergebnis – nicht ihre Laenge. */}
      <ResultHero
        rating={result.rating}
        badgeLabel={t('measurements.lighting.result.badge')}
        summary={t('measurements.lighting.result.summary', {
          count: ranked.length,
          room: roomLabelIn(t, ranked[0]),
        })}
      />

      <div className="glass rounded-3xl p-4">
        <ol className="space-y-1.5">
          {ranked.map((inst, i) => (
            <li key={inst.key} className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
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
        <button
          type="button"
          onClick={() => setBuyingOpen(true)}
          className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-full text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          {t('measurements.lighting.result.worthButton')}
        </button>
      </div>

      <Modal
        open={buyingOpen}
        onClose={() => setBuyingOpen(false)}
        title={t('measurements.lighting.result.worthTitle')}
      >
        <p className="text-sm text-muted">{t('measurements.lighting.result.worth')}</p>
      </Modal>
    </div>
  )
}
