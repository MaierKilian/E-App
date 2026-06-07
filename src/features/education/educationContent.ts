// Erstentwurf – vom Nutzer zu prüfen.
// Fachliche Inhalte (FAQ, Glossar, Messungs-Hintergründe, Laborversuche) liegen
// bewusst hier als deutscher Content (NICHT in i18n). Nur die UI-Beschriftungen
// (Buttons, Überschriften, Labels) werden über i18next übersetzt.

export interface FaqItem {
  q: string
  a: string
}

export interface GlossaryItem {
  term: string
  def: string
  /** Quelle der Information (im Glossar anklickbar). */
  source: { label: string; url: string }
}

export interface MeasurementInfo {
  /** i18n-Key-Suffix der Messung (measurements.<id>.title). */
  id: string
  /** Anzeige-Titel (kann auch über i18n aufgelöst werden – hier deutscher Fallback). */
  title: string
  body: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  /** 0-basierter Index der korrekten Option. */
  correct: number
}

export interface LabExperiment {
  id: 'hydraulischer_abgleich' | 'pumpenpruefstand' | 'heizkoerperpruefstand'
  title: string
  course: string
  intro: string
  prep: string[]
  photoCount: number
  passRatio: number
  quiz: QuizQuestion[]
}

const COURSE = 'HTW Berlin · GEIT · Labor Mechanische Gebäudetechnik'

// --- FAQ (Erstentwurf) ---
export const FAQ: FaqItem[] = [
  {
    q: 'Was bringt mir die E-App konkret?',
    a: 'Die App hilft dir, mit einfachen, geführten Messungen Energiefresser im Haushalt aufzuspüren, Einsparpotenziale in Euro abzuschätzen und deinen Verbrauch über die Zeit im Blick zu behalten.',
  },
  {
    q: 'Brauche ich spezielle Messgeräte?',
    a: 'Für die meisten Messungen reichen Alltagsgegenstände (z. B. ein Messbecher und eine Uhr). Für Strommessungen ist ein einfaches Steckdosen-Energiemessgerät hilfreich, das es schon für wenige Euro gibt.',
  },
  {
    q: 'Wie viel Strom verbraucht der Standby-Betrieb wirklich?',
    a: 'Geräte im Bereitschaftsbetrieb können über das Jahr summiert spürbar ins Gewicht fallen. Schon wenige Watt Dauerlast bedeuten über 8.760 Stunden im Jahr mehrere Kilowattstunden – schaltbare Steckdosenleisten helfen.',
  },
  {
    q: 'Welche Raumtemperatur ist sinnvoll?',
    a: 'Als Richtwert gelten rund 20 °C in Wohnräumen und etwas weniger in Schlafräumen. Jedes Grad weniger spart grob etwa 6 % Heizenergie – ohne dass es unbehaglich werden muss.',
  },
  {
    q: 'Wie senke ich meinen Warmwasserverbrauch?',
    a: 'Ein Sparduschkopf reduziert die Durchflussmenge deutlich, ohne den Komfort stark einzuschränken. Kürzere Duschzeiten und eine moderate Warmwassertemperatur helfen zusätzlich.',
  },
  {
    q: 'Was unterscheidet Arbeitspreis und Grundpreis?',
    a: 'Der Arbeitspreis wird pro verbrauchter Kilowattstunde berechnet, der Grundpreis ist ein fixer Betrag pro Jahr unabhängig vom Verbrauch. Beide zusammen ergeben deine Energiekosten.',
  },
  {
    q: 'Lohnt sich das Abschalten von Geräten oder ist häufiges Ein-/Ausschalten schädlich?',
    a: 'Bei den meisten modernen Geräten ist das vollständige Ausschalten klar sinnvoll. Der oft genannte hohe Einschaltstrom fällt über das Jahr kaum ins Gewicht gegenüber dauerhafter Standby-Last.',
  },
  {
    q: 'Werden meine Daten irgendwohin übertragen?',
    a: 'Die App ist darauf ausgelegt, deine Eingaben lokal auf dem Gerät zu verarbeiten. Es geht primär darum, dir selbst Transparenz über deinen Energieverbrauch zu geben.',
  },
]

// --- Glossar (alphabetisch, Erstentwurf) ---
// Quellen verweisen auf die deutschsprachige Wikipedia (stabile, anklickbare
// Artikel-Links) als allgemein zugängliche Referenz. Bei fachlicher Prüfung
// können sie durch Primärquellen (z. B. VDI, Umweltbundesamt) ersetzt werden.
function wiki(article: string): { label: string; url: string } {
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
    body: 'Beim Duschen entstehen erhebliche Warmwasserkosten. Ein herkömmlicher Duschkopf liefert oft 12–15 Liter pro Minute, ein Sparduschkopf nur etwa 6–9 Liter – bei kaum spürbarem Komfortverlust. Da das Wasser zusätzlich erwärmt werden muss, spart ein geringerer Durchfluss doppelt: Wasser und Energie.',
  },
  {
    id: 'room_temperature',
    title: 'Raumtemperatur',
    body: 'Die Raumtemperatur ist einer der größten Hebel beim Heizen. Als Richtwert gelten rund 20 °C in Wohnräumen. Jedes Grad weniger reduziert den Heizenergiebedarf um grob 6 %. Wichtig ist, nicht einzelne Räume stark auskühlen zu lassen, da das Wiederaufheizen und Feuchteprobleme entstehen können.',
  },
  {
    id: 'standby',
    title: 'Standby-Verbrauch',
    body: 'Viele Geräte verbrauchen auch im Bereitschaftsbetrieb dauerhaft Strom. Schon wenige Watt summieren sich über 8.760 Stunden im Jahr zu mehreren Kilowattstunden. Mit einem Steckdosen-Energiemessgerät lässt sich die tatsächliche Standby-Last bestimmen; schaltbare Steckdosenleisten machen das Abschalten bequem.',
  },
  {
    id: 'fridge',
    title: 'Kühlschrank',
    body: 'Der Kühlschrank läuft rund um die Uhr und gehört damit zu den ständigen Stromverbrauchern. Eine Innentemperatur von etwa 7 °C ist ausreichend; jedes Grad kälter erhöht den Verbrauch. Auch Gerätealter, Dichtungen und der Aufstellort (nicht neben Wärmequellen) beeinflussen den Verbrauch deutlich.',
  },
  {
    id: 'freezer',
    title: 'Gefrierschrank',
    body: 'Gefriergeräte arbeiten dauerhaft auf tiefem Temperaturniveau. Etwa −18 °C sind ausreichend – kälter zu kühlen kostet unnötig Energie. Vereiste Innenflächen wirken als Isolierschicht und erhöhen den Verbrauch, daher lohnt regelmäßiges Abtauen.',
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
      },
      {
        id: 'pp3',
        question: 'Wie ändert sich der Volumenstrom Q näherungsweise mit der Drehzahl n?',
        options: ['Q ~ n', 'Q ~ n²', 'Q ~ n³', 'Q ~ 1/n'],
        correct: 0,
      },
      {
        id: 'pp4',
        question: 'Wie verhält sich die Antriebsleistung P näherungsweise zur Drehzahl n?',
        options: ['P ~ n³', 'P ~ n', 'P ~ n²', 'P ist von n unabhängig'],
        correct: 0,
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
      },
    ],
  },
]
