/**
 * Angaben zum Betreiber – die einzige Stelle, an der sie gepflegt werden.
 * Impressum und Datenschutzerklärung lesen ausschließlich von hier.
 *
 * Leere Pflichtfelder werden in der App sichtbar als „noch einzutragen"
 * markiert – bewusst so, damit ein unvollständiges Impressum nicht unbemerkt
 * online geht. Seit dem 05.09.2026 sind alle Pflichtfelder gefüllt; die
 * Markierung greift erst wieder, wenn eines geleert wird.
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
  /**
   * Vor- und Nachname der verantwortlichen natürlichen Person; bei mehreren
   * Betreibern alle Namen in einem Feld („A und B"). Impressum und
   * Datenschutzerklärung geben den Wert unverändert aus.
   */
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

/**
 * Betreiber sind die beiden Projektbeteiligten, gemeinsam (Stand 05.09.2026).
 *
 * `name` trägt beide Namen in einem Feld. Das Feld ist bewusst eine
 * Zeichenkette und keine Liste: Impressum und Datenschutzerklärung geben es
 * unverändert aus, und mehrere Diensteanbieter stehen dort ohnehin
 * nebeneinander in einer Zeile. Eine Liste brächte nur eine zweite Stelle,
 * an der die Reihenfolge festgelegt werden müsste.
 *
 * `responsibleForContent` bleibt leer und fällt damit auf `name` zurück –
 * beide verantworten die Inhalte gemeinsam.
 *
 * **Was weiterhin zu klären ist, bevor die App öffentlich beworben wird:** Die
 * Anschrift ist die des Campus Wilhelminenhof der HTW Berlin, wo das Projekt
 * entsteht. Diensteanbieter im Sinne des § 5 DDG sind aber die Personen, die
 * das Angebot betreiben – nicht der Ort, an dem es entstanden ist. Ein
 * Personenname unter einer Hochschulanschrift behauptet eine Zustellbarkeit
 * unter dieser Adresse; die trifft nur zu, wenn die Hochschule Post für diese
 * Personen entgegennimmt. Für ein Studienprojekt ist das vertretbar, für ein
 * öffentlich beworbenes Angebot gehört es geprüft.
 */
export const OPERATOR: OperatorInfo = {
  name: 'Kilian Maier und Johan Uhle',
  street: 'Wilhelminenhofstraße 75A',
  postalCode: '12459',
  city: 'Berlin',
  country: 'Deutschland',
  email: 'eapp.admin@gmail.com',
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
export const LEGAL_LAST_UPDATED = '2026-09-05'
