interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** Beschriftung für Screenreader (die Zeile selbst trägt den sichtbaren Text). */
  label: string
}

/**
 * Zugänglicher An/Aus-Schalter (role="switch"). Wird z. B. in Einstellungs-Zeilen
 * als rechtes Steuerelement genutzt.
 */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'border border-border bg-surface-2'
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
