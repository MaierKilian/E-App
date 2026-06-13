/** Kleine, gemeinsam genutzte Formatierungshelfer für die PDF-Generatoren. */

export function numberFmt(language: string, digits = 0): Intl.NumberFormat {
  return new Intl.NumberFormat(language, { maximumFractionDigits: digits })
}

export function currencyFmt(language: string): Intl.NumberFormat {
  return new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

/** Formatiert eine Zahl leersicher, Fallback „-". */
export function fmtNum(value: number | undefined, fmt: Intl.NumberFormat): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return fmt.format(value)
}

/** Zahl + Einheit, leersicher. Fehlt der Wert, „—" ohne Einheit. */
export function fmtVal(value: number | undefined, unit: string | undefined, fmt: Intl.NumberFormat): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return unit ? `${fmt.format(value)} ${unit}` : fmt.format(value)
}

/** Währung leersicher. */
export function fmtCur(value: number | undefined, fmt: Intl.NumberFormat): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return fmt.format(value)
}

/** Mittellanges Datum, leersicher. */
export function fmtDate(iso: string | undefined, language: string): string {
  if (!iso) return '-'
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(d)
}

/** Heutiges Datum als ISO yyyy-mm-dd (für Dateinamen). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
