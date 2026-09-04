import { Home, DoorOpen, Flame, Gauge, MapPin, Wallet, ClipboardCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { OnboardingData } from '@/types'

/**
 * Die eine Liste, aus der Fragebogen-Flow, Titel, Profil-Hub, Abschnitts-Status
 * und Fortschritt folgen.
 *
 * Vorher war die Schrittreihenfolge an fünf Stellen unabhängig kodiert:
 * `QUICK_TOTAL`/`DETAILED_TOTAL`, zwei Titel-Arrays, zwei `switch`-Blöcke, das
 * `SECTIONS`-Array des Hubs und noch einmal `sectionStatus`. Jede Kopie musste
 * dasselbe wissen, und genau das ging schief: `profileChecks` prüfte 16 Felder,
 * `sectionStatus` 19 – der Prozentbalken im Hub konnte 100 % zeigen, während die
 * Kacheln darunter offene Angaben meldeten.
 *
 * Dasselbe Muster wie `measurements/catalog.ts` bei den Messungen: eine
 * Registry, alles andere leitet sich ab.
 */

/**
 * Die Abschnitte des Fragebogens.
 *
 * Als Union statt `string`, damit der Compiler erzwingt, dass jeder Abschnitt
 * einen Inhalt hat (siehe `SECTION_BODIES` in `OnboardingPage`). Ein Test
 * könnte das auch prüfen – aber erst zur Laufzeit, und ein vergessener
 * Abschnitt wäre bis dahin eine leere Seite.
 */
export type SectionId =
  | 'home'
  | 'rooms'
  | 'heating'
  | 'prices'
  | 'equipment'
  | 'location'
  | 'review'

/** Eine Einzelangabe eines Abschnitts. */
export interface SectionField {
  /** Stabiler Schlüssel; zugleich der i18n-Schlüssel unter `onboarding.fields.*`. */
  id: string
  /** Ist die Angabe sinnvoll befüllt? Eine Prüfung, überall dieselbe. */
  answered: (d: OnboardingData) => boolean
  /**
   * Optionale Angaben zählen **nicht** in den Fortschritts-Nenner. Sonst wäre
   * 100 % nur mit Angaben erreichbar, die die App selbst als optional
   * beschriftet – der Ring bliebe für alle dauerhaft unter voll.
   */
  optional?: boolean
}

export interface OnboardingSection {
  /** Stabile id – trägt den Besuchsstatus (`visitedSections`). */
  id: SectionId
  titleKey: string
  icon: LucideIcon
  /** Wird dieser Abschnitt im Schnellstart gezeigt? */
  quick: boolean
  /** Abschluss-Schritt ohne Eingaben (Übersicht) – trägt keine Aktionsleiste. */
  review?: boolean
  fields: SectionField[]
}

/** Kurzschreibweise für eine Pflichtangabe. */
function field(id: string, answered: (d: OnboardingData) => boolean): SectionField {
  return { id, answered }
}

/** Kurzschreibweise für eine freiwillige Angabe (zählt nicht im Nenner). */
function optional(id: string, answered: (d: OnboardingData) => boolean): SectionField {
  return { id, answered, optional: true }
}

/**
 * Die Schrittfolge des vollständigen Fragebogens.
 *
 * Sortiert nach dem, was der Nutzer als zusammengehörig erlebt – und die Preise
 * stehen früh: Sie skalieren jeden €-Betrag der App und standen vorher an
 * vorletzter Stelle, wo die Aufmerksamkeit am geringsten ist. Früher als hier
 * geht nicht, weil erst die Heizungsfrage bestimmt, welche Träger überhaupt
 * abgefragt werden.
 *
 * Der Schnellstart ist eine Teilmenge (`quick`), kein eigener Flow: Zuhause,
 * Heizung, Preise, Übersicht.
 *
 * **Entfallen am 04.09.2026: „Gebäudehülle & Modernisierung"** (ehemals
 * Schritt 5 von 8). Der Schritt stellte vier Pflichtfragen – Fensteralter,
 * Dämmzustand, Lüftungstyp und den Sanierungs-Log –, deren gesamte Wirkung
 * eine Handvoll Zeilen im PDF-Steckbrief war: Keine Messung, kein Tipp und
 * keine Monitoring-Rechnung hat je eines dieser Felder gelesen. Die
 * Effizienz-Einordnung, die der Schritt daraus zeichnete, sah nur, wer gerade
 * in ihm stand.
 *
 * Das Heizungs-Baujahr, das den Tipp „Heizung prüfen/tauschen lassen" trägt,
 * war nie hier zu Hause – es wird im Heizungs-Schritt erfasst und bleibt
 * unberührt.
 *
 * Die Felder (`windowAge`, `insulationState`, `ventilationType`,
 * `renovations`) bleiben in `OnboardingData` und im Bericht: Bestandsprofile
 * tragen echte Werte, die nicht verschwinden sollen. Neu befüllen lassen sie
 * sich nicht mehr. Der Code der beiden Schritte liegt unter
 * `archiv/onboarding-gebaeudehuelle/`.
 */
export const ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    id: 'home',
    titleKey: 'onboarding.sectionTitles.home',
    icon: Home,
    quick: true,
    fields: [
      optional('profileImage', (d) => Boolean((d.profileImage ?? '').trim())),
      field('profileName', (d) => (d.profileName ?? '').trim().length > 0),
      field('buildingType', (d) => Boolean(d.buildingType)),
      field('livingArea', (d) => d.livingArea > 0),
      field('personsCount', (d) => d.personsCount > 0),
      field('buildingYear', (d) => d.buildingYear > 0),
      field('floors', (d) => d.floors > 0),
      field('goals', (d) => d.goals.length > 0),
    ],
  },
  {
    id: 'rooms',
    titleKey: 'onboarding.sectionTitles.rooms',
    icon: DoorOpen,
    quick: false,
    fields: [
      field('rooms', (d) => d.rooms.length > 0),
      // Die Wärmeübergabe steht jetzt beim Raum, den sie beschreibt. Zählbar
      // ist sie überhaupt erst, seit sie optional ist – vorher stand bei jedem
      // Raum stillschweigend „Heizkörper".
      field(
        'heatTransfer',
        (d) => d.rooms.length > 0 && d.rooms.every((r) => Boolean(r.heatTransfer)),
      ),
      optional('roomAreas', (d) => d.rooms.some((r) => (r.areaSqm ?? 0) > 0)),
    ],
  },
  {
    id: 'heating',
    titleKey: 'onboarding.sectionTitles.heating',
    icon: Flame,
    quick: true,
    fields: [
      field('heatGenerators', (d) => d.heatGenerators.length > 0),
      field('hotWaterType', (d) => d.hotWaterType !== 'unknown'),
      // PV wandert in den Schnellstart – nicht als Freischaltung (die entfiel
      // mit Etappe 2), sondern damit die Erinnerung entstehen kann, den
      // Erzeugungszähler anzulegen.
      optional('hasPV', (d) => d.hasPV !== 'no'),
    ],
  },
  {
    id: 'prices',
    titleKey: 'onboarding.sectionTitles.prices',
    icon: Wallet,
    quick: true,
    // Preise liegen im `tariffStore`, nicht in `OnboardingData`; leere Felder
    // behalten sinnvolle Standardwerte. Damit hat dieser Abschnitt keine
    // Pflichtangabe – `stateOf` zählt ihn als erledigt, sobald er besucht wurde.
    fields: [],
  },
  {
    id: 'equipment',
    titleKey: 'onboarding.sectionTitles.equipment',
    icon: Gauge,
    quick: false,
    fields: [
      // Die Messgeräte-Frage ist hier entfallen: Sie zählte für den Fortschritt,
      // ohne etwas zu bewirken – an ihrer Stelle steht jetzt die Übersicht
      // „Was du zum Messen brauchst" (Punkt 18 in `docs/gefundene-probleme.md`).
      // Eine Auskunft hat keinen Ausfüllstand.
      //
      // Beantwortet ist die Geräte-Frage auch mit „wir haben keines" – erst dann
      // fallen Kühl- und Gefrier-Check aus der Fortschrittszählung.
      field('appliances', (d) => d.appliancesAnswered),
    ],
  },
  {
    id: 'location',
    titleKey: 'onboarding.sectionTitles.location',
    icon: MapPin,
    quick: false,
    fields: [
      // Mieter oder Eigentümer entscheidet, welche Maßnahmen überhaupt in Frage
      // kommen – das gehört neben den Standort, nicht neben den Profilnamen.
      field('occupancyStatus', (d) => d.occupancyStatus !== null),
      // Die App beschriftet die Postleitzahl selbst als optional – dann darf sie
      // den Fortschritt auch nicht bremsen.
      optional('postalCode', (d) => (d.postalCode ?? '').trim().length > 0),
    ],
  },
  {
    id: 'review',
    titleKey: 'onboarding.sectionTitles.review',
    icon: ClipboardCheck,
    quick: true,
    review: true,
    fields: [],
  },
]

/** Abschnitte des gewählten Wegs, in der Reihenfolge des Fragebogens. */
export function sectionsFor(mode: 'quick' | 'detailed'): OnboardingSection[] {
  return mode === 'quick'
    ? ONBOARDING_SECTIONS.filter((s) => s.quick)
    : ONBOARDING_SECTIONS
}

/** Abschnitte, die der Profil-Hub als Kacheln zeigt (alles außer der Übersicht). */
export function hubSections(): OnboardingSection[] {
  return ONBOARDING_SECTIONS.filter((s) => !s.review)
}

/** Beantwortungsstand eines Abschnitts (nur Pflichtangaben zählen). */
export interface SectionStatus {
  open: number
  total: number
  /** Füllgrad 0..100; ein Abschnitt ohne Pflichtangaben gilt als voll. */
  pct: number
}

export function statusOf(section: OnboardingSection, data: OnboardingData): SectionStatus {
  const required = section.fields.filter((f) => !f.optional)
  const open = required.filter((f) => !f.answered(data)).length
  const total = required.length
  return { open, total, pct: total === 0 ? 100 : Math.round(((total - open) / total) * 100) }
}

/**
 * Zustand eines Abschnitts für Fortschrittsanzeige und Hub.
 *
 * „Angefangen“ ist die eigentliche Neuerung: Ein durchgeklickter, aber
 * unvollständiger Schritt sah bisher aus wie ein fertiger. Er ist eine offene
 * Schleife und soll auffallen – ein nie besuchter Schritt ist dagegen nur noch
 * nicht dran.
 */
export type SectionState = 'open' | 'started' | 'complete'

export function stateOf(
  section: OnboardingSection,
  data: OnboardingData,
  visited: readonly string[],
): SectionState {
  const { open, total } = statusOf(section, data)
  // Ein Abschnitt ohne Pflichtangabe (Preise, Übersicht) hat nichts zu
  // erledigen – „fertig" wäre er trotzdem erst, wenn der Nutzer dort war.
  // Sonst stünden im Schrittbalken die letzten Segmente von Anfang an voll.
  if (total === 0) return visited.includes(section.id) ? 'complete' : 'open'
  if (open === 0) return 'complete'
  return visited.includes(section.id) ? 'started' : 'open'
}

/**
 * Profil-Vollständigkeit in Prozent – gemessen am **vollständigen** Fragebogen.
 *
 * Nach dem Schnellstart steht hier bewusst kein 100 %: Der Wert beschreibt das
 * Profil, nicht den gewählten Weg. Dieselbe Feldliste speist die Abschnitts-
 * Kacheln, deshalb können beide sich nicht mehr widersprechen.
 */
export function profileCompleteness(data: OnboardingData): number {
  const { answered, total } = fieldTally(data)
  return total === 0 ? 100 : Math.round((answered / total) * 100)
}

/** Anzahl noch offener Pflichtangaben über alle Abschnitte. */
export function profileMissingCount(data: OnboardingData): number {
  const { answered, total } = fieldTally(data)
  return total - answered
}

/**
 * Der Abschnitt, an dem die nächste Angabe am meisten bringt.
 *
 * Speist die Nutzen-Formulierung auf dem Zuhause-Einstieg und die
 * Freischalt-Bilanz: „Räume ergänzen → drei weitere Checks" sagt dasselbe wie
 * „Noch 11 Angaben offen", aber als Gewinn statt als Restarbeit.
 *
 * Noch nicht besuchte Abschnitte gehen vor. Sonst empfiehlt die Übersicht
 * direkt nach dem Schnellstart ausgerechnet den Schritt, den der Nutzer gerade
 * ausgefüllt hat – dort sind zwar noch Felder offen, aber er hat sie eben
 * bewusst übersprungen.
 */
export function nextSection(
  data: OnboardingData,
  visited: readonly string[] = [],
): OnboardingSection | undefined {
  const open = hubSections().filter((section) => statusOf(section, data).open > 0)
  return open.find((section) => !visited.includes(section.id)) ?? open[0]
}

function fieldTally(data: OnboardingData): { answered: number; total: number } {
  let answered = 0
  let total = 0
  for (const section of ONBOARDING_SECTIONS) {
    for (const f of section.fields) {
      if (f.optional) continue
      total += 1
      if (f.answered(data)) answered += 1
    }
  }
  return { answered, total }
}
