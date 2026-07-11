import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpCircle, Check, Copy, Crown, Loader2, RefreshCw, Share2, UserMinus, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { useUser } from '@/store/authStore'
import type { ProfileMeta } from '@/store/profilesStore'
import { refreshProfiles, transferProfileOwnership } from '@/features/sync/cloudSync'
import { getEntitlements } from '@/features/billing/entitlements'
import {
  buildInviteLink,
  getOrCreateInvite,
  getProfile,
  removeMember,
  rotateInvite,
  type ProfileMember,
} from './profiles'

interface ShareProfileDialogProps {
  profile: ProfileMeta
  open: boolean
  onClose: () => void
}

/**
 * Teilen-Dialog einer Wohnung (nur für den Besitzer erreichbar):
 * zeigt den Einladungslink (Kopieren / System-Teilen / Neu erzeugen) und die
 * Mitgliederliste mit der Möglichkeit, Mitglieder zu entfernen.
 *
 * Der Inhalt wird nur bei geöffnetem Dialog gemountet – so startet jedes Öffnen
 * mit frischem Zustand (Link wird neu geladen).
 */
export function ShareProfileDialog({ profile, open, onClose }: ShareProfileDialogProps) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose} title={t('profiles.share.title')}>
      {open && <ShareDialogBody profile={profile} />}
    </Modal>
  )
}

function ShareDialogBody({ profile }: { profile: ProfileMeta }) {
  const { t } = useTranslation()
  const user = useUser()
  const [link, setLink] = useState<string | null>(null)
  const [members, setMembers] = useState<ProfileMember[]>([])
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  const [confirmTransferUid, setConfirmTransferUid] = useState<string | null>(null)

  const { maxMembersPerProfile } = getEntitlements()
  const atMemberLimit = members.length >= maxMembersPerProfile

  // Einladender Nachrichtentext inkl. Link – damit der Empfänger (z. B. in
  // WhatsApp) sofort versteht, worum es geht, statt nur einen nackten Link zu sehen.
  const profileName = profile.name.trim() || t('home.profileNameFallback')
  function inviteMessage(url: string): string {
    return `${t('profiles.share.inviteMessage', { profile: profileName })}\n${url}`
  }

  // Beim Öffnen (Mount): Einladung laden/erstellen und Mitglieder anzeigen.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    void (async () => {
      try {
        const [inviteId, prof] = await Promise.all([
          getOrCreateInvite(profile.id, user.uid),
          getProfile(profile.id),
        ])
        if (cancelled) return
        setLink(buildInviteLink(profile.id, inviteId))
        setMembers(prof?.members ?? [])
      } catch (e) {
        console.warn('[share] Einladung laden fehlgeschlagen:', e)
        if (!cancelled) setError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile.id, user])

  async function handleCopy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(inviteMessage(link))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: Text markieren überlassen wir dem Nutzer (Link ist sichtbar).
    }
  }

  async function handleNativeShare() {
    if (!link) return
    try {
      // Nur `text` (inkl. Link) senden – so zeigt WhatsApp die Nachricht mit
      // einer Linkvorschau, ohne den Link doppelt anzuhängen.
      await navigator.share({ title: t('profiles.share.shareTitle'), text: inviteMessage(link) })
    } catch {
      // Abbruch durch Nutzer – kein Fehler.
    }
  }

  async function handleRotate() {
    if (!user || busy) return
    setBusy(true)
    try {
      const inviteId = await rotateInvite(profile.id, user.uid)
      setLink(buildInviteLink(profile.id, inviteId))
    } catch (e) {
      console.warn('[share] Link erneuern fehlgeschlagen:', e)
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(memberUid: string) {
    if (busy) return
    setBusy(true)
    try {
      await removeMember(profile.id, memberUid)
      setMembers((prev) => prev.filter((m) => m.uid !== memberUid))
      void refreshProfiles()
    } catch (e) {
      console.warn('[share] Mitglied entfernen fehlgeschlagen:', e)
    } finally {
      setBusy(false)
    }
  }

  async function handleTransfer(memberUid: string) {
    if (busy) return
    setBusy(true)
    try {
      await transferProfileOwnership(profile.id, memberUid)
      // Rollen lokal spiegeln (der Dialog wird i. d. R. gleich vom Elternteil
      // ausgeblendet, da man nun Editor ist).
      setMembers((prev) =>
        prev.map((m) => {
          if (m.uid === memberUid) return { ...m, role: 'owner' }
          if (m.uid === user?.uid) return { ...m, role: 'editor' }
          return m
        }),
      )
      setConfirmTransferUid(null)
    } catch (e) {
      console.warn('[share] Eigentumsübertragung fehlgeschlagen:', e)
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <div className="space-y-4">
        <p className="text-sm text-muted">{t('profiles.share.explainer')}</p>

        {error ? (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
            {t('profiles.share.error')}
          </p>
        ) : link === null ? (
          <div className="grid place-items-center py-4 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {/* Einladungslink */}
            <div className="rounded-xl border border-border bg-surface-2/40 p-3">
              <p className="break-all text-xs text-muted">{link}</p>
              {atMemberLimit && (
                <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-amber-700">
                  {t('profiles.share.memberLimit', { max: maxMembersPerProfile })}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={atMemberLimit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('profiles.share.copied') : t('profiles.share.copy')}
                </button>
                {canNativeShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    disabled={atMemberLimit}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
                  >
                    <Share2 className="h-4 w-4" />
                    {t('profiles.share.shareButton')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRotate}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                  {t('profiles.share.rotate')}
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-muted">
                {t('profiles.share.rotateHint')}
              </p>
            </div>

            {/* Mitglieder */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <Users className="h-3.5 w-3.5" />
                {t('profiles.share.membersTitle', { count: members.length })}
              </p>
              <ul className="space-y-2">
                {members.map((m) => {
                  const isOwner = m.role === 'owner'
                  const isSelf = m.uid === user?.uid
                  const label =
                    m.name.trim() ||
                    (isSelf ? t('profiles.share.you') : t('profiles.share.memberFallback'))
                  const confirming = confirmTransferUid === m.uid
                  return (
                    <li key={m.uid} className="flex flex-wrap items-center gap-2.5">
                      <Avatar name={label} size={32} />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {label}
                        {isSelf && !m.name.trim() ? '' : isSelf ? ` (${t('profiles.share.you')})` : ''}
                      </span>
                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                          <Crown className="h-3 w-3" />
                          {t('profiles.share.roleOwner')}
                        </span>
                      ) : confirming ? (
                        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2/40 p-2">
                          <p className="text-[11px] leading-snug text-muted">
                            {t('profiles.share.transferConfirm', { name: label })}
                          </p>
                          <button
                            type="button"
                            onClick={() => setConfirmTransferUid(null)}
                            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-2"
                          >
                            {t('settings.data.cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTransfer(m.uid)}
                            disabled={busy}
                            className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                          >
                            {t('profiles.share.transferYes')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmTransferUid(m.uid)}
                            disabled={busy}
                            title={t('profiles.share.makeOwner')}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-60"
                          >
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                            {t('profiles.share.makeOwner')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(m.uid)}
                            disabled={busy}
                            title={t('profiles.share.remove')}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-60"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            {t('profiles.share.remove')}
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
        </>
      )}
    </div>
  )
}
