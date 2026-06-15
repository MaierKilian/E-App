import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from '@/app/navigation'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useReadingsStore } from '@/store/readingsStore'
import { dueTypes } from '@/features/monitoring/due'

/** Untere Navigationsleiste – nur auf Mobilgeräten sichtbar. */
export function BottomNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const data = useOnboardingStore((s) => s.data)
  const flowMode = useOnboardingStore((s) => s.flowMode)
  const currentStep = useOnboardingStore((s) => s.currentStep)
  const setStep = useOnboardingStore((s) => s.setStep)
  const readings = useReadingsStore((s) => s.readings)
  const frequency = useReadingsStore((s) => s.reminderFrequency)
  const [now] = useState(() => Date.now())

  // Fällige Ablesungen → kleiner Hinweispunkt am Monitoring-Tab (In-App-Reminder).
  const monitoringDue = dueTypes(data, readings, frequency, now).length > 0
  // Im Edit-Modus mit geöffnetem Abschnitt: "Zuhause" kehrt zum Profil-Hub zurück.
  const isEditingSection = flowMode === 'edit' && currentStep >= 0

  return (
    <nav className="glass-bar md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const showDot = item.id === 'monitoring' && monitoringDue
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/')

          const iconEl = (
            <span
              className={`relative grid h-8 w-8 place-items-center rounded-xl transition-colors ${
                isActive ? 'bg-primary/15' : ''
              }`}
            >
              <Icon
                className="w-[1.15rem] h-[1.15rem]"
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              {showDot && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-surface" />
              )}
            </span>
          )

          const labelEl = (
            <span
              className={`transition-colors ${
                isActive ? 'font-semibold text-primary' : 'font-medium text-muted/60'
              }`}
            >
              {t(item.labelKey)}
            </span>
          )

          const baseClass =
            'flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors'

          if (item.id === 'onboarding' && isEditingSection) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(-2)}
                className={baseClass}
              >
                {iconEl}
                {labelEl}
              </button>
            )
          }

          return (
            <Link key={item.id} to={item.path} className={baseClass}>
              {iconEl}
              {labelEl}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
