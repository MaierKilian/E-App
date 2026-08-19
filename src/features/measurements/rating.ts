import type { MeasurementRating } from './types'

/**
 * Semantische Bewertungsfarben: good → grün, medium → gelb/amber,
 * elevated → orange, high → rot.
 *
 * Die Werte liegen als CSS-Variablen je Theme in `src/index.css`, nicht als
 * feste Hex-Werte hier. Grund: ein einziger Satz kann helle und dunkle Themes
 * nicht gleichzeitig lesbar bedienen – was auf Weiß genug Kontrast hat, ist auf
 * Schwarz zu dunkel und umgekehrt.
 *
 * Die Farbe ist immer nur der **zweite** Kanal. Die Bewertung selbst trägt ihr
 * Wort (siehe {@link ../RatingBadge}); Gelb und Orange sind nebeneinander auch
 * mit vollem Farbsehen kaum auseinanderzuhalten. Wo eine Bewertung erscheint,
 * gehört ihr Label dazu.
 */
export const RATING_COLOR: Record<MeasurementRating, string> = {
  good: 'var(--rating-good)',
  medium: 'var(--rating-medium)',
  elevated: 'var(--rating-elevated)',
  high: 'var(--rating-high)',
}
