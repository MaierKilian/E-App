import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, ChevronRight, Lightbulb } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { buildTips } from '@/features/tips/buildTips'
import type { OnboardingData } from '@/types'
import { ProgressRing } from './ProgressRing'
import { profileCompleteness } from './estimateEnergy'
import { ProfileSwitcher } from '@/features/profiles/ProfileSwitcher'

interface HomeDashboardProps {
  data: OnboardingData
  onEdit: () => void
}

/**
 * Ultra-minimalistisches Zuhause-Dashboard: Begrüßungskarte mit Fortschrittsring
 * (öffnet den Fragebogen), ein prägnanter Aufruf zum Vervollständigen (nur solange
 * das Profil unvollständig ist), personalisierte Empfehlungen und die Wohnungs-
 * Auswahl. Bewusst ohne großen Profil-Block, damit bis zu vier Wohnungen ohne
 * Scrollen auf einen Screen passen.
 */
export function HomeDashboard({ data, onEdit }: HomeDashboardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const results = useMeasurementsStore((s) => s.results)

  const completeness = profileCompleteness(data)
  const isComplete = completeness >= 100
  const tips = buildTips(data, results)

  return (
    <div className="space-y-4">
      {/* 1. Begrüßung + Fortschrittsring – ganze Karte öffnet den Fragebogen */}
      <button
        type="button"
        onClick={onEdit}
        className="focus-ring glass w-full text-left rounded-3xl p-5 flex items-center gap-4 transition-transform duration-200 active:scale-[0.99]"
      >
        <ProgressRing value={completeness} size={72} stroke={6}>
          <Avatar src={data.profileImage || undefined} name={data.profileName} size={56} />
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{t('home.greeting')}</p>
          <h1 className="text-xl font-bold text-foreground truncate">
            {(data.profileName ?? '').trim() || t('home.profileNameFallback')}
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            {isComplete
              ? t('home.profileComplete')
              : t('home.completenessLabel', { value: completeness })}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted shrink-0" />
      </button>

      {/* 2. Prägnanter Aufruf – nur solange das Profil noch nicht vollständig ist */}
      {!isComplete && (
        <button
          type="button"
          onClick={onEdit}
          className="focus-ring w-full flex items-center justify-center gap-2 rounded-3xl bg-primary text-primary-foreground py-4 font-semibold shadow-[0_8px_24px_color-mix(in_srgb,var(--primary)_30%,transparent)] active:scale-[0.98] transition-transform"
        >
          <ClipboardList className="w-5 h-5" />
          {t('home.questionnaire.continue')}
        </button>
      )}

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
