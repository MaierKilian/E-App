import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Home, Loader2, LogIn, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { useProfilesStore } from '@/store/profilesStore'
import { joinSharedProfile } from '@/features/sync/cloudSync'

type JoinState = 'waiting' | 'joining' | 'done' | 'invalid'

/**
 * Landeseite eines Einladungslinks (/join/:pid/:inviteId).
 *
 * Nicht angemeldete Nutzer werden freundlich zum Login geführt (und kommen
 * danach automatisch hierher zurück). Angemeldete Nutzer treten der Wohnung
 * direkt bei und landen anschließend im Zuhause-Bereich der geteilten Wohnung.
 */
export function JoinProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { pid, inviteId } = useParams<{ pid: string; inviteId: string }>()

  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const profilesStatus = useProfilesStore((s) => s.status)

  const [state, setState] = useState<JoinState>('waiting')
  const attempted = useRef(false)

  // Beitritt ausführen, sobald angemeldet UND die Profilliste geladen ist
  // (damit „bereits Mitglied" korrekt erkannt wird).
  useEffect(() => {
    if (!user || initializing || profilesStatus !== 'ready') return
    if (!pid || !inviteId || attempted.current) return
    attempted.current = true
    setState('joining')
    void joinSharedProfile(pid, inviteId)
      .then(() => setState('done'))
      .catch((e) => {
        console.warn('[join] Beitritt fehlgeschlagen:', e)
        setState('invalid')
      })
  }, [user, initializing, profilesStatus, pid, inviteId])

  if (!pid || !inviteId) {
    return <InvalidCard />
  }

  // Anmeldestatus wird noch geprüft.
  if (initializing) {
    return (
      <div className="grid min-h-40 place-items-center text-muted" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  // Nicht angemeldet: zum Login schicken, danach zurück hierher.
  if (!user) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Home className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-bold text-foreground">{t('profiles.join.title')}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          {t('profiles.join.loginPrompt')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/login', { state: { from: location.pathname } })}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <LogIn className="h-4 w-4" />
          {t('profiles.join.loginButton')}
        </button>
      </Card>
    )
  }

  if (state === 'invalid') {
    return <InvalidCard />
  }

  if (state === 'done') {
    return (
      <Card className="mx-auto max-w-md text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
          <Check className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-bold text-foreground">{t('profiles.join.successTitle')}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          {t('profiles.join.successMessage')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/onboarding', { replace: true })}
          className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t('profiles.join.goHome')}
        </button>
      </Card>
    )
  }

  // Warten (Profile laden) oder Beitritt läuft.
  return (
    <Card className="mx-auto max-w-md text-center" aria-busy="true">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Loader2 className="h-6 w-6 animate-spin" />
      </span>
      <h1 className="text-lg font-bold text-foreground">{t('profiles.join.title')}</h1>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{t('profiles.join.joining')}</p>
    </Card>
  )
}

/** Karte für ungültige oder widerrufene Einladungen. */
function InvalidCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <Card className="mx-auto max-w-md text-center">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-rose-500/10 text-rose-600">
        <XCircle className="h-6 w-6" />
      </span>
      <h1 className="text-lg font-bold text-foreground">{t('profiles.join.invalidTitle')}</h1>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {t('profiles.join.invalidMessage')}
      </p>
      <button
        type="button"
        onClick={() => navigate('/onboarding', { replace: true })}
        className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('profiles.join.goHome')}
      </button>
    </Card>
  )
}
