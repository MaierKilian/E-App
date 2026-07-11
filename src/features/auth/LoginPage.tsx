import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, User as UserIcon, ArrowLeft, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useUser, useAuthStore } from '@/store/authStore'
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  sendPasswordReset,
  authErrorKey,
} from './auth'

type Mode = 'login' | 'register'

interface LocationState {
  from?: string
}

/**
 * Anmelde- und Registrierungsseite. Erreichbar unter /login.
 * Bietet E-Mail/Passwort und „Mit Google anmelden". Nach Erfolg geht es
 * zurück zur ursprünglich aufgerufenen Seite (oder zur Startseite).
 */
export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from ?? '/'
  const user = useUser()
  const initializing = useAuthStore((s) => s.initializing)

  // Nach einer Google-Weiterleitung landet man wieder hier – sobald der
  // Anmeldestatus feststeht und ein Nutzer da ist, weiterleiten.
  useEffect(() => {
    if (!initializing && user) navigate(from, { replace: true })
  }, [initializing, user, from, navigate])

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function showError(e: unknown) {
    setError(t(`auth.errors.${authErrorKey(e)}`))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'register') {
        await registerWithEmail(email.trim(), password, name.trim() || undefined)
      } else {
        await loginWithEmail(email.trim(), password)
      }
      navigate(from, { replace: true })
    } catch (e) {
      showError(e)
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const signedIn = await loginWithGoogle()
      // Popup-Erfolg → direkt weiter. Bei Redirect (null) lädt die Seite neu,
      // die Navigation übernimmt danach der Effekt oben.
      if (signedIn) navigate(from, { replace: true })
    } catch (e) {
      showError(e)
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError(t('auth.errors.missingEmailForReset'))
      return
    }
    setBusy(true)
    try {
      await sendPasswordReset(email.trim())
      setNotice(t('auth.resetSent'))
    } catch (e) {
      showError(e)
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-surface-2/50 py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none'

  return (
    <div className="mx-auto max-w-md">
      <Link
        to={from}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('auth.backToApp')}
      </Link>

      <Card>
        <h1 className="text-xl font-bold text-foreground">
          {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
        </p>

        {/* Umschalter Anmelden / Registrieren */}
        <div className="mt-4 flex gap-1 rounded-xl border border-border bg-surface-2/40 p-1">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
                setNotice(null)
              }}
              aria-pressed={mode === m}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-surface-2'
              }`}
            >
              {m === 'login' ? t('auth.tabLogin') : t('auth.tabRegister')}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === 'register' && (
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
                autoComplete="name"
                className={inputClass}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              className={inputClass}
            />
          </div>

          {mode === 'login' && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-primary hover:underline"
            >
              {t('auth.forgotPassword')}
            </button>
          )}

          {error && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')}
          </button>
        </form>

        {/* Trenner */}
        <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          {t('auth.or')}
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-60"
        >
          <GoogleIcon />
          {t('auth.continueWithGoogle')}
        </button>
      </Card>
    </div>
  )
}

/** Google-„G"-Logo als Inline-SVG (mehrfarbig). */
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 35.7 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}
