import { useTranslation } from 'react-i18next'
import { Home, Calendar, Users, LayoutGrid, Flame, KeyRound, Target, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { OnboardingData } from '@/types'

interface Fact {
  icon: LucideIcon
  value: string
  label: string
}

/**
 * Prägnante, dashboardartige Darstellung der wichtigsten Profil-Eckdaten
 * als kompakte Icon-Kacheln (statt einer rohen Werteliste).
 */
export function ProfileSnapshot({ data }: { data: OnboardingData }) {
  const { t } = useTranslation()

  const roomCount = data.rooms.length
    ? data.rooms.reduce((sum, r) => sum + r.count, 0)
    : data.roomsCount

  const facts: Fact[] = [
    {
      icon: Home,
      value: `${t(`onboarding.step2.${data.buildingType}`)} · ${data.livingArea} m²`,
      label: t('home.snapshot.building'),
    },
    {
      icon: Calendar,
      value: String(data.buildingYear),
      label: t('home.snapshot.year'),
    },
    {
      icon: Users,
      value: String(data.personsCount),
      label: t('home.snapshot.people'),
    },
    {
      icon: LayoutGrid,
      value: String(roomCount),
      label: t('home.snapshot.rooms'),
    },
  ]

  if (data.heatGenerators.length > 0) {
    const first = t(`onboarding.step4.generators.${data.heatGenerators[0]}`)
    const extra = data.heatGenerators.length > 1 ? ` +${data.heatGenerators.length - 1}` : ''
    facts.push({ icon: Flame, value: `${first}${extra}`, label: t('home.snapshot.heating') })
  }
  if (data.occupancyStatus) {
    facts.push({
      icon: KeyRound,
      value: t(`onboarding.step1.occupancyOptions.${data.occupancyStatus}`),
      label: t('home.snapshot.status'),
    })
  }
  if (data.goals.length > 0) {
    facts.push({
      icon: Target,
      value: t(`onboarding.step1.goalOptions.${data.goals[0]}`),
      label: t('home.snapshot.goal'),
    })
  }
  if ((data.postalCode ?? '').trim()) {
    facts.push({ icon: MapPin, value: data.postalCode, label: t('home.snapshot.location') })
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {facts.map((fact, i) => {
        const Icon = fact.icon
        return (
          <div key={i} className="glass rounded-2xl p-3 flex items-center gap-2.5 min-w-0">
            <span className="grid place-items-center w-8 h-8 shrink-0 rounded-xl bg-primary/10 text-primary">
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{fact.value}</p>
              <p className="text-[0.7rem] text-muted truncate">{fact.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
