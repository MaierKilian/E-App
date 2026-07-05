import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Card } from './ui/Card'

interface LoginGateProps {
  /** Inhalt, der nur für angemeldete Nutzer sichtbar ist. */
  children: ReactNode
  /** Optionaler eigener Motivationstext (sonst Standardtext). */
  message?: string
}

/**
 * Sperrt Inhalte für nicht angemeldete Nutzer und zeigt stattdessen eine
 * freundliche Aufforderung, ein Konto anzulegen. So bleibt die App ohne Login
 * nutzbar, während besondere Funktionen zum Registrieren motivieren.
 *
 * Verwendung:
 *   <LoginGate><MeineFunktion /></LoginGate>
 */
export function LoginGate({ children, message }: LoginGateProps) {
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const demoMode = useSettingsStore((s) => s.demoMode)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  // Solange Firebase den Status prüft: nichts anzeigen (kein Aufblitzen der Sperre).
  if (initializing) {
    return <div className="grid min-h-40 place-items-center text-muted" aria-busy="true" />
  }

  // Angemeldet ODER Demo-Modus (Beispiel-Wohnung) → Inhalt zeigen.
  if (user || demoMode) return <>{children}</>

  return (
    <Card className="text-center">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-bold text-foreground">{t('auth.gate.title')}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {message ?? t('auth.gate.message')}
      </p>

      <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm text-foreground">
        {(t('auth.gate.benefits', { returnObjects: true }) as string[]).map((benefit) => (
          <li key={benefit} className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => navigate('/login', { state: { from: location.pathname } })}
        className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('auth.gate.cta')}
      </button>
    </Card>
  )
}
