import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { LEGAL_LAST_UPDATED } from './operator'

/**
 * Warnfarbe für fehlende Pflichtangaben. Wie überall in der App als
 * CSS-Variable, damit sie in jedem Theme lesbar bleibt (siehe
 * `features/measurements/rating.ts`).
 */
const WARN_COLOR = 'var(--rating-high)'

/**
 * Gemeinsames Gerüst der Rechtstexte (Impressum, Datenschutzerklärung).
 *
 * Die Texte selbst stehen bewusst nur auf Deutsch: Sie sind die rechtlich
 * maßgebliche Fassung, und eine mitgepflegte Übersetzung, die der deutschen
 * Fassung hinterherhinkt, schafft mehr Risiko als Nutzen. Die Bedienelemente
 * ringsum (Zurück, Fußzeile, Einwilligungs-Fenster) bleiben zweisprachig.
 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={title}
        subtitle={intro}
        back={{ label: t('common.back'), onClick: () => navigate(-1) }}
      />
      <div className="space-y-6">{children}</div>
      <p className="border-t border-border/60 pt-4 text-xs text-muted">
        Stand: {formatDate(LEGAL_LAST_UPDATED)}
      </p>
    </div>
  )
}

/** Ein Abschnitt mit Überschrift – der einzige Baustein der Rechtstexte. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  )
}

/**
 * Zeigt einen Wert aus den Betreiberangaben – oder, solange er fehlt, eine
 * unübersehbare Lücke. Ein stillschweigend leeres Impressumsfeld wäre der
 * teuerste denkbare Fehler dieser Seite.
 */
export function LegalValue({ value, hint }: { value: string; hint: string }) {
  if (value.trim()) return <>{value}</>
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium"
      style={{
        color: WARN_COLOR,
        backgroundColor: `color-mix(in srgb, ${WARN_COLOR} 14%, transparent)`,
      }}
    >
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      {hint}
    </span>
  )
}

/** Warnbanner, solange Pflichtangaben des Impressums fehlen. */
export function LegalIncompleteNotice({ fields }: { fields: string[] }) {
  if (fields.length === 0) return null
  return (
    <div
      role="status"
      className="rounded-2xl p-4 text-sm text-foreground"
      style={{
        border: `1px solid color-mix(in srgb, ${WARN_COLOR} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${WARN_COLOR} 10%, transparent)`,
      }}
    >
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle
          className="h-4 w-4 shrink-0"
          style={{ color: WARN_COLOR }}
          aria-hidden="true"
        />
        Impressum unvollständig
      </p>
      <p className="mt-1.5 text-muted">
        Es fehlen noch Pflichtangaben ({fields.join(', ')}). Sie werden in{' '}
        <code className="rounded bg-surface-2 px-1 py-0.5 text-[0.8em]">
          src/features/legal/operator.ts
        </code>{' '}
        eingetragen. Dieser Hinweis verschwindet automatisch, sobald alle Felder
        gefüllt sind.
      </p>
    </div>
  )
}

/** Datum im deutschen Format – ohne Bibliothek, die Eingabe ist ISO. */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}
