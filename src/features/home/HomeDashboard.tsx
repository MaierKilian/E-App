import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Lightbulb, CheckCircle2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { buildTips } from '@/features/tips/buildTips'
import type { OnboardingData } from '@/types'
import { ProgressRing } from './ProgressRing'
import { EnergySummaryCard } from './EnergySummaryCard'
import { profileCompleteness, profileMissingCount } from './estimateEnergy'
import { ProfileSwitcher } from '@/features/profiles/ProfileSwitcher'

interface HomeDashboardProps {
  data: OnboardingData
  onEdit: () => void
}

/**
 * Ultra-minimalistisches Zuhause-Dashboard.
 *
 * 1. Eine Karte vereint Begrüßung, Fortschritt und (nur solange nötig) den Aufruf
 *    zum Vervollständigen – der frühere große schwarze Button entfällt.
 * 2. Energie-Status: hochgerechnete Jahreskosten, aber nur mit echten Zählerständen.
 * 3. Personalisierte Empfehlungen.
 * 4. Wohnungs-Auswahl (schlank bei einer, als Raster ab zwei Wohnungen).
 * Bewusst ohne großen Profil-Block, damit alles ohne Scrollen auf einen Screen passt.
 */
export function HomeDashboard({ data, onEdit }: HomeDashboardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const results = useMeasurementsStore((s) => s.results)

  const completeness = profileCompleteness(data)
  const isComplete = completeness >= 100
  const missing = profileMissingCount(data)
  const tips = buildTips(data, results)

  return (
    <div className="space-y-4">
      {/* 1. Begrüßung + Fortschritt + Aufruf – eine Karte */}
      <div className="glass rounded-3xl p-4">
        <button
          type="button"
          onClick={onEdit}
          className="focus-ring w-full text-left rounded-2xl flex items-center gap-4 transition-transform duration-200 active:scale-[0.99]"
        >
          <ProgressRing value={completeness} size={64} stroke={6}>
            <Avatar src={data.profileImage || undefined} name={data.profileName} size={50} />
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{t('home.greeting')}</p>
            <h1 className="text-xl font-bold text-foreground truncate">
              {(data.profileName ?? '').trim() || t('home.profileNameFallback')}
            </h1>
          </div>
          <ChevronRight className="w-5 h-5 text-muted shrink-0" />
        </button>

        {isComplete ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {t('home.profileComplete')}
          </p>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-muted">
              {t('home.profileMissing', { count: missing })}
            </span>
            <button
              type="button"
              onClick={onEdit}
              className="focus-ring shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
            >
              {t('home.completeCta')}
            </button>
          </div>
        )}
      </div>

      {/* 2. Energie-Status (nur mit echten Zählerständen) */}
      <EnergySummaryCard data={data} />

      {/* 3. Personalisierte Empfehlungen (nur wenn vorhanden) */}
      {tips.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/tipps')}
          className="focus-ring glass w-full text-left rounded-3xl p-4 flex items-center gap-3 transition-transform active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Lightbulb className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{t('tips.entryTitle')}</p>
            <p className="text-xs text-muted">{t('tips.entryCount', { count: tips.length })}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted shrink-0" />
        </button>
      )}

      {/* 4. Wohnprofile: zwischen mehreren Wohnungen wechseln / neue anlegen */}
      <ProfileSwitcher />
    </div>
  )
}
