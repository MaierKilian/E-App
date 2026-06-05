import type { LucideIcon } from 'lucide-react'

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string
  unit?: string
  badge?: string
}

/** Kompakte Kennzahl-Kachel im Glass-Stil für das 2×2-Grid. */
export function StatTile({ icon: Icon, label, value, unit, badge }: StatTileProps) {
  return (
    <div className="glass rounded-3xl p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="grid place-items-center w-9 h-9 rounded-2xl bg-primary/10 text-primary">
          <Icon className="w-4.5 h-4.5" />
        </span>
        {badge && (
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-foreground tabular-nums">{value}</span>
          {unit && <span className="text-xs text-muted">{unit}</span>}
        </div>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}
