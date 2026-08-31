// Erstentwurf – vom Nutzer zu prüfen.
// Fachliche Inhalte (FAQ, Glossar, Messungs-Hintergründe, Laborversuche) liegen
// bewusst hier als deutscher Content (NICHT in i18n). Nur die UI-Beschriftungen
// (Buttons, Überschriften, Labels) werden über i18next übersetzt.

import type { Topic } from './lookup/topics'

/**
 * Quellenangabe eines Eintrags.
 *
 * `stand` nennt den Stand der Angabe (`MM/YYYY`). Nötig überall dort, wo eine
 * Zahl altert – Preise, Förderquoten, Abgaben. Ohne Stand liest sich ein
 * Betrag wie eine zeitlose Wahrheit, und genau das ist er nicht.
 */
export interface Source {
  label: string
  url: string
  /** Stand der Angabe im Format `MM/YYYY`. */
  stand?: string
}

/**
 * Felder, die alle drei Nachschlage-Gattungen teilen.
 *
 * Alle **optional**: Ein Bestandseintrag ohne sie rendert wie zuvor. Die
 * Vorschauzeile leitet die Oberfläche sonst aus dem Fließtext ab (siehe
 * `lookup/search.ts`), die Themen-Chips erscheinen erst, sobald `topic`
 * gepflegt ist. So lässt sich die Oberfläche ausliefern, bevor eine Zeile
 * Inhalt geschrieben ist.
 */
export interface LookupFields {
  /** Handverlesene Vorschauzeile. Ohne sie greift die abgeleitete. */
  teaser?: string
  /** Thema für die Filter-Chips. */
  topic?: Topic
  /** Verweise auf verwandte Einträge (Begriff, Frage oder Messung). */
  related?: string[]
}

export interface FaqItem extends LookupFields {
  /**
   * Stabile Kennung – trägt den Anker `#faq-<id>` und damit jeden Verweis auf
   * diese Frage. Wird eine Frage umformuliert, bleibt die Kennung; wird sie
   * geändert, brechen alle Verweise. Also: niemals nachträglich ändern.
   */
  id: string
  q: string
  a: string
  /** Optionale, anklickbare Quelle. */
  source?: Source
  /** Hervorgehoben als „Beliebte Frage" oben in der FAQ-Liste. */
  popular?: boolean
}

export interface GlossaryItem extends LookupFields {
  term: string
  def: string
  /** Einheit oder Formelzeichen, z. B. „W/(m²·K)". Nur wo es eine gibt. */
  unit?: string
  /** Quelle der Information (im Glossar anklickbar). */
  source: Source
}

/**
 * Die drei Fließtext-Abschnitte eines Mess-Hintergrunds.
 *
 * Der vierte Abschnitt – die Richtwerte – steht bewusst **nicht** hier: Er wird
 * aus `measurementThresholds.ts` gebaut, das die Grenzen aus den Mess-Modulen
 * liest. Stünden sie hier als Text, gäbe es sie zweimal.
 */
export interface MeasurementSections {
  /** „Was du beeinflussen kannst" – kurze Handlungspunkte. */
  influence: string[]
  /** „Häufige Fehler" – was die Messung oder die Sache verdirbt. */
  mistakes: string[]
}

export interface MeasurementInfo extends LookupFields {
  /** i18n-Key-Suffix der Messung (measurements.<id>.title). */
  id: string
  /** Anzeige-Titel (kann auch über i18n aufgelöst werden – hier deutscher Fallback). */
  title: string
  /** „Warum das zählt" – trägt zugleich die Vorschauzeile. */
  body: string
  /** Die übrigen Abschnitte. Ohne sie rendert nur `body`. */
  sections?: MeasurementSections
  /** Optionale, anklickbare Quelle. */
  source?: Source
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  /** 0-basierter Index der korrekten Option. */
  correct: number
  /** Kurze Erklärung der richtigen Antwort (Lern-Feedback nach der Auswertung). */
  explanation?: string
}

export interface LabExperiment {
  id: 'hydraulischer_abgleich' | 'pumpenpruefstand' | 'heizkoerperpruefstand'
  title: string
  course: string
  intro: string
  prep: string[]
  photoCount: number
  /** Echte Versuchsfotos (URLs); leer/fehlend → keine Galerie. */
  photos?: string[]
  /** Geschätzte Dauer des Vorbereitungstests in Minuten. */
  durationMin: number
  /** Schwierigkeitsgrad zur Orientierung. */
  difficulty: 'easy' | 'medium' | 'hard'
  passRatio: number
  quiz: QuizQuestion[]
}

const COURSE = 'HTW Berlin · GEIT · Labor Mechanische Gebäudetechnik'

// --- FAQ (Erstentwurf) ---
export const FAQ: FaqItem[] = [
  // --- Die App selbst ---
  {
    id: 'app-nutzen',
    topic: 'app',
    q: 'Was bringt mir die E-App konkret?',
    a: 'Die App hilft dir, mit einfachen, geführten Messungen Energiefresser im Haushalt aufzuspüren, Einsparpotenziale in Euro abzuschätzen und deinen Verbrauch über die Zeit zu verfolgen. So werden abstrakte Kilowattstunden zu konkreten, nachvollziehbaren Beträgen – und du erkennst, welche Maßnahmen sich für dich am meisten lohnen.',
    popular: true,
  },
  {
    id: 'app-messgeraete',
    topic: 'app',
    q: 'Brauche ich spezielle Messgeräte?',
    a: 'Für die meisten Messungen reichen Alltagsgegenstände wie ein Messbecher und eine Uhr. Für Strommessungen ist ein einfaches Steckdosen-Energiemessgerät hilfreich (ab wenigen Euro), für Temperaturen ein Thermometer oder Infrarot-Thermometer. Bei jeder Messung steht dabei, was du genau benötigst.',
  },
  {
    id: 'app-daten',
    topic: 'app',
    q: 'Wo liegen meine Daten?',
    a: 'Ohne Anmeldung bleibt alles auf deinem Gerät: Profil, Messergebnisse und Zählerstände liegen im lokalen Speicher des Browsers und verlassen ihn nicht. Meldest du dich an, wird deine Wohnung zusätzlich verschlüsselt in der Cloud gespeichert – nur so lassen sich mehrere Geräte abgleichen und eine Wohnung mit anderen teilen. Zwei Dinge verlassen das Gerät unabhängig davon: das Foto beim Zähler-Scan, das zur automatischen Erkennung an einen Server geschickt und dort nicht gespeichert wird, und eine anonyme Nutzungsstatistik, der du in den Einstellungen widersprechen kannst.',
  },

  // --- Heizen ---
  {
    id: 'raumtemperatur',
    topic: 'heating',
    q: 'Welche Raumtemperatur ist sinnvoll?',
    a: 'Als Richtwert gelten rund 20 °C in Wohnräumen, etwas weniger in Schlafräumen (16–18 °C) und etwa 22 °C im Bad. Jedes Grad weniger senkt den Heizenergiebedarf um grob 6 %. Räume sollten aber nicht stark auskühlen, da das Wiederaufheizen Energie kostet und kühle Wandflächen Feuchte- und Schimmelprobleme begünstigen.',
    source: wiki('Raumklima'),
    popular: true,
  },
  {
    id: 'thermostat-zahlen',
    topic: 'heating',
    q: 'Was bedeuten die Zahlen am Thermostat?',
    a: 'Die Zahlen sind keine Leistungsstufen, sondern Zieltemperaturen: 1 steht für etwa 12 °C, 2 für 16 °C, 3 für 20 °C, 4 für 24 °C und 5 für rund 28 °C. Das Schneeflocken-Symbol ist der Frostschutz bei ungefähr 6 °C. Daraus folgt das häufigste Missverständnis: Auf 5 zu drehen heizt den Raum nicht schneller auf 20 °C – das Ventil öffnet ohnehin voll und schließt erst, wenn 28 °C erreicht sind. Wer nach dem Lüften voll aufdreht, heizt deshalb regelmäßig über das Ziel hinaus.',
    source: wiki('Thermostatventil'),
  },
  {
    id: 'nachtabsenkung',
    topic: 'heating',
    q: 'Bringt eine Nachtabsenkung etwas?',
    a: 'Bei Gas- und Ölheizungen in weniger gut gedämmten Gebäuden ja: Eine Absenkung um 2–5 K über Nacht spart spürbar, weil das Haus auskühlt und weniger Wärme nach außen verliert. Bei sehr gut gedämmten Häusern ist der Effekt klein, weil kaum etwas auskühlt. Bei Wärmepumpen kann eine Absenkung sogar schaden: Zum Wiederaufheizen braucht die Anlage eine höhere Vorlauftemperatur, und genau die verschlechtert ihren Wirkungsgrad. Dort ist ein gleichmäßiger, niedriger Betrieb meist günstiger.',
    source: wiki('Nachtabsenkung'),
  },
  {
    id: 'heizkurve',
    topic: 'heating',
    q: 'Was ist die Heizkurve – und wann sollte ich sie ändern?',
    a: 'Die Heizkurve legt fest, wie warm das Heizungswasser bei welcher Außentemperatur wird. Steht sie zu hoch, läuft die Anlage dauerhaft heißer als nötig – das kostet bei jedem Erzeuger Geld und bei der Wärmepumpe besonders viel. Ein Hinweis auf eine zu hohe Kurve: Die Thermostatventile sind fast überall zugedreht und es wird trotzdem warm. Dann lässt sich die Kurve in kleinen Schritten senken, bis es an kalten Tagen gerade noch reicht. Ein Schritt, dann einige Tage beobachten.',
    source: wiki('Heizkurve'),
  },
  {
    id: 'raeume-abdrehen',
    topic: 'heating',
    q: 'Kann ich einzelne Räume einfach abdrehen?',
    a: 'Nur mit Maß. Ein ungenutztes Zimmer etwas kühler zu fahren ist sinnvoll, ganz abdrehen dagegen selten: Der Raum holt sich die Wärme dann über Wände und offene Türen aus den Nachbarräumen, und an den kalten Außenwänden schlägt sich Feuchte nieder. Als Untergrenze gelten etwa 16 °C, und die Tür zum kühlen Raum bleibt geschlossen – sonst wandert feuchte Warmluft hinein und kondensiert dort.',
  },
  {
    id: 'heizkoerper-entlueften',
    topic: 'heating',
    q: 'Wann muss ich Heizkörper entlüften?',
    a: 'Wenn ein Heizkörper gluckert oder oben kalt bleibt, während er unten warm wird, steht Luft darin – sie verdrängt das Wasser und blockiert genau die Fläche, die Wärme abgeben soll. Zum Entlüften die Umwälzpumpe abschalten, warten, bis sich das Wasser beruhigt hat, dann das Ventil mit einem Vierkantschlüssel öffnen, bis Wasser statt Luft austritt. Danach den Anlagendruck prüfen und bei Bedarf Wasser nachfüllen – üblicherweise 1,0–2,0 bar, der genaue Wert steht an der Anlage.',
  },
  {
    id: 'hydraulischer-abgleich',
    topic: 'heating',
    q: 'Lohnt sich ein hydraulischer Abgleich?',
    a: 'In den meisten Bestandsanlagen ja: Er sorgt dafür, dass jeder Heizkörper genau die richtige Wassermenge erhält. Ergebnis sind gleichmäßige Wärme, niedrigere Vorlauf- und Rücklauftemperaturen, weniger Strömungsgeräusche und ein messbar geringerer Energieverbrauch. Besonders wichtig ist er für Brennwertkessel und Wärmepumpen, deren Wirkungsgrad direkt an der Vorlauftemperatur hängt. Ein Hinweis auf fehlenden Abgleich: Räume nahe am Kessel werden schnell warm, die entferntesten bleiben kühl.',
    source: wiki('Hydraulischer_Abgleich'),
  },
  {
    id: 'moebel-vor-heizkoerper',
    topic: 'heating',
    q: 'Stört ein Sofa vor dem Heizkörper wirklich?',
    a: 'Ja, und zwar doppelt. Ein Heizkörper gibt seine Wärme zu einem großen Teil als Luftstrom nach oben ab; steht ein Möbel davor oder hängt ein langer Vorhang darüber, staut sich die Wärme dahinter. Sitzt zusätzlich das Thermostatventil in dieser warmen Nische, misst es eine Temperatur, die im Raum gar nicht herrscht, und schließt zu früh – der Raum bleibt kühl, obwohl geheizt wird. Als Faustregel reichen etwa 10 cm Abstand, damit die Luft frei zirkulieren kann.',
  },

  // --- Wärmepumpe ---
  {
    id: 'waermepumpe-altbau',
    topic: 'heat_pump',
    q: 'Funktioniert eine Wärmepumpe auch im Altbau?',
    a: 'Meistens ja – entscheidend ist nicht das Baujahr, sondern die nötige Vorlauftemperatur. Kommt das Haus an kalten Tagen mit etwa 55 °C aus, arbeitet eine Wärmepumpe wirtschaftlich. Das lässt sich vor jeder Investition ausprobieren: an einem richtig kalten Tag die Vorlauftemperatur der alten Heizung auf 55 °C begrenzen und prüfen, ob alle Räume warm werden. Wenn nicht, helfen oft schon größere Heizkörper in einzelnen Zimmern und ein hydraulischer Abgleich – ein kompletter Dämmumbau ist selten die Voraussetzung.',
    source: wiki('Wärmepumpenheizung'),
    popular: true,
  },
  {
    id: 'jaz-gut',
    topic: 'heat_pump',
    q: 'Was ist eine gute Jahresarbeitszahl?',
    a: 'Die Jahresarbeitszahl (JAZ) sagt, wie viele Kilowattstunden Wärme eine Wärmepumpe aus einer Kilowattstunde Strom über das ganze Jahr gewinnt. Bei Luft-Wasser-Wärmepumpen gelten Werte ab etwa 3,5 als ordentlich und ab 4,0 als gut; Erdreich- und Grundwasseranlagen erreichen häufig 4,0–5,0. Jedes Zehntel hängt vor allem an der Vorlauftemperatur – als grobe Orientierung kostet jedes Grad mehr Vorlauf rund 2–3 % Effizienz.',
    source: wiki('Jahresarbeitszahl'),
  },
  {
    id: 'waermepumpe-fussboden',
    topic: 'heat_pump',
    q: 'Brauche ich für eine Wärmepumpe eine Fußbodenheizung?',
    a: 'Nein. Eine Fußbodenheizung ist günstig, weil sie über eine große Fläche mit niedriger Temperatur arbeitet – aber ausreichend große Heizkörper leisten dasselbe. Als Faustregel gilt: Wo heute 70 °C Vorlauf nötig sind, reicht die etwa doppelte Heizfläche für 50–55 °C. Oft sind nur einzelne Räume unterdimensioniert, und der Austausch dieser wenigen Heizkörper ist deutlich billiger als ein neuer Fußboden.',
  },

  // --- Warmwasser ---
  {
    id: 'warmwasser-senken',
    topic: 'hot_water',
    q: 'Wie senke ich meinen Warmwasserverbrauch?',
    a: 'Ein Sparduschkopf reduziert den Durchfluss von oft 12–15 l/min auf 6–9 l/min – bei kaum spürbarem Komfortverlust. Da das Wasser zusätzlich erwärmt werden muss, sparst du doppelt: Wasser und Energie. Kürzere Duschzeiten wirken zusätzlich. Wie viel bei dir durchläuft, misst der Duschkopf-Test in wenigen Minuten mit einem Messbecher.',
    source: wiki('Warmwasser'),
  },
  {
    id: 'warmwasser-temperatur',
    topic: 'hot_water',
    q: 'Welche Warmwassertemperatur ist richtig?',
    a: 'Hier stehen sich zwei Ziele gegenüber: Je heißer der Speicher, desto höher die Verluste – je kühler, desto besser vermehren sich Legionellen. Bei zentralen Anlagen mit größerem Speicher gelten deshalb 60 °C am Speicheraustritt als Regel, die nicht unterschritten werden sollte. In Ein- und Zweifamilienhäusern mit kleinem Speicher und kurzen Leitungen sind rund 50 °C üblich und vertretbar. Wer sein Wasser mit einem Durchlauferhitzer erwärmt, hat das Problem nicht: Dort steht kein Wasser lange warm.',
    source: wiki('Legionellen'),
  },
  {
    id: 'zirkulation',
    topic: 'hot_water',
    q: 'Was kostet eine Zirkulationspumpe?',
    a: 'Eine Zirkulationsleitung hält warmes Wasser dauerhaft in Bewegung, damit es am Hahn sofort warm ankommt. Der Komfort ist real, der Preis auch: Läuft die Pumpe rund um die Uhr, kostet allein ihr Strom je nach Modell 30–90 € im Jahr, und die dauernd warme Leitung verliert zusätzlich Wärme. Eine Zeitschaltuhr oder ein Taster, der die Pumpe nur bei Bedarf startet, behält den Komfort und streicht den Großteil der Kosten. Wie lange es bei dir bis zum warmen Wasser dauert, misst der Warmwasser-Test.',
  },

  // --- Lüften & Feuchte ---
  {
    id: 'lueften',
    topic: 'ventilation',
    q: 'Wie oft und wie richtig lüften?',
    a: 'Mehrmals täglich kurz stoßlüften (Fenster weit auf, 5–10 Minuten, am besten quer) statt Fenster dauerhaft auf Kipp. Stoßlüften tauscht die feuchte Luft schnell aus, ohne die Wände auszukühlen – das spart Heizenergie und beugt Schimmel vor. Ein gekipptes Fenster macht das Gegenteil: Es tauscht die Luft kaum, kühlt aber die Laibung dauerhaft aus, und genau dort schlägt sich dann Feuchte nieder.',
    source: wiki('Lüftung'),
  },
  {
    id: 'luftfeuchtigkeit',
    topic: 'ventilation',
    q: 'Welche Luftfeuchtigkeit ist gesund?',
    a: 'In Wohnräumen sind etwa 40–60 % relative Luftfeuchte ideal. Dauerhaft über 60 % begünstigt Schimmel, unter 30 % reizt Atemwege und Schleimhäute. Ein Hygrometer für wenige Euro hilft, den Wert im Blick zu behalten und gezielt zu lüften, statt nach Gefühl.',
    source: wiki('Luftfeuchtigkeit'),
  },
  {
    id: 'lueften-bei-regen',
    topic: 'ventilation',
    q: 'Soll ich bei Regen lüften?',
    a: 'Ja. Der Reflex, bei Regen die Fenster zu lassen, führt in die Irre: Entscheidend ist nicht die relative Feuchte draußen, sondern wie viel Wasser die Luft tatsächlich trägt. Kühle Regenluft enthält fast immer weniger Wasser als warme Zimmerluft – erwärmt sie sich drinnen, sinkt ihre relative Feuchte, und sie kann Feuchtigkeit aufnehmen. Falsch herum wird es nur im Hochsommer, wenn draußen schwüle 25 °C herrschen und der Keller 14 °C hat: Dann schlägt sich die Feuchte an den kalten Kellerwänden nieder.',
  },
  {
    id: 'schimmel',
    topic: 'ventilation',
    q: 'Was tun bei Schimmel in der Wohnung?',
    a: 'Kleine Flecken bis etwa einen halben Quadratmeter lassen sich selbst entfernen – mit hochprozentigem Alkohol, Handschuhen und offenem Fenster. Größere Flächen, Schimmel im Mauerwerk oder wiederkehrender Befall gehören in fachliche Hände. Wichtiger als das Wegwischen ist in jedem Fall die Ursache: fast immer eine kalte Oberfläche, an der sich Feuchte niederschlägt. Solange die bleibt, kommt der Schimmel wieder. Also Möbel von Außenwänden abrücken, regelmäßig stoßlüften, Feuchte messen – und bei baulichen Mängeln den Vermieter einschalten.',
  },

  // --- Strom ---
  {
    id: 'standby',
    topic: 'electricity',
    q: 'Wie viel Strom verbraucht der Standby-Betrieb wirklich?',
    a: 'Geräte im Bereitschaftsbetrieb ziehen rund um die Uhr Strom. Schon 5 Watt Dauerlast bedeuten über 8.760 Stunden im Jahr rund 44 kWh – je nach Strompreis etwa 13–18 € jährlich, und das pro Gerät. Über alle Geräte eines Haushalts summiert sich das oft auf einen dreistelligen Betrag. Schaltbare Steckdosenleisten oder Smart-Plugs beseitigen diese Last. Der Standby-Check misst, welche Geräte bei dir wie viel ziehen.',
    source: wiki('Bereitschaftsbetrieb'),
    popular: true,
  },
  {
    id: 'ausschalten-schaedlich',
    topic: 'electricity',
    q: 'Ist häufiges Ein- und Ausschalten schädlich?',
    a: 'Bei den meisten modernen Geräten ist vollständiges Ausschalten klar sinnvoll. Der oft genannte hohe Einschaltstrom dauert nur Sekundenbruchteile und fällt über das Jahr kaum ins Gewicht gegenüber dauerhafter Standby-Last. Ausnahmen sind Geräte, die beim Start einen echten Anlaufvorgang durchlaufen – etwa Anlagen mit Kompressor – und Router, deren Neuaufbau der Verbindung mehr Ärger macht als der gesparte Strom wert ist.',
  },
  {
    id: 'led-wechsel',
    topic: 'electricity',
    q: 'Wie viel spart der Wechsel auf LED?',
    a: 'LED-Lampen verbrauchen rund 80–90 % weniger Strom als klassische Glühlampen bei gleicher Helligkeit und halten deutlich länger. Gerade bei lange brennenden Leuchten – Küche, Wohnzimmer, Außenbeleuchtung – amortisiert sich der Tausch oft schon innerhalb eines Jahres. Bei Lampen, die nur Minuten am Tag brennen, lohnt sich der Tausch dagegen kaum; dort wartet man besser, bis das alte Leuchtmittel durch ist.',
    source: wiki('Leuchtdiode'),
  },
  {
    id: 'balkonkraftwerk',
    topic: 'electricity',
    q: 'Lohnt sich ein Balkonkraftwerk?',
    a: 'Für viele Haushalte ja. Eine steckerfertige Anlage mit bis zu 800 Watt Wechselrichterleistung liefert je nach Ausrichtung und Verschattung grob 400–800 kWh im Jahr. Davon zählt aber nur, was du selbst verbrauchst – der Rest fließt unvergütet ins Netz. Deshalb rechnet sich die Anlage vor allem in Haushalten mit tagsüber laufender Grundlast: Kühlschrank, Router, Homeoffice. Die Anmeldung ist inzwischen schlank; eingetragen wird die Anlage im Marktstammdatenregister. Bei Miete oder Eigentümergemeinschaft klärst du die Montage vorher ab.',
    source: wiki('Steckersolargerät'),
  },
  {
    id: 'waermepumpentarif',
    topic: 'electricity',
    q: 'Gibt es günstigere Tarife für Wärmepumpe und E-Auto?',
    a: 'Ja. Für Wärmepumpen und Ladepunkte gibt es eigene Stromtarife, die deutlich unter dem Haushaltsstrompreis liegen können. Voraussetzung ist meist ein separater Zähler und die Bereitschaft, dem Netzbetreiber in Spitzenzeiten kurze Abschaltungen oder eine gedrosselte Leistung zuzugestehen – im Gegenzug sinken die Netzentgelte. Ob sich der Aufwand für den zweiten Zähler lohnt, hängt an der Menge: Bei einer Wärmepumpe mit einigen tausend Kilowattstunden im Jahr meist ja, bei gelegentlichem Laden eher nicht.',
  },
  {
    id: 'grundversorgung',
    topic: 'electricity',
    q: 'Bin ich in der Grundversorgung – und lohnt ein Wechsel?',
    a: 'In der Grundversorgung ist, wer nie aktiv einen Vertrag geschlossen hat: Man zieht ein, dreht den Strom auf, und der örtliche Grundversorger liefert. Bequem, aber fast immer der teuerste Tarif. Auf der Jahresabrechnung steht der Tarifname; heißt er „Grundversorgung" oder „Grundpreis Allgemein", trifft es zu. Der Wechsel ist unkritisch: Die Kündigungsfrist beträgt zwei Wochen, der neue Anbieter übernimmt die Abmeldung, und der Strom fließt währenddessen ohne Unterbrechung weiter.',
  },
  {
    id: 'waeschetrockner',
    topic: 'electricity',
    q: 'Wie viel kostet ein Wäschetrockner im Jahr?',
    a: 'Das hängt vor allem an der Bauart. Ein Wärmepumpentrockner braucht rund 1,5–2 kWh je Ladung, ein älterer Kondens- oder Ablufttrockner eher 3,5–4 kWh. Bei drei Ladungen pro Woche und 35 ct/kWh sind das etwa 95 € gegenüber rund 200 € im Jahr. Die Wäscheleine kostet nichts – braucht aber Platz und in der Wohnung zusätzliches Lüften, sonst wandert die Feuchtigkeit in die Wände.',
  },

  // --- Kosten & Abrechnung ---
  {
    id: 'arbeitspreis-grundpreis',
    topic: 'cost',
    q: 'Was unterscheidet Arbeitspreis und Grundpreis?',
    a: 'Der Arbeitspreis wird pro verbrauchter Kilowattstunde berechnet (ct/kWh) und steigt mit dem Verbrauch. Der Grundpreis ist ein fixer Betrag pro Abrechnungszeitraum, unabhängig vom Verbrauch – er deckt Zähler, Messung und Netzanschluss. Beide zusammen ergeben deine Energiekosten. Für den Tarifvergleich zählt deshalb nie der Arbeitspreis allein: Bei kleinem Verbrauch kann ein Tarif mit niedrigem Grundpreis günstiger sein, obwohl seine Kilowattstunde mehr kostet.',
    source: wiki('Strompreis'),
  },
  {
    id: 'abrechnung-lesen',
    topic: 'cost',
    q: 'Wie lese ich meine Jahresabrechnung?',
    a: 'Drei Zahlen tragen die ganze Rechnung. Erstens der Verbrauch: Zählerstand am Ende minus Zählerstand am Anfang, in kWh (bei Gas steht dort ein Kubikmeter-Wert, den eine Zustandszahl und ein Brennwert in Kilowattstunden umrechnen). Zweitens der Preis, aufgeteilt in Arbeits- und Grundpreis. Drittens die Summe deiner Abschläge im Zeitraum. Verbrauch mal Arbeitspreis plus Grundpreis minus gezahlte Abschläge – das ist die Nachzahlung oder Erstattung. Lohnt sich zu prüfen: Wurde der Anfangsstand geschätzt statt abgelesen, verschiebt das den Verbrauch zwischen zwei Jahren.',
  },
  {
    id: 'abschlag',
    topic: 'cost',
    q: 'Warum steigt mein Abschlag – und kann ich ihn ändern?',
    a: 'Der Abschlag ist keine Rechnung, sondern eine Vorauszahlung auf den erwarteten Jahresverbrauch. Er steigt, wenn der Preis steigt oder wenn du im Vorjahr mehr verbraucht hast als angenommen. Du kannst ihn anpassen lassen – nach oben jederzeit, nach unten mit einer nachvollziehbaren Begründung, etwa einem gesunkenen Verbrauch nach einer Sanierung oder einem Auszug. Zu niedrig ansetzen lohnt selten: Die Differenz kommt am Jahresende auf einen Schlag.',
    popular: true,
  },
  {
    id: 'co2-preis',
    topic: 'cost',
    q: 'Was ist der CO₂-Preis und was kostet er mich?',
    a: 'Seit 2021 kostet fossiles Heizen und Tanken einen Aufschlag je Tonne Kohlendioxid, der planmäßig jedes Jahr steigt. Auf deiner Gas- oder Heizölrechnung taucht er als eigener Posten auf. Zur Größenordnung: Ein Preis von 50 € je Tonne entspricht bei Erdgas ungefähr 1 ct je Kilowattstunde, bei Heizöl etwas mehr. Bei 15.000 kWh Gas im Jahr sind das rund 150 €. Den aktuell gültigen Satz nennt deine Abrechnung – wer ihn in der App hinterlegt, rechnet mit dem echten Wert statt mit einem Richtwert.',
    source: { ...wiki('Brennstoffemissionshandelsgesetz'), stand: '08/2026' },
  },

  // --- Sanieren & Fördern ---
  {
    id: 'daemmung',
    topic: 'renovation',
    q: 'Was bringt Dämmung wirklich?',
    a: 'Sehr unterschiedlich viel – und die günstigste Maßnahme ist fast nie die auffälligste. Die oberste Geschossdecke zu dämmen kostet vergleichsweise wenig, ist oft in Eigenleistung machbar und amortisiert sich häufig in wenigen Jahren; für ungedämmte oberste Geschossdecken schreibt das Gebäudeenergiegesetz ohnehin einen Mindeststandard vor. Eine Fassadendämmung bringt absolut am meisten, kostet aber ein Vielfaches und rechnet sich meist nur zusammen mit einer ohnehin fälligen Fassadenerneuerung. Ungedämmte Heizungsrohre im kalten Keller sind der billigste Posten von allen.',
    source: wiki('Wärmedämmung'),
  },
  {
    id: 'fenster',
    topic: 'renovation',
    q: 'Fenster tauschen oder erst mal nachrüsten?',
    a: 'Es kommt auf das Alter an. Einfachverglasung und Fenster bis etwa Baujahr 1995 sind ein echter Schwachpunkt, dort lohnt der Austausch. Moderne Zweifachverglasung gegen Dreifachverglasung zu tauschen bringt dagegen wenig, solange die Wände deutlich schlechter dämmen. Häufig sitzt das Problem gar nicht in der Scheibe, sondern in der Dichtung: Neue Dichtungen und eine nachgestellte Beschlagmechanik kosten wenig und beseitigen Zugluft. Ein wichtiger Nebeneffekt: Dichte neue Fenster ohne angepasstes Lüften verlagern das Feuchteproblem an die kälteste Wand.',
  },
  {
    id: 'foerderung',
    topic: 'renovation',
    q: 'Wo bekomme ich Förderung?',
    a: 'Für Heizungstausch und Effizienzmaßnahmen im Bestand gibt es Zuschüsse und zinsgünstige Kredite von Bund und teils von Land und Kommune. Zwei Regeln sind wichtiger als jede Prozentzahl: Der Antrag muss meist **vor** Auftragsvergabe gestellt sein, und für viele Programme ist eine Energieberatung oder die Einbindung eines Fachbetriebs Voraussetzung. Die Sätze ändern sich regelmäßig – verlass dich deshalb nie auf eine Zahl aus zweiter Hand, sondern auf die aktuelle Programmseite oder deine Energieberatung.',
    source: { ...wiki('Bundesförderung_für_effiziente_Gebäude'), stand: '08/2026' },
  },
]

// --- Glossar (alphabetisch, Erstentwurf) ---
// Quellen verweisen auf die deutschsprachige Wikipedia (stabile, anklickbare
// Artikel-Links) als allgemein zugängliche Referenz. Bei fachlicher Prüfung
// können sie durch Primärquellen (z. B. VDI, Umweltbundesamt) ersetzt werden.
function wiki(article: string): Source {
  return { label: `Wikipedia: ${article.replace(/_/g, ' ')}`, url: `https://de.wikipedia.org/wiki/${article}` }
}

export const GLOSSARY: GlossaryItem[] = [
  {
    term: 'Abschlag',
    def: 'Monatliche Vorauszahlung auf den erwarteten Jahresverbrauch – keine Rechnung, sondern eine Anzahlung. Am Ende der Abrechnungsperiode wird der tatsächliche Verbrauch gegengerechnet; die Differenz ist die Nachzahlung oder Erstattung. Der Abschlag lässt sich anpassen, nach unten mit nachvollziehbarer Begründung.',
    unit: '€/Monat',
    topic: 'cost',
    related: ['Arbeitspreis', 'Grundpreis'],
    source: wiki('Abschlagszahlung'),
  },
  {
    term: 'Arbeitspreis',
    def: 'Verbrauchsabhängiger Teil des Energiepreises, angegeben in Cent pro Kilowattstunde. Multipliziert mit der verbrauchten Energiemenge ergibt er die variablen Energiekosten; zusammen mit dem Grundpreis bildet er den Gesamtpreis. Für einen Tarifvergleich taugt er allein nicht – bei kleinem Verbrauch entscheidet der Grundpreis.',
    unit: 'ct/kWh',
    topic: 'cost',
    related: ['Grundpreis', 'Netzentgelt'],
    source: wiki('Strompreis'),
  },
  {
    term: 'Balkonkraftwerk',
    def: 'Steckerfertige Photovoltaik-Anlage für Balkon, Terrasse oder Garagendach, die über eine Steckdose in den Hausstromkreis einspeist. Die Wechselrichterleistung ist begrenzt; überschüssiger Strom fließt unvergütet ins Netz. Wirtschaftlich ist sie deshalb vor allem bei hoher Grundlast am Tag.',
    topic: 'electricity',
    related: ['Wechselrichter', 'Eigenverbrauchsquote', 'Grundlast'],
    source: wiki('Steckersolargerät'),
  },
  {
    term: 'Brennwert / Heizwert',
    def: 'Der Heizwert (unterer Heizwert) ist die bei der Verbrennung nutzbar freigesetzte Wärme, ohne die Kondensationswärme des im Abgas enthaltenen Wasserdampfs. Der Brennwert (oberer Heizwert) schließt diese Kondensationswärme ein – Brennwertkessel nutzen sie zusätzlich und erreichen dadurch höhere Wirkungsgrade. Auf der Gasrechnung wandelt der Brennwert die abgelesenen Kubikmeter in Kilowattstunden um.',
    unit: 'kWh/m³',
    topic: 'heating',
    related: ['Wirkungsgrad'],
    source: wiki('Heizwert'),
  },
  {
    term: 'CO₂ (Kohlenstoffdioxid)',
    def: 'Farb- und geruchloses Gas, das bei der Verbrennung fossiler Energieträger entsteht und als Treibhausgas zur Erderwärmung beiträgt. In Innenräumen ist die CO₂-Konzentration zudem ein Indikator für die Luftqualität: Werte über etwa 1.000 ppm zeigen an, dass gelüftet werden sollte.',
    unit: 'ppm',
    topic: 'ventilation',
    related: ['CO₂-Preis'],
    source: wiki('Kohlenstoffdioxid'),
  },
  {
    term: 'CO₂-Preis',
    def: 'Aufschlag auf fossile Brennstoffe, bemessen je Tonne ausgestoßenem Kohlendioxid. Er erscheint als eigener Posten auf der Gas- oder Heizölrechnung und steigt planmäßig über die Jahre. Zur Größenordnung: 50 € je Tonne entsprechen bei Erdgas ungefähr 1 ct je Kilowattstunde.',
    unit: '€/t CO₂',
    topic: 'cost',
    related: ['CO₂ (Kohlenstoffdioxid)', 'Arbeitspreis'],
    source: { ...wiki('Brennstoffemissionshandelsgesetz'), stand: '08/2026' },
  },
  {
    term: 'COP (Leistungszahl)',
    def: 'Der Coefficient of Performance beschreibt das momentane Verhältnis von abgegebener Wärmeleistung zu eingesetzter elektrischer Leistung einer Wärmepumpe. Ein COP von 4 bedeutet: aus 1 kWh Strom werden 4 kWh Wärme. Der über ein Jahr gemittelte Wert ist die Jahresarbeitszahl.',
    topic: 'heat_pump',
    related: ['Jahresarbeitszahl (JAZ)', 'Wärmepumpe'],
    source: wiki('Leistungszahl'),
  },
  {
    term: 'Differenzdruck',
    def: 'Druckunterschied zwischen zwei Punkten eines Systems, etwa zwischen Vor- und Rücklauf einer Heizungsanlage. Er treibt den Volumenstrom an und ist eine zentrale Größe beim hydraulischen Abgleich; moderne Pumpen regeln ihn konstant oder bedarfsabhängig.',
    unit: 'Pa',
    topic: 'heating',
    related: ['Volumenstrom', 'Hydraulischer Abgleich'],
    source: wiki('Differenzdruck'),
  },
  {
    term: 'Effizienzhaus',
    def: 'Förderstandard für Wohngebäude. Die Kennzahl gibt an, wie viel Primärenergie ein Gebäude im Vergleich zu einem gesetzlich definierten Referenzhaus benötigt – Effizienzhaus 70 also 70 %, Effizienzhaus 40 nur 40 %. Je kleiner die Zahl, desto sparsamer das Haus und desto höher die Förderung.',
    topic: 'renovation',
    related: ['Primärenergie', 'Energieausweis'],
    source: wiki('Effizienzhaus'),
  },
  {
    term: 'Eigenverbrauchsquote',
    def: 'Anteil des selbst erzeugten Solarstroms, der im eigenen Haushalt verbraucht statt ins Netz eingespeist wird. Sie entscheidet über die Wirtschaftlichkeit einer PV-Anlage, weil selbst verbrauchter Strom den teuren Netzbezug ersetzt, während die Einspeisung nur wenige Cent bringt.',
    unit: '%',
    topic: 'electricity',
    related: ['Photovoltaik', 'Einspeisevergütung', 'Grundlast'],
    source: wiki('Eigenverbrauch_(Photovoltaik)'),
  },
  {
    term: 'Einrohr- / Zweirohrsystem',
    def: 'Zwei Bauarten der Heizungsverteilung. Beim verbreiteten Zweirohrsystem bekommt jeder Heizkörper Wasser aus einer gemeinsamen Vorlaufleitung und gibt es in eine Rücklaufleitung ab. Beim älteren Einrohrsystem hängen die Heizkörper hintereinander in einer Ringleitung – das Wasser wird von Körper zu Körper kühler, weshalb der letzte im Ring oft kaum noch warm wird.',
    topic: 'heating',
    related: ['Vorlauf / Rücklauf', 'Hydraulischer Abgleich'],
    source: wiki('Zentralheizung'),
  },
  {
    term: 'Einspeisevergütung',
    def: 'Vergütung für Solarstrom, der ins öffentliche Netz abgegeben wird. Sie ist beim Anschluss der Anlage für zwanzig Jahre festgeschrieben und liegt deutlich unter dem Strompreis, den man beim Bezug zahlt. Genau daraus folgt die Faustregel der PV-Planung: Eigenverbrauch schlägt Einspeisung.',
    unit: 'ct/kWh',
    topic: 'electricity',
    related: ['Eigenverbrauchsquote', 'Photovoltaik'],
    source: { ...wiki('Einspeisevergütung'), stand: '08/2026' },
  },
  {
    term: 'Endenergie',
    def: 'Energiemenge, die beim Verbraucher ankommt und tatsächlich genutzt wird, etwa Strom an der Steckdose oder Gas am Kessel. Sie liegt zwischen der Primärenergie mit ihrer gesamten Vorkette und der Nutzenergie, also der erzeugten Raumwärme.',
    unit: 'kWh',
    topic: 'cost',
    related: ['Primärenergie'],
    source: wiki('Endenergie'),
  },
  {
    term: 'Energieausweis',
    def: 'Pflichtdokument beim Verkauf und bei der Vermietung, das die energetische Qualität eines Gebäudes ausweist. Es gibt zwei Sorten: Der Bedarfsausweis rechnet aus Bauteilen und Anlagentechnik, wie viel das Haus brauchen sollte; der Verbrauchsausweis mittelt, was die Vorbewohner tatsächlich verbraucht haben. Der zweite sagt deshalb mehr über die Bewohner als über das Haus.',
    unit: 'kWh/(m²·a)',
    topic: 'renovation',
    related: ['Effizienzhaus', 'Primärenergie'],
    source: wiki('Energieausweis'),
  },
  {
    term: 'Energieeffizienzklasse',
    def: 'Einstufung von Geräten auf dem EU-Energielabel, heute in der Skala A bis G. Die Klasse bezieht sich immer auf eine Gerätekategorie und eine genormte Prüfsituation – ein A-Kühlschrank und ein A-Trockner sind nicht vergleichbar. Aussagekräftiger ist der ebenfalls angegebene Jahresverbrauch in Kilowattstunden.',
    topic: 'electricity',
    related: ['kWh (Kilowattstunde)'],
    source: wiki('EU-Energielabel'),
  },
  {
    term: 'Förderhöhe',
    def: 'Höhendifferenz, die eine Pumpe überwinden kann, angegeben in Metern Wassersäule. Sie ist zusammen mit dem Volumenstrom die kennzeichnende Größe einer Umwälzpumpe; beide zusammen ergeben ihre Kennlinie.',
    unit: 'm',
    topic: 'heating',
    related: ['Pumpenkennlinie / Betriebspunkt', 'Volumenstrom'],
    source: wiki('Förderhöhe'),
  },
  {
    term: 'GEG (Gebäudeenergiegesetz)',
    def: 'Das Gesetz, das energetische Anforderungen an Gebäude bündelt – Neubaustandards, Nachrüstpflichten im Bestand, Regeln für Heizungen und den Energieausweis. Für Bestandsgebäude sind vor allem die Nachrüstpflichten relevant, etwa für ungedämmte oberste Geschossdecken und ungedämmte Heizungsrohre in unbeheizten Räumen.',
    topic: 'renovation',
    related: ['Energieausweis', 'U-Wert'],
    source: { ...wiki('Gebäudeenergiegesetz'), stand: '08/2026' },
  },
  {
    term: 'Grundlast',
    def: 'Die Leistung, die ein Haushalt rund um die Uhr zieht, auch nachts und im Urlaub: Kühlgeräte, Router, Heizungssteuerung, Standby. Sie ist der wirksamste Ansatzpunkt beim Stromsparen, weil sie mit 8.760 Stunden im Jahr multipliziert wird – 10 Watt dauerhaft sind 88 kWh im Jahr.',
    unit: 'W',
    topic: 'electricity',
    related: ['Standby', 'Lastgang'],
    source: wiki('Grundlast'),
  },
  {
    term: 'Grundpreis',
    def: 'Fixer Betrag pro Abrechnungszeitraum, unabhängig vom Verbrauch. Er deckt Zähler, Messung und Netzanschluss ab. Zusammen mit dem Arbeitspreis ergibt er die Energiekosten; bei kleinem Verbrauch macht er den größeren Teil aus.',
    unit: '€/Jahr',
    topic: 'cost',
    related: ['Arbeitspreis', 'Netzentgelt'],
    source: wiki('Grundpreis'),
  },
  {
    term: 'Grundversorgung',
    def: 'Der Vertrag, in dem landet, wer nie aktiv einen Anbieter gewählt hat: Man zieht ein, dreht den Strom auf, und der örtliche Grundversorger liefert. Rechtlich ist das ein Auffangnetz, preislich fast immer der teuerste Tarif. Die Kündigungsfrist beträgt zwei Wochen.',
    topic: 'cost',
    related: ['Arbeitspreis', 'Grundpreis'],
    source: wiki('Grundversorgung'),
  },
  {
    term: 'Heizkörperexponent',
    def: 'Kennzahl, die beschreibt, wie stark die Wärmeabgabe eines Heizkörpers mit der Übertemperatur wächst. Typische Werte liegen bei 1,25 bis 1,35. Der Zusammenhang ist nicht linear – deshalb bringt eine kleine Absenkung der Vorlauftemperatur weniger Leistungsverlust, als man erwarten würde.',
    topic: 'heating',
    related: ['Übertemperatur', 'Vorlauf / Rücklauf'],
    source: wiki('Heizkörper'),
  },
  {
    term: 'Heizkostenverteiler',
    def: 'Kleines Gerät am Heizkörper, das keine Energie misst, sondern Verbrauchseinheiten zählt – aus Oberflächentemperatur und Größe des Heizkörpers. Die Einheiten haben für sich keine Bedeutung; erst im Vergleich aller Wohnungen eines Hauses verteilen sie die Gesamtkosten. Deshalb kann die eigene Rechnung steigen, obwohl man weniger geheizt hat, wenn alle anderen noch stärker gespart haben.',
    topic: 'cost',
    related: ['Wärmemengenzähler'],
    source: wiki('Heizkostenverteiler'),
  },
  {
    term: 'Heizkurve',
    def: 'Kennlinie, die festlegt, welche Vorlauftemperatur die Heizung bei welcher Außentemperatur bereitstellt. Eine zu steil oder zu hoch eingestellte Kurve führt zu unnötig heißem Heizwasser, höheren Verlusten und – bei Wärmepumpen – deutlich schlechterer Effizienz.',
    topic: 'heating',
    related: ['Vorlauf / Rücklauf', 'Heizlast'],
    source: wiki('Heizkurve'),
  },
  {
    term: 'Heizlast',
    def: 'Die Wärmeleistung, die ein Gebäude am kältesten Auslegungstag braucht, um innen die Solltemperatur zu halten. Sie ist die Grundlage jeder Kessel- oder Wärmepumpen-Auslegung. Sie wird häufig überschätzt, und eine überdimensionierte Anlage taktet, verschleißt schneller und läuft ineffizient.',
    unit: 'kW',
    topic: 'heating',
    related: ['Heizkurve', 'U-Wert'],
    source: wiki('Heizlast'),
  },
  {
    term: 'HT / NT (Hoch- und Niedertarif)',
    def: 'Zwei Preisstufen im selben Vertrag, meist tagsüber teurer und nachts günstiger. Der Zähler hat dafür zwei Zählwerke, die getrennt abgelesen werden. Verbreitet bei Nachtspeicherheizungen und Wärmepumpen mit eigenem Zähler.',
    topic: 'cost',
    related: ['Smart Meter', 'Arbeitspreis'],
    source: wiki('Doppeltarifzähler'),
  },
  {
    term: 'Hydraulischer Abgleich',
    def: 'Einstellung der Heizungsanlage, bei der jeder Heizkörper genau den Volumenstrom erhält, den er für seine Heizlast braucht. Ergebnis sind gleichmäßige Wärme, niedrigere Vorlauftemperaturen und weniger Pumpenstrom. Ohne Abgleich werden die Heizkörper nahe der Pumpe überversorgt und die entferntesten bleiben kühl.',
    topic: 'heating',
    related: ['Volumenstrom', 'Differenzdruck', 'Vorlauf / Rücklauf'],
    source: wiki('Hydraulischer_Abgleich'),
  },
  {
    term: 'Jahresarbeitszahl (JAZ)',
    def: 'Verhältnis der über ein ganzes Jahr abgegebenen Wärme zur dafür eingesetzten elektrischen Energie einer Wärmepumpe. Anders als der COP ist sie kein Prüfstandswert, sondern der reale Betriebsmittelwert einschließlich Abtauen und Hilfsenergie. Bei Luft-Wasser-Anlagen gelten Werte ab etwa 3,5 als ordentlich.',
    topic: 'heat_pump',
    related: ['COP (Leistungszahl)', 'Wärmepumpe'],
    source: wiki('Jahresarbeitszahl'),
  },
  {
    term: 'Kavitation',
    def: 'Bildung und schlagartiges Zusammenfallen von Dampfblasen in einer Flüssigkeit, wenn der örtliche Druck unter den Dampfdruck fällt. In Pumpen verursacht sie Geräusche, Leistungsverlust und Materialabtrag am Laufrad.',
    topic: 'heating',
    related: ['Pumpenkennlinie / Betriebspunkt'],
    source: wiki('Kavitation'),
  },
  {
    term: 'kWh (Kilowattstunde)',
    def: 'Einheit der Energiemenge: eine Leistung von 1.000 Watt über eine Stunde. Sie ist die Abrechnungseinheit für Strom, Gas und Fernwärme. Anschaulich: Ein Wasserkocher mit 2.000 Watt braucht in einer halben Stunde genau eine Kilowattstunde.',
    unit: 'kWh',
    topic: 'electricity',
    related: ['Watt (Leistung)'],
    source: wiki('Kilowattstunde'),
  },
  {
    term: 'kWp (Kilowatt-Peak)',
    def: 'Nennleistung einer Photovoltaik-Anlage unter genormten Testbedingungen – kein Wert, der im Alltag erreicht wird, sondern eine Vergleichsgröße. Als Faustregel liefert ein Kilowatt-Peak in Deutschland je nach Ausrichtung 800 bis 1.000 Kilowattstunden im Jahr.',
    unit: 'kWp',
    topic: 'electricity',
    related: ['Photovoltaik', 'Wechselrichter'],
    source: wiki('Nennleistung_(Photovoltaik)'),
  },
  {
    term: 'Lastgang',
    def: 'Der zeitliche Verlauf der bezogenen Leistung, meist in Viertelstundenwerten. Er zeigt, wann wie viel Strom fließt, und macht Grundlast und Spitzen sichtbar. Moderne Messeinrichtungen und Smart Meter können ihn aufzeichnen – die Grundlage für zeitvariable Tarife.',
    topic: 'electricity',
    related: ['Smart Meter', 'Grundlast'],
    source: wiki('Lastgang'),
  },
  {
    term: 'Legionellen',
    def: 'Bakterien, die sich in stehendem, lauwarmem Trinkwasser zwischen etwa 25 und 45 °C vermehren und beim Einatmen feiner Tröpfchen eine schwere Lungenentzündung auslösen können. Deshalb die Regel bei zentralen Anlagen mit größerem Speicher: mindestens 60 °C am Speicheraustritt. Durchlauferhitzer sind unkritisch, weil kein Wasser lange warm steht.',
    topic: 'hot_water',
    related: ['Zirkulation'],
    source: wiki('Legionellen'),
  },
  {
    term: 'Luftdichtheit (Blower-Door)',
    def: 'Maß für die Dichtheit der Gebäudehülle, geprüft mit einem Ventilator in der Haustür bei 50 Pascal Druckdifferenz. Der Kennwert n50 gibt an, wie oft das Luftvolumen dabei pro Stunde ausgetauscht wird. Undichtheiten kosten Wärme und führen Feuchte in die Konstruktion – dort kondensiert sie unbemerkt.',
    unit: 'n50 in 1/h',
    topic: 'renovation',
    related: ['Wärmebrücke', 'Wärmerückgewinnung'],
    source: wiki('Blower-Door'),
  },
  {
    term: 'Luftfeuchtigkeit (relativ)',
    def: 'Anteil des tatsächlich in der Luft enthaltenen Wasserdampfs an der bei dieser Temperatur maximal möglichen Menge. Weil warme Luft mehr Wasser aufnehmen kann, sinkt die relative Feuchte beim Erwärmen derselben Luft. In Wohnräumen gelten 40 bis 60 % als gesund.',
    unit: '% r. F.',
    topic: 'ventilation',
    related: ['Taupunkt', 'CO₂ (Kohlenstoffdioxid)'],
    source: wiki('Luftfeuchtigkeit'),
  },
  {
    term: 'Nachtabsenkung',
    def: 'Zeitgesteuerte Absenkung der Raum- oder Vorlauftemperatur in den Nachtstunden. Bei Gas- und Ölheizungen in weniger gut gedämmten Gebäuden spart sie spürbar. Bei Wärmepumpen kann sie schaden: Das Wiederaufheizen verlangt eine höhere Vorlauftemperatur, und genau die verschlechtert die Effizienz.',
    topic: 'heating',
    related: ['Heizkurve', 'Wärmepumpe'],
    source: wiki('Nachtabsenkung'),
  },
  {
    term: 'Netzentgelt',
    def: 'Entgelt für die Nutzung der Strom- oder Gasnetze, das im Arbeits- und Grundpreis enthalten ist und regional unterschiedlich ausfällt. Es ist kein Posten, den der Lieferant frei setzt – er reicht ihn vom Netzbetreiber durch. Wer eine Wärmepumpe oder Wallbox steuerbar anmeldet, kann reduzierte Netzentgelte bekommen.',
    unit: 'ct/kWh',
    topic: 'cost',
    related: ['Arbeitspreis', 'Grundpreis', 'Wallbox'],
    source: wiki('Netzentgelt'),
  },
  {
    term: 'Photovoltaik',
    def: 'Direkte Umwandlung von Sonnenlicht in elektrischen Strom über Halbleiter-Solarzellen. Die Anlagenleistung wird in Kilowatt-Peak angegeben; ein Wechselrichter macht aus dem Gleichstrom der Module haushaltsüblichen Wechselstrom.',
    topic: 'electricity',
    related: ['kWp (Kilowatt-Peak)', 'Wechselrichter', 'Eigenverbrauchsquote'],
    source: wiki('Photovoltaik'),
  },
  {
    term: 'Primärenergie',
    def: 'Energiemenge einschließlich der gesamten Vorkette – Förderung, Umwandlung, Transport und Verluste bis zum Verbraucher. Der Primärenergiefaktor rechnet Endenergie in Primärenergie um und macht Energieträger vergleichbar; er ist die Bezugsgröße der gesetzlichen Anforderungen an Gebäude.',
    unit: 'kWh',
    topic: 'renovation',
    related: ['Endenergie', 'Energieausweis'],
    source: wiki('Primärenergie'),
  },
  {
    term: 'Pumpenkennlinie / Betriebspunkt',
    def: 'Die Pumpenkennlinie zeigt, welche Förderhöhe eine Pumpe bei welchem Volumenstrom erreicht. Der Betriebspunkt ist ihr Schnittpunkt mit der Anlagenkennlinie – dort stellt sich der tatsächliche Durchfluss ein. Eine zu groß gewählte Pumpe arbeitet dauerhaft neben ihrem günstigsten Punkt.',
    topic: 'heating',
    related: ['Förderhöhe', 'Volumenstrom', 'Kavitation'],
    source: wiki('Kennlinie_(Pumpe)'),
  },
  {
    term: 'Scheinbares Aus',
    def: 'Zustand eines Geräts, das ausgeschaltet wirkt, aber weiter Strom zieht – für Fernbedienungsempfänger, Uhr, Netzwerkverbindung oder ein Netzteil, das dauerhaft am Netz hängt. Nur eine schaltbare Steckdosenleiste oder das Ziehen des Steckers beendet diesen Verbrauch wirklich.',
    topic: 'electricity',
    related: ['Standby', 'Grundlast'],
    source: wiki('Bereitschaftsbetrieb'),
  },
  {
    term: 'Smart Meter',
    def: 'Digitaler Stromzähler mit Kommunikationsanbindung, der Verbrauchswerte zeitaufgelöst erfasst und übermittelt. Er ermöglicht Lastgang-Auswertungen und zeitvariable Tarife. Nicht jeder digitale Zähler ist ein Smart Meter – ohne Kommunikationsmodul ist es eine moderne Messeinrichtung.',
    topic: 'electricity',
    related: ['Lastgang', 'HT / NT (Hoch- und Niedertarif)'],
    source: wiki('Intelligenter_Zähler'),
  },
  {
    term: 'Solarthermie',
    def: 'Nutzung der Sonnenstrahlung zur Wärmeerzeugung, meist für Warmwasser und Heizungsunterstützung. Anders als Photovoltaik erzeugt sie keinen Strom, sondern erwärmt eine Flüssigkeit in Kollektoren, deren Wärme ein Speicher aufnimmt.',
    topic: 'hot_water',
    related: ['Photovoltaik'],
    source: wiki('Solarthermie'),
  },
  {
    term: 'Standby',
    def: 'Bereitschaftszustand eines Geräts mit dauerhafter, geringer Leistungsaufnahme. Weil er rund um die Uhr anliegt, summieren sich schon wenige Watt über 8.760 Stunden im Jahr zu spürbaren Beträgen – je Gerät und erst recht über den ganzen Haushalt.',
    unit: 'W',
    topic: 'electricity',
    related: ['Scheinbares Aus', 'Grundlast'],
    source: wiki('Bereitschaftsbetrieb'),
  },
  {
    term: 'Taupunkt',
    def: 'Die Temperatur, bei der Luft ihren Wasserdampf nicht mehr halten kann und Feuchte sich niederschlägt. Trifft warme, feuchte Raumluft auf eine Oberfläche unterhalb des Taupunkts – eine Außenwandecke, eine Fensterlaibung, eine Wärmebrücke –, bildet sich dort Kondensat. Das ist der Anfang fast jedes Schimmelschadens.',
    unit: '°C',
    topic: 'ventilation',
    related: ['Luftfeuchtigkeit (relativ)', 'Wärmebrücke'],
    source: wiki('Taupunkt'),
  },
  {
    term: 'Thermostatventil',
    def: 'Selbsttätiges Regelventil am Heizkörper, das den Volumenstrom abhängig von der Raumtemperatur drosselt. Die Zahlen am Kopf sind Zieltemperaturen, keine Leistungsstufen: 3 steht für etwa 20 °C. Wird der Fühler durch Möbel oder Vorhänge verdeckt, misst er die Nischentemperatur statt der Raumtemperatur und schließt zu früh.',
    topic: 'heating',
    related: ['Volumenstrom', 'Hydraulischer Abgleich'],
    source: wiki('Thermostatventil'),
  },
  {
    term: 'Übertemperatur',
    def: 'Differenz zwischen der mittleren Heizwassertemperatur und der Raumtemperatur. Sie bestimmt, wie viel Wärme ein Heizkörper abgibt – über den Heizkörperexponenten allerdings nicht linear, sondern gedämpft.',
    unit: 'K',
    topic: 'heating',
    related: ['Heizkörperexponent', 'Vorlauf / Rücklauf'],
    source: wiki('Heizkörper'),
  },
  {
    term: 'U-Wert',
    def: 'Wärmedurchgangskoeffizient eines Bauteils: die Wärmeleistung, die je Quadratmeter und je Kelvin Temperaturunterschied hindurchgeht. Je kleiner, desto besser gedämmt. Eine alte Einfachverglasung liegt bei etwa 5, ein modernes Dreifachfenster unter 1.',
    unit: 'W/(m²·K)',
    topic: 'renovation',
    related: ['Wärmebrücke', 'Heizlast'],
    source: wiki('Wärmedurchgangskoeffizient'),
  },
  {
    term: 'Volumenstrom',
    def: 'Flüssigkeitsmenge, die pro Zeiteinheit durch einen Querschnitt fließt. In der Heizung bestimmt er zusammen mit der Temperaturspreizung die transportierte Wärmeleistung und ist die Stellgröße des hydraulischen Abgleichs.',
    unit: 'm³/h',
    topic: 'heating',
    related: ['Hydraulischer Abgleich', 'Differenzdruck'],
    source: wiki('Volumenstrom'),
  },
  {
    term: 'Vorlauf / Rücklauf',
    def: 'Der Vorlauf führt erwärmtes Wasser vom Erzeuger zu den Heizflächen, der Rücklauf das abgekühlte zurück. Ihre Differenz ist die Spreizung. Eine niedrige Vorlauftemperatur ist der wichtigste Effizienzhebel überhaupt – bei Brennwertkesseln, weil sie erst dann kondensieren, bei Wärmepumpen, weil ihre Leistungszahl direkt daran hängt.',
    unit: '°C',
    topic: 'heating',
    related: ['Heizkurve', 'Übertemperatur', 'Hydraulischer Abgleich'],
    source: wiki('Vorlauftemperatur'),
  },
  {
    term: 'Wallbox',
    def: 'Fest installierte Ladestation für Elektrofahrzeuge im privaten Bereich, üblicherweise mit 11 kW Ladeleistung. Sie ist beim Netzbetreiber anzumelden; wer sie als steuerbare Verbrauchseinrichtung anmeldet, bekommt reduzierte Netzentgelte und akzeptiert dafür eine zeitweise begrenzte Leistung.',
    unit: 'kW',
    topic: 'electricity',
    related: ['Netzentgelt', 'Lastgang'],
    source: wiki('Wallbox'),
  },
  {
    term: 'Wärmebrücke',
    def: 'Stelle in der Gebäudehülle, an der deutlich mehr Wärme nach außen fließt als in der Fläche daneben – ein auskragender Balkon, ein Rollladenkasten, eine Deckenauflagerung. Innen ist die Oberfläche dort kälter, und genau dort schlägt sich als Erstes Feuchte nieder.',
    topic: 'renovation',
    related: ['U-Wert', 'Taupunkt'],
    source: wiki('Wärmebrücke'),
  },
  {
    term: 'Wärmemengenzähler',
    def: 'Gerät, das tatsächlich gelieferte Wärme misst – aus Volumenstrom und der Temperaturdifferenz zwischen Vor- und Rücklauf. Anders als ein Heizkostenverteiler liefert er eine echte physikalische Größe in Kilowattstunden und ist damit die belastbarere Grundlage einer Abrechnung.',
    unit: 'kWh',
    topic: 'cost',
    related: ['Heizkostenverteiler', 'Volumenstrom'],
    source: wiki('Wärmezähler'),
  },
  {
    term: 'Wärmepumpe',
    def: 'Anlage, die Umweltwärme aus Luft, Erdreich oder Grundwasser auf ein nutzbares Temperaturniveau hebt und dafür elektrische Energie einsetzt. Ihr Wirkungsgrad steigt, je kleiner der Temperaturhub ist – niedrige Vorlauftemperaturen sind deshalb keine Feinheit, sondern die Voraussetzung für wirtschaftlichen Betrieb.',
    topic: 'heat_pump',
    related: ['Jahresarbeitszahl (JAZ)', 'COP (Leistungszahl)', 'Vorlauf / Rücklauf'],
    source: wiki('Wärmepumpenheizung'),
  },
  {
    term: 'Wärmerückgewinnung',
    def: 'Rückgewinnung von Wärme aus der Abluft, um damit die Zuluft vorzuwärmen. In Lüftungsanlagen erreichen Wärmeübertrager Rückgewinnungsgrade von 70 bis über 90 %. Je dichter ein Gebäude ist, desto größer der Anteil, den Lüftungsverluste am Gesamtverbrauch ausmachen.',
    unit: '%',
    topic: 'ventilation',
    related: ['Luftdichtheit (Blower-Door)'],
    source: wiki('Wärmerückgewinnung'),
  },
  {
    term: 'Watt (Leistung)',
    def: 'Einheit der Leistung, also der Energie je Zeit. Sie sagt, wie schnell Energie umgesetzt wird, nicht wie viel insgesamt – die Menge ergibt sich erst aus Leistung mal Zeit und heißt dann Kilowattstunde.',
    unit: 'W',
    topic: 'electricity',
    related: ['kWh (Kilowattstunde)'],
    source: wiki('Watt_(Einheit)'),
  },
  {
    term: 'Wechselrichter',
    def: 'Gerät, das den Gleichstrom von Solarmodulen oder Batteriespeichern in netzkonformen Wechselstrom umwandelt. Seine Leistung begrenzt, wie viel eine Anlage tatsächlich einspeisen kann – bei Balkonkraftwerken ist genau das die regulierte Größe, nicht die Modulleistung.',
    unit: 'W',
    topic: 'electricity',
    related: ['Photovoltaik', 'Balkonkraftwerk'],
    source: wiki('Wechselrichter'),
  },
  {
    term: 'Wirkungsgrad',
    def: 'Verhältnis von nutzbar abgegebener zu zugeführter Energie. Bei Verbrennung bleibt er unter 100 %; Brennwertkessel erreichen bezogen auf den Heizwert scheinbar mehr, weil sie zusätzlich die Kondensationswärme nutzen. Wärmepumpen entziehen sich dem Vergleich ganz – sie erzeugen keine Energie, sondern verschieben sie.',
    unit: '%',
    topic: 'heating',
    related: ['Brennwert / Heizwert', 'COP (Leistungszahl)'],
    source: wiki('Wirkungsgrad'),
  },
  {
    term: 'Zirkulation',
    def: 'Leitungskreis, der Warmwasser dauerhaft in Bewegung hält, damit es am Hahn ohne Wartezeit warm ankommt. Der Komfort kostet: Die Pumpe zieht Strom, und die dauernd warme Leitung verliert Wärme. Eine Zeitschaltung oder ein Anforderungstaster behält den Komfort und streicht den größten Teil der Verluste.',
    topic: 'hot_water',
    related: ['Legionellen'],
    source: wiki('Zirkulationsleitung'),
  },
]

export const MEASUREMENT_INFOS: MeasurementInfo[] = [
  {
    id: 'showerhead',
    title: 'Duschkopf-Durchfluss',
    topic: 'hot_water',
    body: 'Warmwasser ist nach dem Heizen der zweitgrößte Energieposten im Haushalt, und Duschen macht davon den größten Teil aus. Jeder Liter muss von etwa 10 °C auf rund 38 °C erwärmt werden – ein geringerer Durchfluss spart deshalb doppelt: Trinkwasser und die Energie, es zu erwärmen. Der Hebel ist ungewöhnlich günstig: Ein Sparduschkopf kostet wenig und wirkt vom ersten Tag an.',
    sections: {
      influence: [
        'Sparduschkopf statt Standardbrause – der größte Einzelschritt.',
        'Durchflussbegrenzer in die Armatur, wenn der Kopf bleiben soll.',
        'Duschdauer: jede Minute weniger zählt linear.',
        'Warmwassertemperatur am Speicher moderat halten.',
      ],
      mistakes: [
        'Mit halb geöffnetem Hahn messen – gemessen wird bei voller Öffnung.',
        'Den Messbecher erst nach dem Aufdrehen unterhalten; die ersten Sekunden verfälschen.',
        'Regenduschen unterschätzen: Sie liegen oft deutlich über 15 l/min.',
      ],
    },
    source: wiki('Warmwasser'),
  },
  {
    id: 'hot_water_wait',
    title: 'Warmwasser-Wartezeit',
    topic: 'hot_water',
    body: 'Die Sekunden, bis warmes Wasser am Hahn ankommt, sind kein Komfortproblem, sondern ein Verbrauch: Das kalte Wasser aus der Leitung läuft ungenutzt in den Abfluss, und die Wärme, die vorher darin steckte, ist längst an die Rohre abgegeben. Lange Wartezeiten verraten entweder weite Wege zum Erzeuger oder eine abgeschaltete Zirkulation.',
    sections: {
      influence: [
        'Zirkulationsleitung mit Zeitschaltung oder Anforderungstaster statt Dauerbetrieb.',
        'Warmwasserleitungen dämmen – besonders im kalten Keller.',
        'Bei sehr langen Wegen: dezentraler Durchlauferhitzer an der entfernten Zapfstelle.',
        'Das erste kalte Wasser auffangen und nutzen, statt es wegzuschütten.',
      ],
      mistakes: [
        'Direkt nach dem letzten Zapfen messen – die Leitung ist dann noch warm.',
        'Am Einhebelmischer nicht ganz auf heiß stellen.',
        'Die Wartezeit an der nächstgelegenen Zapfstelle messen statt an der entferntesten.',
      ],
    },
    source: wiki('Zirkulationsleitung'),
  },
  {
    id: 'room_temperature',
    title: 'Raumklima',
    topic: 'heating',
    body: 'Die Raumtemperatur ist der größte Hebel beim Heizen: Jedes Grad weniger senkt den Heizenergiebedarf um grob 6 %. Gleichzeitig ist sie kein reiner Sparposten – zu kühle Räume kosten beim Wiederaufheizen Energie, und kalte Wandflächen sind der Anfang jedes Feuchteschadens. Deshalb zählt neben der Temperatur immer auch die Luftfeuchte.',
    sections: {
      influence: [
        'Thermostatventile auf die Zieltemperatur einstellen, nicht auf Anschlag.',
        'Ungenutzte Räume kühler fahren, aber nicht unter 16 °C.',
        'Türen zu kühleren Räumen geschlossen halten – sonst wandert feuchte Warmluft hinein.',
        'Nachts absenken, sofern nicht mit Wärmepumpe geheizt wird.',
      ],
      mistakes: [
        'Am Heizkörper oder an der Außenwand messen statt in Raummitte.',
        'Das Thermometer nicht angleichen lassen – es braucht einige Minuten.',
        'Direkt nach dem Lüften messen.',
        'In der Sonne messen: Direkte Einstrahlung verfälscht jedes Thermometer.',
      ],
    },
    source: wiki('Raumklima'),
  },
  {
    id: 'furniture_spacing',
    title: 'Heizkörper frei?',
    topic: 'heating',
    body: 'Ein Heizkörper gibt einen großen Teil seiner Wärme als aufsteigenden Luftstrom ab. Steht ein Möbel davor oder hängt ein langer Vorhang darüber, staut sich die Wärme dahinter, statt in den Raum zu gelangen. Schlimmer noch: Sitzt das Thermostatventil in dieser warmen Nische, misst es eine Temperatur, die im Raum gar nicht herrscht, und schließt zu früh – der Raum bleibt kühl, obwohl geheizt wird.',
    sections: {
      influence: [
        'Möbel abrücken – wenige Zentimeter entscheiden.',
        'Lange Vorhänge kürzen oder vor dem Heizkörper enden lassen.',
        'Keine Verkleidung über dem Heizkörper, auch keine abgelegten Handtücher.',
        'Bei fest verbautem Möbel: Thermostatkopf mit Fernfühler nachrüsten.',
      ],
      mistakes: [
        'Nur den Abstand betrachten und die Verdeckung von oben übersehen.',
        'Die Heizkörpernische hinter dem Sofa vergessen, weil man sie nie sieht.',
        'Annehmen, ein Zentimeter Luft genüge – die Luft muss zirkulieren können.',
      ],
    },
  },
  {
    id: 'lighting',
    title: 'Beleuchtung',
    topic: 'electricity',
    body: 'Beleuchtung ist selten der größte Posten im Haushalt, aber der mit dem einfachsten Hebel: LED-Lampen brauchen bei gleicher Helligkeit rund 80–90 % weniger Strom als Glühlampen und halten ein Vielfaches länger. Entscheidend ist nicht die Zahl der Lampen, sondern wie lange sie brennen – deshalb geht dieser Check Raum für Raum vor.',
    sections: {
      influence: [
        'Zuerst die Dauerbrenner tauschen: Küche, Wohnzimmer, Außenlicht.',
        'Auf Lumen achten statt auf Watt – Lumen ist die Helligkeit.',
        'Warmweiß (2.700 K) für Wohnräume, neutralweiß fürs Arbeiten.',
        'Bewegungsmelder für Flur, Keller und Außenbereich.',
      ],
      mistakes: [
        'Funktionierende Leuchtmittel in selten genutzten Räumen vorzeitig tauschen – dort amortisiert sich der Kauf kaum.',
        'Halogen für sparsam halten: Es ist eine Glühlampe mit etwas besserer Ausbeute.',
        'Beim Tausch die Helligkeit unterschätzen und den Raum zu dunkel machen.',
      ],
    },
    source: wiki('Leuchtdiode'),
  },
  {
    id: 'base_load',
    title: 'Grundlast',
    topic: 'electricity',
    body: 'Die Grundlast ist die Leistung, die dein Haushalt rund um die Uhr zieht – auch nachts und im Urlaub. Sie ist deshalb der wirksamste Ansatzpunkt beim Stromsparen: Jedes Watt wird mit 8.760 Stunden im Jahr multipliziert. Anders als die anderen Checks beziffert dieser keine Ersparnis, sondern stellt eine Diagnose: Ist die Grundlast hoch, sagen die Folge-Checks, woher sie kommt.',
    sections: {
      influence: [
        'Standby-Geräte über schaltbare Steckdosenleisten trennen.',
        'Alte Kühl- und Gefriergeräte prüfen – sie laufen dauerhaft.',
        'Zweitgeräte im Keller hinterfragen: Der alte Kühlschrank ist oft der größte Einzelposten.',
        'Netzteile und Ladegeräte ziehen, die dauerhaft in der Dose stecken.',
      ],
      mistakes: [
        'Zu kurz messen: Kühlgeräte takten, ein Messfenster unter einer Stunde trifft zufällig einen Zustand.',
        'Während der Messung Geräte ein- oder ausschalten.',
        'Die Umwälzpumpe der Heizung vergessen – in der Heizsaison ist sie Teil der Grundlast.',
      ],
    },
    source: wiki('Grundlast'),
  },
  {
    id: 'standby',
    title: 'Standby-Verbrauch',
    topic: 'electricity',
    body: 'Viele Geräte ziehen auch im Bereitschaftsbetrieb dauerhaft Strom – Fernseher, Konsolen, PCs, Router, Ladegeräte, Audioanlagen. Schon wenige Watt summieren sich über 8.760 Stunden im Jahr zu mehreren Kilowattstunden je Gerät; über den ganzen Haushalt entstehen daraus schnell dreistellige Beträge. Das Tückische: Man sieht dem Gerät nichts an.',
    sections: {
      influence: [
        'Schaltbare Steckdosenleiste für ganze Gerätegruppen – ein Griff statt sechs.',
        'Netzwerkfunktionen abschalten, die niemand nutzt (Wake-on-LAN, Schnellstart).',
        'Beim Neukauf auf die Standby-Aufnahme achten, nicht nur auf die Effizienzklasse.',
        'Router und Netzwerk bewusst ausnehmen – dort stört das Wiederhochfahren mehr, als das Watt bringt.',
      ],
      mistakes: [
        'Nur die offensichtlichen Geräte messen und Netzteile übersehen.',
        'Im ausgeschalteten Zustand messen, während das Gerät noch herunterfährt.',
        'Geräte mit stark schwankender Aufnahme (Drucker, Konsolen) in einem Moment erfassen.',
      ],
    },
    source: wiki('Bereitschaftsbetrieb'),
  },
  {
    id: 'fridge',
    title: 'Kühlschrank',
    topic: 'electricity',
    body: 'Der Kühlschrank läuft rund um die Uhr und gehört damit zu den ständigen Stromverbrauchern. Eine Innentemperatur von 5–7 °C reicht für alle Lebensmittel; jedes Grad kälter erhöht den Verbrauch um grob 6 %. Neben der Einstellung entscheiden Alter, Türdichtung und Aufstellort – ein Gerät neben Herd oder Heizung arbeitet dauerhaft gegen die Wärme an.',
    sections: {
      influence: [
        'Temperatur auf 7 °C stellen und mit einem Thermometer prüfen.',
        'Aufstellort: nicht neben Herd, Spülmaschine oder Heizkörper.',
        'Türdichtung prüfen – ein eingeklemmtes Blatt Papier darf sich nicht leicht herausziehen lassen.',
        'Lüftungsgitter hinten und unten frei halten und entstauben.',
      ],
      mistakes: [
        'Die Temperatur direkt in der Luft messen – sie schwankt bei jedem Öffnen.',
        'Zu früh ablesen: Ein Glas Wasser in der Mitte braucht mehrere Stunden.',
        'Nach dem Einräumen warmer Einkäufe messen.',
        'Der Stufenanzeige am Regler vertrauen – sie ist keine Temperatur.',
      ],
    },
    source: wiki('Kühlschrank'),
  },
  {
    id: 'freezer',
    title: 'Gefrierschrank',
    topic: 'electricity',
    body: 'Gefriergeräte arbeiten dauerhaft auf tiefem Temperaturniveau und laufen ununterbrochen. −18 °C genügen für die Haltbarkeit; jedes Grad kälter kostet unnötig Energie. Der größte Einzelfaktor ist aber nicht die Einstellung, sondern der Reif: Eine Eisschicht an den Innenwänden wirkt wie eine Dämmung – allerdings in die falsche Richtung, sie hält die Kälte vom Innenraum fern.',
    sections: {
      influence: [
        'Auf −18 °C einstellen, nicht kälter.',
        'Abtauen, sobald die Eisschicht ein paar Millimeter erreicht.',
        'Türdichtung prüfen und die Tür kurz halten.',
        'Gerät gut gefüllt halten – Luft muss bei jedem Öffnen neu gekühlt werden.',
      ],
      mistakes: [
        'Direkt nach dem Abtauen messen, bevor das Gerät wieder heruntergekühlt hat.',
        'Das Thermometer beim Ablesen herausnehmen – der Wert steigt in Sekunden.',
        'Die Schnellgefrierfunktion dauerhaft laufen lassen.',
      ],
    },
    source: wiki('Gefriergerät'),
  },
]

// --- Laborversuche HTW Berlin · GEIT (Erstentwurf) ---
export const LAB_EXPERIMENTS: LabExperiment[] = [
  {
    id: 'hydraulischer_abgleich',
    title: 'Hydraulischer Abgleich',
    course: COURSE,
    intro:
      'Ziel des Versuchs ist es zu verstehen, wie ein Heizsystem so eingestellt wird, dass jeder Heizkörper genau den ausgelegten Volumenstrom erhält. Ein korrekter hydraulischer Abgleich sorgt für gleichmäßige Wärmeverteilung, geringere Strömungsgeräusche und einen effizienteren Betrieb.',
    prep: [
      'Funktionsprinzip von Thermostatventilen mit Voreinstellung verstehen.',
      'Zusammenhang zwischen Differenzdruck, Volumenstrom und Pumpenförderhöhe nachvollziehen.',
      'Verfahren A (vereinfacht, raumweise Heizlast) und Verfahren B (raumweise Heizlastberechnung) unterscheiden.',
      'Bedeutung von Heizkurve und Rücklauftemperatur für die Effizienz kennen.',
      'Erwartete Vorteile benennen können: Effizienz, gleichmäßige Wärme, weniger Geräusche, Energieeinsparung.',
    ],
    photoCount: 2,
    durationMin: 5,
    difficulty: 'medium',
    passRatio: 0.6,
    quiz: [
      {
        id: 'ha1',
        question: 'Was ist das primäre Ziel des hydraulischen Abgleichs?',
        options: [
          'Jeder Heizkörper erhält den ausgelegten Volumenstrom',
          'Die Vorlauftemperatur wird maximiert',
          'Die Pumpe läuft stets mit voller Drehzahl',
          'Alle Ventile werden vollständig geöffnet',
        ],
        correct: 0,
        explanation: 'Genau das ist der Kern: Jeder Heizkörper bekommt den ausgelegten Volumenstrom – nicht zu viel, nicht zu wenig.',
      },
      {
        id: 'ha2',
        question: 'Womit wird der Volumenstrom an einem Heizkörper begrenzt?',
        options: [
          'Über die Voreinstellung des Thermostatventils',
          'Über die Raumtemperatur allein',
          'Über die Länge der Rohrleitung',
          'Über die Farbe des Heizkörpers',
        ],
        correct: 0,
        explanation: 'Die Voreinstellung am Thermostatventil begrenzt den Durchfluss und sorgt so für die richtige Verteilung.',
      },
      {
        id: 'ha3',
        question: 'Welcher Vorteil ergibt sich NICHT direkt aus einem korrekten Abgleich?',
        options: [
          'Geringere Strömungsgeräusche',
          'Gleichmäßigere Wärmeverteilung',
          'Höhere Effizienz',
          'Höherer Stromverbrauch der Pumpe',
        ],
        correct: 3,
        explanation: 'Ein korrekter Abgleich senkt den Pumpenstrom eher (geringere Förderhöhe nötig) – höherer Verbrauch ist kein Vorteil.',
      },
      {
        id: 'ha4',
        question: 'Was beschreibt der Differenzdruck im Heizkreis?',
        options: [
          'Die Druckdifferenz, die den Volumenstrom durch die Bauteile treibt',
          'Die Außentemperatur',
          'Den elektrischen Widerstand der Pumpe',
          'Die Dichte des Heizwassers',
        ],
        correct: 0,
        explanation: 'Der Differenzdruck ist die Druckdifferenz, die das Wasser durch die Bauteile treibt.',
      },
      {
        id: 'ha5',
        question: 'Welche Maßnahme unterstützt einen energieeffizienten Betrieb zusätzlich?',
        options: [
          'Eine zu hoch eingestellte Heizkurve',
          'Eine an das Gebäude angepasste Heizkurve mit niedriger Rücklauftemperatur',
          'Dauerhaft maximale Pumpendrehzahl',
          'Vollständig geschlossene Thermostatventile',
        ],
        correct: 1,
        explanation: 'Eine ans Gebäude angepasste Heizkurve mit niedriger Rücklauftemperatur steigert die Effizienz zusätzlich.',
      },
      {
        id: 'ha6',
        question: 'Was unterscheidet Verfahren B vom vereinfachten Verfahren A?',
        options: [
          'Verfahren B beruht auf einer raumweisen Heizlastberechnung',
          'Verfahren B verzichtet auf Voreinstellungen',
          'Verfahren B benötigt keine Pumpe',
          'Verfahren B gilt nur für Fußbodenheizungen',
        ],
        correct: 0,
        explanation: 'Verfahren B stützt sich auf eine raumweise Heizlastberechnung und ist dadurch genauer als das vereinfachte Verfahren A.',
      },
    ],
  },
  {
    id: 'pumpenpruefstand',
    title: 'Pumpenprüfstand',
    course: COURSE,
    intro:
      'Am Pumpenprüfstand wird das Betriebsverhalten einer Kreiselpumpe untersucht. Im Mittelpunkt stehen die Pumpenkennlinie, die Anlagenkennlinie und ihr Schnittpunkt – der Betriebspunkt – sowie der Einfluss der Drehzahlregelung auf Förderhöhe, Volumenstrom und Leistung.',
    prep: [
      'Pumpenkennlinie als Förderhöhe H über Volumenstrom Q verstehen.',
      'Anlagenkennlinie als Widerstandsverlauf des Systems einordnen.',
      'Betriebspunkt als Schnittpunkt von Pumpen- und Anlagenkennlinie erkennen.',
      'Affinitätsgesetze anwenden: Q~n, H~n², P~n³.',
      'Wirkungsgrad und dessen Lage relativ zum Bestpunkt beurteilen.',
      'Kavitation und die Bedeutung des NPSH-Werts kennen.',
    ],
    photoCount: 2,
    durationMin: 6,
    difficulty: 'hard',
    passRatio: 0.6,
    quiz: [
      {
        id: 'pp1',
        question: 'Was stellt die Pumpenkennlinie dar?',
        options: [
          'Die Förderhöhe H in Abhängigkeit vom Volumenstrom Q',
          'Den Stromverbrauch über die Zeit',
          'Die Temperatur über den Druck',
          'Den Wirkungsgrad über die Drehzahl der Anlage',
        ],
        correct: 0,
        explanation: 'Die Pumpenkennlinie zeigt die Förderhöhe H über dem Volumenstrom Q.',
      },
      {
        id: 'pp2',
        question: 'Wie entsteht der Betriebspunkt einer Pumpe in einer Anlage?',
        options: [
          'Als Schnittpunkt von Pumpenkennlinie und Anlagenkennlinie',
          'Beim maximalen Volumenstrom der Pumpe',
          'Bei Förderhöhe null',
          'Immer im Stillstand der Pumpe',
        ],
        correct: 0,
        explanation: 'Der Betriebspunkt ist der Schnittpunkt von Pumpen- und Anlagenkennlinie.',
      },
      {
        id: 'pp3',
        question: 'Wie ändert sich der Volumenstrom Q näherungsweise mit der Drehzahl n?',
        options: ['Q ~ n', 'Q ~ n²', 'Q ~ n³', 'Q ~ 1/n'],
        correct: 0,
        explanation: 'Nach den Affinitätsgesetzen gilt Q ~ n (linear mit der Drehzahl).',
      },
      {
        id: 'pp4',
        question: 'Wie verhält sich die Antriebsleistung P näherungsweise zur Drehzahl n?',
        options: ['P ~ n³', 'P ~ n', 'P ~ n²', 'P ist von n unabhängig'],
        correct: 0,
        explanation: 'Die Leistung steigt mit der dritten Potenz: P ~ n³ – deshalb spart Drehzahlabsenkung so viel Energie.',
      },
      {
        id: 'pp5',
        question: 'Was beschreibt der NPSH-Wert?',
        options: [
          'Den zur Vermeidung von Kavitation erforderlichen Zulaufdruck',
          'Den maximalen Wirkungsgrad',
          'Die Nenndrehzahl der Pumpe',
          'Die Förderhöhe bei Q = 0',
        ],
        correct: 0,
        explanation: 'Der NPSH-Wert gibt den erforderlichen Zulaufdruck an, um Kavitation zu vermeiden.',
      },
      {
        id: 'pp6',
        question: 'Was passiert bei Kavitation?',
        options: [
          'Es bilden sich Dampfblasen, die implodieren und die Pumpe schädigen können',
          'Der Wirkungsgrad steigt dauerhaft',
          'Die Förderhöhe verdoppelt sich',
          'Die Pumpe läuft besonders leise und effizient',
        ],
        correct: 0,
        explanation: 'Bei Kavitation bilden sich Dampfblasen, die implodieren und die Pumpe schädigen können.',
      },
    ],
  },
  {
    id: 'heizkoerperpruefstand',
    title: 'Heizkörperprüfstand',
    course: COURSE,
    intro:
      'Der Heizkörperprüfstand dient der Bestimmung der Wärmeleistung von Heizkörpern in Abhängigkeit von der Übertemperatur. Untersucht werden Normwärmeleistung, Heizkörperexponent, Massenstrom sowie Vor- und Rücklauftemperatur und die Anteile von Konvektion und Strahlung.',
    prep: [
      'Wärmeleistung Q als zentrale Messgröße verstehen.',
      'Begriff der Normwärmeleistung und ihrer genormten Randbedingungen kennen.',
      'Heizkörperexponent n und seinen Einfluss auf die Leistungskennlinie nachvollziehen.',
      '(Logarithmische) Übertemperatur als treibende Größe der Wärmeabgabe einordnen.',
      'Zusammenhang von Massenstrom, Vorlauf- und Rücklauftemperatur kennen.',
      'Anteile von Konvektion und Strahlung an der Wärmeabgabe unterscheiden.',
    ],
    photoCount: 2,
    durationMin: 5,
    difficulty: 'medium',
    passRatio: 0.6,
    quiz: [
      {
        id: 'hk1',
        question: 'Welche Größe treibt die Wärmeabgabe eines Heizkörpers maßgeblich an?',
        options: [
          'Die Übertemperatur zwischen Heizmittel und Raumluft',
          'Die Farbe des Heizkörpers',
          'Die Raumgröße allein',
          'Der Wasserdruck im Keller',
        ],
        correct: 0,
        explanation: 'Treibende Größe ist die Übertemperatur zwischen Heizmittel und Raumluft.',
      },
      {
        id: 'hk2',
        question: 'Was beschreibt die Normwärmeleistung?',
        options: [
          'Die Leistung unter genormten Randbedingungen (z. B. 75/65/20 °C)',
          'Die maximale Leistung bei beliebiger Temperatur',
          'Die elektrische Anschlussleistung',
          'Die Leistung bei abgeschalteter Pumpe',
        ],
        correct: 0,
        explanation: 'Die Normwärmeleistung gilt unter genormten Randbedingungen (z. B. 75/65/20 °C).',
      },
      {
        id: 'hk3',
        question: 'Wofür steht der Heizkörperexponent n?',
        options: [
          'Für die Nichtlinearität der Leistung über der Übertemperatur',
          'Für die Anzahl der Heizkörperrippen',
          'Für den elektrischen Wirkungsgrad',
          'Für die Drehzahl der Umwälzpumpe',
        ],
        correct: 0,
        explanation: 'Der Heizkörperexponent n beschreibt die Nichtlinearität der Leistung über der Übertemperatur.',
      },
      {
        id: 'hk4',
        question: 'Wie wird die treibende Temperaturdifferenz üblicherweise berechnet?',
        options: [
          'Als (logarithmische) mittlere Übertemperatur',
          'Als reine Vorlauftemperatur',
          'Als Außentemperatur minus Rücklauf',
          'Als konstante 50 K unabhängig vom Betrieb',
        ],
        correct: 0,
        explanation: 'Üblich ist die (logarithmische) mittlere Übertemperatur als treibende Differenz.',
      },
      {
        id: 'hk5',
        question: 'Welche Übertragungsarten überlagern sich bei einem Heizkörper?',
        options: [
          'Konvektion und Strahlung',
          'Nur Strahlung',
          'Nur Leitung im Metall',
          'Verdunstung und Kondensation',
        ],
        correct: 0,
        explanation: 'Heizkörper geben Wärme über Konvektion UND Strahlung ab.',
      },
      {
        id: 'hk6',
        question: 'Wie wirkt sich ein höherer Massenstrom bei gleicher Vorlauftemperatur tendenziell aus?',
        options: [
          'Die Rücklauftemperatur steigt und die mittlere Übertemperatur nimmt zu',
          'Die Wärmeleistung sinkt immer auf null',
          'Die Übertemperatur wird negativ',
          'Der Heizkörper kühlt vollständig aus',
        ],
        correct: 0,
        explanation: 'Höherer Massenstrom hebt die Rücklauftemperatur und damit die mittlere Übertemperatur.',
      },
    ],
  },
]
