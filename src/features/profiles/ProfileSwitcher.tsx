import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Check, Home, Share2, LogOut, Users, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useProfilesStore } from '@/store/profilesStore'
import { useIsAuthenticated } from '@/store/authStore'
import {
  switchProfile,
  createNewProfile,
  leaveProfile,
  deleteActiveProfile,
  canCreateProfile,
} from '@/features/sync/cloudSync'
import { ShareProfileDialog } from './ShareProfileDialog'

/**
 * Kachel-Reihe der Wohnprofile im Zuhause-Bereich.
 *
 * Zeigt jede Wohnung als Kachel (Bild/Initialen + Name), das aktive Profil ist
 * markiert. Antippen wechselt die Wohnung; „+" legt eine neue an. Für die aktive
 * Wohnung gibt es „Teilen" (Besitzer) bzw. „Verlassen" (beigetretenes Mitglied).
 * Wird nur für angemeldete Nutzer angezeigt, sobald die Profile geladen sind.
 */
export function ProfileSwitcher() {
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const profiles = useProfilesStore((s) => s.profiles)
  const activeId = useProfilesStore((s) => s.activeProfileId)
  const status = useProfilesStore((s) => s.status)
  const [busy, setBusy] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Nur für angemeldete Nutzer mit geladenen Profilen anzeigen.
  if (!isAuthenticated || status !== 'ready' || profiles.length === 0) return null

  const active = profiles.find((p) => p.id === activeId)
  const atProfileLimit = !canCreateProfile()

  async function handleSwitch(id: string) {
    if (id === activeId || busy) return
    setBusy(true)
    setConfirmLeave(false)
    setConfirmDelete(false)
    try {
      await switchProfile(id)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate() {
    if (busy) return
    setBusy(true)
    setConfirmLeave(false)
    setConfirmDelete(false)
    try {
      await createNewProfile()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!active || busy) return
    setBusy(true)
    try {
      await deleteActiveProfile(active.id)
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave() {
    if (!active || busy) return
    setBusy(true)
    try {
      await leaveProfile(active.id)
      setConfirmLeave(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {t('profiles.sectionTitle')}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {profiles.map((p) => {
          const isActive = p.id === activeId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSwitch(p.id)}
              disabled={busy}
              aria-pressed={isActive}
              className={`focus-ring glass relative flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-transform active:scale-[0.98] disabled:opacity-60 ${
                isActive ? 'ring-2 ring-primary' : ''
              }`}
            >
              {isActive && (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              {p.memberCount > 1 && (
                <span
                  className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"
                  title={t('profiles.sharedBadge', { count: p.memberCount })}
                >
                  <Users className="h-3 w-3" />
                  {p.memberCount}
                </span>
              )}
              <Avatar src={p.image || undefined} name={p.name} size={48} />
              <span className="line-clamp-1 w-full text-sm font-medium text-foreground">
                {p.name.trim() || t('home.profileNameFallback')}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={handleCreate}
          disabled={busy || atProfileLimit}
          title={atProfileLimit ? t('profiles.limitReached') : undefined}
          className="focus-ring flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-4 text-center text-muted transition-colors hover:text-foreground hover:border-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted disabled:hover:border-border"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">{t('profiles.addNew')}</span>
        </button>
      </div>

      {atProfileLimit && (
        <p className="mt-2 px-1 text-xs text-muted">{t('profiles.limitReached')}</p>
      )}

      {/* Aktionen für die aktive Wohnung: Teilen (Besitzer) / Verlassen (Mitglied) */}
      {active && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {active.role === 'owner' ? (
            confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2/40 p-2">
                <p className="text-xs text-muted">{t('profiles.deleteConfirm')}</p>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
                >
                  {t('settings.data.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {t('profiles.deleteYes')}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  disabled={busy}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  <Share2 className="h-4 w-4" />
                  {t('profiles.shareActive')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('profiles.deleteActive')}
                </button>
              </>
            )
          ) : confirmLeave ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2/40 p-2">
              <p className="text-xs text-muted">{t('profiles.leaveConfirm')}</p>
              <button
                type="button"
                onClick={() => setConfirmLeave(false)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
              >
                {t('settings.data.cancel')}
              </button>
              <button
                type="button"
                onClick={handleLeave}
                disabled={busy}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {t('profiles.leaveYes')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmLeave(true)}
              disabled={busy}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {t('profiles.leaveActive')}
            </button>
          )}
        </div>
      )}

      <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-muted">
        <Home className="h-3.5 w-3.5 shrink-0" />
        {t('profiles.hint')}
      </p>

      {active && active.role === 'owner' && (
        <ShareProfileDialog
          profile={active}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}
