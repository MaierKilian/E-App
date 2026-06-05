import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from '@/app/navigation'

/** Untere Navigationsleiste – nur auf Mobilgeräten sichtbar. */
export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav className="glass-bar md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
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
              <Icon className="w-5 h-5" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
