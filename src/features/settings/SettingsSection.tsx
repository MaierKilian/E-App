import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface SettingsSectionProps {
  title: string
  icon?: LucideIcon
  children: ReactNode
}

/**
 * Gruppiert zusammengehörige Einstellungen unter einer Abschnittsüberschrift.
 * Die Zeilen sitzen gemeinsam in einer Karte mit Trennlinien – das aus iOS/Android
 * bekannte Settings-Muster, das mit neuen Bereichen beliebig mitwächst: einfach
 * eine weitere `SettingsSection` bzw. `SettingsRow` einhängen.
 */
export function SettingsSection({ title, icon: Icon, children }: SettingsSectionProps) {
  return (
    <section>
      <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>
    </section>
  )
}
