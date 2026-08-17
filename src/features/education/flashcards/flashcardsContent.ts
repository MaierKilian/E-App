// Karteikarten für den HTW-GEIT-Wissensbereich (Phase 1).
//
// Datenmodell nach docs/flashcards-trainer.md (Format „Hybrid": Bild UND/ODER
// Text). In Phase 1 sind die Karten TEXT-basiert und bewusst als BEISPIEL
// gekennzeichnet (`placeholder: true`) – sie zeigen Aufbau und Bedienung, bevor
// die echten GoodNotes-Karten (als Bilder) eingepflegt werden.
//
// Fachliche Inhalte liegen – wie educationContent.ts – bewusst als deutscher
// Content hier und NICHT in i18n. Nur UI-Beschriftungen werden übersetzt.

/**
 * Modul (Fach) des Studiengangs, z. B. „Thermodynamik". Jedes Modul gehört zu
 * genau einem Fachsemester und bündelt ein oder mehrere Karteikartensets.
 */
export interface FlashcardSubject {
  id: string
  title: string
  /** Fachsemester (1–6), in dem das Modul gehört wird. */
  semester: number
  /** Kurzbeschreibung des Moduls. */
  description?: string
}

/** Karteikartenset innerhalb eines Fachs. */
export interface FlashcardSet {
  id: string
  subjectId: string
  title: string
  description?: string
  /**
   * Inhaltsversion – wird bei Änderungen erhöht. Karten-IDs bleiben stabil,
   * damit der spätere Lernfortschritt (Phase 2+) an ihnen hängen bleibt.
   */
  version: number
  cards: Flashcard[]
}

/**
 * Eine Karteikarte (Format „Hybrid"). Vorder-/Rückseite können als Bild und/oder
 * als Text vorliegen. Für eine lauffähige Karte genügt jeweils Bild ODER Text.
 */
export interface Flashcard {
  /** Stabile ID – Grundlage des späteren Fortschritts. Niemals nachträglich ändern. */
  id: string
  /** Bild der Vorderseite (Asset-Import/-Pfad); optional in Phase 1. */
  frontImage?: string
  /** Bild der Rückseite; optional in Phase 1. */
  backImage?: string
  /** Text der Vorderseite (Frage/Begriff). */
  frontText?: string
  /** Text der Rückseite (Antwort/Definition). */
  backText?: string
  /** Schlagworte für spätere Filter/Suche. */
  tags?: string[]
}

/**
 * Beispiel-Sets für Phase 1. Bewusst als Platzhalter markiert: Die Karten
 * stammen aus dem GEIT-Grundlagenstoff und dienen der Vorschau. Die echten,
 * professionell aufbereiteten GoodNotes-Sets ersetzen diese schrittweise.
 */
export const FLASHCARDS_PLACEHOLDER = true

export const FLASHCARD_SUBJECTS: FlashcardSubject[] = [
  {
    id: 'thermodynamik',
    title: 'Thermodynamik & Wärmeübertragung',
    semester: 2,
    description: 'Grundgrößen, Wärmeübertragung und Kennwerte der Gebäudetechnik.',
  },
  {
    id: 'heizungstechnik',
    title: 'Heizungstechnik & Hydraulik',
    semester: 3,
    description: 'Heizsysteme, hydraulischer Abgleich und Effizienzkennwerte.',
  },
  {
    id: 'stroemungsmaschinen',
    title: 'Strömungsmaschinen',
    semester: 3,
    description: 'Kreiselpumpen, Kennlinien und Betriebsverhalten.',
  },
]

export const FLASHCARD_SETS: FlashcardSet[] = [
  {
    id: 'thermo_grundgroessen',
    subjectId: 'thermodynamik',
    title: 'Grundgrößen & Einheiten',
    description: 'Leistung, Energie und Kennwerte im Überblick.',
    version: 1,
    cards: [
      {
        id: 'thermo_grundgroessen_01',
        frontText: 'Was beschreibt die Einheit kWh?',
        backText:
          'Die Kilowattstunde ist eine Einheit für Energie. Ein Gerät mit 1.000 W Leistung verbraucht in einer Stunde genau 1 kWh. Energiekosten = verbrauchte kWh × Arbeitspreis.',
        tags: ['Energie', 'Einheiten'],
      },
      {
        id: 'thermo_grundgroessen_02',
        frontText: 'Was ist Watt als physikalische Größe?',
        backText:
          'Watt ist die Einheit der Leistung, also Energie pro Zeit (1 W = 1 J/s). Sie beschreibt, wie schnell Energie umgesetzt wird; über die Zeit ergibt sich der Energieverbrauch in Wh bzw. kWh.',
        tags: ['Leistung', 'Einheiten'],
      },
      {
        id: 'thermo_grundgroessen_03',
        frontText: 'Wofür steht der U-Wert und in welcher Einheit?',
        backText:
          'Der Wärmedurchgangskoeffizient U in W/(m²·K) gibt an, wie viel Wärmeleistung pro m² Bauteil und Grad Temperaturunterschied verloren geht. Je kleiner der U-Wert, desto besser die Dämmung.',
        tags: ['Dämmung', 'Kennwerte'],
      },
      {
        id: 'thermo_grundgroessen_04',
        frontText: 'Was unterscheidet Heizwert und Brennwert?',
        backText:
          'Der Heizwert (unterer Heizwert) ist die nutzbare Wärme ohne die Kondensationswärme des Wasserdampfs im Abgas. Der Brennwert (oberer Heizwert) schließt diese ein – Brennwertkessel nutzen sie und erreichen höhere Wirkungsgrade.',
        tags: ['Verbrennung'],
      },
      {
        id: 'thermo_grundgroessen_05',
        frontText: 'Welche drei Arten der Wärmeübertragung gibt es?',
        backText:
          'Wärmeleitung (Konduktion), Konvektion (Strömung) und Wärmestrahlung. In der Gebäudetechnik überlagern sich diese – ein Heizkörper etwa gibt Wärme über Konvektion UND Strahlung ab.',
        tags: ['Wärmeübertragung'],
      },
      {
        id: 'thermo_grundgroessen_06',
        frontText: 'Was beschreibt die (logarithmische) Übertemperatur?',
        backText:
          'Die Differenz zwischen mittlerer Heizmitteltemperatur und Raumtemperatur. Sie ist die treibende Größe der Wärmeabgabe eines Heizkörpers; üblich ist die logarithmische mittlere Übertemperatur aus Vorlauf-, Rücklauf- und Raumtemperatur.',
        tags: ['Wärmeübertragung', 'Heizkörper'],
      },
    ],
  },
  {
    id: 'heizung_hydraulischer_abgleich',
    subjectId: 'heizungstechnik',
    title: 'Hydraulischer Abgleich',
    description: 'Ziel, Wirkung und Kenngrößen des Abgleichs.',
    version: 1,
    cards: [
      {
        id: 'heizung_ha_01',
        frontText: 'Was ist das primäre Ziel des hydraulischen Abgleichs?',
        backText:
          'Jeder Heizkörper erhält genau den ausgelegten Volumenstrom – nicht zu viel, nicht zu wenig. Ergebnis: gleichmäßige Wärme, niedrigere Rücklauftemperaturen, weniger Geräusche, geringerer Verbrauch.',
        tags: ['Abgleich'],
      },
      {
        id: 'heizung_ha_02',
        frontText: 'Womit wird der Volumenstrom an einem Heizkörper begrenzt?',
        backText:
          'Über die Voreinstellung des Thermostatventils. Sie begrenzt den maximalen Durchfluss und sorgt so für die richtige Verteilung im ganzen Netz.',
        tags: ['Abgleich', 'Ventil'],
      },
      {
        id: 'heizung_ha_03',
        frontText: 'Was beschreibt der Differenzdruck im Heizkreis?',
        backText:
          'Die Druckdifferenz (z. B. zwischen Vor- und Rücklauf), die den Volumenstrom durch die Bauteile treibt. Moderne Pumpen regeln ihn konstant oder bedarfsabhängig.',
        tags: ['Hydraulik'],
      },
      {
        id: 'heizung_ha_04',
        frontText: 'Was unterscheidet Verfahren B vom vereinfachten Verfahren A?',
        backText:
          'Verfahren B beruht auf einer raumweisen Heizlastberechnung und ist dadurch genauer. Verfahren A ist eine vereinfachte, raumweise Abschätzung der Heizlast.',
        tags: ['Abgleich', 'Verfahren'],
      },
      {
        id: 'heizung_ha_05',
        frontText: 'Warum senkt ein korrekter Abgleich tendenziell den Pumpenstrom?',
        backText:
          'Weil weniger Förderhöhe nötig ist: Der Volumenstrom wird gezielt verteilt statt überall maximal. Zusammen mit einer angepassten Heizkurve und niedriger Rücklauftemperatur steigt die Effizienz.',
        tags: ['Effizienz'],
      },
    ],
  },
  {
    id: 'pumpen_kennlinien',
    subjectId: 'stroemungsmaschinen',
    title: 'Kreiselpumpen & Kennlinien',
    description: 'Kennlinien, Betriebspunkt und Affinitätsgesetze.',
    version: 1,
    cards: [
      {
        id: 'pumpen_kl_01',
        frontText: 'Was stellt die Pumpenkennlinie dar?',
        backText:
          'Die Förderhöhe H in Abhängigkeit vom Volumenstrom Q. Sie beschreibt, welche Höhe die Pumpe bei welchem Durchfluss aufbauen kann.',
        tags: ['Kennlinie'],
      },
      {
        id: 'pumpen_kl_02',
        frontText: 'Wie entsteht der Betriebspunkt einer Pumpe in einer Anlage?',
        backText:
          'Als Schnittpunkt von Pumpenkennlinie und Anlagenkennlinie (dem Widerstand des Rohrnetzes). Dort arbeitet die Pumpe tatsächlich; Drehzahlregelung verschiebt diesen Punkt energiesparend.',
        tags: ['Betriebspunkt'],
      },
      {
        id: 'pumpen_kl_03',
        frontText: 'Wie ändern sich Q, H und P mit der Drehzahl n (Affinitätsgesetze)?',
        backText:
          'Q ~ n (linear), H ~ n² (quadratisch), P ~ n³ (kubisch). Deshalb spart bereits eine moderate Drehzahlabsenkung überproportional viel Antriebsleistung.',
        tags: ['Affinitätsgesetze'],
      },
      {
        id: 'pumpen_kl_04',
        frontText: 'Was beschreibt der NPSH-Wert?',
        backText:
          'Den zur Vermeidung von Kavitation erforderlichen Zulaufdruck am Pumpeneintritt. Unterschreitet der Druck lokal den Dampfdruck, entstehen Dampfblasen.',
        tags: ['Kavitation'],
      },
      {
        id: 'pumpen_kl_05',
        frontText: 'Was passiert bei Kavitation und warum ist sie schädlich?',
        backText:
          'Es bilden sich Dampfblasen, die schlagartig implodieren. Das verursacht Geräusche, Leistungseinbußen und Materialschäden an Laufrad und Gehäuse.',
        tags: ['Kavitation'],
      },
    ],
  },
]

/** Die Fachsemester des Studiengangs (fest 1–6). */
export const SEMESTERS = [1, 2, 3, 4, 5, 6] as const

/** Alle Module (Fächer) eines Semesters. */
export function modulesForSemester(semester: number): FlashcardSubject[] {
  return FLASHCARD_SUBJECTS.filter((m) => m.semester === semester)
}

/** Alle Sets eines Moduls. */
export function setsForSubject(subjectId: string): FlashcardSet[] {
  return FLASHCARD_SETS.filter((s) => s.subjectId === subjectId)
}

/** Gesamtzahl der Karten eines Moduls (über alle Sets). */
export function cardCountForSubject(subjectId: string): number {
  return setsForSubject(subjectId).reduce((sum, set) => sum + set.cards.length, 0)
}

/** Gesamtzahl der Karten eines Semesters (über alle Module). */
export function cardCountForSemester(semester: number): number {
  return modulesForSemester(semester).reduce((sum, m) => sum + cardCountForSubject(m.id), 0)
}
