import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Check,
  Home,
  Share2,
  LogOut,
  Users,
  Trash2,
  SlidersHorizontal,
  RotateCw,
  CloudOff,
} from 'lucide-react'
import { useProfilesStore } from '@/store/profilesStore'
import { useAuthStore, useIsAuthenticated } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import {
  switchProfile,
  createNewProfile,
  leaveProfile,
  deleteActiveProfile,
  canCreateProfile,
  retryLoadProfiles,
} from '@/features/sync/cloudSync'
import { ShareProfileDialog } from './ShareProfileDialog'

/**
 * Kürzt fürs Display gängige Straßen-Endungen (…straße/…strasse → …str.),
 * damit lange Adressen in die Kachel passen – ohne die gespeicherte
 * Bezeichnung zu ändern. Greift nur am Wortende, damit z. B. „Straßenfest"
 * unangetastet bleibt.
 */
function shortenPlaceName(name: string): string {
  return name.replace(/stra(?:ß|ss)e\b/gi, (m) => (m[0] === 'S' ? 'Str.' : 'str.'))
}

/**
 * Wohnprofil-Auswahl im Zuhause-Bereich.
 *
 * Bei genau einer Wohnung bleibt nur eine schlanke „Weitere Wohnung hinzufügen"-
 * Zeile stehen – kein Raster, kein aktiver Haken, keine (destruktiven) Aktionen.
 * Ab zwei Wohnungen erscheint das Kachel-Raster (Spaltenzahl passt sich dynamisch
 * an) samt „Verwalten"-Umschalter, hinter dem Teilen/Verlassen/Löschen der aktiven
 * Wohnung liegen – so ist die Startseite aufgeräumt und das Löschen nicht mehr
 * dauerhaft präsent. Die Kacheln erklären sich über den Haken der aktiven Wohnung
 * selbst; ein dauerhafter „Tippe eine Wohnung an"-Hinweis entfällt deshalb.
 * Wird nur für angemeldete Nutzer mit geladenen Profilen gezeigt.
 *
 * **Startverhalten:** Solange Firebase den Anmeldestatus prüft und die Profile
 * aus Firestore lädt, werden die Kacheln bereits aus dem persistierten
 * Anzeige-Cache gezeigt (siehe `profilesStore`) – in voller Deckkraft, aber
 * noch nicht bedienbar. Dadurch springt das Layout nicht mehr und die
 * Wohnungen „ploppen" nicht verspätet auf. Erst nach erfolgreichem Laden
 * (`status === 'ready'`) sind sie anklickbar, damit nie auf veralteten Daten
 * gehandelt wird. Abgeblendet wird nur bei einer laufenden Aktion (`busy`) –
 * beim Laden sähe es aus, als stimme etwas mit den Daten nicht. Scheitert das
 * Laden, erscheint statt eines stummen Nichts eine Zeile mit „Erneut versuchen".
 *
 * Der Aufklapper „Verwalten" ist davon ausgenommen und immer bedienbar: hinter
 * ihm liegt der einzige Weg zum Teilen. Gesperrt sind die Aktionen darin, nicht
 * der Zugang zu ihnen. Zuvor hing der Knopf selbst am Ladezustand – blieb der
 * hängen, war das Teilen dauerhaft unerreichbar, ohne dass die Oberfläche einen
 * Hinweis darauf gab (die Kacheln sehen im Ladezustand ja normal aus).
 *
 * In der Regel ist davon nichts zu sehen: der Startbildschirm bleibt stehen,
 * bis der Anmeldestatus geklärt ist (siehe `SplashScreen`).
 */
export function ProfileSwitcher() {
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const initializing = useAuthStore((s) => s.initializing)
  const demoMode = useSettingsStore((s) => s.demoMode)
  const profiles = useProfilesStore((s) => s.profiles)
  const cachedUid = useProfilesStore((s) => s.cachedUid)
  const activeId = useProfilesStore((s) => s.activeProfileId)
  const status = useProfilesStore((s) => s.status)
  const [busy, setBusy] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // In der Demo geht es um die Beispiel-Wohnung, nicht um echte Profile.
  if (demoMode) return null

  // Noch am Anmelden/Laden? Der Cache darf einspringen – aber nur, wenn er zu
  // einem Konto auf diesem Gerät gehört. Ein echter Gast sieht weiterhin nichts.
  const loading = initializing || status === 'idle' || status === 'loading'
  if (!isAuthenticated && !(initializing && cachedUid)) return null

  // Laden gescheitert (Netz weg, Token-Refresh hakt): nicht stumm verschwinden.
  // Im Hintergrund läuft die automatische Wiederholung, hier der manuelle Weg.
  if (status === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-2/40 p-3">
        <CloudOff className="h-4 w-4 shrink-0 text-muted" />
        <p className="flex-1 text-xs text-muted">{t('profiles.loadError')}</p>
        <button
          type="button"
          onClick={() => void retryLoadProfiles()}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
        >
          <RotateCw className="h-3.5 w-3.5" />
          {t('profiles.retry')}
        </button>
      </div>
    )
  }

  if (profiles.length === 0) return null

  // Während des Ladens sind die Kacheln nur Vorschau – kein Wechseln, kein
  // Anlegen und vor allem kein Löschen auf noch unbestätigtem Stand.
  const locked = busy || loading
  // Gesperrt heisst nicht immer abgeblendet: bei einer laufenden Aktion (`busy`)
  // ist das Abblenden die Rueckmeldung, beim anfaenglichen Laden waere es
  // irrefuehrend – die Kacheln zeigen dort korrekte Daten.
  const dimWhenLocked = loading ? '' : 'disabled:opacity-60'
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
              disabled={locked}
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
              disabled={locked}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-60"
            >
              <Share2 className="h-4 w-4" />
              {t('profiles.shareActive')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={locked}
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
            disabled={locked}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {t('profiles.leaveYes')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          disabled={locked}
          className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {t('profiles.leaveActive')}
        </button>
      )}
    </div>
  ) : null

  return (
    // Waehrend des Ladens nur gesperrt, nicht abgeblendet: die Kacheln zeigen
    // echte, zwischengespeicherte Daten – blass gezeichnet lasen sie sich wie
    // ein Defekt, obwohl sie stimmen.
    //
    // Gesperrt wird an den Knoepfen selbst (`locked`), nicht am Container: ein
    // `pointer-events-none` ueber allem nahm auch dem reinen Aufklapper
    // „Verwalten" die Funktion, obwohl der nichts aendert.
    <div aria-busy={loading}>
      {/* Kopfzeile mit „Verwalten" – immer sichtbar, sobald es eine aktive
          Wohnung gibt. So ist Teilen/Löschen auch bei nur einer Wohnung
          erreichbar (vorher erst ab zwei). */}
      {active && (
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('profiles.sectionTitle')}
          </p>
          {/* „Verwalten" ist immer da, auch waehrend des Ladens: dahinter liegt
              der einzige Weg zum Teilen. Was daran gefaehrlich ist – Loeschen,
              Verlassen –, sperrt sich weiter unten selbst, bis der Stand
              bestaetigt ist. Frueher hing der Knopf an `!loading`; blieb das
              Laden haengen, verschwand der Zugang zum Teilen dauerhaft. */}
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
          disabled={locked}
          className={`focus-ring flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-3.5 text-left text-muted transition-colors hover:border-primary hover:text-foreground ${dimWhenLocked}`}
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
                  disabled={locked}
                  aria-pressed={isActive}
                  aria-label={fullName}
                  className={`focus-ring relative aspect-[4/3] overflow-hidden rounded-2xl transition-transform active:scale-[0.98] ${dimWhenLocked} ${
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
                disabled={locked}
                className={`focus-ring flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-muted transition-colors hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:hover:text-muted disabled:hover:border-border ${
                  loading ? '' : 'disabled:opacity-50'
                }`}
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

      {/* Aktionen der aktiven Wohnung – hinter „Verwalten", in beiden Fällen.
          Waehrend des Ladens sichtbar, aber abgeblendet: so ist erkennbar, dass
          es sie gibt und dass sie gleich wieder greifen. */}
      {manageOpen && manageActions}

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
