// Erstentwurf – vom Nutzer zu prüfen.
// Fachliche Inhalte (FAQ, Glossar, Messungs-Hintergründe, Laborversuche) liegen
// bewusst hier als deutscher Content (NICHT in i18n). Nur die UI-Beschriftungen
// (Buttons, Überschriften, Labels) werden über i18next übersetzt.

export interface FaqItem {
  q: string
  a: string
  /** Optionale, anklickbare Quelle. */
  source?: { label: string; url: string }
  /** Hervorgehoben als „Beliebte Frage" oben in der FAQ-Liste. */
  popular?: boolean
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
  /** Optionale, anklickbare Quelle. */
  source?: { label: string; url: string }
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
  {
    q: 'Was bringt mir die E-App konkret?',
    a: 'Die App hilft dir, mit einfachen, geführten Messungen Energiefresser im Haushalt aufzuspüren, Einsparpotenziale in Euro abzuschätzen und deinen Verbrauch über die Zeit zu verfolgen. So werden abstrakte Kilowattstunden zu konkreten, nachvollziehbaren Beträgen – und du erkennst, welche Maßnahmen sich für dich am meisten lohnen.',
    popular: true,
  },
  {
    q: 'Brauche ich spezielle Messgeräte?',
    a: 'Für die meisten Messungen reichen Alltagsgegenstände wie ein Messbecher und eine Uhr. Für Strommessungen ist ein einfaches Steckdosen-Energiemessgerät hilfreich (ab wenigen Euro), für Temperaturen ein Thermometer oder Infrarot-Thermometer. Bei jeder Messung steht dabei, was du genau benötigst.',
  },
  {
    q: 'Wie viel Strom verbraucht der Standby-Betrieb wirklich?',
    a: 'Geräte im Bereitschaftsbetrieb ziehen rund um die Uhr Strom. Schon 5 Watt Dauerlast bedeuten über 8.760 Stunden im Jahr rund 44 kWh – je nach Strompreis etwa 13–18 € jährlich, und das pro Gerät. Über alle Geräte eines Haushalts summiert sich das oft auf einen dreistelligen Betrag. Schaltbare Steckdosenleisten oder Smart-Plugs beseitigen diese Last.',
    source: wiki('Bereitschaftsbetrieb'),
    popular: true,
  },
  {
    q: 'Welche Raumtemperatur ist sinnvoll?',
    a: 'Als Richtwert gelten rund 20 °C in Wohnräumen, etwas weniger in Schlafräumen (16–18 °C). Jedes Grad weniger senkt den Heizenergiebedarf um grob 6 %. Räume sollten aber nicht stark auskühlen, da das Wiederaufheizen Energie kostet und Feuchte-/Schimmelprobleme begünstigt.',
    source: wiki('Raumklima'),
    popular: true,
  },
  {
    q: 'Wie oft und wie richtig lüften?',
    a: 'Mehrmals täglich kurz stoßlüften (Fenster weit auf, 5–10 Minuten, am besten quer) statt Fenster dauerhaft auf Kipp. Stoßlüften tauscht die feuchte Luft schnell aus, ohne die Wände auszukühlen – das spart Heizenergie und beugt Schimmel vor.',
    source: wiki('Lüftung'),
  },
  {
    q: 'Welche Luftfeuchtigkeit ist gesund?',
    a: 'In Wohnräumen sind etwa 40–60 % relative Luftfeuchte ideal. Dauerhaft über 60 % begünstigt Schimmel, unter 30 % reizt Atemwege und Schleimhäute. Ein Hygrometer hilft, den Wert im Blick zu behalten und gezielt zu lüften.',
    source: wiki('Luftfeuchtigkeit'),
  },
  {
    q: 'Wie senke ich meinen Warmwasserverbrauch?',
    a: 'Ein Sparduschkopf reduziert den Durchfluss von oft 12–15 l/min auf 6–9 l/min – bei kaum spürbarem Komfortverlust. Da das Wasser zusätzlich erwärmt werden muss, sparst du doppelt: Wasser und Energie. Kürzere Duschzeiten und eine moderate Warmwassertemperatur (ca. 50–55 °C, auch aus Hygienegründen) wirken zusätzlich.',
    source: wiki('Warmwasser'),
  },
  {
    q: 'Lohnt sich ein hydraulischer Abgleich?',
    a: 'In den meisten Bestandsanlagen ja: Er sorgt dafür, dass jeder Heizkörper genau die richtige Wassermenge erhält. Ergebnis sind gleichmäßige Wärme, niedrigere Vorlauf-/Rücklauftemperaturen, weniger Strömungsgeräusche und ein messbar geringerer Energieverbrauch – besonders wichtig für effiziente Brennwert- und Wärmepumpenheizungen.',
    source: wiki('Hydraulischer_Abgleich'),
  },
  {
    q: 'Was unterscheidet Arbeitspreis und Grundpreis?',
    a: 'Der Arbeitspreis wird pro verbrauchter Kilowattstunde berechnet (ct/kWh) und steigt mit dem Verbrauch. Der Grundpreis ist ein fixer Betrag pro Abrechnungszeitraum, unabhängig vom Verbrauch (z. B. für Zähler und Netz). Beide zusammen ergeben deine Energiekosten.',
    source: wiki('Strompreis'),
  },
  {
    q: 'Ist häufiges Ein- und Ausschalten schädlich?',
    a: 'Bei den meisten modernen Geräten ist vollständiges Ausschalten klar sinnvoll. Der oft genannte hohe „Einschaltstrom" dauert nur Sekundenbruchteile und fällt über das Jahr kaum ins Gewicht gegenüber dauerhafter Standby-Last. Ausnahme: Geräte mit sehr häufigen Schaltzyklen oder Anlaufverschleiß (z. B. manche Leuchtmittel).',
  },
  {
    q: 'Wie viel spart der Wechsel auf LED?',
    a: 'LED-Lampen verbrauchen rund 80–90 % weniger Strom als klassische Glühlampen bei gleicher Helligkeit und halten deutlich länger. Gerade bei lange brennenden Leuchten (Küche, Wohnzimmer, Außenbeleuchtung) amortisiert sich der Tausch oft schon innerhalb eines Jahres.',
    source: wiki('Leuchtdiode'),
  },
  {
    q: 'Werden meine Daten irgendwohin übertragen?',
    a: 'Die App verarbeitet deine Eingaben lokal auf deinem Gerät. Es geht darum, dir selbst Transparenz über deinen Energieverbrauch zu geben – ohne dass deine Daten zwingend das Gerät verlassen. (Spätere Cloud-/Konto-Funktionen wären optional und klar gekennzeichnet.)',
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
