// Karteikarten für den HTW-GEIT-Wissensbereich (Phase 1).
//
// Datenmodell nach docs/flashcards-trainer.md (Format „Hybrid": Bild UND/ODER
// Text). Sets, die nur Aufbau und Bedienung zeigen, sind als `placeholder: true`
// gekennzeichnet; echter Prüfungsstoff ist es nicht.
//
// „Elektrische Anlagen im Gebäude" ist aus einer zusammengefassten Altklausur
// des Fachs aufgebaut: Themengebiete und Aufgabenreihenfolge übernommen,
// Formulierungen und Erklärungen neu gefasst.
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
   * damit der Lernfortschritt an ihnen hängen bleibt.
   */
  version: number
  /**
   * Beispielkarten statt echtem Prüfungsstoff. Wird in der Oberfläche
   * gekennzeichnet, damit niemand darauf eine Klausur vorbereitet.
   */
  placeholder?: boolean
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
  {
    id: 'elektrische_anlagen',
    title: 'Elektrische Anlagen im Gebäude',
    semester: 4,
    description: 'Vorschriften, Verteilung, Schaltanlagen, Licht, Maschinen und Instandhaltung.',
  },
]

export const FLASHCARD_SETS: FlashcardSet[] = [
  {
    id: 'thermo_grundgroessen',
    subjectId: 'thermodynamik',
    title: 'Grundgrößen & Einheiten',
    description: 'Leistung, Energie und Kennwerte im Überblick.',
    version: 1,
    placeholder: true,
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
    placeholder: true,
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
    placeholder: true,
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
  // ---------------------------------------------------------------------------
  // Elektrische Anlagen im Gebäude – aufgebaut aus einer zusammengefassten
  // Altklausur des Fachs (Aufgabenreihenfolge und Themengebiete übernommen,
  // Formulierungen und Erklärungen neu gefasst).
  // ---------------------------------------------------------------------------
  {
    id: 'ea_vorschriften',
    subjectId: 'elektrische_anlagen',
    title: 'Vorschriften & Brandschutz',
    description: 'Normen, Gesetze, MLAR und Feuerwiderstandsklassen.',
    version: 1,
    cards: [
      {
        id: 'ea_vorschriften_01',
        frontText:
          'Welche drei grundlegenden Normen gelten für Planung und Betrieb elektrischer Anlagen (Nummer und Bezeichnung)?',
        backText:
          'DIN VDE 0100 – Errichtung von Anlagen mit Nennspannungen bis 1 kV.\nDIN VDE 0101 – Errichtung von Anlagen über 1 kV.\nDIN VDE 0105 – Betrieb elektrotechnischer Anlagen.',
        tags: ['Normen'],
      },
      {
        id: 'ea_vorschriften_02',
        frontText: 'Worin unterscheiden sich Gesetz und Verordnung, und was steht in der Rangfolge vorn?',
        backText:
          'Ein Gesetz wird im förmlichen Gesetzgebungsverfahren vom Parlament beschlossen. Eine Verordnung erlässt die Verwaltung, nachdem das Parlament sie dazu ermächtigt hat.\nGesetze stehen in der Rangfolge vorn – bindend sind beide.',
        tags: ['Recht'],
      },
      {
        id: 'ea_vorschriften_03',
        frontText:
          'DIN-VDE-Normen sind kein Gesetz. Warum musst du sie im technischen Gebäudemanagement trotzdem einhalten?',
        backText:
          'Weil Gesetze und Verordnungen verlangen, dass Anlagen den anerkannten Regeln der Technik entsprechen. Werden die DIN-VDE-Normen eingehalten, wird das vermutet – hältst du sie nicht ein, musst du die Gleichwertigkeit selbst nachweisen.',
        tags: ['Recht', 'Normen'],
      },
      {
        id: 'ea_vorschriften_04',
        frontText:
          'Du bist für Instandhaltung und Wartung einer bestehenden Anlage zuständig. Welchen Regeln muss die Anlage entsprechen?',
        backText:
          'Den anerkannten Regeln der Technik, die zum Zeitpunkt der Errichtung gültig waren – nicht dem heutigen Stand der Technik. Eine Bestandsanlage muss also nicht bei jeder Normänderung nachgerüstet werden.',
        tags: ['Recht', 'Instandhaltung'],
      },
      {
        id: 'ea_vorschriften_05',
        frontText: 'Nenne je zwei Gesetze und Verordnungen, die für elektrische Anlagen in Gebäuden gelten.',
        backText:
          'Gesetze: Arbeitsschutzgesetz, EnWG (Energiewirtschaftsgesetz – Elektrizitäts- und Gasversorgung).\nVerordnungen: Arbeitsstättenverordnung, Garagenverordnung, Versammlungsstättenverordnung, Hochhausverordnung.',
        tags: ['Recht'],
      },
      {
        id: 'ea_vorschriften_06',
        frontText:
          'Welche Muster-Richtlinie regelt die brandschutztechnischen Anforderungen an Leitungsanlagen (Bezeichnung und Fassung)?',
        backText: 'Die Muster-Leitungsanlagen-Richtlinie (MLAR), Fassung 2005.',
        tags: ['Brandschutz', 'MLAR'],
      },
      {
        id: 'ea_vorschriften_07',
        frontText: 'Welche Medien behandelt die MLAR nicht – und was gilt dort stattdessen?',
        backText:
          'Lüftungsanlagen. Für sie gilt die Muster-Lüftungsanlagen-Richtlinie (M-LüAR) mit ihren eigenen brandschutztechnischen Anforderungen.',
        tags: ['Brandschutz', 'MLAR'],
      },
      {
        id: 'ea_vorschriften_08',
        frontText: 'Wann dürfen Leitungen in notwendigen Treppenräumen angeordnet werden?',
        backText:
          'Nur wenn sie ausschließlich der Versorgung dieser Räume oder der Brandbekämpfung dienen und die Nutzung als Rettungsweg im Brandfall ausreichend lang möglich bleibt. Durchführungen müssen dieselbe Feuerwiderstandsklasse haben wie das durchdrungene Bauteil.',
        tags: ['Brandschutz', 'Rettungsweg'],
      },
      {
        id: 'ea_vorschriften_09',
        frontText: 'Wofür stehen die Kennbuchstaben F, T, L und E bei Feuerwiderstandsklassen – mit typischer Dauer?',
        backText:
          'F = Bauwerk (F 90), T = Tür (T 30), L = Lüftung (L 90), E = Elektro (E 90).\nWeiter: G = Glas (G 30), S = Sanitär (S 30), H = Heizung (H 30).\nDie Zahl ist die Feuerwiderstandsdauer in Minuten.',
        tags: ['Brandschutz', 'Kennbuchstaben'],
      },
      {
        id: 'ea_vorschriften_10',
        frontText: 'Wo sind bei Leitungsführungen Schottungen erforderlich, und welche Klasse?',
        backText:
          'An Wanddurchbrüchen von Brandabschnitt zu Brandabschnitt: Brandschott E 90.\nAn Durchbrüchen von Allgemein- und Sicherheitsversorgung in den Brandabschnitt: F 30.\nTüren in diesen Wänden: T 30.',
        tags: ['Brandschutz', 'Schottung'],
      },
    ],
  },
  {
    id: 'ea_verteilung',
    subjectId: 'elektrische_anlagen',
    title: 'Elektroenergieverteilung',
    description: 'Spannungsebenen, Leistungsbedarf, Topologien und Erdungssysteme.',
    version: 1,
    cards: [
      {
        id: 'ea_verteilung_01',
        frontText: 'Welche Spannungsebenen der Einspeisung gibt es – mit Spannungshöhe?',
        backText:
          'Höchstspannung 220–1150 kV\nHochspannung 60–110 kV\nMittelspannung 3–30 kV\nNiederspannung 127–400 V',
        tags: ['Spannungsebenen'],
      },
      {
        id: 'ea_verteilung_02',
        frontText: 'Definiere installierte Leistung, Nennleistung und Gleichzeitigkeitsfaktor.',
        backText:
          'Installierte Leistung: Summe der Leistungswerte aller angeschlossenen Anlagen.\nNennleistung: Summe der Leistungswerte der Verbraucher, die gleichzeitig in Betrieb sind.\nGleichzeitigkeitsfaktor g = Nennleistung / installierte Leistung.',
        tags: ['Leistungsbedarf', 'Definitionen'],
      },
      {
        id: 'ea_verteilung_03',
        frontText:
          'Beleuchtung hat g = 0,8, Steckdosen g = 0,7. Mit welchem g rechnest du für die Bürofläche insgesamt?',
        backText:
          'Mit dem Mittelwert der beteiligten Anteile: g = 0,75. Bei 0,9 und 0,8 entsprechend 0,85. Der Gesamtfaktor der Fläche liegt immer zwischen den Einzelfaktoren – nicht einfach den kleineren nehmen.',
        tags: ['Leistungsbedarf', 'Gleichzeitigkeitsfaktor'],
      },
      {
        id: 'ea_verteilung_04',
        frontText:
          'Wie berechnest du die installierte Leistung einer Bürofläche von 6.000 m² bei 20 VA/m² Beleuchtung und 30 VA/m² Steckdosen?',
        backText:
          'Flächenbezogene Leistungen addieren und mit der Fläche multiplizieren:\n(20 + 30) VA/m² × 6.000 m² = 300.000 VA = 300 kVA.\nDie Nennleistung folgt daraus mit dem Gleichzeitigkeitsfaktor: 300 kVA × 0,75 = 225 kVA.',
        tags: ['Leistungsbedarf', 'Rechnen'],
      },
      {
        id: 'ea_verteilung_05',
        frontText: 'Wie kommst du von der Scheinleistung auf den Strombedarf im Drehstromnetz?',
        backText:
          'I = S / (√3 · U_L), im 400-V-Netz also I = S / 693 V.\nBeispiel: 495 kVA → 495.000 VA / (1,732 · 400 V) ≈ 714 A.',
        tags: ['Leistungsbedarf', 'Rechnen'],
      },
      {
        id: 'ea_verteilung_06',
        frontText:
          'Die benötigte Gesamtleistung beträgt 355 kVA. Welchen Transformator wählst du bei 20 % Leistungsreserve – 250, 400 oder 630 kVA?',
        backText:
          '630 kVA.\nRechnung: 355 kVA × 1,2 = 426 kVA erforderlich. 400 kVA wäre zu klein, die nächste Normgröße ist 630 kVA.\nVorgehen allgemein: Nennleistung × 1,2, dann die nächstgrößere Normgröße wählen.',
        tags: ['Transformator', 'Rechnen'],
      },
      {
        id: 'ea_verteilung_07',
        frontText: 'Welche Arten elektrischer Hausanschlüsse gibt es?',
        backText:
          'Freileitungshausanschluss, Anschlusssäule im Freien und Hausanschluss im Gebäude.',
        tags: ['Hausanschluss'],
      },
      {
        id: 'ea_verteilung_08',
        frontText: 'Nenne drei Topologien der Verkabelung im Gebäude.',
        backText: 'Vollstern, Etagenstern und Stammverkabelung.',
        tags: ['Topologie'],
      },
      {
        id: 'ea_verteilung_09',
        frontText:
          'Wohnhaus-Sanierung, alle Zähler kommen in den Keller. Welche Verkabelungstopologie wählst du und warum?',
        backText:
          'Vollstern.\nJeder Abzweig zu einer Unterverteilung ist separat abgesichert: hohe Flexibilität, einzelne Unterverteilungen abschaltbar, geringe Beeinflussung untereinander, gut für Wartung und Betriebskostenerfassung. Bei Zählerzentralisation am Einspeisepunkt ist er vorgeschrieben.\nNachteil: relativ hoher Verkabelungsaufwand.',
        tags: ['Topologie', 'Anwendung'],
      },
      {
        id: 'ea_verteilung_10',
        frontText: 'Für welches Erdungssystem entscheidest du sich bei einem Bürogebäude – und warum?',
        backText:
          'TN-S.\nGründe: Betriebssicherheit und Netzqualität. Ab der Trennung von Schutz- und Neutralleiter darf bei Neuinstallationen keine Zusammenführung mehr erfolgen.',
        tags: ['Erdungssystem'],
      },
      {
        id: 'ea_verteilung_11',
        frontText: 'Was unterscheidet TN-C-S von TN-S?',
        backText:
          'Im TN-C-S laufen Schutz- und Neutralleiter zunächst gemeinsam als PEN und werden erst an einem Punkt in PE und N aufgeteilt. Im TN-S sind sie von der Einspeisung an getrennt geführt.\nNach der Trennung darf PEN nie wieder zusammengeführt werden.',
        tags: ['Erdungssystem'],
      },
    ],
  },
  {
    id: 'ea_schaltanlagen',
    subjectId: 'elektrische_anlagen',
    title: 'Schaltanlagen, Sicherungen & Kabel',
    description: 'Platzbedarf, IP-Code, Überstromschutz und Strombelastbarkeit.',
    version: 1,
    cards: [
      {
        id: 'ea_schaltanlagen_01',
        frontText: 'Wie viele Platzeinheiten (PLE) belegen die üblichen Geräte in der Verteilung?',
        backText:
          'Leitungsschutzschalter 1-polig: 1 PLE, 3-polig: 3 PLE.\nFI-Schutzschalter 2-polig: 2,5 PLE, 4-polig: 4,5 PLE.\nSchaltrelais 1-polig: 1 PLE.',
        tags: ['Verteilung', 'PLE'],
      },
      {
        id: 'ea_schaltanlagen_02',
        frontText:
          'Die Geräte einer Verteilung ergeben 42,5 PLE. Wie viele Platzeinheiten und Reihen (RE) planst du?',
        backText:
          'Etwa 20 % Platzreserve aufschlagen: 42,5 + 8,5 = 51 PLE.\nBei 12 PLE je Reihe: 51 / 12 = 4,25 → aufgerundet 5 Reihen.\nDie Reserve ist Pflicht, nicht Kür – Nachrüstungen sind der Normalfall.',
        tags: ['Verteilung', 'Rechnen'],
      },
      {
        id: 'ea_schaltanlagen_03',
        frontText: 'Welche Einbausituationen von Verteilungen gibt es?',
        backText: 'Unterputz, Aufputz und Hohlwandmontage.',
        tags: ['Verteilung'],
      },
      {
        id: 'ea_schaltanlagen_04',
        frontText: 'Was sagen die beiden Ziffern des IP-Codes aus?',
        backText:
          'Erste Ziffer: Schutz gegen Eindringen von Fremdkörpern und gegen Berührung.\nZweite Ziffer: Schutz gegen Wasser bzw. Feuchtigkeit.',
        tags: ['IP-Code'],
      },
      {
        id: 'ea_schaltanlagen_05',
        frontText: 'Welche Überstrom-Schutzeinrichtungen kennst du?',
        backText: 'Schmelzsicherung, Leitungsschutzschalter und Leistungsschalter.',
        tags: ['Überstromschutz'],
      },
      {
        id: 'ea_schaltanlagen_06',
        frontText: 'Was bedeutet das Toleranzband einer Sicherung?',
        backText:
          'Innerhalb des Toleranzbandes muss die Sicherung auslösen. Begrenzt wird es vom unteren Band (kleiner Prüfstrom – darf noch nicht auslösen) und vom oberen Band (großer Prüfstrom – muss auslösen).',
        tags: ['Überstromschutz'],
      },
      {
        id: 'ea_schaltanlagen_07',
        frontText: 'Welcher signifikante Unterschied besteht zwischen Leitungsschutzschalter und Schmelzsicherung?',
        backText:
          'Leitungsschutzschalter: wiederverwendbar, aber nicht vollselektiv.\nSchmelzsicherung: nicht wiederverwendbar, dafür vollselektiv.',
        tags: ['Überstromschutz', 'Selektivität'],
      },
      {
        id: 'ea_schaltanlagen_08',
        frontText: 'Wie hängen Betriebsstrom I_B, Strombelastbarkeit I_Z und Nennstrom I_N der Sicherung zusammen?',
        backText:
          'I_B ≤ I_N ≤ I_Z – der Nennstrom liegt zwischen Betriebsstrom und Belastbarkeit der Leitung.\nZusätzlich muss der Auslösestrom I_AL ≤ 1,45 · I_Z bleiben, damit die Leitung im Auslösefall nicht überhitzt.',
        tags: ['Überstromschutz', 'Auslegung'],
      },
      {
        id: 'ea_schaltanlagen_09',
        frontText: 'Wogegen sind Kabel und Leitungen primär zu schützen?',
        backText: 'Gegen zu hohe Erwärmung und die daraus folgende Brandgefahr.',
        tags: ['Kabel'],
      },
      {
        id: 'ea_schaltanlagen_10',
        frontText:
          'Ein Kabelbündel liegt in einer wärmegedämmten Wand. Nenne drei Maßnahmen, um die zulässige Strombelastbarkeit zu erhöhen.',
        backText:
          'Nennquerschnitt erhöhen oder Leitermaterial wechseln.\nKabel- bzw. Leitungsbauart anpassen.\nVerlegeart ändern und Umgebungsbedingungen verbessern (Häufung auflösen, Wärmeabfuhr verbessern).',
        tags: ['Kabel', 'Strombelastbarkeit'],
      },
    ],
  },
  {
    id: 'ea_lampen',
    subjectId: 'elektrische_anlagen',
    title: 'Lampen & Leuchten',
    description: 'Systematik der Lichtquellen, Leuchtstofflampen und Vorschaltgeräte.',
    version: 1,
    cards: [
      {
        id: 'ea_lampen_01',
        frontText: 'Wie gliedert sich die Systematik der Lichtquellen?',
        backText:
          'Festkörperlampen: Lumineszenzstrahler (z. B. LED) und Temperaturstrahler (Glühlampe, Halogenglühlampe).\nEntladungslampen: Glimmentladung und Bogenentladung – letztere als Hochdruck- und Niederdruckentladungslampe.',
        tags: ['Lichtquellen', 'Systematik'],
      },
      {
        id: 'ea_lampen_02',
        frontText: 'Wie zündet eine Niederdruckentladungslampe mit Starter und Drossel?',
        backText:
          'Bimetall im Starter schließt: Strom fließt über die Elektroden, sie glühen vor, das Gas wird ionisiert.\nBimetall öffnet: die Drossel induziert eine hohe Spannung, es kommt zur Stoßionisation, der Strom fließt über das Gas.\nDie Drossel wirkt danach strombegrenzend. Die Lampe zündet bei jedem Nulldurchgang neu.',
        tags: ['Leuchtstofflampe', 'Funktion'],
      },
      {
        id: 'ea_lampen_03',
        frontText: 'Welche Aufgabe hat die Drossel bei einer Leuchtstofflampe?',
        backText:
          'Sie liefert beim Öffnen des Starters die Zündspannung und begrenzt anschließend den Strom. Ohne Strombegrenzung würde die Gasentladung bis zum Kurzschlussstrom ansteigen.',
        tags: ['Leuchtstofflampe'],
      },
      {
        id: 'ea_lampen_04',
        frontText: 'Wovon hängt die Lichtausbeute einer Leuchtstofflampe stark ab?',
        backText:
          'Von der Temperatur. Bei 0 °C liefert die Lampe nur noch etwa ein Drittel ihres Nennlichtstroms.\nVon der Netzspannung hängt sie dagegen weniger ab als eine Glühlampe.',
        tags: ['Leuchtstofflampe', 'Lichtausbeute'],
      },
      {
        id: 'ea_lampen_05',
        frontText: 'Welche Vorschaltgeräte und Starter gibt es bei Leuchtstofflampen – mit Merkmalen?',
        backText:
          'KVG (konventionell): einfacher Aufbau, sehr preiswert, cos φ ≈ 0,5 induktiv, hohe Verluste in der Drossel.\nVVG (verlustarm): verlustarmes Eisen, mehr Kupfer, Verluste bei etwa 15 % der Lampenleistung.\nTandem-Schaltung: Serienschaltung kleiner Lampen bis 22 W – ein Vorschaltgerät, zwei Starter.',
        tags: ['Vorschaltgerät'],
      },
      {
        id: 'ea_lampen_06',
        frontText: 'Nenne Vor- und Nachteile der Hochdruckentladungslampe.',
        backText:
          'Vorteile: wirtschaftlich, große Lichtausbeute, lange Lebensdauer.\nNachteile: schlechte Farbeigenschaften, spezielles Hochspannungszündgerät nötig, neue Leuchtmittel brauchen Einbrennzeit.',
        tags: ['Hochdruckentladungslampe'],
      },
      {
        id: 'ea_lampen_07',
        frontText: 'Nenne drei Typen von Hochdruckentladungslampen.',
        backText:
          'Quecksilber-Hochdrucklampe, Halogen-Metalldampflampe und Natriumdampf-Hochdrucklampe.\nSpezialfall: Induktionslampe (Quecksilber-Niederdrucklampe).',
        tags: ['Hochdruckentladungslampe'],
      },
    ],
  },
  {
    id: 'ea_motoren',
    subjectId: 'elektrische_anlagen',
    title: 'Motoren',
    description: 'Maschinenarten, Anlaufverhalten, Schlupf und Stern-Dreieck.',
    version: 1,
    cards: [
      {
        id: 'ea_motoren_01',
        frontText: 'Nenne drei Arten rotierender elektrischer Maschinen.',
        backText:
          'Motoren (Gleichstrom-, Synchron-, Asynchronmaschine), Generatoren und Umformer.',
        tags: ['Maschinenarten'],
      },
      {
        id: 'ea_motoren_02',
        frontText: 'Wie verhält sich der Strom beim Anlauf eines Motors?',
        backText:
          'Im ersten Moment fließt ein sehr hoher Anlaufstrom; mit zunehmender Drehzahl sinkt er. Deshalb sind Anlaufhilfen wie Stern-Dreieck-Anlauf oder Sanftanlauf üblich.',
        tags: ['Anlauf'],
      },
      {
        id: 'ea_motoren_03',
        frontText: 'Wie ändert man die Drehrichtung einer Gleichstrommaschine?',
        backText:
          'Entweder das Erregerfeld umpolen oder die Stromrichtung im Läufer umkehren – aber nur eines von beiden. Kehrt man beides um, bleibt die Drehrichtung gleich.',
        tags: ['Gleichstrommaschine'],
      },
      {
        id: 'ea_motoren_04',
        frontText: 'Wovon hängt die Drehzahl einer Synchronmaschine ab, und wie läuft sie an?',
        backText:
          'Von der Frequenz der Wechselspannung und der Polpaarzahl: n = f / p.\nAnlauf: kein Selbstanlauf, für den Anlauf muss Erregerleistung zugeführt werden, der Anlaufstrom ist hoch.',
        tags: ['Synchronmaschine'],
      },
      {
        id: 'ea_motoren_05',
        frontText: 'Wie ist der Schlupf s definiert?',
        backText:
          's = (n_D − n_L) / n_D, mit Drehfelddrehzahl n_D und Läuferdrehzahl n_L.\nDie Läuferdrehzahl bleibt beim Asynchronmotor also stets hinter dem Drehfeld zurück.',
        tags: ['Asynchronmaschine', 'Schlupf'],
      },
      {
        id: 'ea_motoren_06',
        frontText: 'Welcher Schlupf gehört zu Motor-, Generator- und Bremsbetrieb?',
        backText: 'Motor: 0 < s < 1\nGenerator: s < 0\nBremse: s > 1',
        tags: ['Asynchronmaschine', 'Schlupf'],
      },
      {
        id: 'ea_motoren_07',
        frontText: 'Wie hängen Strang- und Leitergrößen in der Sternschaltung zusammen?',
        backText:
          'Ströme: I_S = I_L (Strangstrom gleich Leiterstrom).\nSpannungen: U_S = U_L / √3.\nIm Neutralleiter gilt I_0 = I_1 + I_2 + I_3 – bei symmetrischer Last also null.',
        tags: ['Sternschaltung', 'Formeln'],
      },
      {
        id: 'ea_motoren_08',
        frontText: 'Wie hängen Strang- und Leitergrößen in der Dreieckschaltung zusammen?',
        backText:
          'Spannungen: U_S = U_L (Strangspannung gleich Leiterspannung).\nStröme: I_S = I_L / √3, also I_L = √3 · I_S.',
        tags: ['Dreieckschaltung', 'Formeln'],
      },
    ],
  },
  {
    id: 'ea_transformator',
    subjectId: 'elektrische_anlagen',
    title: 'Transformator',
    description: 'Übersetzung, Kurzschlussspannung, Schaltgruppen und Parallelbetrieb.',
    version: 1,
    cards: [
      {
        id: 'ea_transformator_01',
        frontText: 'Wozu dienen Transformatoren, und warum werden sie gebraucht?',
        backText:
          'Sie wandeln Spannung, Strom und Widerstand. Gebraucht werden sie, um Wechselspannung hoch- oder herunterzutransformieren – nur so lässt sich Energie verlustarm übertragen und beim Verbraucher sicher nutzen.',
        tags: ['Grundlagen'],
      },
      {
        id: 'ea_transformator_02',
        frontText: 'Wie ist das Übersetzungsverhältnis definiert?',
        backText:
          'N₁ / N₂ = U₁ / U₂ = I₂ / I₁.\nWindungszahl und Spannung verhalten sich gleichsinnig, der Strom umgekehrt.',
        tags: ['Übersetzung', 'Formeln'],
      },
      {
        id: 'ea_transformator_03',
        frontText: 'Wie ist die relative Kurzschlussspannung definiert, und was sagt sie aus?',
        backText:
          'u_k in % = absolute Kurzschlussspannung (V) bezogen auf die primäre Nennspannung.\nSie bestimmt die Größe der sekundären Klemmspannung, die Höhe von Stoß- und Dauerkurzschlussstrom und die Lastaufteilung bei Parallelschaltung von Transformatoren.',
        tags: ['Kurzschlussspannung'],
      },
      {
        id: 'ea_transformator_04',
        frontText: 'Auf dem Typenschild steht „Dy 5". Was bedeutet das?',
        backText:
          'Oberspannungsseitig Dreieckschaltung (D), unterspannungsseitig Sternschaltung (y), Kennzahl 5 → 5 × 30° = 150° Phasenverschiebung.\nBuchstaben: D/d Dreieck, Y/y Stern, Z/z Zickzack. Großbuchstabe = Oberspannungsseite, Kleinbuchstabe = Unterspannungsseite.',
        tags: ['Schaltgruppe'],
      },
      {
        id: 'ea_transformator_05',
        frontText: 'Welche Bedingungen gelten für den Parallelbetrieb von Transformatoren?',
        backText:
          'Gleiche Übersetzung und gleiche Nennspannung.\nKurzschlussspannung annähernd gleich (± 10 %).\nLeistungsverhältnis zwischen größtem und kleinstem Transformator nicht größer als 1 : 3.\nUnterspannungsseitig gleiche Phasenlage.',
        tags: ['Parallelbetrieb'],
      },
      {
        id: 'ea_transformator_06',
        frontText: 'Was passiert, wenn die Bedingungen für den Parallelbetrieb nicht eingehalten werden?',
        backText:
          'Im Leerlauf können Ausgleichsströme fließen. Unter Last teilt sich der Strom nicht im Verhältnis der Leistungen auf, sodass der leistungsschwächere Transformator überlastet werden kann.',
        tags: ['Parallelbetrieb'],
      },
    ],
  },
  {
    id: 'ea_instandhaltung',
    subjectId: 'elektrische_anlagen',
    title: 'Fehler & Instandhaltung',
    description: 'Kurzschlussarten, Fehlerursachen und die fünf Sicherheitsregeln.',
    version: 1,
    cards: [
      {
        id: 'ea_instandhaltung_01',
        frontText: 'Welche Fehlerursachen in elektrischen Anlagen gibt es?',
        backText:
          'Fehler durch Bedienung, durch falsche Auslegung, durch Überbeanspruchung und durch äußere Einwirkungen.',
        tags: ['Fehler'],
      },
      {
        id: 'ea_instandhaltung_02',
        frontText: 'Nenne die Arten von Kurzschlüssen.',
        backText:
          'Dreipoliger Kurzschluss.\nZweipoliger Kurzschluss – ohne oder mit Erdberührung.\nEinpoliger Erdkurzschluss.\nDoppelerdkurzschluss: zwei Erdschlüsse unterschiedlicher Außenleiter in einem Abstand größer null.',
        tags: ['Kurzschluss'],
      },
      {
        id: 'ea_instandhaltung_03',
        frontText: 'Nenne vier Auswirkungen von Kurzschlussströmen.',
        backText:
          'Stromkräfte, thermische Beanspruchung, Spannungsverlagerungen und Verlust der transienten Stabilität.',
        tags: ['Kurzschluss'],
      },
      {
        id: 'ea_instandhaltung_04',
        frontText: 'Welcher Zustand ist Ziel der Instandhaltung, und wie legt man Maßnahmen fest?',
        backText:
          'Ziel ist der festgelegte Sollzustand. Grundlage ist die laufende Kontrolle des Istzustandes; Maßnahmen ergeben sich aus dem Vergleich von Soll- und Istzustand.',
        tags: ['Instandhaltung'],
      },
      {
        id: 'ea_instandhaltung_05',
        frontText: 'Welche Norm beschreibt die Grundlagen der Instandhaltung?',
        backText:
          'DIN 31051 – Grundlagen der Instandhaltung. Sie gliedert die Instandhaltung in Wartung, Inspektion, Instandsetzung und Verbesserung.',
        tags: ['Instandhaltung', 'Normen'],
      },
      {
        id: 'ea_instandhaltung_06',
        frontText: 'Welche Unfallverhütungsvorschrift gilt für elektrische Anlagen und Betriebsmittel?',
        backText:
          'BGV A3 – Elektrische Anlagen und Betriebsmittel (früher VBG 4), heute als DGUV Vorschrift 3 geführt.',
        tags: ['Arbeitsschutz', 'Normen'],
      },
      {
        id: 'ea_instandhaltung_07',
        frontText: 'Nenne die fünf Sicherheitsregeln zum Freischalten einer Anlage – in der richtigen Reihenfolge.',
        backText:
          '1. Freischalten (spannungsfrei schalten)\n2. Gegen Wiedereinschalten sichern\n3. Spannungsfreiheit feststellen (messen)\n4. Erden und kurzschließen\n5. Benachbarte, unter Spannung stehende Teile abdecken oder abschranken',
        tags: ['Arbeitsschutz', 'Sicherheitsregeln'],
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
