import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Leaf } from 'lucide-react'
import { NAV_ITEMS } from '@/app/navigation'
import { ThemeSwitcher } from './ThemeSwitcher'
import { LanguageSwitcher } from './LanguageSwitcher'

/** Feste Kopfzeile mit Logo, Navigation (Desktop) sowie Sprach- und Theme-Wahl. */
export function Header() {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Leaf className="w-5 h-5" />
          </span>
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
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  )
}
