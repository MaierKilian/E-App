import type { Theme } from '@/store/settingsStore'

/** Farbvorschau eines Themes für den Umschalter (Hintergrund + Akzent). */
export interface ThemeSwatch {
  bg: string
  primary: string
}

/**
 * Vorschaufarben je Theme – gespiegelt aus den CSS-Variablen in `index.css`.
 * Wird nur für die kleinen Farbpunkte im Theme-Umschalter genutzt; bei einer
 * Palettenänderung hier den passenden Wert mitziehen.
 */
export const THEME_SWATCHES: Record<Theme, ThemeSwatch> = {
  light: { bg: '#FAFAFA', primary: '#18181B' },
  dark: { bg: '#111114', primary: '#FAFAFA' },
  midnight: { bg: '#000000', primary: '#FAFAFA' },
  htw: { bg: '#f0f5ea', primary: '#5a8a1b' },
  ocean: { bg: '#f0f5fb', primary: '#2563eb' },
  amber: { bg: '#fdf6ec', primary: '#d97706' },
  sepia: { bg: '#f5efe2', primary: '#a65a28' },
  contrast: { bg: '#ffffff', primary: '#0033cc' },
}
