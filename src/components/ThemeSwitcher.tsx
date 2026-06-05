import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Leaf, Check, Palette } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettingsStore, THEMES, type Theme } from '@/store/settingsStore'

const THEME_ICONS: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  htw: Leaf,
}

/** Auswahl des Farb-Themes (Hell / Dunkel / HTW-Grün) über ein kleines Menü. */
export function ThemeSwitcher() {
  const { t } = useTranslation()
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const CurrentIcon = THEME_ICONS[theme]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t('theme.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid place-items-center w-9 h-9 rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
      >
        <CurrentIcon className="w-4.5 h-4.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg z-30"
        >
          <p className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Palette className="w-3.5 h-3.5" />
            {t('theme.label')}
          </p>
          {THEMES.map((option) => {
            const Icon = THEME_ICONS[option]
            const active = option === theme
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(option)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'text-primary' : 'text-foreground hover:bg-surface-2'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{t(`theme.${option}`)}</span>
                {active && <Check className="w-4 h-4" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
