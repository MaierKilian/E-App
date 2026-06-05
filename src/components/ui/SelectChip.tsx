interface SelectChipProps {
  label: string
  selected: boolean
  onClick: () => void
  className?: string
}

export function SelectChip({ label, selected, onClick, className = '' }: SelectChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors active:scale-95 transition-transform ${
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-surface border-border text-foreground hover:bg-surface-2'
      } ${className}`}
    >
      {label}
    </button>
  )
}
