import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Palette, Settings, ChevronRight, LogOut } from 'lucide-react'
import { useUser } from '@/store/authStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { Avatar } from '@/components/ui/Avatar'
import { ThemePicker } from '@/components/ThemePicker'
import { logout } from '@/features/auth/auth'
import { APP_VERSION } from '@/app/version'

/**
 * Schlankes Konto-Popover oben rechts (Dropdown). Bietet nur den schnellen
 * Zugriff auf das Konto und den Design-Umschalter; alles Weitere lebt auf der
 * eigenständigen Einstellungsseite (`/einstellungen`), auf die von hier verlinkt
 * wird. So bleibt das Popover übersichtlich, egal wie viele Einstellungen
 * hinzukommen.
 */
export function ProfileMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useUser()
  const profileName = useOnboardingStore((s) => s.data.profileName)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Der Account-Avatar zeigt bewusst Initialen/Personen-Icon (nicht das
  // Wohnungsfoto) – so ist das Konto klar vom Wohnprofil unterscheidbar.
  // Bevorzugt der Firebase-Anzeigename, sonst die E-Mail, sonst der Profilname.
  const avatarName = user?.displayName || user?.email || profileName

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('settings.open')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-ring grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-border transition-transform hover:scale-105 active:scale-95"
      >
        <Avatar name={avatarName} size={34} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-border bg-surface p-3 shadow-xl"
        >
          {/* Konto */}
          {user ? (
            <div className="mb-3 rounded-xl border border-border bg-surface-2/50 p-2.5">
              <div className="flex items-center gap-3">
                <Avatar name={user.displayName || user.email || undefined} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user.displayName || t('settings.account')}
                  </p>
                  <p className="truncate text-[11px] text-muted">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  void logout()
                }}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
              >
                <LogOut className="h-4 w-4" />
                {t('settings.logout')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                navigate('/login')
              }}
              className="mb-3 flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2/50 p-2.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{t('settings.signIn')}</p>
                <p className="text-[11px] text-muted">{t('settings.accountHint')}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </button>
          )}

          {/* Design-Schnellumschalter */}
          <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <Palette className="h-3.5 w-3.5" />
            {t('theme.label')}
          </p>
          <div className="mb-3">
            <ThemePicker compact />
          </div>

          {/* Zur vollständigen Einstellungsseite */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              navigate('/einstellungen')
            }}
            className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface-2/50 p-2.5 text-left transition-colors hover:bg-surface-2"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Settings className="h-4.5 w-4.5" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">{t('settings.title')}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </button>

          <p className="mt-3 text-center text-[10px] text-muted">
            {t('app.name')} · {APP_VERSION}
          </p>
        </div>
      )}
    </div>
  )
}
