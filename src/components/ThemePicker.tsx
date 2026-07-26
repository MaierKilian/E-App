import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { useSettingsStore, THEMES } from '@/store/settingsStore'
import { THEME_SWATCHES } from '@/app/themes'

interface ThemePickerProps {
  /**
   * Kompakte Variante: nur Farbpunkte in einer umbrechenden Reihe (ohne Labels),
   * für das enge Konto-Popover. Standard ist das beschriftete Raster für die
   * Einstellungsseite.
   */
  compact?: boolean
}

/** Diagonale Zweifarb-Vorschau eines Themes (Hintergrund + Akzent). */
function swatchStyle(bg: string, primary: string) {
  return { background: `linear-gradient(135deg, ${bg} 0 50%, ${primary} 50% 100%)` }
}

/**
 * Theme-Auswahl mit zweifarbiger Vorschau (Hintergrund/Akzent), die bei hellen
 * wie dunklen Themes gleich klar aussieht. Wird auf der Einstellungsseite
 * (beschriftetes Raster) und im Konto-Popover (`compact`) genutzt, damit die
 * Auswahl an beiden Stellen konsistent ist und beliebig viele Themes verträgt.
 */
export function ThemePicker({ compact = false }: ThemePickerProps) {
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2.5">
        {THEMES.map((key) => {
          const sw = THEME_SWATCHES[key]
          const active = key === theme
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              aria-pressed={active}
              aria-label={t(`theme.${key}`)}
              title={t(`theme.${key}`)}
              className={`focus-ring h-8 w-8 shrink-0 rounded-full border transition-transform active:scale-90 ${
                active
                  ? 'border-transparent ring-2 ring-primary ring-offset-2 ring-offset-surface'
                  : 'border-border'
              }`}
              style={swatchStyle(sw.bg, sw.primary)}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {THEMES.map((key) => {
        const sw = THEME_SWATCHES[key]
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
              className="h-5 w-5 shrink-0 rounded-full border border-border"
              style={swatchStyle(sw.bg, sw.primary)}
            />
            <span
              className={`flex-1 text-xs leading-tight text-foreground ${
                active ? 'font-semibold' : 'font-medium'
              }`}
            >
              {t(`theme.${key}`)}
            </span>
            {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}
