import { useEffect } from 'react'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * Überträgt das aktuell gewählte Theme aus dem Store auf das <html>-Element
 * (data-theme), wodurch die passenden CSS-Variablen aktiv werden.
 */
export function useApplyTheme() {
  const theme = useSettingsStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
}
