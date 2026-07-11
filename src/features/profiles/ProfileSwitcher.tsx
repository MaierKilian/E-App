import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Check, Home, Share2, LogOut, Users, Trash2, SlidersHorizontal } from 'lucide-react'
import { useProfilesStore } from '@/store/profilesStore'
import { useIsAuthenticated } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import {
  switchProfile,
  createNewProfile,
  leaveProfile,
  deleteActiveProfile,
  canCreateProfile,
} from '@/features/sync/cloudSync'
import { ShareProfileDialog } from './ShareProfileDialog'

/**
 * Wohnprofil-Auswahl im Zuhause-Bereich.
 *
 * Bei genau einer Wohnung bleibt nur eine schlanke „Weitere Wohnung hinzufügen"-
 * Zeile stehen – kein Raster, kein aktiver Haken, keine (destruktiven) Aktionen.
 * Ab zwei Wohnungen erscheint das Kachel-Raster (Spaltenzahl passt sich dynamisch
 * an) samt „Verwalten"-Umschalter, hinter dem Teilen/Verlassen/Löschen der aktiven
 * Wohnung liegen – so ist die Startseite aufgeräumt und das Löschen nicht mehr
 * dauerhaft präsent. Wird nur für angemeldete Nutzer mit geladenen Profilen gezeigt.
 */
/**
 * Kürzt fürs Display gängige Straßen-Endungen (…straße/…strasse → …str.),
 * damit lange Adressen in die Kachel passen – ohne die gespeicherte
 * Bezeichnung zu ändern. Greift nur am Wortende, damit z. B. „Straßenfest"
 * unangetastet bleibt.
 */
function shortenPlaceName(name: string): string {
  return name.replace(/stra(?:ß|ss)e\b/gi, (m) => (m[0] === 'S' ? 'Str.' : 'str.'))
}

export function ProfileSwitcher() {
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const demoMode = useSettingsStore((s) => s.demoMode)
  const profiles = useProfilesStore((s) => s.profiles)
  const activeId = useProfilesStore((s) => s.activeProfileId)
  const status = useProfilesStore((s) => s.status)
  const [busy, setBusy] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Nur für angemeldete Nutzer mit geladenen Profilen anzeigen – und nicht in
  // der Demo (dort geht es um die Beispiel-Wohnung, nicht um echte Profile).
  if (demoMode || !isAuthenticated || status !== 'ready' || profiles.length === 0) return null

  const active = profiles.find((p) => p.id === activeId)
  const atProfileLimit = !canCreateProfile()
  const single = profiles.length === 1

  // Spaltenzahl dynamisch an die Anzahl der Kacheln anpassen (Wohnungen + „Neu"),
  // damit bis zu vier Wohnungen kompakt und ohne Scrollen auf den Screen passen.
  const tileCount = profiles.length + (atProfileLimit ? 0 : 1)
  const columnsClass =
    tileCount <= 2
      ? 'grid-cols-2'
      : tileCount === 3
        ? 'grid-cols-3'
        : tileCount === 4
          ? 'grid-cols-2'
          : 'grid-cols-3'

  function resetConfirms() {
    setConfirmLeave(false)
    setConfirmDelete(false)
  }

  async function handleSwitch(id: string) {
    if (id === activeId || busy) return
    setBusy(true)
    resetConfirms()
    try {
      await switchProfile(id)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate() {
    if (busy) return
    setBusy(true)
    resetConfirms()
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

  // Aktionen der aktiven Wohnung (Teilen/Löschen bzw. Verlassen) – gemeinsam für
  // den Ein- und Mehr-Wohnungs-Fall, aufgeklappt über „Verwalten".
  const manageActions = active ? (
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
  ) : null

  return (
    <div>
      {/* Kopfzeile mit „Verwalten" – immer sichtbar, sobald es eine aktive
          Wohnung gibt. So ist Teilen/Löschen auch bei nur einer Wohnung
          erreichbar (vorher erst ab zwei). */}
      {active && (
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('profiles.sectionTitle')}
          </p>
          <button
            type="button"
            onClick={() => {
              setManageOpen((open) => !open)
              resetConfirms()
            }}
            aria-expanded={manageOpen}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('profiles.manage')}
          </button>
        </div>
      )}

      {single ? (
        // Eine Wohnung: schlanke Zeile zum Hinzufügen (Aktionen liegen hinter „Verwalten").
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy}
          className="focus-ring flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-3.5 text-left text-muted transition-colors hover:border-primary hover:text-foreground disabled:opacity-60"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">{t('profiles.addAnother')}</span>
        </button>
      ) : (
        <>
          <div className={`grid gap-2.5 ${columnsClass}`}>
            {profiles.map((p) => {
              const isActive = p.id === activeId
              const fullName = p.name.trim() || t('home.profileNameFallback')
              const name = shortenPlaceName(fullName)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSwitch(p.id)}
                  disabled={busy}
                  aria-pressed={isActive}
                  aria-label={fullName}
                  className={`focus-ring relative aspect-[4/3] overflow-hidden rounded-2xl transition-transform active:scale-[0.98] disabled:opacity-60 ${
                    isActive ? 'ring-2 ring-primary' : 'ring-1 ring-border'
                  }`}
                >
                  {/* Foto füllt die Kachel – oder schicke grüne Fallback-Kachel mit Haus. */}
                  {p.image ? (
                    <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/70 to-primary/90 text-white">
                      <Home className="h-7 w-7 opacity-90" />
                    </span>
                  )}
                  {/* Verlauf für lesbaren Namen */}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                  {isActive && (
                    <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-white/70">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {p.memberCount > 1 && (
                    <span
                      className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm"
                      title={t('profiles.sharedBadge', { count: p.memberCount })}
                    >
                      <Users className="h-3 w-3" />
                      {p.memberCount}
                    </span>
                  )}

                  <span className="absolute inset-x-0 bottom-0 p-2.5 text-left">
                    <span className="line-clamp-2 text-[13px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                      {name}
                    </span>
                  </span>
                </button>
              )
            })}

            {!atProfileLimit && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy}
                className="focus-ring flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-muted transition-colors hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted disabled:hover:border-border"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium">{t('profiles.addNew')}</span>
              </button>
            )}
          </div>

          {atProfileLimit && (
            <p className="mt-2 px-1 text-xs text-muted">{t('profiles.limitReached')}</p>
          )}
        </>
      )}

      {/* Aktionen der aktiven Wohnung – hinter „Verwalten", in beiden Fällen. */}
      {manageOpen && manageActions}

      {/* Hinweis zum Wechseln nur bei mehreren Wohnungen. */}
      {!single && (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-muted">
          <Home className="h-3.5 w-3.5 shrink-0" />
          {t('profiles.hint')}
        </p>
      )}

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
