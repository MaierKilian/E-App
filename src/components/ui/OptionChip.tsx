import type { LucideIcon } from 'lucide-react'

interface OptionChipProps {
  label: string
  selected: boolean
  onClick: () => void
  /** Optionales Piktogramm links vom Text. */
  icon?: LucideIcon
  className?: string
}

/**
 * Auswahl-Chip mit optionalem Piktogramm. Aktiv gefüllt (Primary), inaktiv im
 * dezenten Glass-Stil. Icon erbt die Textfarbe (aktiv) bzw. ist gedämpft.
 */
export function OptionChip({ label, selected, onClick, icon: Icon, className = '' }: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`focus-ring inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-200 active:scale-[0.95] ${
        selected
          ? 'bg-primary text-primary-foreground border border-primary shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_30%,transparent)]'
          : 'glass text-foreground hover:bg-surface-2/70'
      } ${className}`}
    >
      {Icon && <Icon className={`h-4 w-4 shrink-0 ${selected ? '' : 'text-muted'}`} />}
      <span>{label}</span>
    </button>
  )
}
