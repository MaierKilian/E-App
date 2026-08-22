import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  User,
  Palette,
  Globe,
  PlayCircle,
  Sparkles,
  Trash2,
  LogOut,
  Info,
  ShieldCheck,
  BarChart3,
  MessageSquarePlus,
  GraduationCap,
  SlidersHorizontal,
} from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useUser, useIsAuthenticated } from '@/store/authStore'
import { useProfilesStore } from '@/store/profilesStore'
import { useAccountAvatarSrc } from '@/store/accountAvatarStore'
import { useFeedbackStore } from '@/store/feedbackStore'
import { saveAccountPhoto, deleteAccountPhoto } from '@/features/sync/accountAvatarSync'
import { AvatarPicker } from '@/components/AvatarPicker'
import { Toggle } from '@/components/ui/Toggle'
import { ThemePicker } from '@/components/ThemePicker'
import { useLogout } from '@/features/auth/useLogout'
import { syncAnalyticsConsent } from '@/features/analytics/analytics'
import { ProfileSwitcher } from '@/features/profiles/ProfileSwitcher'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { APP_VERSION } from '@/app/version'
import { SettingsSection } from './SettingsSection'
import { SettingsRow } from './SettingsRow'

/**
 * Eigenständige Einstellungsseite: bündelt Konto, Darstellung, Hilfe, Daten und
 * Info in klar getrennten Abschnitten. Löst das frühere, mit jeder neuen Option
 * überladene Dropdown ab und ist so aufgebaut, dass weitere Bereiche einfach als
 * zusätzliche `SettingsSection`/`SettingsRow` ergänzt werden können.
 */
export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const logoutAndLeave = useLogout()
  const setIntroSeen = useSettingsStore((s) => s.setIntroSeen)
  const demoMode = useSettingsStore((s) => s.demoMode)
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled)
  const setAnalyticsEnabled = useSettingsStore((s) => s.setAnalyticsEnabled)
  const user = useUser()
  const isAuthenticated = useIsAuthenticated()
  const accountAvatar = useAccountAvatarSrc()
  const openFeedback = useFeedbackStore((s) => s.openFeedback)
  const profilesReady = useProfilesStore((s) => s.status === 'ready' && s.profiles.length > 0)
  const currentLang = i18n.resolvedLanguage

  // Wohnprofil-Verwaltung nur zeigen, wenn es echte, geladene Profile gibt
  // (angemeldet, nicht in der Demo) – sonst bliebe der Abschnitt leer.
  const showProfiles = !demoMode && isAuthenticated && profilesReady

  function handleAnalyticsToggle(next: boolean) {
    setAnalyticsEnabled(next)
    void syncAnalyticsConsent()
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title={t('settings.title')} back={{ label: t('common.back'), onClick: () => navigate(-1) }} />

      {/* Konto */}
      <SettingsSection title={t('settings.account')} icon={User}>
        {user ? (
          <>
            <div className="flex flex-col items-center gap-3 px-3 py-4">
              <AvatarPicker
                value={accountAvatar}
                name={user.displayName || user.email || undefined}
                size={72}
                addLabel={t('settings.avatar.add')}
                removeLabel={t('settings.avatar.remove')}
                onChange={(dataUrl) => {
                  if (dataUrl) void saveAccountPhoto(dataUrl)
                  else void deleteAccountPhoto()
                }}
              />
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user.displayName || t('settings.account')}
                </p>
                <p className="truncate text-[11px] text-muted">{user.email}</p>
              </div>
            </div>
            <SettingsRow icon={LogOut} title={t('settings.logout')} onClick={() => void logoutAndLeave()} right={null} />
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

      {/* Wohnprofil verwalten (wechseln, teilen, verlassen, löschen) – nutzt den
          bestehenden ProfileSwitcher (bringt seine eigene Überschrift „Meine
          Wohnungen" mit), damit die Logik nur an einer Stelle lebt. */}
      {showProfiles && (
        <section className="rounded-2xl border border-border bg-surface p-3">
          <ProfileSwitcher />
        </section>
      )}

      {/* Darstellung: Design + Sprache */}
      <SettingsSection title={t('settings.appearance')} icon={Palette}>
        <div className="px-3 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <Palette className="h-3.5 w-3.5" />
            {t('theme.label')}
          </p>
          <ThemePicker />
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

      {/* Lernen */}
      <SettingsSection title={t('settings.learning')} icon={GraduationCap}>
        <SettingsRow
          icon={SlidersHorizontal}
          title={t('education.flashcards.pace.title')}
          subtitle={t('education.flashcards.pace.settingsHint')}
          to="/lernen/tempo"
        />
      </SettingsSection>

      {/* Hilfe */}
      <SettingsSection title={t('settings.help')} icon={PlayCircle}>
        <SettingsRow
          icon={PlayCircle}
          title={t('settings.replayIntro')}
          onClick={() => setIntroSeen(false)}
        />
        <SettingsRow icon={Sparkles} title={t('settings.viewLanding')} to="/willkommen" />
        <SettingsRow
          icon={MessageSquarePlus}
          title={t('feedback.short')}
          subtitle={t('feedback.settingsHint')}
          onClick={() => openFeedback('settings')}
        />
      </SettingsSection>

      {/* Daten */}
      <SettingsSection title={t('settings.dataSection')} icon={Trash2}>
        <SettingsRow icon={Trash2} title={t('settings.resetEntry')} to="/einstellungen/daten" danger />
      </SettingsSection>

      {/* Datenschutz */}
      <SettingsSection title={t('settings.privacy')} icon={ShieldCheck}>
        <SettingsRow
          icon={BarChart3}
          title={t('settings.analytics.title')}
          subtitle={t('settings.analytics.desc')}
          right={
            <Toggle
              checked={analyticsEnabled}
              onChange={handleAnalyticsToggle}
              label={t('settings.analytics.title')}
            />
          }
        />
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
