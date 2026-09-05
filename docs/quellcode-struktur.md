# Die Quellcode-Struktur der E-App — Erläuterung zur Abbildung

> **Zweck dieses Dokuments.** Es ist die Informationsquelle für die Erklärung
> der Abbildung „Verzeichnisstruktur des Quellcodes der E-App" in einer
> Hausarbeit. Es beschreibt vollständig, **was** die Grafik zeigt, **warum** die
> Struktur so gewählt wurde und **welche Überlegung hinter jeder Ebene** steht.
> Es ist bewusst so geschrieben, dass ein interessierter Leser ohne
> IT-Hintergrund folgen kann; Fachbegriffe werden bei ihrer ersten Verwendung
> erklärt und in Abschnitt 12 noch einmal gesammelt.
>
> Stand: 05.09.2026 · Projektversion 0.6.0 · alle Zahlen aus dem Repository
> `MaierKilian/E-App` ausgezählt, nicht geschätzt.

---

## 1. Worum es geht: die E-App in fünf Sätzen

Die E-App ist eine Web-Anwendung zur **selbst durchführbaren Energieanalyse im
Haushalt**. Der Nutzer beantwortet zunächst einen Fragebogen zu seiner Wohnung,
führt anschließend einfache Messungen durch (etwa: Wie viel Wasser läuft durch
den Duschkopf? Wie kalt ist der Kühlschrank eingestellt? Wie hoch ist die
Grundlast, wenn alles ausgeschaltet ist?), trägt regelmäßig Zählerstände ein und
erhält daraus Auswertungen, Handlungsempfehlungen und einen PDF-Bericht. Ein
Wissensbereich liefert die Hintergründe dazu. Die App läuft im Browser, speichert
die Daten zunächst auf dem Gerät des Nutzers und synchronisiert sie auf Wunsch
über ein Cloud-Backend.

Das ist wichtig für das Verständnis der Struktur: Die App besteht nicht aus
einer Funktion, sondern aus **fünf großen, fachlich unterschiedlichen Bereichen**
— Fragebogen, Messungen, Monitoring, Berichte, Wissen — die alle auf dieselben
Daten zugreifen. Genau diese Ausgangslage bestimmt den Aufbau des Quellcodes.

---

## 2. Warum Quellcode überhaupt eine Ordnerstruktur braucht

Ein Programm ist technisch gesehen Text in vielen Dateien. Der Computer wäre es
gleichgültig, wie diese Dateien abgelegt sind — er liest ohnehin alle. Die
Ordnerstruktur existiert **ausschließlich für den Menschen**. Sie beantwortet
drei Fragen, die sich in einem Projekt dieser Größe — rund 46.000 Zeilen
Anwendungscode, verteilt auf 390 Code-Dateien — täglich stellen:

1. **Wo finde ich das, was ich ändern will?**
2. **Was zerbreche ich, wenn ich es ändere?**
3. **Wo gehört etwas Neues hin?**

Eine gute Struktur beantwortet alle drei, ohne dass jemand das ganze Projekt im
Kopf haben muss. Eine schlechte erzwingt genau das — und wird bei jeder
Erweiterung teurer.

### Die naheliegende Analogie

Ein Ingenieurbüro kann seine Projektunterlagen auf zwei Arten ablegen:

**(a) Nach Dokumentart.** Ein Ordner für alle Zeichnungen, einer für alle
Berechnungen, einer für alle Ausschreibungstexte — quer über sämtliche Projekte.
Wer wissen will, wie eine bestimmte Zeichnung entsteht, findet sie schnell. Wer
aber *ein Projekt* bearbeiten will, muss in jedem Ordner suchen und in jedem
etwas ändern.

**(b) Nach Projekt.** Ein Ordner je Bauvorhaben, darin die Zeichnungen,
Berechnungen und Texte *dieses* Vorhabens. Wer ein Projekt bearbeitet, hat alles
an einem Ort. Was wirklich für alle Projekte gilt — Bürostandards, Vorlagen,
Normenauszüge — liegt zusätzlich in einem gemeinsamen Bereich.

Die E-App ist nach **(b)** geordnet. In der Softwareentwicklung heißt dieses
Prinzip **„vertikaler Schnitt"** oder *feature-based structure*: gegliedert wird
nach Fachthema, nicht nach technischer Dateiart. Der Gegenentwurf (a) heißt
**„Schichtenarchitektur"** (*layer-based*) und ist in kleineren Projekten
verbreitet. Abschnitt 8 begründet die Wahl ausführlich.

---

## 3. Das Bauprinzip in einem Satz

> **Siebzehn fachlich eigenständige Bereiche liegen nebeneinander in
> `src/features/`; darunter liegen fünf schmale Querschnittsschichten, die alle
> Bereiche gemeinsam benutzen.**

Bildlich: Die `features/` sind die Wohnungen eines Hauses — jede für sich
abgeschlossen und begreifbar. Die Querschnittsschichten (`components/`,
`store/`, `lib/`, `i18n/`, `types/`) sind Treppenhaus, Steigleitungen und
Hausanschluss — sie gehören keiner Wohnung, aber jede ist auf sie angewiesen.

Aus diesem Bild folgt die einzige echte Regel der Struktur:

- Ein `feature`-Ordner darf die Querschnittsschichten benutzen.
- Ein `feature`-Ordner sollte **nicht** in einem anderen `feature`-Ordner
  herumgreifen. Braucht ein zweiter Bereich dieselbe Sache, wandert sie nach
  unten in eine Querschnittsschicht.

Genau dieser Vorgang ist im Projekt mehrfach dokumentiert. Ein Beispiel aus
`measurements/catalog.ts`:

> *„Farbe je Gewerk. Lag vorher in `views/TradesView.tsx` und war damit an eine
> Ansicht gebunden — der Wissensbereich zeigt dieselben Gewerke und hätte die
> Werte sonst abschreiben müssen."*

Das ist die Struktur bei der Arbeit: Sobald ein zweiter Ort dieselbe Information
braucht, zieht sie um — statt kopiert zu werden. Zwei Kopien wären zwei
Gelegenheiten, auseinanderzulaufen.

---

## 4. Die verwendeten Dateiarten

Ein häufiges Missverständnis über Web-Anwendungen: Man vermutet HTML und CSS als
tragende Bestandteile. Bei der E-App ist das **nicht** so, und die Grafik macht
das sichtbar.

| Endung | Anzahl | Was darin steht |
|---|---:|---|
| `.ts` | **221** | TypeScript — **reine Logik**: Berechnungen, Bewertungsregeln, Datenmodelle, Zustandsverwaltung. Enthält keine Bildschirmdarstellung. |
| `.tsx` | **153** | TypeScript **mit JSX** — die sichtbaren Bausteine der Oberfläche (Schaltflächen, Karten, Seiten). |
| `.md` | 30 | Markdown — Dokumentation, Konzepte, Arbeitsstände. Kein ausführbarer Code. |
| `.json` | 10 | Konfiguration und die beiden Sprachdateien. |
| Medien | 26 | `.webp`, `.png`, `.svg`, `.mp4`, `.webm` — Bilder und Videos zu den Messungen. |
| `.yml` | 3 | Automatisierung (Tests und Veröffentlichung, siehe 6.9). |
| `.html` | 3 | Nur die Einstiegshülle und zwei statische Zusatzseiten. |
| `.js` | 2 | JavaScript — die Server-Funktion und eine Prüfkonfiguration. |
| `.css` | 1 | Eine einzige Datei mit den Farb- und Themevariablen. |
| `.rules` | 1 | Zugriffsregeln der Cloud-Datenbank. |

**Rund 96 % des Codes sind TypeScript** (374 von 390 Code-Dateien).

### Was diese Begriffe bedeuten

**TypeScript** ist JavaScript — die Sprache, die Browser ausführen — erweitert um
**Typangaben**. Eine Typangabe legt fest, welche Art von Wert an einer Stelle
erlaubt ist. Steht dort „Temperatur ist eine Zahl", meldet der Rechner schon
beim Schreiben einen Fehler, wenn versehentlich ein Text zugewiesen wird. Der
Nutzen ist derselbe wie bei Einheiten in einer technischen Berechnung: Ein
großer Teil der Fehler fällt auf, bevor irgendetwas läuft.

**JSX** ist eine Schreibweise, die HTML-artige Struktur direkt in den Code
schreiben lässt. Deshalb die zwei Endungen: `.tsx` enthält Oberfläche, `.ts`
nicht. **Diese Unterscheidung ist die wichtigste in der ganzen Abbildung** —
sie trennt „was gerechnet wird" von „was man sieht".

**Warum fast kein HTML und CSS?**

- **HTML:** Es gibt genau eine relevante HTML-Datei (`index.html`) — eine leere
  Hülle mit einem einzigen Platzhalter. Alles Sichtbare erzeugt React zur
  Laufzeit in die Hülle hinein. HTML ist hier also **Rahmen, nicht Inhalt**.
- **CSS:** Die Gestaltung entsteht über sogenannte **Utility-Klassen** von
  Tailwind CSS, die unmittelbar neben dem jeweiligen Baustein in der
  `.tsx`-Datei stehen. Der Vorteil: Aussehen und Baustein liegen an derselben
  Stelle; wer einen Baustein löscht, hinterlässt keine verwaisten Stilregeln.
  Übrig bleibt eine einzige CSS-Datei (`src/index.css`, 840 Zeilen) mit dem, was
  wirklich global gilt: den Farbwerten der drei Themes (Hell, Dunkel, HTW-Grün).

Damit ist eine mögliche Rückfrage zur Grafik beantwortet: Das Fehlen von
HTML- und CSS-Ordnern ist **kein Versäumnis, sondern das Ergebnis der gewählten
Technik**.

---

## 5. Die Größenverhältnisse

| Bereich | Umfang |
|---|---:|
| `src/` — Anwendungscode | ~46.300 Zeilen (22.100 Logik, 23.400 Oberfläche, 840 CSS) |
| `src/i18n/locales/` — Sprachdateien | 5.608 Zeilen (2.804 je Sprache, exakt gleich lang) |
| `tests/` — automatische Tests | 10.783 Zeilen |
| `docs/` — Dokumentation | 9.844 Zeilen |

Zwei Verhältnisse sind für die Bewertung des Projekts aussagekräftig:

- **Logik zu Oberfläche ≈ 1 : 1.** Die App ist keine reine Bildschirmmaske. Auf
  jede Zeile Darstellung kommt etwa eine Zeile Berechnung — bei einer
  Energieanalyse-App das zu erwartende und erwünschte Bild.
- **Test-Code entspricht ~23 % des Anwendungscodes.** 72 Testdateien prüfen die
  Rechenwege automatisch bei jeder Änderung. Dass das überhaupt möglich ist,
  hängt unmittelbar an der Struktur — siehe 7.1.

---

## 6. Die Struktur Ebene für Ebene

Die maximale Verschachtelungstiefe beträgt **fünf Ebenen**
(`src/features/education/flashcards/engine/`). Das ist bewusst flach: Jede
zusätzliche Ebene ist ein weiterer Ort, an dem gesucht werden muss.

### 6.1 Das Wurzelverzeichnis — 15 Konfigurationsdateien

Hier steht nichts, was der Nutzer je sieht: Bauanweisungen und Regeln.

| Datei | Aufgabe |
|---|---|
| `package.json` | Verzeichnis aller verwendeten Fremdbibliotheken samt Version. Vergleichbar einer Stückliste. |
| `vite.config.ts` | Konfiguration des Build-Werkzeugs, das aus 391 Dateien ein auslieferbares Paket macht. |
| `tsconfig*.json` (3×) | Regeln der Typprüfung — u. a. „ungenutzte Variablen sind ein Fehler". |
| `eslint.config.js` | Stilregeln für einheitliches Schreiben. |
| `vitest.config.ts` | Konfiguration der Testausführung. |
| `firebase.json`, `firestore.rules`, `.firebaserc` | Cloud-Backend: Auslieferung und **Zugriffsregeln** — wer welche Daten lesen und schreiben darf. |
| `index.html` | Die erwähnte Hülle. |
| `README.md`, `CLAUDE.md` | Einstieg für Menschen bzw. Arbeitsanweisungen für die KI-gestützte Entwicklung. |

### 6.2 `src/` — der eigentliche Anwendungscode

Zwei Dateien liegen direkt darin, und beide sind Anfangspunkte:

- `main.tsx` — der **Startpunkt der Anwendung**. Sieben Zeilen genügen: Themes
  laden, Sprachen laden, Cloud-Synchronisation starten, App anzeigen.
- `index.css` — die einzige globale Stildatei.

### 6.3 `src/app/` — das Gerüst (6 Dateien)

Was für die ganze App gilt, unabhängig vom Fachthema:

- `App.tsx` — legt fest, welche Adresse (`/measurements`, `/reports` …) welchen
  Bereich anzeigt.
- `Layout.tsx` — der immer gleiche Rahmen: Kopfzeile, Navigationsleiste, Fußzeile.
- `navigation.ts` — die **Liste der fünf Hauptbereiche an genau einer Stelle**.
  Der Kommentar im Code nennt den Grund: *„Wird sowohl von der Kopfzeile
  (Desktop) als auch von der unteren Navigationsleiste (Mobil) genutzt, damit die
  Navigation nur an einer Stelle gepflegt werden muss."*
- `themes.ts`, `useApplyTheme.ts` — die drei Farbschemata.
- `version.ts` — die Versionsnummer.

### 6.4 `src/components/` — wiederverwendbare Bausteine (9 + 15 Dateien)

Zwei Ebenen mit einer klaren Trennlinie:

- **`components/` (9 Dateien)** — Bausteine, die *diese* App kennt: Kopfzeile,
  untere Navigationsleiste, Profilmenü, Anmelde-Sperre, Startbildschirm.
- **`components/ui/` (15 Dateien)** — **völlig allgemeine** Bausteine, die von
  der Energieanalyse nichts wissen: `Card`, `Modal`, `Slider`, `Toggle`,
  `Stopwatch`, `Stepper` (das Zahlenfeld mit Plus/Minus), `ProgressRing`. Sie
  ließen sich unverändert in einer beliebig anderen App verwenden.

Warum diese Trennung eine praktische Wirkung hat, zeigt ein realer Fall aus der
Projektgeschichte: Der Wunsch, bei gedrückt gehaltener Plus-Taste automatisch
weiterzuzählen, wurde **einmal** in `ui/Stepper.tsx` umgesetzt — und wirkte
sofort an allen fünf Stellen, an denen Zahlen eingegeben werden. Der
Duschkopf-Test hatte sich seinerzeit ein eigenes Zahlenfeld gebaut und ging
deshalb zunächst leer aus; er wurde später auf den gemeinsamen Baustein
umgestellt, um dieselbe Verbesserung zu erhalten. Das ist der Nutzen einer
gemeinsamen Bausteinebene in einem Satz: **eine Änderung, überall wirksam.**

### 6.5 `src/features/` — die 17 Fachbereiche

Der Ordner selbst enthält **keine einzige Datei** — er ist reiner Behälter. Das
ist Absicht und in der Grafik erkennbar: Er trägt keine Logik, er ordnet nur.

| Ordner | Dateien | Fachlicher Inhalt |
|---|---:|---|
| `onboarding/` | 16 + 9 | Der Fragebogen zur Wohnung: Räume, Heizung, Geräte, Ziele. |
| `measurements/` | 31 + 39 | Alle Messungen samt Rahmenwerk. Der größte Bereich. |
| `monitoring/` | 30 | Zählerstände, Tankfüllstände, Verlaufsdiagramme, Foto-Erkennung von Zählern. |
| `reports/` | 13 + 3 | Erzeugung der PDF-Berichte. |
| `education/` | 6 + 36 | Wissensbereich: FAQ, Glossar, Lernkarten. |
| `tips/` | 4 | Die Empfehlungs-Engine: Aus Profil und Messergebnissen werden Handlungsvorschläge. |
| `legal/` | 9 | Impressum, Datenschutzerklärung, Cookie-Einwilligung. |
| `home/` | 7 | Startseite mit Übersichtskacheln. |
| `feedback/` | 6 | Rückmeldungen der Nutzer inkl. Bildschirmfoto. |
| `demo/` | 4 | Eine vorausgefüllte Demo-Wohnung zum Ausprobieren. |
| `landing/` | 4 | Die öffentliche Startseite vor der Anmeldung. |
| `profiles/` | 4 | Mehrere Wohnungen je Konto, Freigabe an andere. |
| `settings/` | 4 | Einstellungen, Datenlöschung. |
| `auth/` | 3 | An- und Abmeldung. |
| `sync/` | 3 | Abgleich mit der Cloud. |
| `analytics/` | 1 | Nutzungsstatistik — erst **nach** ausdrücklicher Einwilligung. |
| `billing/` | 1 | Vorbereitung kostenpflichtiger Funktionen. |

Die Größenunterschiede (31 gegenüber 1 Datei) sind kein Mangel, sondern ein
**Abbild der fachlichen Wirklichkeit**: Messungen sind das Herzstück der App,
die Nutzungsstatistik ist ein Schalter. Eine Struktur, die beide gleich groß
darstellte, wäre die schlechtere.

### 6.6 Die tieferen Ebenen — wo weiter unterteilt wird und warum

Unterordner entstehen **nur dort, wo ein Bereich zu groß für einen Blick wird**.
Vier Bereiche haben sie:

#### `measurements/` — 10 Unterordner

31 Dateien liegen direkt im Ordner: das gemeinsame **Rahmenwerk** aller
Messungen — Katalog, Ablaufsteuerung, Bewertungslogik, Raumverwaltung,
Fortschrittsberechnung. Darunter neun Ordner für die **neun Messungen** plus
`views/` für die drei Ansichten (empfohlen / nach Gewerk / nach Raum):

`base_load/` (Grundlast) · `freezer/` (Gefriergerät) · `fridge/` (Kühlschrank) ·
`furniture_spacing/` (Möbelabstand zum Heizkörper) · `hot_water_wait/`
(Warmwasser-Wartezeit) · `lighting/` (Beleuchtung) · `room_temperature/`
(Raumklima) · `showerhead/` (Duschkopf-Durchfluss) · `standby/`
(Standby-Verbrauch)

#### `education/` — drei Ebenen tief

`education/` (6 Dateien) → `flashcards/` (12) → `flashcards/engine/` (14). Die
unterste Ebene ist die **tiefste Stelle des gesamten Projekts** und enthält
etwas fachlich sehr Spezielles: die Algorithmen des Lernkarten-Trainers (FSRS,
SM-2, Leitner-System — Verfahren, die berechnen, wann eine Lernkarte
wiederholt werden sollte). Diese vierzehn Dateien haben mit Energie nichts zu
tun; sie sind reine Lernpsychologie in Code. Genau deshalb liegen sie so tief:
**Der Grad der Verschachtelung entspricht dem Grad der Spezialisierung.** Wer an
der App arbeitet, ohne den Lernkarten-Trainer anzufassen, begegnet ihnen nie.

Daneben `education/lookup/` (10 Dateien) — die Such- und Filtermechanik für
Glossar und FAQ, ebenfalls ein abgeschlossenes Teilthema.

#### `onboarding/steps/` — 9 Dateien

Die einzelnen Fragebogenschritte (`Step0Mode`, `Step1Profile`, `Step3Rooms`,
`Step4Heating`, `StepAppliances`, `StepGoals`, `StepPrices`, `Step6Instruments`,
`Step8Review`). Der übergeordnete Ordner enthält den Rahmen — Schrittsteuerung,
Fortschrittsanzeige, Plausibilitätsprüfungen.

Eine aufschlussreiche Beobachtung für den Leser: Die Nummerierung hat Lücken
(kein `Step2`, `Step5`, `Step7`). Der Grund ist dokumentiert — diese Schritte
wurden entfernt, nachdem eine Überprüfung ergab, dass ihre Antworten von keiner
Berechnung gelesen wurden. Ihr Code liegt im Ordner `archiv/` (siehe 6.10). Die
Lücke ist also **keine Schlamperei, sondern eine Spur der Projektgeschichte** —
und die erhaltenen Dateinamen verhindern, dass gespeicherte Nutzerprofile ihre
Zuordnung verlieren.

#### `reports/pdf/` — 3 Dateien

Die technische Werkzeugschicht der PDF-Erzeugung (Seitenaufbau, Zahlenformate,
Auslieferung), getrennt von den sieben Dateien darüber, die den **Inhalt** der
Berichte bestimmen. Trennlinie: *Wie* etwas aufs Papier kommt, gegenüber *was*
darauf steht.

### 6.7 Die fünf Querschnittsschichten

Diese Ordner gehören keinem Fachbereich und werden von allen benutzt:

| Ordner | Dateien | Aufgabe |
|---|---:|---|
| `store/` | 15 | **Das Gedächtnis der App.** |
| `i18n/` | 1 + 2 | Alle Texte in Deutsch und Englisch. |
| `lib/` | 5 | Technische Helfer ohne Fachbezug. |
| `types/` | 1 | Die zentralen Datentypen (297 Zeilen). |
| `components/` | 24 | Siehe 6.4. |

**`store/` (15 Dateien) verdient eine eigene Erklärung**, weil der Begriff für
Nicht-Fachleute nicht selbsterklärend ist. Ein „Store" ist der Ort, an dem der
aktuelle Zustand der App liegt: die Antworten des Fragebogens, die
Messergebnisse, die Zählerstände, die Einstellungen. Ohne einen solchen Ort
müsste jeder Bildschirm seine Daten selbst verwalten und an den nächsten
weiterreichen — bei fünf Bereichen, die auf dieselben Daten zugreifen, wäre das
die Hauptfehlerquelle der App.

Es gibt **einen Store je Sachgebiet**, nicht einen großen für alles:
`onboardingStore` (Fragebogen), `measurementsStore` (Messergebnisse),
`readingsStore` (Zählerstände), `settingsStore`, `tariffStore` (Preise),
`profilesStore`, `flashcardStore`, `authStore` und weitere. Der Grund ist
derselbe wie bei getrennten Sicherungskreisen: Ein Fehler in einem Bereich
betrifft nicht alle. Diese Stores schreiben ihre Daten zugleich in den lokalen
Speicher des Geräts — deshalb sind die Eingaben nach dem Schließen des Browsers
noch da.

**`i18n/` (2 Sprachdateien à 2.804 Zeilen)**: Kein sichtbarer Text steht im Code
selbst; überall steht nur ein Schlüssel wie `nav.measurements`, und die Sprachdatei
liefert dazu „Messungen" oder „Measurements". Bemerkenswert: **Beide Dateien sind
exakt gleich lang.** Das ist kein Zufall, sondern die praktische Folge der Regel,
dass kein Text ohne seine Übersetzung eingebaut wird — eine Abweichung fiele
sofort auf.

### 6.8 `tests/` — 74 Dateien

`tests/unit/` (72 Dateien) enthält automatische Prüfungen der Rechenwege. Ein
Test beschreibt eine erwartete Tatsache — etwa: *„Ein Kühlschrank bei 5 °C gilt
als optimal und hat deshalb kein Sparpotenzial."* Bei jeder Änderung laufen alle
72 Dateien durch. Widerspricht eine Änderung einer festgehaltenen Tatsache,
schlägt der Test fehl, **bevor** die Änderung Nutzer erreicht.

Der Bezug zur Struktur ist unmittelbar: Testen lässt sich nur, was von der
Bildschirmdarstellung getrennt ist. Weil die Rechenregeln in eigenen
`.ts`-Dateien stehen, kann ein Test sie direkt aufrufen, ohne eine Oberfläche zu
starten. **Die Trennung von Logik und Ansicht ist die Voraussetzung dafür, dass
es diese 72 Dateien überhaupt geben kann.** Ein zweiter Test (`tests/`, 2
Dateien) prüft die Zugriffsregeln der Cloud-Datenbank — also ob wirklich niemand
fremde Daten lesen kann.

### 6.9 `.github/workflows/` — 3 Dateien Automatisierung

- `ci.yml` — führt bei jeder Änderung Typprüfung, Stilprüfung und alle Tests aus.
- `firebase-deploy.yml` — veröffentlicht die App auf Firebase Hosting.
- `deploy.yml` — veröffentlicht sie zusätzlich auf GitHub Pages.

Die beiden Deploy-Dateien laufen **nur beim Hauptzweig `main`**. Daraus folgt
eine Projektregel, die in `CLAUDE.md` festgehalten ist: Die KI entwickelt auf
Arbeitszweigen und darf nicht selbst nach `main` zusammenführen — denn dieser
Schritt macht eine Änderung unmittelbar öffentlich. Über den Zeitpunkt der
Veröffentlichung entscheidet ein Mensch. Das ist ein bemerkenswerter Punkt für
die Hausarbeit: **eine organisatorische Regel, die technisch in der
Ordnerstruktur verankert ist.**

### 6.10 Die vier unterstützenden Verzeichnisse

| Ordner | Inhalt | Warum es ihn gibt |
|---|---|---|
| `docs/` | 22 Markdown-Dateien, 9.844 Zeilen | Konzepte, Etappenpläne, Fehlerlisten, Einrichtungsanleitungen. |
| `functions/` | 3 Dateien, JavaScript | Die einzige **Server**-Komponente: Sie liest per KI-Modell Zählerstände aus einem Foto. Sie liegt getrennt, weil sie nicht im Browser läuft, sondern in der Cloud — und weil sie den geheimen Zugangsschlüssel braucht, der niemals in die Browser-App gehört. |
| `public/` | 28 Dateien | Bilder und Videos, die unverändert ausgeliefert werden. In `public/measurements/` liegen zu den meisten Messungen **je zwei Fassungen** (`-light` / `-dark`) für helles und dunkles Design. |
| `archiv/` | 3 Ordner, je mit `README.md` | **Stillgelegter, aber aufbewahrter Code.** |

Das `archiv/` ist eine ungewöhnliche und erklärenswerte Entscheidung. Normalerweise
wird gelöschter Code einfach gelöscht — die Versionsverwaltung bewahrt ihn ja
ohnehin auf. Hier liegen drei entfernte Fragebogenschritte samt einer
`README.md`, die begründet, *warum* sie entfernt wurden und *wie* man sie
zurückholt. Der Gedanke dahinter: Eine Begründung, die nur in der
Versionshistorie steht, findet niemand wieder. Für ein Projekt, an dem
abwechselnd Mensch und KI arbeiten, ist die sichtbare Begründung wertvoller als
der aufgeräumte Ordner.

---

## 7. Drei wiederkehrende Muster

Diese Muster sind der eigentliche Grund, warum die Struktur trägt. Sie sollten in
der Erläuterung der Abbildung besonders hervorgehoben werden.

### 7.1 Der Dreiklang jeder Messung — Intro · Run · Result · Logik

Alle neun Mess-Ordner sind **identisch aufgebaut**. Am Beispiel Kühlschrank:

```
fridge/
├── FridgeIntro.tsx    Was wird gemessen und warum? (Erklärung vorab)
├── FridgeRun.tsx      Die Durchführung: Eingabefelder, Stoppuhr, Schieberegler
├── FridgeResult.tsx   Die Auswertung: Bewertung, Sparpotenzial, Empfehlung
└── fridge.ts          Die reine Rechenlogik — ohne jede Bildschirmdarstellung
```

Die ersten drei Dateien folgen dem natürlichen Ablauf des Nutzers: *verstehen →
messen → auswerten*. Die vierte ist die entscheidende: **Sie enthält die
Fachlichkeit und nichts sonst.** Ein Blick in `fridge.ts` zeigt, was das
bedeutet — dort stehen die Schwellenwerte als benannte Größen:

```
GOOD_MIN = 5              // °C, unteres Ende des guten Bereichs
GOOD_MAX = 7              // °C, oberes Ende
PERCENT_PER_DEGREE = 0.06 // ~6 % Mehrverbrauch je °C kälter
REFERENCE_TEMP = 7        // empfohlene Innentemperatur
```

Darüber steht ein Kommentar, der die Herkunft der Faustregel nennt und
begründet, warum das Ergebnis als Prozentsatz und nicht als Eurobetrag
ausgewiesen wird. Damit ist die fachliche Aussage der Messung **an einer Stelle
nachlesbar und überprüfbar** — nicht verteilt über drei Bildschirmdateien.

Der praktische Nutzen dieses Musters ist dreifach:

1. **Wer eine Messung sucht, findet sie sofort.** Der Ordnername ist die Messung.
2. **Wer eine Rechenregel prüfen will, öffnet genau eine Datei.**
3. **Eine neue Messung ist ein neuer Ordner nach demselben Muster** — kein
   Umbau des Bestehenden. Der Kommentar in `catalog.ts` beschreibt den
   Vorgang ausdrücklich: neuen Ordner anlegen, im Katalog auf `available: true`
   setzen, in der Registry eintragen. An den neun vorhandenen Messungen ändert
   sich dabei nichts.

### 7.2 Katalog und Registry — die App weiß, was sie kann

Zwei Dateien im Rahmenwerk halten alle Messungen zusammen:

- **`catalog.ts`** — die **Eigenschaften** jeder Messung: Symbol, Gewerk
  (Heizung / Warmwasser / Strom / Wasser), Schwierigkeitsgrad, geschätzte Dauer,
  betroffene Raumtypen, benötigte Messgeräte, und ob sie schon verfügbar ist.
- **`registry.ts`** — die **Zuordnung** von Kennung zu den drei
  Bildschirmbausteinen: `fridge → { FridgeIntro, FridgeRun, FridgeResult }`.

Der Nutzen zeigt sich an einem realen Beispiel aus dem Projekt: Die
Fragebogenseite „Was du zum Messen brauchst" — eine Übersicht, welche Messgeräte
man für welche Messung benötigt — wird **nicht von Hand gepflegt**, sondern aus
dem Katalog abgeleitet. Als der Gefrierschrank-Check seine Strommessung verlor,
verschwand das Strommessgerät dort **von selbst**. Eine handgeschriebene Liste
hätte jemand nachpflegen müssen; früher oder später wäre sie falsch gewesen.

Das ist das allgemeine Prinzip dahinter, und es prägt die ganze Struktur:
**Ableiten statt Abschreiben. Jede Information hat genau einen Ort.**

### 7.3 Die Trennung von Text und Code

Kein sichtbarer Satz steht in einer `.tsx`-Datei. Die Oberfläche verweist auf
Schlüssel, die Sprachdatei liefert den Text. Das ermöglicht die Zweisprachigkeit
— und macht zugleich sichtbar, wenn ein Text fehlt: Beim Testen einer Änderung
erschien einmal der rohe Schlüssel `tips.items.pv_planned_base_load.action` auf
einer Schaltfläche statt einer Beschriftung. Daraufhin wurde ein Test ergänzt,
der genau das künftig verhindert. Auch das ist ein Strukturmerkmal: **Fehlt ein
Baustein, fällt es auf, statt still falsch zu sein.**

---

## 8. Warum diese Struktur — und was die Alternative gewesen wäre

### Die Alternative: nach technischer Art ordnen

Ein in kleineren Projekten verbreiteter Aufbau sieht so aus:

```
src/
├── components/   alle Bildschirmbausteine des ganzen Projekts
├── utils/        alle Berechnungen des ganzen Projekts
├── hooks/        alle Zustandslogiken
└── pages/        alle Seiten
```

Für ein Projekt mit fünfzehn Dateien ist das übersichtlich. Für die E-App wären
es **153 Dateien in einem einzigen `components`-Ordner**. Die Folgen:

- **Eine Änderung berührt vier weit auseinanderliegende Ordner.** Wer den
  Kühlschrank-Check anpasst, arbeitet in `pages/`, `components/`, `utils/` und
  `hooks/` gleichzeitig.
- **Zusammengehöriges steht nicht beieinander.** `FridgeRun` läge zwischen
  `FeedbackModal` und `FillLevelInput` — Nachbarschaft nach Alphabet statt nach
  Sinn.
- **Niemand sieht, welche Fachbereiche die App überhaupt hat.** Die Ordnerliste
  beschreibt die Technik, nicht das Produkt.

### Die gewählte Struktur und ihre nachweisbaren Vorteile

Die Gliederung nach Fachbereichen kehrt das um. Vier Vorteile lassen sich am
Projekt konkret belegen:

**1. Der Ordnerbaum erklärt das Produkt.** Wer `src/features/` öffnet, liest ohne
eine Zeile Code, was die App tut: Fragebogen, Messungen, Monitoring, Berichte,
Wissen, Empfehlungen, Rechtliches. Für eine Hausarbeit ist das der stärkste
Punkt: **Die Struktur ist selbst eine Dokumentation.**

**2. Änderungen bleiben örtlich.** Über 30 dokumentierte Verbesserungen wurden im
Projekt umgesetzt (`docs/gefundene-probleme.md`). Nahezu jede betraf einen
einzigen Ordner. Ein Beispiel: Die Umgestaltung des Duschkopf-Mess-Bildschirms —
Reihenfolge geändert, ein handgebauter Regler durch den gemeinsamen ersetzt,
Beschriftungen neu — fand vollständig in `measurements/showerhead/` statt, mit
einer einzigen Ergänzung in `components/ui/Stepper.tsx`.

**3. Entfernen ist so einfach wie Hinzufügen.** Das Projekt hat mehrere
Fragebogenschritte wieder abgeschafft, nachdem sich zeigte, dass ihre Antworten
von keiner Berechnung gelesen wurden. Weil jeder Schritt eine eigene Datei ist,
war das ein Verschieben nach `archiv/` — kein Herausoperieren aus einer großen
Datei. **Eine Struktur, in der Rückbau billig ist, verhindert, dass Totes liegen
bleibt.**

**4. Die Struktur trägt eine überprüfbare Regel.** Im Projekt gilt: *Jedes Feld
des Fragebogens braucht einen Abnehmer* — es muss von einer Messung, einer
Berechnung, einem Tipp oder dem Bericht tatsächlich gelesen werden. Diese Regel
ist in `onboarding/fieldUsage.ts` hinterlegt, und ein Test lässt das Projekt
fehlschlagen, wenn ein neues Feld ohne Eintrag hinzukommt. So etwas ist nur
möglich, wenn es **einen definierten Ort** für diese Zuordnung gibt.

### Der Preis, ehrlich benannt

Die Struktur ist nicht kostenlos:

- **Sie lohnt sich erst ab einer gewissen Größe.** Für ein kleines Projekt wäre
  sie überdimensioniert.
- **Sie verlangt eine Entscheidung, die manchmal schwerfällt:** Gehört etwas in
  einen Fachbereich oder nach unten in eine gemeinsame Schicht? Falsch
  entschieden entsteht entweder Doppelung oder ein aufgeblähter Allgemeinbereich.
- **`measurements/` mit 31 Dateien direkt im Ordner ist an der Grenze** dessen,
  was ein Blick erfasst. Hier wäre eine weitere Unterteilung des Rahmenwerks
  denkbar — sie wurde bewusst nicht vorgenommen, weil eine zusätzliche Ebene für
  fünf Personen, die den Bereich ohnehin kennen, mehr Weg als Nutzen wäre.

Diese Offenheit gehört in die Erläuterung: Eine Struktur ist eine **Abwägung**,
kein Naturgesetz.

---

## 9. Lesehilfe zur Abbildung

Was der Leser in der Grafik konkret ablesen soll — in dieser Reihenfolge:

**(1) Die Zweiteilung ganz oben.** Links/oben `src/` — der Code, der zum Nutzer
gelangt. Rechts/unten alles Übrige — Tests, Dokumentation, Konfiguration,
Medien, Archiv. Nur der erste Teil wird ausgeliefert; der zweite existiert für
die Entwicklung.

**(2) Der Block `features/` als Schwerpunkt.** Er ist der breiteste Ast. Seine
17 Zweige sind die Fachbereiche der App — die Grafik zeigt damit, dass gegliedert
wurde **nach dem, was die App tut**, nicht nach dem, woraus sie technisch besteht.

**(3) Die schmalen Schichten daneben.** `store/` (15), `lib/` (5), `i18n/` (1+2),
`types/` (1), `components/` (9+15) — auffällig klein im Verhältnis. Das ist die
Aussage: Der gemeinsame Unterbau ist bewusst schlank gehalten; das Gewicht liegt
in der Fachlichkeit.

**(4) Die Farbverteilung.** Grün (Logik, `.ts`) und Blaugrau (Oberfläche,
`.tsx`) halten sich etwa die Waage. In `store/`, `lib/` und
`education/flashcards/engine/` steht ausschließlich Grün — reine Berechnung ohne
Bildschirm. In `components/ui/` ausschließlich Blaugrau — reine Darstellung ohne
Fachlogik. **Diese saubere Trennung an den Rändern ist das Qualitätsmerkmal, das
die Abbildung sichtbar macht.**

**(5) Die tiefste Stelle.** `src/features/education/flashcards/engine/` — fünf
Ebenen. Die Grafik zeigt damit, dass Tiefe sparsam eingesetzt wird: Genau ein
Zweig geht so weit, und zwar der fachlich speziellste.

**(6) Der hervorgehobene Kasten „Modulmuster".** Er zeigt, dass die neun
Mess-Ordner keine neun Einzellösungen sind, sondern **neunmal dasselbe Muster**.
Das ist die wichtigste Einzelaussage der Abbildung: Die Struktur ist nicht
gewachsen, sie ist entworfen.

**(7) Der Kasten „Dateitypen".** Er verhindert das eingangs genannte
Missverständnis — dass eine Web-App überwiegend aus HTML und CSS bestünde.

---

## 10. Zahlen für die Bildunterschrift oder eine Tabelle

| Kennzahl | Wert |
|---|---:|
| Code-Dateien gesamt | 390 |
| davon TypeScript (`.ts` + `.tsx`) | 374 (95,9 %) |
| Zeilen Anwendungscode (`src/`) | ~46.300 |
| Zeilen Test-Code | 10.783 |
| Zeilen Dokumentation (`docs/`) | 9.844 |
| Fachbereiche in `src/features/` | 17 |
| Implementierte Messungen | 9 |
| Zustands-Stores | 15 |
| Automatische Testdateien | 72 (+2) |
| Maximale Verschachtelungstiefe | 5 Ebenen |
| Unterstützte Sprachen | 2 (de, en), je 2.804 Zeilen |
| Farbschemata | 3 (Hell, Dunkel, HTW-Grün) |

---

## 11. Verwendete Technik (für eine Fußnote)

| Baustein | Rolle |
|---|---|
| **React 19** | Bibliothek zum Bauen der Oberfläche aus wiederverwendbaren Bausteinen. |
| **TypeScript 6** | Programmiersprache mit Typprüfung. |
| **Vite 8** | Build-Werkzeug: bündelt die Quelldateien zum auslieferbaren Paket. |
| **Tailwind CSS 4** | Gestaltung über Utility-Klassen statt separater Stildateien. |
| **React Router 7** | Zuordnung von Adressen zu Bildschirmen. |
| **Zustand 5** | Verwaltung des App-Zustands (die 15 Stores). |
| **i18next** | Mehrsprachigkeit. |
| **Firebase** | Cloud-Backend: Anmeldung, Datenbank, Auslieferung. |
| **jsPDF** | Erzeugung der PDF-Berichte im Browser. |
| **Tesseract.js** | Texterkennung für das Abfotografieren von Zählerständen. |
| **Vitest 4** | Ausführung der automatischen Tests. |

---

## 12. Kurzglossar

| Begriff | Erklärung |
|---|---|
| **Repository** | Der versionierte Gesamtbestand aller Projektdateien; hier auf GitHub. |
| **Quellcode** | Der von Menschen geschriebene Programmtext, aus dem die laufende App erzeugt wird. |
| **Komponente** | Ein wiederverwendbarer Baustein der Oberfläche — etwa eine Karte, eine Schaltfläche, ein ganzer Bildschirm. |
| **TypeScript** | Programmiersprache; JavaScript mit Typprüfung. |
| **JSX / `.tsx`** | Schreibweise, die Oberflächenstruktur direkt im Code erlaubt. Daher die eigene Dateiendung. |
| **Store / Zustand** | Der zentrale Ort, an dem die Daten der App während der Nutzung liegen. |
| **i18n** | Kurzform für *internationalization* (i + 18 Buchstaben + n) — Mehrsprachigkeit. |
| **Build** | Der Vorgang, aus dem Quellcode ein auslieferbares Paket zu erzeugen. |
| **Deployment** | Die Veröffentlichung dieses Pakets auf einem Server. |
| **CI** | *Continuous Integration* — automatische Prüfung bei jeder Änderung. |
| **Branch (Zweig)** | Eine parallele Entwicklungslinie; erlaubt Arbeit, ohne die veröffentlichte Fassung zu berühren. |
| **Unit-Test** | Automatische Prüfung einer einzelnen Rechenregel. |
| **Utility-Klasse** | Kleine, einzweckige Stilangabe direkt am Baustein (z. B. „Abstand unten mittel"). |

---

## 13. Belegstellen im Repository

Für Nachprüfbarkeit — die Aussagen dieses Dokuments lassen sich hier verifizieren:

| Aussage | Belegstelle |
|---|---|
| Aufbau jeder Messung | `src/features/measurements/fridge/` (vier Dateien) |
| Rechenlogik ohne Oberfläche | `src/features/measurements/fridge/fridge.ts` |
| Katalog aller Messungen | `src/features/measurements/catalog.ts` |
| Zuordnung Kennung → Bausteine | `src/features/measurements/registry.ts` |
| Navigation an einer Stelle | `src/app/navigation.ts` |
| Startpunkt der App | `src/main.tsx` |
| Ein Store je Sachgebiet | `src/store/` (15 Dateien) |
| Regel „jedes Feld braucht einen Abnehmer" | `src/features/onboarding/fieldUsage.ts` + `tests/unit/fieldUsage.test.ts` |
| Begründete Stilllegungen | `archiv/*/README.md` |
| Projektregeln und Konventionen | `CLAUDE.md` |
| Vollständige Befundliste | `docs/gefundene-probleme.md` |
| Technikwahl und Abhängigkeiten | `package.json` |

---

## 14. Was die Abbildung nicht zeigt — und warum das in Ordnung ist

Ein Verzeichnisbaum zeigt **Ablage**, nicht **Ablauf**. Nicht sichtbar sind:

- **Wer wen aufruft.** Dass `measurements/` aus `store/` liest und `reports/` aus
  beiden, ist eine Beziehung, die kein Ordnerbaum abbildet. Dafür wäre ein
  Abhängigkeitsdiagramm nötig.
- **Wie oft eine Datei geändert wird.** Die Grafik zeigt Dateizahlen, nicht
  Aktivität.
- **Die zeitliche Entwicklung.** Dass mehrere Fragebogenschritte wieder entfernt
  wurden, ist nur an den Lücken der Nummerierung und am `archiv/` ablesbar.

Das ist keine Schwäche der Abbildung, sondern ihre Abgrenzung: Sie beantwortet
die Frage **„Wie ist der Code geordnet und warum?"** — und diese eine Frage
vollständig. Wer die Aufrufbeziehungen darstellen möchte, braucht eine zweite,
andere Grafik.
