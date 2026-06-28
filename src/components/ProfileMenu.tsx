import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Palette, Globe, PlayCircle, ChevronRight, Sun, Moon, Leaf, Trash2, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettingsStore, THEMES, type Theme } from '@/store/settingsStore'
import { useUser } from '@/store/authStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { Avatar } from '@/components/ui/Avatar'
import { logout } from '@/features/auth/auth'
import { SUPPORTED_LANGUAGES } from '@/i18n'

const THEME_ICONS: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  htw: Leaf,
}

/**
 * Zentraler Profil-/Einstellungs-Einstieg oben rechts (Dropdown). Bündelt Konto
 * (Platzhalter fürs künftige Login), Darstellung (Design + Sprache) und Hilfe –
 * statt mehrerer Schnellschalter in der Kopfzeile.
 */
export function ProfileMenu() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)
  const user = useUser()
  const profileName = useOnboardingStore((s) => s.data.profileName)
  const profileImage = useOnboardingStore((s) => s.data.profileImage)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const currentLang = i18n.resolvedLanguage
  // Name für Initialen/Alt: bevorzugt der Firebase-Anzeigename, sonst der Profilname.
  const avatarName = user?.displayName || profileName

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
        <Avatar src={profileImage || undefined} name={avatarName} size={34} />
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
                <Avatar src={profileImage || undefined} name={user.displayName || undefined} size={36} />
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

          {/* Design */}
          <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <Palette className="h-3.5 w-3.5" />
            {t('theme.label')}
          </p>
          <div className="mb-3 flex gap-1 rounded-xl border border-border bg-surface-2/40 p-1">
            {THEMES.map((option) => {
              const Icon = THEME_ICONS[option]
              const active = option === theme
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  aria-pressed={active}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-medium transition-colors ${
                    active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-surface-2'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t(`theme.${option}`)}</span>
                </button>
              )
            })}
          </div>

          {/* Sprache */}
          <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <Globe className="h-3.5 w-3.5" />
            {t('language.label')}
          </p>
          <div className="mb-3 flex gap-1 rounded-xl border border-border bg-surface-2/40 p-1">
            {SUPPORTED_LANGUAGES.map((lng) => {
              const active = currentLang === lng
              return (
                <button
                  key={lng}
                  type="button"
                  onClick={() => void i18n.changeLanguage(lng)}
                  aria-pressed={active}
                  className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                    active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-surface-2'
                  }`}
                >
                  {t(`language.${lng}`)}
                </button>
              )
            })}
          </div>

          {/* Hilfe */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setIntroSeen(false)
            }}
            className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface-2/50 p-2.5 text-left transition-colors hover:bg-surface-2"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <PlayCircle className="h-4.5 w-4.5" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">
              {t('settings.replayIntro')}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              navigate('/einstellungen/daten')
            }}
            className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface-2/50 p-2.5 text-left transition-colors hover:bg-surface-2"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600">
              <Trash2 className="h-4.5 w-4.5" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">
              {t('settings.resetEntry')}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </button>

          <p className="mt-3 text-center text-[10px] text-muted">{t('app.name')} · v0.5.0</p>
        </div>
      )}
    </div>
  )
}
