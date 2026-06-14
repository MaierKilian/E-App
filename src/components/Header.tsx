import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Logo } from './ui/Logo'
import { NAV_ITEMS } from '@/app/navigation'
import { ProfileMenu } from './ProfileMenu'

/** Feste Kopfzeile mit Logo, Navigation (Desktop) und Profil-/Einstellungs-Menü. */
export function Header() {
  const { t } = useTranslation()

  return (
    <header className="glass-bar sticky top-0 z-20 border-b border-border/60">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6 text-foreground" />
          <span>{t('app.name')}</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:text-foreground hover:bg-surface-2'
                }`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
