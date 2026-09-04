import type { OnboardingData } from '@/types'

/**
 * Wer eine Angabe des Fragebogens verwertet.
 *
 * Bewusst die vier Bereiche, die dem Nutzer etwas zurückgeben – nicht jede
 * Stelle, die ein Feld irgendwo anfasst. Der Fragebogen selbst zählt nicht:
 * Eine Frage, die nur ihre eigene Zusammenfassung füttert, ist keine
 * verwertete Frage.
 */
export type FieldConsumer = 'measurements' | 'monitoring' | 'report' | 'tips'

export interface FieldUsage {
  /** Leere Liste = die Angabe wird erhoben, aber nirgends gelesen. */
  consumers: FieldConsumer[]
  /**
   * Wofür sie gebraucht wird – oder, bei leerer Liste, warum sie trotzdem
   * erhoben wird. Klartext, kein Stichwort: Der Satz landet in der
   * Aufstellung „Wofür wir das nutzen".
   */
  reason: string
  /**
   * i18n-Schlüssel der Beschriftung in der Aufstellung.
   *
   * Fehlt er, taucht das Feld dort nicht auf – das ist der Unterschied
   * zwischen einer Frage, die der Nutzer beantwortet hat, und einem inneren
   * Zustand wie `completed` oder `mode`. In der Tabelle stehen beide, weil der
   * Test alles abdecken soll; auf dem Schirm hat nur die Frage etwas verloren.
   */
  labelKey?: string
}

/**
 * Die Feld-Landkarte: für jede Angabe des Fragebogens, wer sie verwertet.
 *
 * **Warum es sie gibt.** Die Hälfte der Fragen lief ins Leere – erhoben,
 * gespeichert, in die Cloud synchronisiert und danach nie wieder gelesen. Das
 * fiel niemandem auf, weil es keine Stelle gab, an der es hätte auffallen
 * können. Jetzt gibt es sie, und `tests/unit/fieldUsage.test.ts` lässt eine
 * neue Frage ohne Abnehmer nicht mehr stillschweigend durch.
 *
 * **Wer hier etwas ändert:** Ein neues Feld in `OnboardingData` ohne Eintrag
 * hier bricht schon den Typecheck (`satisfies`). Wer ein totes Feld
 * anschließt, kürzt die Liste im Test; wer eins hinzufügt, erweitert sie und
 * begründet es in `reason`.
 */
export const FIELD_USAGE = {
  profileName: {
    consumers: ['report'],
    reason: 'Benennt die Wohnung im Bericht und in der Wohnungs-Auswahl.',
    labelKey: 'onboarding.step8.labels.profileName',
  },
  profileImage: {
    consumers: [],
    reason: 'Bild zur Wiedererkennung der Wohnung. Ein Bild braucht keinen Verwerter.',
  },
  personsCount: {
    consumers: ['measurements', 'monitoring'],
    reason:
      'Warmwasser- und Stromverbrauch hängen an der Personenzahl; das Monitoring rechnet Kennwerte je Person.',
    labelKey: 'onboarding.step8.labels.persons',
  },
  roomsCount: {
    consumers: [],
    reason:
      'Zimmerzahl als schnelle Angabe im Schnellstart. Gerechnet wird mit den einzeln angelegten Räumen (`rooms`), nicht mit dieser Zahl.',
    labelKey: 'onboarding.step8.labels.roomsCount',
  },
  buildingYear: {
    consumers: ['monitoring'],
    reason: 'Bestimmt den Heizwärme-Vergleichswert, an dem der eigene Verbrauch gemessen wird.',
    labelKey: 'onboarding.step8.labels.buildingYear',
  },
  buildingType: {
    consumers: ['report'],
    reason:
      'Wohnung oder Haus. Der Steckbrief im Bericht nennt den Gebäudetyp – ohne ihn sind Verbrauchszahlen je m² nicht einzuordnen.',
    labelKey: 'onboarding.step8.labels.buildingType',
  },
  livingArea: {
    consumers: ['measurements', 'monitoring'],
    reason: 'Bezugsgröße fast aller Kennwerte: Verbrauch je m² statt nackter Zahl.',
    labelKey: 'onboarding.step8.labels.livingArea',
  },
  rooms: {
    consumers: ['measurements', 'tips', 'report'],
    reason:
      'Trägt die Pro-Raum-Checks (Raumklima, Beleuchtung, Möbelabstand) und entscheidet, welche Empfehlungen für welchen Raum gelten.',
    labelKey: 'onboarding.fieldUsage.labels.rooms',
  },
  heatGenerators: {
    consumers: ['measurements', 'monitoring'],
    reason:
      'Entscheidet, welcher Energieträger überhaupt zu erfassen ist und mit welchem Preis eine Heizersparnis gerechnet wird.',
    labelKey: 'onboarding.step8.labels.heatGenerators',
  },
  hotWaterType: {
    consumers: ['measurements'],
    reason:
      'Der Duschkopf-Check rechnet je Warmwasserquelle anders – ein Durchlauferhitzer kostet anderes Geld als eine Wärmepumpe.',
    labelKey: 'onboarding.step8.labels.hotWater',
  },
  instruments: {
    consumers: ['measurements', 'report'],
    reason:
      'Vorhandene Messgeräte. Wird nicht mehr erhoben – an der Stelle der Frage steht die Übersicht „Was du zum Messen brauchst". Ein Bestandsprofil trägt weiter Werte: Sie haken die optionale Abstandsmessung im Möbelabstand-Check vor und stehen im Steckbrief des Berichts.',
  },
  locationMode: {
    consumers: [],
    reason:
      'Wie der Standort angegeben wurde. Ohne Abnehmer, solange der Standort selbst keinen hat.',
  },
  postalCode: {
    consumers: ['report'],
    reason:
      'Im Steckbrief des Berichts, bewusst auf zwei Stellen gekürzt. Für Klimadaten und regionale Preise wäre sie zusätzlich brauchbar, beides gibt es noch nicht.',
    labelKey: 'onboarding.step8.labels.postalCode',
  },
  completed: {
    consumers: ['measurements'],
    reason: 'Steuert, ob die App den Fragebogen oder den Messbereich zeigt.',
  },
  mode: {
    consumers: ['monitoring'],
    reason: 'Schnellstart oder vollständig – bestimmt, wie viel das Monitoring voraussetzen darf.',
  },
  goals: {
    consumers: ['tips', 'measurements', 'report'],
    reason:
      'Gewichtet die Empfehlungen und die empfohlene Messreihenfolge: Wer CO₂ senken will, sieht Wärme-Maßnahmen und Wärme-Messungen zuerst. Der Handlungsplan im Bericht nennt die Ziele, nach denen er sortiert.',
    labelKey: 'onboarding.step8.labels.goals',
  },
  occupancyStatus: {
    consumers: ['report'],
    reason:
      'Mieter oder Eigentümer, im Steckbrief des Berichts. Dass die Empfehlungen die Angabe lesen – eine neue Heizung ist für Mieter keine Empfehlung – steht weiter aus.',
    labelKey: 'onboarding.step8.labels.occupancyStatus',
  },
  floors: {
    consumers: ['report'],
    reason:
      'Geschosszahl, im Steckbrief des Berichts. Für die Hüllflächen-Abschätzung wäre sie zusätzlich brauchbar, dort wird sie noch nicht gelesen.',
    labelKey: 'onboarding.step8.labels.floors',
  },
  windowAge: {
    consumers: ['report'],
    reason:
      'Fensteralter. Wird seit dem Wegfall des Schritts „Gebäudehülle" nicht mehr erhoben; im Steckbrief des Berichts erscheint es nur noch, wenn ein Bestandsprofil einen Wert trägt.',
    labelKey: 'onboarding.step8.labels.windowAge',
  },
  hasPV: {
    consumers: ['monitoring', 'tips'],
    reason:
      'Legt den Erzeugungszähler aufs Board und erinnert daran, ihn zu füllen. „Ja" trägt zusätzlich die Empfehlung, große Verbraucher in die Mittagsstunden zu legen; „geplant" die, vor der Auslegung Grundlast und Standby zu messen.',
    labelKey: 'onboarding.step8.labels.hasPV',
  },
  hasExtraFireplace: {
    consumers: ['report'],
    reason:
      'Zusätzlicher Kamin oder Ofen. Wird nicht mehr gefragt – die Angabe verschob keine Rechnung, ihre gesamte Wirkung war eine Zeile im Steckbrief. Ein Bestandsprofil, das „ja" gesagt hat, behält sie dort.',
  },
  ventilationType: {
    consumers: ['report'],
    reason:
      'Lüftungsart. Wird nicht mehr erhoben (Schritt „Gebäudehülle" entfallen); im Steckbrief nur noch bei Bestandsprofilen. Für Lüftungsverluste wäre sie brauchbar gewesen – gelesen hat sie dort nie jemand.',
    labelKey: 'onboarding.step8.labels.ventilationType',
  },
  insulationState: {
    consumers: ['report'],
    reason:
      'Dämmzustand als Selbsteinschätzung. Wird nicht mehr erhoben (Schritt „Gebäudehülle" entfallen); im Steckbrief nur noch bei Bestandsprofilen.',
    labelKey: 'onboarding.step8.labels.insulationState',
  },
  smartHomeDevices: {
    consumers: ['report'],
    reason:
      'Vorhandene Smart-Home-Geräte, im Steckbrief des Berichts. Dass die Empfehlungen schon Vorhandenes unterdrücken, steht weiter aus.',
    labelKey: 'onboarding.step8.labels.smartHomeDevices',
  },
  renovations: {
    consumers: ['report'],
    reason:
      'Der Sanierungs-Log steht chronologisch im Steckbrief des Berichts. Erhoben wird er nicht mehr (Schritt „Gebäudehülle" entfallen), deshalb bekommt nur noch ein Bestandsprofil dieses Kapitel.',
    labelKey: 'onboarding.fieldUsage.labels.renovations',
  },
  heatGeneratorYears: {
    consumers: ['tips'],
    reason:
      'Das Alter des Wärmeerzeugers trägt die Empfehlung, ihn prüfen oder tauschen zu lassen (`boilerAgeYears`).',
    labelKey: 'onboarding.fieldUsage.labels.heatGeneratorYears',
  },
  appliances: {
    consumers: ['measurements'],
    reason: 'Bestimmt, welche Kühl- und Gefriergeräte einzeln zu messen sind.',
    labelKey: 'onboarding.fieldUsage.labels.appliances',
  },
  appliancesAnswered: {
    consumers: ['measurements'],
    reason:
      'Unterscheidet „wir haben keines" von „noch nicht gefragt" – nur im ersten Fall fallen die Geräte-Checks aus Zähler und Nenner.',
  },
  lastRenovationYear: {
    consumers: [],
    reason:
      'Aus `renovations` abgeleitet, für Demo-Profil und Cloud-Sync erhalten. Kein eigener Abnehmer.',
  },
  renovationItems: {
    consumers: [],
    reason: 'Aus `renovations` abgeleitet. Wie `lastRenovationYear` ohne eigenen Abnehmer.',
  },
} satisfies Record<keyof OnboardingData, FieldUsage>

/**
 * Eintrag zu einem Feld, auf `FieldUsage` verbreitert.
 *
 * `satisfies` behält den engen Typ je Eintrag – dann kennt ein Eintrag ohne
 * `labelKey` die Eigenschaft gar nicht. Für die Tabelle ist das richtig (der
 * Typechecker prüft jede Zeile einzeln), zum Auslesen zu eng.
 */
export function usageOf(key: keyof OnboardingData): FieldUsage {
  return FIELD_USAGE[key]
}

/** Felder, die niemand liest – die offene Rechnung des Fragebogens. */
export function fieldsWithoutConsumer(): (keyof OnboardingData)[] {
  return (Object.keys(FIELD_USAGE) as (keyof OnboardingData)[]).filter(
    (key) => FIELD_USAGE[key].consumers.length === 0,
  )
}

/** Felder, die dieser Bereich verwertet – Grundlage der Aufstellung in der App. */
export function fieldsFor(consumer: FieldConsumer): (keyof OnboardingData)[] {
  return (Object.keys(FIELD_USAGE) as (keyof OnboardingData)[]).filter((key) =>
    (FIELD_USAGE[key].consumers as readonly FieldConsumer[]).includes(consumer),
  )
}
