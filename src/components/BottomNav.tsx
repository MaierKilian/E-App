import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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

          if (item.id === 'onboarding' && isEditingSection) {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(-2)}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted'
                }`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                </span>
                <span>{t(item.labelKey)}</span>
              </button>
            )
          }

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted'
                }`
              }
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {showDot && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-surface" />
                )}
              </span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
