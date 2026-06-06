/**
 * Reine Helfer für das Zählwerk (Odometer). Seiteneffektfrei und NaN-/Bereich-
 * sicher. In eigener Datei, damit OdometerInput.tsx ausschließlich Komponenten
 * exportiert (Vite Fast-Refresh).
 */

/** Begrenzt einen Wert auf [0, max] und macht ihn ganzzahlig & endlich. */
export function clampInt(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, Math.trunc(value)))
}

/** Zerlegt einen Ganzzahl-Wert in feste Stellen (höchste zuerst). */
export function toDigits(value: number, count: number): number[] {
  const padded = value.toString().padStart(count, '0').slice(-count)
  return padded.split('').map((c) => Number(c))
}

/** Setzt aus Stellen wieder einen Ganzzahl-Wert zusammen. */
export function fromDigits(arr: number[]): number {
  return Number(arr.join('')) || 0
}
