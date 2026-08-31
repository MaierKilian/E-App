interface AlphabetRailProps {
  /** Belegte Anfangsbuchstaben, alphabetisch. */
  letters: string[]
  onJump: (letter: string) => void
  label: string
}

/**
 * Schmale Buchstabenleiste am rechten Rand zum Springen – das Muster aus
 * Adressbüchern.
 *
 * Sie steht als eigene Spalte **neben** der Liste, nicht darüber: Als Overlay
 * läge sie genau auf den Aufklapp-Pfeilen der Einträge und würde jeden Tipp am
 * rechten Rand abfangen.
 *
 * Gezeigt werden nur belegte Buchstaben. Ein vollständiges A–Z mit ausgegrauten
 * Lücken wäre länger und sagt nichts: Wo nichts steht, gibt es nichts zu
 * springen.
 */
export function AlphabetRail({ letters, onJump, label }: AlphabetRailProps) {
  if (letters.length < 2) return null
  return (
    <nav
      aria-label={label}
      className="sticky top-32 flex h-fit w-5 shrink-0 flex-col items-center gap-px self-start"
    >
      {letters.map((letter) => (
        <button
          key={letter}
          type="button"
          onClick={() => onJump(letter)}
          // Die Trefferfläche ist bewusst größer als die Schrift: 11 px Text
          // wären auf dem Daumen nicht zu treffen.
          className="focus-ring w-full rounded py-0.5 text-[11px] font-semibold leading-none text-muted transition-colors hover:text-primary"
        >
          {letter}
        </button>
      ))}
    </nav>
  )
}
