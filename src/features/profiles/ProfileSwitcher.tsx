import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Check, Home } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useProfilesStore } from '@/store/profilesStore'
import { useIsAuthenticated } from '@/store/authStore'
import { switchProfile, createNewProfile } from '@/features/sync/cloudSync'

/**
 * Kachel-Reihe der Wohnprofile im Zuhause-Bereich.
 *
 * Zeigt jede Wohnung als Kachel (Bild/Initialen + Name), das aktive Profil ist
 * markiert. Antippen wechselt die Wohnung; „+" legt eine neue an. Wird nur für
 * angemeldete Nutzer angezeigt, sobald die Profile geladen sind.
 */
export function ProfileSwitcher() {
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const profiles = useProfilesStore((s) => s.profiles)
  const activeId = useProfilesStore((s) => s.activeProfileId)
  const status = useProfilesStore((s) => s.status)
  const [busy, setBusy] = useState(false)

  // Nur für angemeldete Nutzer mit geladenen Profilen anzeigen.
  if (!isAuthenticated || status !== 'ready' || profiles.length === 0) return null

  async function handleSwitch(id: string) {
    if (id === activeId || busy) return
    setBusy(true)
    try {
      await switchProfile(id)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate() {
    if (busy) return
    setBusy(true)
    try {
      await createNewProfile()
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
          const active = p.id === activeId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSwitch(p.id)}
              disabled={busy}
              aria-pressed={active}
              className={`focus-ring glass relative flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-transform active:scale-[0.98] disabled:opacity-60 ${
                active ? 'ring-2 ring-primary' : ''
              }`}
            >
              {active && (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
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
          disabled={busy}
          className="focus-ring flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-4 text-center text-muted transition-colors hover:text-foreground hover:border-primary disabled:opacity-60"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">{t('profiles.addNew')}</span>
        </button>
      </div>
      <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-muted">
        <Home className="h-3.5 w-3.5 shrink-0" />
        {t('profiles.hint')}
      </p>
    </div>
  )
}
