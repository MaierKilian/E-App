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

export interface MeasurementInfo extends LookupFields {
  /** i18n-Key-Suffix der Messung (measurements.<id>.title). */
  id: string
  /** Anzeige-Titel (kann auch über i18n aufgelöst werden – hier deutscher Fallback). */
  title: string
  body: string
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
    term: 'Arbeitspreis',
    def: 'Verbrauchsabhängiger Teil des Energiepreises, angegeben in Cent pro Kilowattstunde (ct/kWh). Multipliziert mit der verbrauchten Energiemenge ergibt er die variablen Energiekosten; zusammen mit dem Grundpreis bildet er den Gesamtpreis. Bei Strom liegt er typischerweise bei rund 25–40 ct/kWh, bei Gas niedriger.',
    source: wiki('Strompreis'),
  },
  {
    term: 'Brennwert / Heizwert',
    def: 'Der Heizwert (unterer Heizwert) ist die bei der Verbrennung nutzbar freigesetzte Wärme, ohne die Kondensationswärme des im Abgas enthaltenen Wasserdampfs. Der Brennwert (oberer Heizwert) schließt diese Kondensationswärme ein – Brennwertkessel nutzen sie zusätzlich und erreichen dadurch höhere Wirkungsgrade.',
    source: wiki('Heizwert'),
  },
  {
    term: 'CO₂ (Kohlenstoffdioxid)',
    def: 'Farb- und geruchloses Gas, das bei der Verbrennung fossiler Energieträger entsteht und als Treibhausgas zur Erderwärmung beiträgt. In Innenräumen ist die CO₂-Konzentration (in ppm) zudem ein Indikator für die Luftqualität: hohe Werte zeigen an, dass gelüftet werden sollte.',
    source: wiki('Kohlenstoffdioxid'),
  },
  {
    term: 'COP (Leistungszahl)',
    def: 'Der Coefficient of Performance beschreibt das momentane Verhältnis von abgegebener Wärmeleistung zu eingesetzter elektrischer Leistung einer Wärmepumpe. Ein COP von 4 bedeutet: aus 1 kWh Strom werden 4 kWh Wärme. Der über ein Jahr gemittelte Wert ist die Jahresarbeitszahl (JAZ).',
    source: wiki('Leistungszahl'),
  },
  {
    term: 'Differenzdruck',
    def: 'Druckunterschied zwischen zwei Punkten eines Systems, z. B. zwischen Vor- und Rücklauf einer Heizungsanlage. Er treibt den Volumenstrom an und ist eine zentrale Größe beim hydraulischen Abgleich; moderne Pumpen regeln den Differenzdruck konstant oder bedarfsabhängig.',
    source: wiki('Differenzdruck'),
  },
  {
    term: 'Endenergie',
    def: 'Energiemenge, die beim Verbraucher ankommt und tatsächlich genutzt wird (z. B. Strom an der Steckdose, Gas am Kessel). Sie liegt zwischen der Primärenergie (gesamte Vorkette) und der Nutzenergie (z. B. erzeugte Raumwärme).',
    source: wiki('Endenergie'),
  },
  {
    term: 'Energieeffizienzklasse',
    def: 'Einstufung von Geräten auf dem EU-Energielabel (Skala A bis G) nach ihrem Energieverbrauch. Sie hilft, beim Neukauf sparsame Geräte zu erkennen; seit 2021 gilt eine neue, strengere Skala ohne „A+++".',
    source: wiki('EU-Energielabel'),
  },
  {
    term: 'Förderhöhe',
    def: 'Druckhöhe, die eine Pumpe aufbauen kann, angegeben in Metern Wassersäule. Sie beschreibt, gegen welchen Strömungswiderstand die Pumpe ein bestimmtes Fördervolumen bewegen kann, und ist – zusammen mit dem Volumenstrom – Teil der Pumpenkennlinie.',
    source: wiki('Förderhöhe'),
  },
  {
    term: 'Grundpreis',
    def: 'Fixer, verbrauchsunabhängiger Betrag pro Abrechnungszeitraum (meist pro Jahr oder Monat) für die Bereitstellung der Energieversorgung – z. B. für Zähler, Netz und Abrechnung. Er fällt auch an, wenn wenig oder nichts verbraucht wird.',
    source: wiki('Strompreis'),
  },
  {
    term: 'Heizkörperexponent',
    def: 'Erfahrungswert (Formelzeichen n, meist etwa 1,3), der beschreibt, wie stark die Wärmeleistung eines Heizkörpers mit der Übertemperatur ansteigt. Er geht in die Umrechnung der Normwärmeleistung auf abweichende Betriebstemperaturen ein.',
    source: wiki('Heizkörper'),
  },
  {
    term: 'Heizkurve',
    def: 'Regelkennlinie, die die Vorlauftemperatur der Heizung in Abhängigkeit von der Außentemperatur festlegt: je kälter draußen, desto wärmer der Vorlauf. Eine möglichst flach und niedrig eingestellte Heizkurve senkt den Energieverbrauch, ohne den Komfort einzuschränken.',
    source: wiki('Heizkurve'),
  },
  {
    term: 'Hydraulischer Abgleich',
    def: 'Verfahren, bei dem die Wassermengen in einem Heizsystem so eingestellt werden, dass jeder Heizkörper genau den ausgelegten Volumenstrom erhält. Ergebnis sind gleichmäßige Wärmeverteilung, geringere Rücklauftemperaturen, weniger Strömungsgeräusche und ein spürbar niedrigerer Energieverbrauch.',
    source: wiki('Hydraulischer_Abgleich'),
  },
  {
    term: 'Jahresarbeitszahl (JAZ)',
    def: 'Verhältnis der über ein ganzes Jahr abgegebenen Wärme zur eingesetzten elektrischen Energie einer Wärmepumpe. Sie ist der praxisrelevante Mittelwert des COP über reale Betriebsbedingungen; je höher, desto effizienter die Anlage.',
    source: wiki('Jahresarbeitszahl'),
  },
  {
    term: 'Kavitation',
    def: 'Bildung und schlagartiges Zusammenfallen von Dampfblasen in einer Flüssigkeit, wenn der Druck lokal unter den Dampfdruck fällt (z. B. am Pumpeneintritt). Sie verursacht Geräusche, Leistungseinbußen und Materialschäden und wird über den NPSH-Wert vermieden.',
    source: wiki('Kavitation'),
  },
  {
    term: 'kWh (Kilowattstunde)',
    def: 'Einheit für Energie. Ein Gerät mit 1.000 Watt Leistung verbraucht in einer Stunde genau eine Kilowattstunde. Energiekosten ergeben sich aus verbrauchten kWh × Arbeitspreis.',
    source: wiki('Kilowattstunde'),
  },
  {
    term: 'Luftfeuchtigkeit (relativ)',
    def: 'Verhältnis des tatsächlichen Wasserdampfgehalts der Luft zum maximal möglichen bei der jeweiligen Temperatur, angegeben in Prozent. In Wohnräumen gelten etwa 40–60 % als behaglich; dauerhaft über 60 % begünstigt Schimmel, unter 30 % trocknet die Schleimhäute aus.',
    source: wiki('Luftfeuchtigkeit'),
  },
  {
    term: 'Photovoltaik',
    def: 'Direkte Umwandlung von Sonnenlicht in elektrischen Strom mithilfe von Solarzellen. Der erzeugte Strom kann selbst verbraucht, gespeichert oder ins Netz eingespeist werden und senkt den Bezug aus dem öffentlichen Netz.',
    source: wiki('Photovoltaik'),
  },
  {
    term: 'Primärenergie',
    def: 'Energiemenge, die unter Berücksichtigung der gesamten Vorkette (Gewinnung, Umwandlung, Transport, Verluste) eingesetzt wird, um die nutzbare Endenergie bereitzustellen. Der Primärenergiefaktor bewertet Energieträger ökologisch – Strom aus erneuerbaren Quellen schneidet besser ab.',
    source: wiki('Primärenergie'),
  },
  {
    term: 'Pumpenkennlinie / Betriebspunkt',
    def: 'Die Pumpenkennlinie zeigt die Förderhöhe einer Pumpe in Abhängigkeit vom Volumenstrom. Der Betriebspunkt ist der Schnittpunkt mit der Anlagenkennlinie (dem Widerstand des Rohrnetzes) – hier arbeitet die Pumpe tatsächlich. Drehzahlregelung verschiebt diesen Punkt energiesparend.',
    source: wiki('Kreiselpumpe'),
  },
  {
    term: 'Smart Meter',
    def: 'Intelligentes Messsystem, das den Energieverbrauch digital erfasst und fernauslesbar macht. Es liefert detaillierte Verbrauchsdaten (teils in Echtzeit) und ist Voraussetzung für variable Tarife und eine bessere Verbrauchssteuerung.',
    source: wiki('Intelligenter_Zähler'),
  },
  {
    term: 'Solarthermie',
    def: 'Nutzung der Sonnenstrahlung zur Wärmegewinnung über Kollektoren – meist für Warmwasser und zur Heizungsunterstützung. Im Unterschied zur Photovoltaik wird hier nicht Strom, sondern Wärme erzeugt.',
    source: wiki('Solarthermie'),
  },
  {
    term: 'Standby',
    def: 'Bereitschaftsbetrieb eines Geräts, in dem es nicht aktiv genutzt wird, aber weiterhin Strom verbraucht. Schon wenige Watt summieren sich über 8.760 Stunden im Jahr zu mehreren Kilowattstunden; schaltbare Steckdosenleisten oder Smart-Plugs schaffen Abhilfe.',
    source: wiki('Bereitschaftsbetrieb'),
  },
  {
    term: 'Thermostatventil',
    def: 'Selbsttätig regelndes Heizkörperventil, das den Wasserdurchfluss anhand der Raumtemperatur steuert. Über die Voreinstellung des Ventils wird der maximale Volumenstrom begrenzt – ein zentrales Stellglied beim hydraulischen Abgleich.',
    source: wiki('Thermostatventil'),
  },
  {
    term: 'Übertemperatur',
    def: 'Differenz zwischen der mittleren Heizmitteltemperatur und der Raumtemperatur. Sie ist maßgeblich für die abgegebene Wärmeleistung eines Heizkörpers; üblich ist die logarithmische Übertemperatur aus Vorlauf-, Rücklauf- und Raumtemperatur.',
    source: wiki('Heizkörper'),
  },
  {
    term: 'U-Wert',
    def: 'Wärmedurchgangskoeffizient in W/(m²·K). Er gibt an, wie viel Wärmeleistung pro Quadratmeter Bauteil und Grad Temperaturunterschied verloren geht – je kleiner der U-Wert, desto besser die Dämmung.',
    source: wiki('Wärmedurchgangskoeffizient'),
  },
  {
    term: 'Volumenstrom',
    def: 'Flüssigkeits- oder Gasmenge, die pro Zeiteinheit durch einen Querschnitt strömt, z. B. in Litern pro Stunde (l/h) oder Kubikmetern pro Stunde (m³/h). In Heizungen bestimmt er zusammen mit der Temperaturspreizung die transportierte Wärmeleistung.',
    source: wiki('Volumenstrom'),
  },
  {
    term: 'Vorlauf / Rücklauf',
    def: 'Der Vorlauf führt das warme Heizwasser zu den Heizkörpern, der Rücklauf das abgekühlte Wasser zurück zum Wärmeerzeuger. Die Differenz (Spreizung) ist ein wichtiger Effizienzindikator – eine niedrige Rücklauftemperatur ist besonders für Brennwert- und Wärmepumpenbetrieb günstig.',
    source: wiki('Vorlauftemperatur'),
  },
  {
    term: 'Wärmepumpe',
    def: 'Gerät, das Umweltwärme aus Luft, Erdreich oder Wasser mithilfe von elektrischem Strom auf ein nutzbares Temperaturniveau anhebt. Aus einem Teil Strom werden mehrere Teile Wärme (siehe COP/JAZ), weshalb Wärmepumpen sehr effizient heizen können.',
    source: wiki('Wärmepumpe'),
  },
  {
    term: 'Wärmerückgewinnung',
    def: 'Verfahren, bei dem die Wärme der Abluft genutzt wird, um zugeführte Frischluft vorzuwärmen (WRG). So lassen sich Lüftungswärmeverluste stark reduzieren – moderne Lüftungsanlagen erreichen Rückgewinnungsgrade von über 80 %.',
    source: wiki('Wärmerückgewinnung'),
  },
  {
    term: 'Watt (Leistung)',
    def: 'Einheit der Leistung, also der Energie pro Zeit (1 Watt = 1 Joule pro Sekunde). Sie beschreibt, wie schnell ein Gerät Energie umsetzt; über die Zeit ergibt die Leistung den Energieverbrauch in Wattstunden bzw. Kilowattstunden.',
    source: wiki('Watt_(Einheit)'),
  },
  {
    term: 'Wirkungsgrad',
    def: 'Verhältnis von nutzbarer Ausgangsenergie zu zugeführter Energie, meist in Prozent. Er beschreibt, wie verlustarm eine Umwandlung abläuft – z. B. bei Pumpen, Kesseln oder Motoren; der Rest geht überwiegend als Wärme verloren.',
    source: wiki('Wirkungsgrad'),
  },
]

// --- Hintergründe zu den Messungen (deutscher Fließtext) ---
export const MEASUREMENT_INFOS: MeasurementInfo[] = [
  {
    id: 'showerhead',
    title: 'Duschkopf-Durchfluss',
    body: 'Warmwasser ist nach dem Heizen oft der zweitgrößte Energieposten im Haushalt – und Duschen macht davon einen großen Teil aus. Ein herkömmlicher Duschkopf liefert 12–15 Liter pro Minute, ein Sparduschkopf nur etwa 6–9 Liter, ohne dass der Komfort spürbar leidet. Da jeder Liter zusätzlich von etwa 10 °C auf rund 38 °C erwärmt werden muss, spart ein geringerer Durchfluss doppelt: Trinkwasser und Heizenergie. So misst du: einen Messbecher unter den laufenden Duschkopf halten und stoppen, wie viele Liter in einer bestimmten Zeit zusammenkommen – daraus ergibt sich der Durchfluss in l/min.',
    source: wiki('Warmwasser'),
  },
  {
    id: 'room_temperature',
    title: 'Raumtemperatur',
    body: 'Die Raumtemperatur ist einer der größten Hebel beim Heizen: Jedes Grad weniger reduziert den Heizenergiebedarf um grob 6 %. Als Richtwerte gelten etwa 20 °C in Wohnräumen, 16–18 °C in Schlafräumen und um die 22 °C im Bad. Wichtig ist, Räume nicht stark auskühlen zu lassen – das spätere Wiederaufheizen kostet Energie und kühle Wandflächen begünstigen Feuchte und Schimmel. Miss die Temperatur in Raummitte, nicht direkt an Heizkörper oder Außenwand, und lass das Thermometer kurz angleichen.',
    source: wiki('Raumklima'),
  },
  {
    id: 'standby',
    title: 'Standby-Verbrauch',
    body: 'Viele Geräte ziehen auch im Bereitschaftsbetrieb dauerhaft Strom – Fernseher, Konsolen, PCs, Router, Ladegeräte oder Audioanlagen. Schon wenige Watt summieren sich über 8.760 Stunden im Jahr zu mehreren Kilowattstunden je Gerät; über den ganzen Haushalt entstehen schnell 50–150 € im Jahr „für nichts". Mit einem Steckdosen-Energiemessgerät bestimmst du die tatsächliche Standby-Leistung in Watt. Schaltbare Steckdosenleisten oder Smart-Plugs trennen mehrere Geräte auf einen Schlag vom Netz.',
    source: wiki('Bereitschaftsbetrieb'),
  },
  {
    id: 'fridge',
    title: 'Kühlschrank',
    body: 'Der Kühlschrank läuft rund um die Uhr und zählt damit zu den ständigen Stromverbrauchern. Eine Innentemperatur von etwa 5–7 °C ist ausreichend; jedes Grad kälter erhöht den Verbrauch spürbar (Richtwert ~6 % je Grad). Auch Gerätealter, Türdichtungen, Vereisung und der Aufstellort beeinflussen den Verbrauch – das Gerät sollte nicht neben Herd, Spülmaschine oder Heizung stehen. Zum Messen ein Thermometer in ein Glas Wasser in die Mitte stellen und nach einigen Stunden ablesen (das dämpft kurzfristige Schwankungen).',
    source: wiki('Kühlschrank'),
  },
  {
    id: 'freezer',
    title: 'Gefrierschrank',
    body: 'Gefriergeräte arbeiten dauerhaft auf tiefem Temperaturniveau und laufen ununterbrochen. Etwa −18 °C sind ausreichend – jedes Grad kälter kostet unnötig Energie. Eine Eisschicht an den Innenwänden wirkt wie eine Dämmung gegen die Kühlung: Schon wenige Millimeter Reif können den Stromverbrauch deutlich erhöhen, daher lohnt regelmäßiges Abtauen. Prüfe außerdem die Türdichtung und vermeide langes Offenstehen.',
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
