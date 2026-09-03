/**
 * Angaben zum Betreiber – die einzige Stelle, an der sie gepflegt werden.
 * Impressum und Datenschutzerklärung lesen ausschließlich von hier.
 *
 * ⚠️ VOR DER VERÖFFENTLICHUNG AUSFÜLLEN.
 * Leere Felder werden in der App sichtbar als „noch einzutragen" markiert –
 * bewusst so, damit ein unvollständiges Impressum nicht unbemerkt online geht.
 *
 * Pflichtangaben für ein privat/nicht-geschäftsmäßig betriebenes Angebot
 * (§ 5 DDG, § 18 Abs. 2 MStV):
 *   - Name (Vor- und Nachname)
 *   - ladungsfähige Anschrift (kein Postfach)
 *   - eine E-Mail-Adresse für die unmittelbare Kontaktaufnahme
 *   - inhaltlich Verantwortlicher, wenn redaktionelle Inhalte angeboten werden
 *
 * Nicht erforderlich, solange nicht geschäftsmäßig gehandelt wird:
 * Registergericht/-nummer, Umsatzsteuer-Identifikationsnummer (§ 27a UStG),
 * Aufsichtsbehörde, Angaben zur Berufshaftpflicht.
 */
export interface OperatorInfo {
  /** Vor- und Nachname der verantwortlichen natürlichen Person. */
  name: string
  /** Straße und Hausnummer (ladungsfähig, kein Postfach). */
  street: string
  /** Postleitzahl. */
  postalCode: string
  /** Ort. */
  city: string
  /** Land – bleibt in der Regel „Deutschland". */
  country: string
  /** E-Mail-Adresse für die Kontaktaufnahme (Pflichtangabe). */
  email: string
  /** Telefonnummer – freiwillig, darf leer bleiben. */
  phone: string
  /**
   * Inhaltlich Verantwortlicher nach § 18 Abs. 2 MStV.
   * Leer lassen, wenn identisch mit `name` – dann wird `name` angezeigt.
   */
  responsibleForContent: string
}

export const OPERATOR: OperatorInfo = {
  name: '',
  street: '',
  postalCode: '',
  city: '',
  country: 'Deutschland',
  email: '',
  phone: '',
  responsibleForContent: '',
}

/** Pflichtfelder, ohne die das Impressum unvollständig ist. */
const REQUIRED_FIELDS = ['name', 'street', 'postalCode', 'city', 'email'] as const

/** Sind alle Pflichtangaben hinterlegt? */
export function isOperatorComplete(operator: OperatorInfo = OPERATOR): boolean {
  return REQUIRED_FIELDS.every((field) => operator[field].trim().length > 0)
}

/** Noch fehlende Pflichtangaben – für den Hinweis auf der Impressumsseite. */
export function missingOperatorFields(operator: OperatorInfo = OPERATOR): string[] {
  return REQUIRED_FIELDS.filter((field) => operator[field].trim().length === 0)
}

/**
 * Die Anschrift als Zeilen – oder eine leere Liste, solange sie unvollständig
 * ist. `country` allein ergäbe sonst ein Impressum, in dem unter „Anbieter"
 * nur „Deutschland" steht: formal gefüllt, inhaltlich wertlos.
 */
export function addressLines(operator: OperatorInfo = OPERATOR): string[] {
  if (!operator.street.trim() || !operator.city.trim()) return []
  return [
    operator.street,
    [operator.postalCode, operator.city].filter((part) => part.trim()).join(' '),
    operator.country,
  ].filter((line) => line.trim().length > 0)
}

/** Inhaltlich Verantwortlicher; fällt auf den Betreibernamen zurück. */
export function responsiblePerson(operator: OperatorInfo = OPERATOR): string {
  return operator.responsibleForContent.trim() || operator.name
}

/**
 * Stand der Rechtstexte. Bei jeder inhaltlichen Änderung an Impressum oder
 * Datenschutzerklärung mit anpassen – die Seiten zeigen ihn unten an.
 */
export const LEGAL_LAST_UPDATED = '2026-08-23'
