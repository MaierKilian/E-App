import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { useSettingsStore, THEMES } from '@/store/settingsStore'
import { THEME_SWATCHES } from '@/app/themes'

/**
 * Theme-Auswahl als umbrechendes Raster mit Farbvorschau. Ersetzt den früheren
 * horizontalen Segmented-Control, der bei mehr als drei Themes auf kleinen
 * Displays zu eng wurde. Wird sowohl auf der Einstellungsseite als auch im
 * Konto-Popover genutzt, damit die Auswahl an beiden Stellen identisch ist und
 * beliebig viele Themes verträgt.
 */
export function ThemePicker() {
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {THEMES.map((key) => {
        const swatch = THEME_SWATCHES[key]
        const active = key === theme
        return (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            aria-pressed={active}
            className={`focus-ring flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${
              active ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface-2'
            }`}
          >
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-black/10"
              style={{ backgroundColor: swatch.bg }}
            >
              {active ? (
                <Check className="h-3.5 w-3.5" style={{ color: swatch.primary }} />
              ) : (
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: swatch.primary }} />
              )}
            </span>
            <span className="truncate text-xs font-medium text-foreground">{t(`theme.${key}`)}</span>
          </button>
        )
      })}
    </div>
  )
}
