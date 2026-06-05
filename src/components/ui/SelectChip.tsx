interface SelectChipProps {
  label: string
  selected: boolean
  onClick: () => void
  className?: string
}

/**
 * Auswahl-Chip im Liquid-Glass-Stil.
 * Aktiv: gefüllt mit bg-primary für klaren Premium-Kontrast.
 * Inaktiv: zartes Glass mit weichem Hover/Active-Feedback.
 */
export function SelectChip({ label, selected, onClick, className = '' }: SelectChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`focus-ring px-4 py-2 rounded-2xl text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-200 active:scale-[0.94] ${
        selected
          ? 'bg-primary text-primary-foreground border border-primary shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_35%,transparent)]'
          : 'glass text-foreground hover:bg-surface-2/70 active:bg-surface-2/80'
      } ${className}`}
    >
      {label}
    </button>
  )
}
