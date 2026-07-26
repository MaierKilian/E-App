import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  User,
  Palette,
  Globe,
  PlayCircle,
  Sparkles,
  Trash2,
  LogOut,
  Info,
  Sun,
  Moon,
  Leaf,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettingsStore, THEMES, type Theme } from '@/store/settingsStore'
import { useUser } from '@/store/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { logout } from '@/features/auth/auth'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { APP_VERSION } from '@/app/version'
import { SettingsSection } from './SettingsSection'
import { SettingsRow } from './SettingsRow'

const THEME_ICONS: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  htw: Leaf,
}

/**
 * Eigenständige Einstellungsseite: bündelt Konto, Darstellung, Hilfe, Daten und
 * Info in klar getrennten Abschnitten. Löst das frühere, mit jeder neuen Option
 * überladene Dropdown ab und ist so aufgebaut, dass weitere Bereiche einfach als
 * zusätzliche `SettingsSection`/`SettingsRow` ergänzt werden können.
 */
export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)
  const user = useUser()
  const currentLang = i18n.resolvedLanguage

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('common.back')}
      </button>

      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      {/* Konto */}
      <SettingsSection title={t('settings.account')} icon={User}>
        {user ? (
          <>
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar name={user.displayName || user.email || undefined} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user.displayName || t('settings.account')}
                </p>
                <p className="truncate text-[11px] text-muted">{user.email}</p>
              </div>
            </div>
            <SettingsRow icon={LogOut} title={t('settings.logout')} onClick={() => void logout()} right={null} />
          </>
        ) : (
          <SettingsRow
            icon={User}
            title={t('settings.signIn')}
            subtitle={t('settings.accountHint')}
            to="/login"
          />
        )}
      </SettingsSection>

      {/* Darstellung: Design + Sprache */}
      <SettingsSection title={t('settings.appearance')} icon={Palette}>
        <div className="px-3 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <Palette className="h-3.5 w-3.5" />
            {t('theme.label')}
          </p>
          <div className="flex gap-1 rounded-xl border border-border bg-surface-2/40 p-1">
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
        </div>
        <div className="border-t border-border px-3 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <Globe className="h-3.5 w-3.5" />
            {t('language.label')}
          </p>
          <div className="flex gap-1 rounded-xl border border-border bg-surface-2/40 p-1">
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
        </div>
      </SettingsSection>

      {/* Hilfe */}
      <SettingsSection title={t('settings.help')} icon={PlayCircle}>
        <SettingsRow
          icon={PlayCircle}
          title={t('settings.replayIntro')}
          onClick={() => setIntroSeen(false)}
        />
        <SettingsRow icon={Sparkles} title={t('settings.viewLanding')} to="/willkommen" />
      </SettingsSection>

      {/* Daten */}
      <SettingsSection title={t('settings.dataSection')} icon={Trash2}>
        <SettingsRow icon={Trash2} title={t('settings.resetEntry')} to="/einstellungen/daten" danger />
      </SettingsSection>

      {/* Über */}
      <SettingsSection title={t('settings.about')} icon={Info}>
        <SettingsRow
          icon={Info}
          title={t('app.name')}
          subtitle={t('app.tagline')}
          right={<span className="shrink-0 text-xs font-medium text-muted">{APP_VERSION}</span>}
        />
      </SettingsSection>
    </div>
  )
}
