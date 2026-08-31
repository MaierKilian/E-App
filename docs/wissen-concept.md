# Wissen-Konzept – von der Bibliothek zur Erklär-Schicht

> Stand: 2026-08-31 · Spezifikation für den Bereich „Wissen" (FAQ, Glossar,
> Messungs-Hintergründe).
> **Noch nicht umgesetzt** – dies ist die Zielvorstellung, nicht der Ist-Zustand.
>
> Arbeitsstand und Etappenschnitt: `wissen-etappen.md`.
> Berührt `src/features/education/` und knüpft an die vorhandene
> Personalisierung in `src/features/tips/buildTips.ts` an.
> Löst die offenen Phasen 2–4 aus `ux-roadmap.md` ab und ersetzt sie.

---

## 0. Leitgedanke

> **Wissen ist keine Bibliothek neben der App, sondern die Erklär-Schicht der App.**

Daraus folgt die tragende Entscheidung: Jede Antwort rechnet, wo sie kann, mit
den Zahlen *dieses* Haushalts – und zwar über **dieselbe Rechenkette**, die
Tipps, Messergebnisse und Bericht schon benutzen. Es gibt keine zweite
Rechenkette für Wissen. (Dieselbe Regel, die den Tank-Umbau getragen hat.)

Drei Regeln tragen den Rest des Dokuments:

1. **Wissen kennt den Nutzer.** Ein Artikel, der bei einem Ölkessel von 1994
   dasselbe sagt wie bei einer Wärmepumpe von 2021, ist kein Wissen, sondern
   ein Suchmaschinen-Treffer.
2. **Ohne Daten bleibt der Artikel trotzdem vollständig.** Der persönliche Teil
   ist ein *Aufsatz*, kein Ersatz. Wer nichts gemessen hat, liest den
   allgemeinen Text – nie eine Lücke, nie „—".
3. **Wissen ist kein Ziel, sondern ein Weg.** Jeder Artikel führt weiter: in
   eine Messung, in einen Tipp, in einen Begriff. Und umgekehrt führt jedes
   Ergebnis, jeder Ausreißer im Monitoring in den passenden Artikel.

---

## 1. Warum sich der Bereich heute generisch anfühlt

Der Befund ist nicht „zu wenig Inhalt". Der Inhalt ist fachlich ordentlich. Es
sind vier strukturelle Gründe:

### 1.1 Wissen ist der einzige Bereich, der den Nutzer nicht kennt

Die ganze App ist persönlich: *deine* Räume, *dein* Zähler, *dein* Sparbetrag
in Euro. Nur Wissen nicht. `EducationPage.tsx` liest **keinen einzigen Store** –
nicht `onboardingStore`, nicht `measurementsStore`, nicht `readingsStore`, nicht
`tariffStore`. Dabei liegt alles bereit:

| Vorhandene Datenquelle | Was daraus im Wissen werden könnte |
|---|---|
| `OnboardingData` (Baujahr, Wärmeerzeuger + Baujahr, Dämmung, Fenster, Lüftung, PV, Fläche, Personen, Geräte) | Welcher Artikel überhaupt relevant ist – und mit welchen Zahlen |
| `measurementsStore` (9 Checks, teils mit €/Jahr) | „Bei dir gemessen: 22,4 °C im Wohnzimmer" |
| `readingsStore` + `tariffStore` | Der echte Arbeitspreis statt „ca. 25–40 ct/kWh" |
| `specificValues.ts` + `heatDemandBenchmark()` | „Dein Haus: 138 kWh/m²·a – Baujahrs-Richtwert wäre 160" |
| `buildTips.ts` | Die Brücke Artikel ↔ Handlung ist schon gebaut, nur nicht verdrahtet |

Der Standby-Artikel sagt heute „13–18 € jährlich, je nach Strompreis". Der
Strompreis dieses Haushalts steht in `tariffStore`. Der gemessene Standby-Wert
steht im `measurementsStore`. Der Satz könnte lauten: **„Deine 14 gemessenen
Watt kosten dich 41 € im Jahr."** Das ist derselbe Inhalt – und ein völlig
anderes Produkt.

### 1.2 Die Gliederung folgt Inhaltstypen, nicht Fragen

`FAQ · Glossar · Messungen` sind drei **Regalbretter einer Bibliothek**. Nutzer
denken aber nicht „ich brauche einen Glossareintrag", sondern „mein
Schlafzimmer wird nicht warm" oder „meine Abrechnung ist zu hoch".

Dazu kommt: FAQ und Glossar sind in `EducationPage.tsx` zweimal *dieselbe*
Komponente (Suchfeld + zugeklappte Accordions über einem flachen Array) mit
zwei getrennten Suchen. Und der Tab „Messungen" heißt genauso wie der echte
Messbereich in der Bottom-Nav – die Verwechslung ist schon in `ux-roadmap.md`
notiert und bis heute offen.

### 1.3 Kein Grund wiederzukommen

Zwischen zwei Besuchen ändert sich nichts. Kein Einstieg, kein „neu", kein
Fortschritt, keine Saison. Ein Nachschlagewerk wird einmal durchgeblättert und
danach nie wieder geöffnet – es sei denn, jemand hat eine konkrete Frage. Genau
dann aber sucht er nicht in der App, sondern im Web.

**Die Ironie:** Die App hat bereits eine vollwertige Lern-Maschine –
`src/features/education/flashcards/engine/` mit FSRS, SM2, Leitner,
Warteschlange, Sitzungslogik und Statistik (~2.100 Zeilen). Die Engine ist
inhaltsagnostisch: sie kennt nur `QueueCard { cardId, subjectId, setId }`. Sie
bedient heute ausschließlich HTW-Klausurstoff – also einen Nebenpfad, von dem
`EducationPage.tsx:66` selbst sagt, er werde „perspektivisch entfernt".
Der öffentliche Teil derselben Seite ist derweil eine Liste zugeklappter
Accordions.

### 1.4 Sackgassen in beide Richtungen

- Kein Messergebnis verlinkt in seinen Hintergrund.
- Kein Glossarbegriff verlinkt in die Messung, die ihn misst.
- Kein Tipp verlinkt in die Begründung.
- Kein Ausreißer im Monitoring verlinkt in die Erklärung.
- 4 der 9 Messungen (`hot_water_wait`, `furniture_spacing`, `lighting`,
  `base_load`) haben überhaupt keinen Hintergrundtext – `MEASUREMENT_INFOS`
  kennt nur 5.

### 1.5 Nebenbefund: Quellenlage

Alle 31 Glossar-Quellen zeigen über den Helfer `wiki()` auf die deutsche
Wikipedia. Für eine App, die Menschen zu vierstelligen Investitions­entscheidungen
berät, ist das die falsche Fußnote – der Kommentar im Code sieht das selbst so
vor („bei fachlicher Prüfung durch Primärquellen ersetzen"). Und die Datei
trägt in Zeile 1 bis heute `// Erstentwurf – vom Nutzer zu prüfen.`

---

## 2. Die sieben Bausteine

### B1 – Antworten, die mit deinen Zahlen rechnen

Jeder Artikel kann ein **„Bei dir"-Band** tragen: ein bis drei Sätze mit den
echten Werten dieses Haushalts, optisch abgesetzt, immer mit Herkunft
(„gemessen am 14.08." / „aus deinem Profil" / „geschätzt").

Beispiele:

| Artikel | Allgemein (heute) | „Bei dir" (Ziel) |
|---|---|---|
| Raumtemperatur | „jedes Grad ≈ 6 %" | „Wohnzimmer 22,4 °C gemessen. 2 Grad runter ≈ **74 €/Jahr** bei deinem Gaspreis." |
| Standby | „5 W ≈ 13–18 €/Jahr" | „Du hast **14 W** über 6 Geräte gemessen → **41 €/Jahr**." |
| Hydraulischer Abgleich | „lohnt sich meistens" | „Gasheizung von 1998, 4 Heizkörper mit Übertemperatur-Befund – hier lohnt es sich." |
| Arbeitspreis | „typisch 25–40 ct/kWh" | „Deiner: **34,2 ct/kWh**, Grundpreis 11,90 €/Monat." |
| Lüften | „40–60 % ideal" | „In deinem Bad wurden 68 % gemessen." |

**Technisch:** ein `knowledgeContext.ts` analog zu `useTipContext.ts` – Profil,
Messergebnisse, Zählerstände, Preise. Die €-Beträge kommen aus `impact.ts` /
`resultSavingsEur`, nicht aus neuer Arithmetik (Regel: keine zweite
Rechenkette). Es gilt derselbe Riegel wie bei `yieldsSaving` im Mess-Katalog:
Ein Band wird nur gezeigt, wenn die Zahl **heute** noch behauptet wird.

Fehlt die Datengrundlage, fehlt das Band – und darunter steht ein Einstieg:
*„Noch nicht gemessen · Standby-Check starten (12 Min)"*. Damit wird jeder
Artikel gleichzeitig ein Werbeträger für die Messungen.

### B2 – Themen statt Inhaltstypen

Neue oberste Ebene, nach **Nutzerproblemen** geschnitten:

```
Heizen · Warmwasser · Strom · Lüften & Feuchte · Kosten & Tarife · Sanieren & Fördern
```

Jedes Thema ist eine Seite mit immer demselben Aufbau:

1. **Deine Lage** – eine Statuszeile aus echten Daten
   („Gas: 138 kWh/m²·a · Richtwert für Baujahr 1975: 160")
2. **Artikel** des Themas, nach Relevanz fürs Profil sortiert
3. **Passende Messungen** (aus `MEASUREMENT_CATALOG`, gefiltert nach `category`)
4. **Passende Tipps** (aus `buildTips`)
5. **Begriffe** des Themas

Der Startschirm von „Wissen" wird damit:

```
┌───────────────────────────────────────┐
│ Wissen                                │
│ [ Suche über alles ]                  │  ← eine Suche: Artikel, Begriffe,
├───────────────────────────────────────┤     Messungen, Tipps, Mythen
│  FÜR DICH GERADE                      │
│  ┌─────────────────────────────────┐  │
│  │ Heizsaison beginnt              │  │  ← saison-/datenabhängig,
│  │ Deine Heizkurve ist bei …       │  │     max. 3 Karten
│  └─────────────────────────────────┘  │
├───────────────────────────────────────┤
│  THEMEN                               │
│  [Heizen] [Warmwasser] [Strom]        │  ← Kacheln mit Fortschritt
│  [Lüften] [Kosten] [Sanieren]         │
├───────────────────────────────────────┤
│  Nachschlagen  ·  Lernen  ·  Mythen   │
└───────────────────────────────────────┘
```

- **FAQ und Glossar verschmelzen** zu „Nachschlagen" mit *einer* Suche. Ein
  Begriff und eine Frage sind für den Suchenden dasselbe: ein Treffer.
- **Der Tab „Messungen" verschwindet.** Sein Inhalt wandert dorthin, wo er
  gebraucht wird: an die Messung selbst (B6). Damit ist auch die
  Namens­kollision mit der Bottom-Nav erledigt.

### B3 – Rechen-Antworten statt Beispielrechnungen

Statt „5 Watt Dauerlast ≈ 44 kWh" ein **Mini-Rechner im Artikel**, vorbelegt mit
den echten Werten des Nutzers und sofort reagierend:

- *Was kostet ein Grad?* – Regler 18–24 °C → €/Jahr bei deinem Wärmepreis
- *Was kostet mein Standby?* – Watt + Stunden → €/Jahr
- *Sparduschkopf* – l/min alt/neu, Duschdauer, Personen → €/Jahr
- *Trockner vs. Wäscheleine* – Ladungen/Woche → €/Jahr
- *Warmwasser-Temperatur* – 60 °C vs. 50 °C → €/Jahr (mit Legionellen-Hinweis)
- *Reicht mein Öl bis April?* – nutzt die vorhandene `range.ts`

Jeder Rechner endet nicht mit einer Zahl, sondern mit einer **Handlung**:
„Messung starten" oder „Als Tipp merken".

Regel: Ein Rechner rechnet nie etwas, das die App an anderer Stelle schon
rechnet – er ruft dieselbe Funktion auf.

### B4 – Mythen-Check: „Stimmt das?"

Das Format, das den Bereich am schnellsten unverwechselbar macht. Kurzkarten
mit klarem Urteil:

| Behauptung | Urteil |
|---|---|
| „Heizung nachts ganz aus spart am meisten." | **Kommt drauf an** |
| „Fenster auf Kipp lüftet auch." | **Falsch** |
| „Standby ist bei modernen Geräten egal." | **Falsch** |
| „Wärmepumpen funktionieren im Altbau nicht." | **Falsch** |
| „Handy-Ladegerät in der Dose zieht viel Strom." | **Kaum noch** |
| „Kürzer duschen bringt mehr als ein Sparduschkopf." | **Falsch** |
| „Balkonkraftwerke rechnen sich nicht." | **Kommt drauf an** |
| „Heizkörper entlüften spart Energie." | **Stimmt** |

Aufbau je Karte: Behauptung → Urteils-Badge → **warum** (der ehrliche Teil,
inklusive „kommt drauf an, weil …") → *bei dir* (B1) → Quelle.

Warum das trägt: Es beantwortet Fragen, die Menschen **wirklich** haben und über
die sie streiten; es ist erzählbar; es kostet 20 Sekunden pro Karte; und es ist
das natürliche Futter für das Lern-Deck (B7).

### B5 – Entscheidungshilfen

Der größte Sprung im wahrgenommenen Wert: **von der Enzyklopädie zum Berater.**

Kurze geführte Strecken zu genau den Fragen, an denen Haushalte hängenbleiben:

- Lohnt sich eine **Wärmepumpe** bei mir?
- Lohnt sich ein **Balkonkraftwerk**?
- Lohnt sich **Dämmen der obersten Geschossdecke**?
- **Sparduschkopf** oder Durchflussbegrenzer?
- **Thermostate** tauschen – lohnt das?
- Ist mein **Kessel** am Ende seiner Nutzungsdauer?
- **Fenster** tauschen oder erstmal nachrüsten?

Der Clou: Die Strecke fängt **nicht bei null** an. Baujahr, Fläche, Erzeuger und
dessen Baujahr, Dämmzustand, Fensteralter, PV, Personen – alles steht im
Onboarding-Profil. Statt 15 Fragen bleiben zwei bis vier, und die Strecke sagt
das auch: *„Ich rechne mit: Reihenhaus, 1975, 142 m², Gaskessel von 1998.
Stimmt das noch?"*

Ergebnis ist eine **Spanne**, keine Scheingenauigkeit: Investition,
Einsparung €/Jahr, grobe Amortisation, CO₂ – plus „was jetzt zu tun ist" und
„welche Messung diese Annahme prüft". Fördermittel (BAFA/KfW) werden als
Größenordnung mit Datum genannt, nicht als Zusage.

**Abgrenzung, die im Text stehen muss:** Das ersetzt keine
Energieberatung nach GEG. Es sagt, ob sich das Gespräch lohnt.

### B6 – Die Einstiege umdrehen

Heute muss der Nutzer auf „Wissen" tippen. Künftig kommt Wissen zu ihm:

| Ort | Einstieg |
|---|---|
| Messergebnis | „Warum ist das so?" → Hintergrund-Artikel |
| Messung vor dem Start | „Was messe ich hier eigentlich?" (ersetzt `MEASUREMENT_INFOS`) |
| Monitoring-Ausreißer | „Verbrauch +18 % ggü. Vorjahr – woran liegt das?" |
| Tipp | „Warum das wirkt" |
| Bericht (PDF) | Fußnoten mit Begriffserklärungen |
| App-weit | Fachbegriffe werden antippbar → Begriffs-Sheet |

Der letzte Punkt macht das Glossar von einem Tab zu **Infrastruktur**: eine
`<Term>`-Komponente, die überall im Text stehen kann und ein Bottom-Sheet mit
Definition, Quelle und Weiterführung öffnet. Ein Begriff ist dann keine
Sackgasse mehr, sondern der Klebstoff der App.

### B7 – Behalten statt nur lesen

Die vorhandene SR-Engine bekommt öffentlichen Inhalt: ein Deck
**„Energiewissen"** aus Glossarbegriffen, Mythen-Urteilen und den Kernaussagen
der Artikel. Themenweise wählbar („nur Heizen"), 5 Karten am Tag, Terminierung
über FSRS.

**Warum das und nicht XP/Streak/Badges:** Ein Punktesystem ist eine Belohnung,
die man sich ausdenkt. Wiederholung ist ein Nutzen, den man behält – und die
Maschine dafür ist bereits gebaut und getestet. Der Wiederkehrgrund entsteht aus
der Sache selbst („5 Karten fällig"), nicht aus einer Zahl. Das trifft auch
genau die in `ux-roadmap.md` festgelegte Tonalität: dezent und seriös.

**Aufwand:** Die Engine bleibt **unangetastet**. Es braucht eine zweite
Inhaltsquelle und eine Erweiterung der Brücke `cardIndex.ts` – die Engine kennt
ohnehin nur IDs.

Nebenwirkung: Der HTW-Teil und das Energiewissen teilen sich dann eine
Lernoberfläche unter `/lernen`. Wird der Hochschulteil später entfernt, bleibt
die Maschine – heute wäre sie mit ihm verschwunden.

### B8 – Vertrauen und Aktualität

Kein eigener Baustein im Sinne von Oberfläche, aber Voraussetzung für alles
andere:

- **Primärquellen** statt Wikipedia: Umweltbundesamt, BDEW, dena,
  Verbraucherzentrale, BAFA/KfW, VDI/DIN, Fraunhofer ISE. Wikipedia nur noch
  ergänzend.
- **Stand-Datum** an jedem Artikel („geprüft 08/2026"). Preise und
  Förderbeträge veralten – das muss sichtbar sein.
- **Zahlen mit Spannen und Herkunft**, nie mit falscher Präzision.
- Der Vermerk `// Erstentwurf – vom Nutzer zu prüfen.` fällt erst, wenn der
  Inhalt tatsächlich geprüft ist.

---

## 3. Datenmodell

Heute drei getrennte, flache Typen (`FaqItem`, `GlossaryItem`,
`MeasurementInfo`) ohne gemeinsame Klammer. Künftig ein Typ mit Rolle:

```ts
type ArticleKind = 'answer' | 'term' | 'background' | 'myth' | 'guide'
type Topic = 'heating' | 'hot_water' | 'electricity' | 'ventilation'
           | 'cost' | 'renovation'

interface Article {
  id: string                    // stabil – trägt Lernfortschritt und Deep-Links
  kind: ArticleKind
  topic: Topic
  title: string
  teaser: string                // ein Satz, für Suche und Kacheln
  body: Block[]                 // Absätze, Listen, Rechner, Merksätze
  verdict?: 'true' | 'false' | 'depends'   // nur bei kind: 'myth'
  terms?: string[]              // verlinkte Begriffe
  measurements?: MeasurementId[]// „das misst du so"
  tips?: string[]               // Tipp-IDs
  personal?: PersonalBandId     // welches „Bei dir"-Band greift
  sources: Source[]
  reviewedAt: string            // 'YYYY-MM'
  cards?: CardSeed[]            // Saat für das Lern-Deck (B7)
}
```

Wichtig:
- **IDs sind stabil.** Am Artikel hängen Lernfortschritt und Deep-Links; ein
  umbenannter Artikel verliert beides. (Dieselbe Regel wie bei den Karteikarten.)
- **Fachinhalt bleibt deutscher Content in `.ts`**, nicht in i18n – so wie es
  `educationContent.ts` und `flashcardsContent.ts` heute schon halten. Nur
  UI-Beschriftungen laufen über i18next.
- **`personal` ist eine ID, kein Text.** Die Bänder sind Funktionen über den
  `KnowledgeContext`, damit sie testbar sind und keine Store-Zugriffe im Content
  stehen.

---

## 4. Was das für die bestehende Roadmap heißt

`ux-roadmap.md` bleibt als Analyse gültig; Phase 0 und 1 sind erledigt. Die
offenen Phasen 2–4 werden von diesem Konzept **ersetzt**, mit einer bewussten
Abweichung:

| Roadmap (Phase 2) | Dieses Konzept |
|---|---|
| XP, Level, Badges, Erfolge-Galerie | **entfällt** – ersetzt durch echte Wiederholung (B7) |
| Streak + Wochenring | nur der Lern-Streak, den die Engine ohnehin führt |
| Profilbasierte Empfehlungen | **Kern** statt Phase 3 (B1, B2) |
| Begriffs-Verlinkung FAQ↔Glossar↔Messung | **Kern** (B6) |

Begründung für den Streich: Ein zweites Belohnungssystem neben Messungen,
Sparbeträgen und Lernfortschritt macht die App lauter, nicht wertvoller. Die
Zahl, die diesen Nutzer motiviert, steht schon auf dem Schirm – sie hat ein
Eurozeichen.

---

## 5. Abnahme – woran man merkt, dass es gelungen ist

1. Ein Nutzer mit ausgefülltem Profil und drei Messungen findet auf jedem
   zweiten Artikel **seine eigene Zahl**.
2. Ein Nutzer ohne jede Messung liest denselben Artikel **ohne Lücke** – und
   bekommt einen Einstieg angeboten.
3. Von jedem Messergebnis führt genau ein Tipp in den Hintergrund, und von jedem
   Artikel führt mindestens ein Weg zurück in eine Handlung.
4. Alle 9 Messungen haben einen Hintergrund (heute: 5).
5. Eine Suche findet Fragen, Begriffe, Messungen und Mythen (heute: zwei
   getrennte Suchen über je ein Array).
6. Die Frage „Lohnt sich eine Wärmepumpe bei mir?" wird mit einer **Spanne in
   Euro für dieses Haus** beantwortet, nicht mit einem Absatz.
7. Kein Artikel ohne Primärquelle und Stand-Datum.
