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

/**
 * Eine Euro-Spanne als „35–55 €". Das Währungszeichen steht nur einmal, am
 * Ende – die Spanne soll als *ein* Betrag lesbar sein, nicht als zwei.
 * Leersicher; fehlt die Spanne, steht dort „-".
 */
export function fmtCurRange(
  range: { low: number; high: number } | undefined,
  cur: Intl.NumberFormat,
  num: Intl.NumberFormat,
): string {
  if (!range || !Number.isFinite(range.low) || !Number.isFinite(range.high)) return '-'
  return `${num.format(range.low)}\u2013${cur.format(range.high)}`
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

/** Kurzes Datum (TT.MM.JJJJ o. Ä.), leersicher – für enge Kacheln/Zeilen. */
export function fmtDateShort(iso: string | undefined, language: string): string {
  if (!iso) return '-'
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat(language, { dateStyle: 'short' }).format(d)
}

/**
 * Zeitraum als „von – bis". Fallen Anfang und Ende auf denselben Tag (nur eine
 * Ablesung), steht dort nur dieses eine Datum statt einer Spanne von null Tagen.
 */
export function fmtPeriod(from: string, to: string, language: string): string {
  const a = fmtDateShort(from, language)
  const b = fmtDateShort(to, language)
  return a === b ? a : `${a} – ${b}`
}

/** Umlaut-/Sonderzeichen-Ersetzungen für Dateinamen. */
const SLUG_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss',
}

/**
 * Macht aus einem freien Text (z. B. dem Objektnamen) einen dateinamens-
 * tauglichen Slug: Umlaute ausgeschrieben, Diakritika entfernt, alles andere
 * zu Bindestrichen. Leerer/fehlender Text ergibt einen leeren String.
 */
export function fileSlug(input: string | undefined, maxLength = 40): string {
  if (!input) return ''
  const mapped = input.replace(/[äöüÄÖÜß]/g, (ch) => SLUG_MAP[ch] ?? ch)
  return mapped
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '')
}

/**
 * Baut den Dateinamen eines Berichts: `E-App-<Typ>[-<Objekt>]-<Datum>.pdf`.
 * Der Objektteil entfällt, wenn kein verwertbarer Name vorliegt.
 */
export function reportFileName(typeLabel: string, objectName: string | undefined): string {
  const parts = ['E-App', fileSlug(typeLabel, 24), fileSlug(objectName), todayIso()].filter(Boolean)
  return `${parts.join('-')}.pdf`
}
