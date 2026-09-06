# Analyse: Kapitel 4.1 „Projekt- und Ordnerstruktur"

**Zweck dieser Datei:** Arbeitsgrundlage für die Überarbeitung des Doku-Kapitels
zur Codestruktur. Sie enthält (A) einen Faktencheck gegen den tatsächlichen
Repository-Stand, (B) ein Verständlichkeits-Inventar mit fertigen
Erklärvorschlägen, (C) strukturelle Befunde und (D) Absatz-für-Absatz-Vorschläge.

**Prüfstand:** Repository `MaierKilian/E-App`, Branch `main`, Commit `0b7d1fc`,
geprüft am 06.09.2026. Alle Zahlen unten wurden am Dateibestand nachgezählt,
nicht geschätzt.

**Nachtrag (06.09.2026):** Auf Kilians Wunsch wurde zusätzlich eine deutlich
reduzierte Neufassung von Abbildung 2 konzipiert – die bisherige Fassung wirkte
mit dem vollständigen Verzeichnisbaum und der achtzeiligen Dateitypen-Tabelle zu
unruhig. Das Konzept dafür steht in **Teil H**, der ausformulierte Prompt für
Claude Design in der separaten Datei
[`docs/prompt-claude-design-abbildung2.md`](./prompt-claude-design-abbildung2.md).
Teil A.3 unten bezieht sich weiterhin auf die **alte** Fassung der Abbildung;
beide dort benannten Widersprüche lösen sich mit der reduzierten Neufassung von
selbst, weil die betroffenen Elemente (Gesamt-Dateizahl im Untertitel,
Legenden-Ausnahme bei `features/`) darin nicht mehr vorkommen.

---

## 0. Auftrag an die überarbeitende KI

**Zielgruppe des Kapitels:** Ein Hochschullehrer, der die Arbeit fachlich
bewertet, **aber selbst nicht programmiert.** Er kennt wissenschaftliches
Arbeiten, Systematik und Begründungslogik – er kennt weder React noch Git noch
die Konventionen der Softwareentwicklung.

**Daraus folgen vier Regeln:**

1. **Kein Fachbegriff ohne Erklärung an seiner ersten Fundstelle.** Die Erklärung
   steht im Satz selbst oder direkt danach, nicht in einer Fußnote am Kapitelende
   und nicht erst im Glossar.
2. **Jede Zahl bekommt einen Maßstab.** „52 000 Zeilen" sagt einem
   Nicht-Programmierer nichts. „52 000 Zeilen – etwa der Umfang eines
   400-seitigen Fachbuchs" sagt ihm etwas.
3. **Jede Strukturentscheidung nennt ihren Grund.** Nicht „die Struktur ist
   feature-basiert", sondern „sie ist so gewählt, weil …" – und was die
   Alternative gekostet hätte.
4. **Nichts behaupten, was der Code nicht hält.** Siehe Teil A: An vier Stellen
   weicht der Text vom Ist-Stand ab.

**Was ausdrücklich erhalten bleiben soll:** siehe Teil F. Das Kapitel hat starke
Passagen – die Projektablage-Analogie, die „Gedächtnis der App"-Metapher und
den selbstkritischen Schlussabsatz. Diese drei nicht glattbügeln.

---

## Der Originaltext (Transkript, Stand 05.09.2026)

Damit die Überarbeitung ohne die PDF-Seiten auskommt, hier der geprüfte Wortlaut.

### 4 Codestruktur und technische Umsetzung · 4.1 Projekt- und Ordnerstruktur

> Der Quellcode der E-App wird im GitHub-Repository `MaierKilian/E-App`
> verwaltet. Mit dem wachsenden Funktionsumfang wurde eine Struktur notwendig,
> die nicht nur Dateien ablegt, sondern drei praktische Fragen beantwortet: Wo
> befindet sich eine bestimmte Funktion, welche anderen Teile können durch eine
> Änderung betroffen sein und an welcher Stelle wird eine neue Funktion ergänzt?
> Die in **Abbildung 2** dargestellte Gliederung folgt deshalb überwiegend den
> fachlichen Aufgaben der App und nicht den technischen Dateiarten.
>
> Das Repository lässt sich zunächst in zwei Bereiche teilen. Unter `src` liegt
> der Quellcode, der zur eigentlichen Browser-Anwendung gebündelt wird. Daneben
> stehen Dateien, die für Entwicklung und Betrieb benötigt werden, jedoch nicht
> unmittelbar Bestandteil der ausgelieferten Oberfläche sind. Dazu gehören
> automatische Tests, Dokumentation, statische Medien, Cloud Functions,
> archivierte Bestandteile und die Konfiguration der Entwicklungswerkzeuge.
> Einschließlich Sprachdateien und globaler Gestaltung umfasst `src` ungefähr
> 52 000 Zeilen; davon entfallen rund 46 300 Zeilen auf Anwendungslogik,
> Oberfläche und globale Styles.

### Fachbereiche als vertikale Schnitte

> Den Schwerpunkt bildet `src/features` mit 17 fachlich getrennten Bereichen.
> Dort liegen unter anderem Fragebogen, Messungen, Monitoring, Berichte,
> Wissensbereich, Empfehlungen, Profile und rechtliche Inhalte nebeneinander.
> Diese sogenannte feature-basierte Struktur lässt sich mit einer Projektablage
> vergleichen: Alle Unterlagen zu einem Vorhaben liegen an einem Ort. Nur
> wirklich gemeinsame Vorlagen werden separat geführt. Bei einer Änderung am
> Kühlschrank-Check müssen daher keine allgemeinen Ordner für Seiten,
> Berechnungen und Eingabefelder durchsucht werden. Die zusammengehörigen
> Dateien liegen gemeinsam im Bereich `measurements` unter `fridge`.
>
> Der Messbereich zeigt dieses Prinzip besonders deutlich. Direkt unter
> `measurements` liegen 31 Dateien für das gemeinsame Rahmenwerk, beispielsweise
> Katalog, Ablaufsteuerung, Fortschrittsberechnung und Geräteauswahl. Neun
> Unterordner enthalten die einzelnen Messungen. Jeder dieser Ordner folgt
> demselben Muster: `Intro.tsx` erklärt die Messung, `Run.tsx` führt durch die
> Eingabe, `Result.tsx` stellt die Auswertung dar und eine gleichnamige
> `.ts`-Datei enthält die reine Fach- und Rechenlogik. Der Ablauf *verstehen,
> messen, auswerten* ist somit direkt in der Dateistruktur erkennbar.
> Gleichzeitig kann die Rechenlogik unabhängig von der Oberfläche getestet
> werden.
>
> Unterordner werden nur dort ergänzt, wo ein Fachbereich sonst unübersichtlich
> würde. Die tiefste Stelle ist mit fünf Ebenen
> `features/education/flashcards/engine`. Dort liegen die spezialisierten
> Algorithmen des Lernkartentrainers. Dass nur dieser besonders eigenständige
> Teil so tief verschachtelt ist, hält die übrige Struktur bewusst flach.

### Gemeinsame Querschnittsschichten

> Neben den Fachbereichen existieren schmale, gemeinsam genutzte Schichten.
> `components` enthält wiederverwendbare Oberflächenbausteine; die Unterebene
> `components/ui` umfasst allgemeine Elemente wie Karten, Dialoge, Regler oder
> Eingabeschritte. Eine Änderung am gemeinsamen Zahlenfeld wirkt dadurch an allen
> Stellen, die diesen Baustein verwenden.
>
> In `store` arbeiten 15 voneinander getrennte Zustandsbereiche. Gemeinsam bilden
> sie das Gedächtnis der App: Sie verwalten beispielsweise Wohnprofile,
> Messergebnisse, Zählerstände, Tarife und Einstellungen und sichern diese
> zusätzlich im lokalen Browserspeicher. `i18n` enthält sämtliche sichtbaren
> Texte in Deutsch und Englisch, `types` die zentralen Datenstrukturen und `lib`
> technische Hilfsfunktionen ohne eindeutige Zuordnung zu einem Fachbereich.
> Benötigen mehrere Features dieselbe Funktion, wird sie in eine solche
> gemeinsame Schicht verschoben, anstatt an mehreren Stellen kopiert zu werden.

### Dateitypen und technische Trennung

> Die Farbgebung in **Abbildung 2** macht zugleich die Trennung von Logik und
> Darstellung sichtbar. 221 `.ts`-Dateien enthalten Berechnungen,
> Zustandsverwaltung und Datenmodelle, während 153 `.tsx`-Dateien
> React-Komponenten mit sichtbarer Oberfläche enthalten. Damit bestehen rund 96 %
> der Code-Dateien aus TypeScript. Klassische HTML- und CSS-Dateien spielen
> dagegen nur eine kleine Rolle: React erzeugt die sichtbare Struktur zur
> Laufzeit, und Tailwind CSS beschreibt die Gestaltung überwiegend durch Klassen
> direkt an den Komponenten. Eine einzelne globale CSS-Datei bündelt lediglich
> übergreifende Farb- und Themevariablen.

### Qualitätssicherung und Betrieb

> Außerhalb des Anwendungscodes zeigt der Verzeichnisbaum die unterstützenden
> Teile des Projekts. Insgesamt 72 Unit-Test-Dateien prüfen insbesondere die
> ausgelagerten Rechenregeln; zwei weitere Tests kontrollieren die Zugriffsregeln
> der Cloud-Datenbank. Der Dokumentationsordner sammelt technische Konzepte,
> Entscheidungen und bekannte Probleme. Ein eigener Medienordner stellt Bilder
> und Videos für die Anwendung bereit. Auch der serverseitige Code für die
> KI-gestützte Erkennung von Zählerständen ist getrennt abgelegt. Ein Archiv
> bewahrt entfernte Fragebogenschritte zusammen mit ihrer Begründung auf. Dadurch
> bleibt die Entscheidung auch unabhängig von der Git-Historie nachvollziehbar.
>
> Drei Abläufe unter `.github/workflows` automatisieren Typprüfung, Tests, Build
> und Veröffentlichung. Änderungen werden zunächst in einem eigenen Branch
> entwickelt und über einen Pull Request geprüft. Erst die Übernahme in den
> Hauptzweig `main` löst die Veröffentlichung über GitHub Pages beziehungsweise
> Firebase aus. Damit ist die organisatorische Regel, dass ein Mensch über die
> Veröffentlichung entscheidet, technisch im Projektablauf verankert.
>
> Die gewählte Struktur erleichtert Erweiterungen, weil neue Funktionen als
> abgegrenzte Module hinzukommen und Änderungen überwiegend lokal bleiben. Sie
> verursacht jedoch ebenfalls Abstimmungsbedarf: Bei gemeinsam genutzter Logik
> muss entschieden werden, ob sie in einem Fachbereich verbleibt oder in eine
> Querschnittsschicht gehört. Auch die 31 Rahmendateien direkt unter
> `measurements` liegen bereits an der Grenze dessen, was ohne weitere
> Unterteilung schnell erfassbar ist. Die Struktur ist daher keine starre
> Vorgabe, sondern eine bewusste Abwägung zwischen kurzen Wegen, geringer
> Verschachtelung und klarer fachlicher Zuordnung. Die Abbildung zeigt dabei die
> Ablage der Dateien; Aufrufbeziehungen und konkrete Datenflüsse werden durch sie
> nicht dargestellt.

---

## Teil A — Faktencheck gegen den Repository-Stand

Nachgezählt am Dateibestand (ohne `.git`, `node_modules`, `dist`).

### A.1 Was stimmt (unverändert übernehmen)

| Angabe im Kapitel | Nachgezählt | |
|---|---|---|
| `src` ≈ 52 000 Zeilen | 51 929 | ✅ |
| davon ≈ 46 300 Zeilen Logik/Oberfläche/Styles | 46 321 (22 067 `.ts` + 23 414 `.tsx` + 840 `.css`) | ✅ |
| 17 fachlich getrennte Bereiche in `src/features` | 17 | ✅ |
| 31 Dateien direkt unter `measurements` | 31 | ✅ |
| Tiefste Stelle: 5 Ebenen, `features/education/flashcards/engine` | 5 Ebenen, 14 Dateien | ✅ |
| 15 Zustandsbereiche in `store` | 15 | ✅ |
| 221 `.ts`-Dateien | 221 | ✅ |
| 153 `.tsx`-Dateien | 153 | ✅ |
| 72 Unit-Test-Dateien | 72 | ✅ |
| Drei Abläufe unter `.github/workflows` | 3 (`ci.yml`, `deploy.yml`, `firebase-deploy.yml`) | ✅ |
| Diese automatisieren Typprüfung, Tests, Build, Veröffentlichung | ✅ (`npm run build` = `tsc -b && vite build`, also mit Typprüfung) | ✅ |
| Alle Ordner-Zahlen der Abbildung (`app/ 6`, `ui/ 15`, `monitoring/ 30`, `docs/ 22`, `archiv/ 8` …) | ausnahmslos korrekt | ✅ |

Die Zahlenbasis der Abbildung ist also **sehr sauber gearbeitet.** Das ist
bemerkenswert und sollte nicht durch die folgenden Korrekturen entwertet werden.

### A.2 Was korrigiert werden muss

#### ❌ A.2.1 „zwei weitere Tests kontrollieren die Zugriffsregeln der Cloud-Datenbank"

**Falsch.** Es gibt **eine** Testdatei dafür: `tests/firestore.rules.test.ts`.
Sie enthält allerdings **45 einzelne Testfälle**. Die zweite Datei direkt unter
`tests/` ist `roomFixture.ts` – kein Test, sondern eine gemeinsam genutzte
Hilfsdatei, die Beispielräume für andere Tests bereitstellt.

Vermutliche Ursache: Die Abbildung zeigt `tests/ 2` (= zwei Dateien direkt in
diesem Ordner), das wurde als „zwei Tests" gelesen.

> **Vorschlag:** „Eine weitere Testdatei prüft mit 45 Einzelfällen die
> Zugriffsregeln der Cloud-Datenbank – also die Frage, wer welche gespeicherten
> Daten lesen und schreiben darf."

#### ❌ A.2.2 „rund 96 % der Code-Dateien aus TypeScript"

**Nicht nachvollziehbar,** weil die Bezugsgröße fehlt. Je nachdem, was man als
„Code-Dateien" zählt, ergibt dieselbe Datenlage:

| Bezugsgröße | Rechnung | Ergebnis |
|---|---|---|
| Alle 453 Dateien im Repository | 374 / 453 | 82,6 % |
| Die 423 Dateien der Typentabelle | 374 / 423 | 88,4 % |
| Nur Dateien mit Programmcode (`.ts .tsx .js .html .css`) | 374 / 380 | **98,4 %** |
| Gemessen in Zeilen statt Dateien (in `src`) | 45 481 / 51 929 | 87,6 % |

Keine dieser Rechnungen ergibt 96 %.

> **Vorschlag (Bezug nennen, Zahl anpassen):** „Von den 380 Dateien, die
> Programmcode enthalten, sind 374 in TypeScript geschrieben – rund 98 %.
> Klassische HTML- und CSS-Dateien treten nur als Rahmen auf."

#### ❌ A.2.3 „Neun Unterordner enthalten die einzelnen Messungen"

**Ungenau.** `measurements` hat **zehn** Unterordner: neun Mess-Module und
zusätzlich `views/` (4 Dateien) für gemeinsame Anzeigebausteine. Die Abbildung
zeigt `views/` korrekt mit – der Text zählt es nicht mit, ohne das zu sagen.

> **Vorschlag:** „Zehn Unterordner folgen: Neun enthalten je eine einzelne
> Messung, der zehnte (`views`) gemeinsame Anzeigebausteine, die alle Messungen
> verwenden."

#### ❌ A.2.4 Das Datei-Muster der Mess-Module – drei Ungenauigkeiten

Der Satz lautet: *„Jeder dieser Ordner folgt demselben Muster: `Intro.tsx`
erklärt die Messung, `Run.tsx` führt durch die Eingabe, `Result.tsx` stellt die
Auswertung dar und eine gleichnamige `.ts`-Datei enthält die reine Fach- und
Rechenlogik."*

**(a) Die Dateien heißen nicht so.** Sie heißen `FridgeIntro.tsx`,
`FridgeRun.tsx`, `FridgeResult.tsx` – mit dem Namen der Messung davor. Die
Abbildung schreibt das korrekt als `<Name>Intro.tsx`; nur der Fließtext lässt
den Namensteil weg. Wer im Repository nach `Intro.tsx` sucht, findet nichts.

**(b) „Jeder dieser Ordner" stimmt nicht ausnahmslos.** Der Lichtcheck
(`lighting/`) hat **keine** Intro-Datei. Das ist kein Versehen, sondern im Code
begründet – `registry.ts` führt das Feld `Intro` ausdrücklich als optional
(`Intro?: React.ComponentType`) und vermerkt an dieser Stelle: *„Ohne Intro: die
Erklärung steht über der Raumliste im Run-Schirm."*

**(c) „eine gleichnamige `.ts`-Datei"** trifft auf 8 von 9 Modulen zu. Der
Raumklima-Check (`room_temperature/`) hat stattdessen vier Rechendateien mit
eigenen Namen (`dewPoint.ts`, `heatingCost.ts`, `roomAreas.ts`,
`roomClimate.ts`) – keine davon heißt `roomTemperature.ts`.

> **Vorschlag – und das ist inhaltlich sogar die bessere Geschichte:**
>
> „Alle neun folgen demselben Grundmuster, hier am Kühlschrank-Check gezeigt:
> `FridgeIntro.tsx` erklärt die Messung, `FridgeRun.tsx` führt durch die
> Eingabe, `FridgeResult.tsx` stellt die Auswertung dar, und `fridge.ts` enthält
> die reine Rechenlogik ohne jede Bildschirmausgabe. Der Ablauf *verstehen,
> messen, auswerten* ist damit unmittelbar aus den Dateinamen ablesbar.
>
> Das Muster ist ein Standard mit begründeten Ausnahmen, keine starre Schablone:
> Der Lichtcheck kommt ohne eigene Einführungsseite aus, weil seine Erklärung
> direkt über der Raumliste steht – der Code kennzeichnet diesen Teil deshalb
> ausdrücklich als optional. Der Raumklima-Check verteilt seine Rechenlogik auf
> vier Dateien (unter anderem Taupunkt- und Heizkostenberechnung), weil sie
> fachlich zu verschieden ist für eine einzige."

Diese Fassung ist nicht nur richtiger, sie belegt die These des Kapitels
besser: Eine Struktur, deren Ausnahmen im Code begründet stehen, ist eine
durchdachte Struktur – keine, die man einfach nur behauptet hat.

### A.3 Abbildung 2 — zwei Widersprüche in der Grafik selbst

#### ⚠️ A.3.1 „423 Dateien" im Untertitel

Die Typentabelle rechts summiert sich auf exakt 423
(221 + 153 + 30 + 10 + 3 + 3 + 2 + 1). **Das Repository enthält aber 453
Dateien.** Nicht erfasst sind 30 Dateien: 26 Medien (Bilder `.webp`/`.png`,
Videos `.mp4`/`.webm`, ein `.svg`) und vier Dateien ohne klassische Endung
(`.gitignore` ×2, `.firebaserc`, `firestore.rules`).

Das ist deshalb ein Widerspruch, weil der **Verzeichnisbaum** in derselben
Abbildung diese Medien mitzählt: `public/ 10`, `measurements/ 17`, `neu/ 1`
sind fast ausschließlich Bilder und Videos. Untertitel und Baum verwenden also
zwei verschiedene Grundgesamtheiten.

> **Vorschlag:** Untertitel präzisieren auf „423 Text- und Codedateien
> (zusätzlich 30 Medien- und Konfigurationsdateien ohne eigene Zeile in der
> Typentabelle)" – oder die Tabelle um eine Zeile „Medien 26" ergänzen und die
> Gesamtzahl auf 453 setzen. Die zweite Variante ist ehrlicher und kostet eine
> Tabellenzeile.

#### ⚠️ A.3.2 Die Legende stimmt für einen Eintrag nicht

Die Legende sagt: **„Zahl im Ordner = Anzahl enthaltener Dateien."** Das trifft
auf jeden Eintrag zu – geprüft, ausnahmslos – **außer auf `features/ 17`.**
Dieser Ordner enthält **null** Dateien direkt; die 17 ist die Anzahl seiner
*Unterordner*. Die Beschriftung „17 Fachdomänen" daneben deutet es an, aber die
Zahl bedeutet an dieser einen Stelle etwas anderes als überall sonst.

> **Vorschlag:** `features/ 17 Fachbereiche` optisch anders setzen als die
> Dateizahlen (z. B. ohne den grauen Zahlenkasten) und in der Legende ergänzen:
> „Bei `features/` bezeichnet die Zahl ausnahmsweise die Unterordner – der
> Ordner selbst enthält keine Dateien."

### A.4 Kleinigkeiten

- **„sichern diese zusätzlich im lokalen Browserspeicher"** – 14 der 15
  Zustandsbereiche tun das. Der fünfzehnte (`authStore`) bewusst nicht: Der
  Anmeldezustand kommt bei jedem Start frisch von Firebase. Formulierung:
  „… und sichern diese – bis auf den Anmeldezustand – zusätzlich im lokalen
  Browserspeicher."
- **`src/app` (6 Dateien) und `src/types` (1 Datei)** stehen in der Abbildung,
  werden im Text aber nie erwähnt. Ein Halbsatz genügt.
- **Die Firestore-Regeltests laufen nicht in der automatischen Prüfung mit** –
  sie brauchen einen lokal gestarteten Datenbank-Simulator und werden per
  eigenem Befehl ausgeführt. Falls das Kapitel Vollständigkeit beansprucht,
  gehört der Halbsatz dazu.

### A.5 Eine ungenutzte starke Zahl

Das Kapitel nennt **72 Unit-Test-Dateien**. Für einen Nicht-Programmierer ist
das eine Zahl ohne Bedeutung – eine Datei kann einen Test enthalten oder
hundert.

**Tatsächlich enthalten diese 72 Dateien 921 einzelne Testfälle**, dazu 45 für
die Zugriffsregeln: **rund 966 automatische Prüfungen**, die bei jeder Änderung
durchlaufen.

Das ist die Zahl, die ein Prüfer versteht und die den Qualitätsanspruch belegt.
Sie sollte unbedingt in den Text.

---

## Teil B — Verständlichkeit: Jargon-Inventar

**Kernbefund:** Das Kapitel erklärt seine Struktur gut – aber es setzt genau das
Vokabular voraus, mit dem es sie erklärt. Von rund 35 Fachbegriffen sind vier
erklärt.

Die Tabelle listet jeden erklärungsbedürftigen Begriff mit einem **fertig
formulierten Vorschlag**, der direkt in den Fließtext übernommen werden kann.

### B.1 Dringend – ohne diese Erklärungen bricht das Verständnis ab

| Begriff | Vorschlag zur Einführung an der ersten Fundstelle |
|---|---|
| **Repository** | „… im GitHub-Repository `MaierKilian/E-App` – einem zentralen Online-Speicher, der nicht nur den aktuellen Stand des Codes enthält, sondern jede jemals vorgenommene Änderung mit Zeitpunkt, Urheber und Begründung." |
| **Quellcode** | „Quellcode – der von Menschen geschriebene, lesbare Text der Anwendung, aus dem das Programm erzeugt wird." |
| **`src`** | „`src` (für *source*, Quelle)" – die Abkürzung einmal auflösen. |
| **gebündelt / Build** | „… der zur eigentlichen Browser-Anwendung gebündelt wird: Ein Werkzeug fasst die vielen Einzeldateien automatisch zu wenigen komprimierten Dateien zusammen, die der Browser lädt. Der Ordner ist die Arbeitsfassung, das Gebündelte die Auslieferungsfassung." |
| **feature-basierte Struktur** | Die vorhandene Projektablage-Analogie ist gut – nur den englischen Begriff auflösen: „nach *Features*, also nach fachlichen Funktionen der App, statt nach technischen Dateiarten." |
| **vertikale Schnitte** (Überschrift) | Wird nie aufgelöst. Entweder erklären („senkrecht durch alle technischen Ebenen hindurch – von der Bildschirmanzeige bis zur Berechnung – statt waagerecht nach Ebenen sortiert") oder die Überschrift ersetzen durch **„Fachbereiche: alles zu einer Funktion an einem Ort"**. |
| **Querschnittsschichten** (Überschrift) | „Gemeinsam genutzte Bausteine" wäre die verständliche Überschrift; „Querschnittsschicht" kann dann im ersten Satz als Fachbegriff nachgereicht werden. |
| **React / Komponente** | „React – die verwendete Programmbibliothek für Benutzeroberflächen. Sie setzt die Oberfläche aus *Komponenten* zusammen: abgeschlossenen Bausteinen wie einer Karte, einem Dialog oder einem Eingabefeld, die mehrfach verwendet werden können." |
| **TypeScript** | „TypeScript – eine Erweiterung der Programmiersprache JavaScript um Typangaben. Sie legt für jeden Wert fest, welcher Art er ist, sodass viele Fehler bereits beim Schreiben auffallen und nicht erst beim Nutzer." |
| **`.ts` / `.tsx`** | „`.ts`-Dateien enthalten reine Logik, `.tsx`-Dateien zusätzlich die Beschreibung sichtbarer Oberfläche." |
| **`i18n`** | **Der undurchsichtigste Begriff im ganzen Kapitel** – der Leser kann ihn nicht einmal aussprechen. „`i18n` – die branchenübliche Abkürzung für *internationalization*: i, 18 ausgelassene Buchstaben, n. Der Ordner enthält sämtliche sichtbaren Texte in Deutsch und Englisch, getrennt vom Programmcode." |
| **`lib`** | „`lib` (für *library*, Bibliothek) – technische Hilfsfunktionen …" |
| **Unit-Test** | „Unit-Tests – kleine Prüfprogramme, die eine einzelne Rechenregel mit bekannten Eingabewerten aufrufen und mit dem erwarteten Ergebnis vergleichen. Sie laufen automatisch bei jeder Änderung und schlagen an, sobald ein Ergebnis abweicht." |
| **Branch / Pull Request / `main`** | Zusammen erklären, siehe C.4 – das ist der schwierigste Absatz des Kapitels. |
| **Cloud Function** | „Cloud Function – ein kleines Programm, das nicht im Browser des Nutzers läuft, sondern auf einem Server des Anbieters, und nur bei Bedarf gestartet wird. Hier übernimmt es die KI-gestützte Erkennung von Zählerständen aus Fotos." |

### B.2 Wünschenswert

| Begriff | Kurzvorschlag |
|---|---|
| **Tailwind CSS / „Klassen"** | „Tailwind CSS – ein Gestaltungswerkzeug, bei dem das Aussehen nicht in eigenen Gestaltungsdateien beschrieben, sondern über Kurzbezeichnungen unmittelbar an den jeweiligen Baustein geschrieben wird. Deshalb gibt es hier nur eine einzige klassische Gestaltungsdatei." |
| **„zur Laufzeit"** | „… erst während der Benutzung im Browser erzeugt, nicht vorab als fertige Seite abgelegt." |
| **Themevariablen** | „… zentrale Farbwerte für helle und dunkle Darstellung." |
| **Zustand / Zustandsbereich** | Die Metapher „Gedächtnis der App" leistet das bereits – nur einen Halbsatz ergänzen: „*Zustand* bezeichnet in der Programmierung alle Daten, die die Anwendung während der Benutzung im Kopf behält." |
| **Modul** | „abgegrenzte Module – in sich geschlossene Programmteile mit klarer Aufgabe." |
| **Git-Historie** | „… unabhängig von der Änderungshistorie des Versionsverwaltungssystems." |
| **serverseitiger Code** | „Code, der nicht auf dem Gerät des Nutzers, sondern auf einem Server ausgeführt wird." |
| **Algorithmen** | Geläufig genug, kann stehen bleiben. |

### B.3 Eine echte Stolperfalle

> „… weil neue Funktionen als abgegrenzte Module hinzukommen und **Änderungen
> überwiegend lokal bleiben.**"

„Lokal" heißt hier *örtlich begrenzt* (die Änderung wirkt nur an einer Stelle).
Ein Nicht-Programmierer liest es als *auf dem lokalen Rechner* – zumal im selben
Kapitel „lokaler Browserspeicher" vorkommt, wo es genau das bedeutet.

> **Vorschlag:** „… und Änderungen in ihrer Wirkung meist auf einen einzigen
> Fachbereich beschränkt bleiben."

---

## Teil C — Strukturelle Befunde

### C.1 Die Abbildung erscheint, bevor der Leser sie lesen kann

Der Text bricht nach Seite 6 ab, die ganzseitige Abbildung steht auf Seite 7,
die Erklärung folgt erst auf Seite 8. Der Leser trifft also auf eine sehr dichte
Grafik mit rund 55 Ordnern, Farbcodierung, einem Detailkasten und einer
Typentabelle – **bevor** ein einziger Begriff erklärt wurde.

> **Vorschlag:** Vor die Abbildung einen kurzen Absatz „Wie diese Abbildung zu
> lesen ist" setzen. Drei bis vier Sätze genügen:
>
> „Abbildung 2 zeigt den Verzeichnisbaum des Projekts – die Ordnerstruktur, wie
> sie sich beim Öffnen des Repositorys darstellt. Eingerückte Einträge liegen
> jeweils im Ordner darüber. Die Zahl hinter einem Ordnernamen gibt an, wie viele
> Dateien er unmittelbar enthält; die Farbe, welcher Art diese Dateien sind
> (Oberfläche, Rechenlogik, Konfiguration, Dokumentation). Der Kasten rechts
> oben greift ein Muster heraus, das sich in neun Ordnern gleichartig
> wiederholt."

### C.2 Zahlen ohne Maßstab

Das Kapitel nennt 423 Dateien, 52 000 Zeilen, 17 Bereiche, 31 Rahmendateien, 72
Testdateien, 5 Ebenen. Für einen Nicht-Programmierer ist **keine** dieser Zahlen
einzuordnen. Ist das ein großes Projekt? Sind fünf Ebenen tief oder flach? Sind
31 Dateien in einem Ordner viel?

An einer Stelle löst das Kapitel das vorbildlich – im Schlussabsatz heißt es,
die 31 Rahmendateien lägen „an der Grenze dessen, was ohne weitere Unterteilung
schnell erfassbar ist". **Genau dieser Bewertungssatz fehlt bei allen anderen
Zahlen.**

> **Vorschläge für je einen Halbsatz:**
> - 52 000 Zeilen: „… ungefähr 52 000 Zeilen. Zum Vergleich: Das entspricht etwa
>   dem Textumfang eines mehrere hundert Seiten starken Fachbuchs. Für eine
>   Anwendung dieses Zuschnitts ist das eine mittlere Größenordnung – klein
>   genug, dass eine Person den Überblick behält, groß genug, dass eine
>   Ordnungsstruktur unverzichtbar wird."
> - 5 Ebenen: „Fünf Ebenen sind für ein Projekt dieser Größe flach; tiefe
>   Verschachtelung verlängert Suchwege und war deshalb ausdrücklich nicht das
>   Ziel."
> - 72 Testdateien: siehe A.5 – auf 966 Testfälle umstellen.

### C.3 Kein durchgehendes Beispiel

Der Kühlschrank-Check wird zweimal als Beispiel angerissen und dann jeweils
verlassen. Ein einziges Beispiel, das durch **alle** Abschnitte des Kapitels
führt, würde die Struktur für einen Nicht-Programmierer erfahrbar machen statt
nur beschreibbar.

> **Vorschlag:** Am Ende des Abschnitts „Fachbereiche" einen kurzen Absatz
> ergänzen, der eine Frage durch die Struktur verfolgt:
>
> „Ein Beispiel macht den Nutzen dieser Ordnung greifbar. Angenommen, die
> Bewertungsgrenze des Kühlschrank-Checks soll geändert werden – ab welcher
> Temperatur gilt ein Gerät als zu kalt eingestellt. Gesucht wird genau eine
> Datei: `features/measurements/fridge/fridge.ts`. Die zugehörige
> Bildschirmanzeige liegt daneben, die zugehörigen Prüfregeln unter
> `tests/unit/fridge.test.ts`. Wäre das Projekt nach technischen Dateiarten
> geordnet – alle Berechnungen in einem Ordner, alle Bildschirme in einem
> zweiten, alle Tests in einem dritten –, lägen dieselben drei Dateien an drei
> weit auseinanderliegenden Stellen."

Diese Passage ist besonders wertvoll, weil sie die **Alternative** benennt. Eine
Strukturentscheidung wird erst dann als Entscheidung sichtbar, wenn man sieht,
wogegen sie getroffen wurde.

### C.4 Der schwierigste Absatz: Branch, Pull Request, main

Der Absatz zur Veröffentlichung ist inhaltlich der stärkste des Kapitels – er
zeigt, dass eine **organisatorische** Regel **technisch** durchgesetzt wird.
Genau das ist ein Argument, das ein Prüfer würdigt.

Er enthält aber vier unerklärte Begriffe hintereinander: *Branch, Pull Request,
Hauptzweig main, GitHub Pages/Firebase.* Damit verpufft die Pointe.

> **Vorschlag – vollständige Neufassung:**
>
> „Die Veröffentlichung folgt einem festen Ablauf. Änderungen entstehen zunächst
> in einem *Branch* – einer abgezweigten Arbeitskopie des Projekts, in der
> gearbeitet werden kann, ohne den veröffentlichten Stand zu berühren. Ist die
> Änderung fertig, wird sie über einen *Pull Request* zur Übernahme
> vorgeschlagen; das ist der Punkt, an dem sie geprüft wird und an dem die
> automatischen Prüfungen anlaufen. Erst die Zusammenführung in den Hauptzweig
> `main` – den Zweig, der den veröffentlichten Stand trägt – löst die
> Veröffentlichung aus.
>
> Diese Zusammenführung ist der einzige Schritt, der nicht automatisiert ist.
> Sie erfolgt bewusst durch eine Person. Damit ist die organisatorische Regel,
> dass ein Mensch über die Veröffentlichung entscheidet, nicht bloß vereinbart,
> sondern technisch im Ablauf verankert: Ohne diesen manuellen Schritt erreicht
> keine Änderung die Nutzer."

Der letzte Satz ist der eigentliche Punkt und sollte deshalb am Ende stehen.

### C.5 Der Abschnitt „Dateitypen und technische Trennung" trägt am wenigsten

Er ist der abstrakteste Abschnitt und derjenige mit dem geringsten
Erkenntnisgewinn für einen Nicht-Programmierer – er beschreibt im Kern eine
Farblegende. Zugleich enthält er mit den „96 %" den einzigen nicht
nachvollziehbaren Zahlenwert (A.2.2).

> **Vorschlag:** Auf drei bis vier Sätze kürzen und auf die *eine* Aussage
> zuspitzen, die fachlich zählt: **Rechenlogik und Bildschirmanzeige liegen in
> getrennten Dateien.** Das ist der Grund, warum die Rechenregeln automatisch
> geprüft werden können, ohne die Oberfläche zu starten – und damit die direkte
> Brücke zum Abschnitt „Qualitätssicherung". Diese Brücke fehlt bisher, obwohl
> beide Abschnitte dasselbe Prinzip von zwei Seiten beschreiben.

### C.6 Die Reihenfolge der Abschnitte ist richtig

Vom Groben zum Feinen: Repository → zwei Bereiche → Fachbereiche → Muster
innerhalb eines Fachbereichs → gemeinsame Schichten → Dateitypen → Umfeld →
Bewertung. Das ist nachvollziehbar aufgebaut und sollte **nicht** umgestellt
werden.

Einzige Empfehlung: die Lesehilfe aus C.1 vor die Abbildung ziehen.

---

## Teil D — Absatz-für-Absatz-Übersicht

| # | Absatz | Befund | Maßnahme |
|---|---|---|---|
| 1 | Einleitung (drei Fragen) | Guter Einstieg, die drei Leitfragen tragen das Kapitel | Nur „Repository" und „Quellcode" erklären |
| 2 | Zwei Bereiche, Zeilenzahlen | Zahlen korrekt | „gebündelt", „Cloud Functions" erklären; Größenvergleich ergänzen (C.2) |
| — | **vor Abbildung 2** | fehlt | Lesehilfe einfügen (C.1) |
| 3 | 17 Fachbereiche, Projektablage-Analogie | **Stärkster Absatz des Kapitels** | Nur „feature-basiert" auflösen; Analogie unbedingt erhalten |
| 4 | Messbereich, Dateimuster | 3 sachliche Ungenauigkeiten | Nach A.2.3 / A.2.4 neu fassen |
| — | | | Durchgehendes Beispiel ergänzen (C.3) |
| 5 | Verschachtelungstiefe | Korrekt | Einordnen: fünf Ebenen sind flach (C.2) |
| 6 | components / ui | Korrekt, gut verständlich | „Komponente" einmal erklären |
| 7 | store / i18n / types / lib | „Gedächtnis der App" ist stark | `i18n` **muss** aufgelöst werden (B.1); `authStore`-Ausnahme (A.4) |
| 8 | Dateitypen | 96 % nicht nachvollziehbar | Kürzen, Bezug nennen, Brücke zur Qualitätssicherung (A.2.2, C.5) |
| 9 | Tests, Doku, Medien, Archiv | „zwei weitere Tests" falsch | Korrigieren; 966 Testfälle nennen (A.2.1, A.5) |
| 10 | Workflows, Branch, Pull Request | Inhaltlich stark, sprachlich verschlossen | Neufassung nach C.4 |
| 11 | Abwägung und Grenzen | **Wissenschaftlich vorbildlich** | Nur „lokal" ersetzen (B.3), sonst nicht anfassen |

---

## Teil E — Empfohlene Ergänzung: ein Kurzglossar

Selbst bei bester Erklärung im Fließtext wird ein Nicht-Programmierer beim
Weiterlesen Begriffe vergessen. Ein kompaktes Glossar – als Kasten am
Kapitelanfang oder als Tabelle im Anhang mit Verweis – kostet eine halbe Seite
und nimmt dem Leser die Sorge, den Anschluss zu verlieren.

**Mindestumfang (13 Einträge):** Repository · Quellcode · Branch · Pull Request ·
Build · React · Komponente · TypeScript · Zustand · Unit-Test · Cloud Function ·
Bibliothek · Verzeichnisbaum

Formulierungen dafür stehen in Teil B und können übernommen werden.

---

## Teil F — Was erhalten bleiben muss

Diese Passagen sind gelungen und dürfen bei der Überarbeitung **nicht**
verwässert werden:

1. **Die drei Leitfragen der Einleitung.** Sie geben dem Kapitel eine Achse und
   rechtfertigen, dass eine Ordnerstruktur überhaupt beschrieben wird.
2. **Die Projektablage-Analogie.** Der beste didaktische Griff des Kapitels –
   sie erklärt das feature-basierte Prinzip in zwei Sätzen ohne Fachbegriff.
3. **„Gemeinsam bilden sie das Gedächtnis der App."** Eine tragfähige Metapher
   für einen abstrakten Sachverhalt.
4. **Der Ablauf *verstehen, messen, auswerten* ist in der Dateistruktur
   erkennbar.** Der überzeugendste Beleg dafür, dass die Struktur der fachlichen
   Aufgabe folgt und nicht der Technik.
5. **Der gesamte Schlussabsatz.** Er benennt den Preis der Entscheidung, eine
   Stelle an der Grenze der Übersichtlichkeit und die Grenzen der Abbildung
   selbst. Das ist wissenschaftlich sauberes Arbeiten und wiegt in der Bewertung
   mehr als jede zusätzliche Detailbeschreibung. **Nicht kürzen, nicht
   abschwächen.**

---

## Teil G — Belege für die Architekturentscheidung

Das Kapitel begründet die feature-basierte Struktur bisher rein aus sich selbst.
Eine oder zwei Literaturstellen würden die Entscheidung von einer
Geschmacksfrage zu einer begründeten Wahl aufwerten.

**Die Gegenüberstellung, um die es geht:** Ordnung nach fachlicher Funktion
(*package by feature*) gegenüber Ordnung nach technischer Art (*package by
layer*) – alle Bildschirme in einem Ordner, alle Berechnungen in einem zweiten.
Das ist ein etablierter, breit diskutierter Gegensatz in der
Softwarearchitektur.

**Wichtig – ungeprüft:** Diese Session hatte keinen Netzzugang zur Verifikation
von Fundstellen. Die folgenden Hinweise sind **Rechercheansätze, keine geprüften
Belege.** Nach der Projektkonvention „Jeder Richtwert nennt seine Herkunft" darf
keine Quelle in die Arbeit übernommen werden, die nicht am Original geprüft
wurde:

- Robert C. Martin, *Clean Architecture* – zum Gedanken, dass die
  Verzeichnisstruktur die fachliche Aufgabe erkennen lassen soll
  („screaming architecture").
- Martin Fowler und das Umfeld der Microservices-/Modularitätsdebatte – zur
  Gegenüberstellung von fachlicher und technischer Schnittbildung.
- Eric Evans, *Domain-Driven Design* – zum Prinzip, Software entlang fachlicher
  Zuständigkeiten statt technischer Ebenen zu schneiden.

**Empfehlung:** Ein einziger, sauber geprüfter Beleg genügt. Drei ungeprüfte
Verweise schaden mehr, als sie nützen.

---

## Teil H — Vorschlag: reduzierte Abbildung 2 (Nachtrag 06.09.2026)

**Auftrag:** Die Abbildung wirkt unruhig und soll auf das für das Verständnis
der Ordnerstruktur Wesentliche reduziert werden. Der vollständige, an Claude
Design übergebbare Prompt steht in
[`docs/prompt-claude-design-abbildung2.md`](./prompt-claude-design-abbildung2.md).
Hier nur die Begründung der Auswahl, damit sie nachvollziehbar bleibt und die
Textstellen entsprechend mitgezogen werden können.

### H.1 Was bleibt

| Baustein | Warum er bleibt |
|---|---|
| Zwei-Teilung `src/` vs. „Unterstützende Bereiche" | Steckt den Rahmen ab: Wie viel vom Repository ist überhaupt die App. |
| 17 Fachbereiche, davon 8 benannt + „9 weitere" | Trägt den Kerngedanken des Kapitels (feature-basiert). Die 8 benannten sind exakt die im Fließtext bereits genannten (Fragebogen, Messungen, Monitoring, Berichte, Wissensbereich, Empfehlungen, Profile, Rechtliches) – Abbildung und Text zeigen damit dieselbe Auswahl. |
| „Gemeinsam genutzte Bausteine" (components, store, i18n, lib, types) | Zweiter Kerngedanke: Wenige, bewusst schmale Schichten stehen den 17 Fachbereichen gegenüber. |
| Modulmuster-Callout (Kühlschrank-Beispiel) | Einziger Teil der alten Abbildung, der eine Regel *zeigt*, nicht nur *aufzählt*. Wird in der Neufassung gleich korrigiert: Die in Teil A.2.4 belegten Ausnahmen (Lichtcheck ohne Intro, Raumklima-Check mit vier statt einer Rechendatei) stehen jetzt ehrlich mit im Bild, statt „jeder Ordner" zu behaupten. |

### H.2 Was entfällt

| Baustein | Warum er entfällt |
|---|---|
| Vollständiger Verzeichnisbaum mit jeder Unterordner-Datei-Zahl (analytics/1, billing/1, demo/4 usw.) | Für das Verständnis „nach Themen geordnet, nicht nach Technik" liefert keine dieser Einzelzahlen einen zusätzlichen Erkenntniswert – nur Dichte. |
| Achtzeilige Dateitypen-Tabelle mit Prozentbalken | Beschreibt die Zusammensetzung des Codes, nicht die Ordnerstruktur – ein anderes Thema als das der Abbildung (vgl. Teil C.5). Die einzige tragende Aussage („Logik und Oberfläche sind technisch getrennt") wandert als **ein Satz** in den Fließtext, siehe H.3. |
| Gesamt-Dateizahl im Untertitel | Löst zugleich den in A.3.1 belegten Widerspruch (423 vs. 453) auf, indem die Zahl in der Abbildung schlicht nicht mehr auftaucht. |
| Fünfteilige Farblegende | Wird durch drei Kategorien ersetzt (Fachbereich · gemeinsamer Baustein · Beispiel-Datei-Ebene). Löst zugleich A.3.2 (die eine Ausnahme bei `features/`), weil diese Legenden-Bedeutung in der neuen Fassung nicht mehr gebraucht wird. |

### H.3 Textfolgen der Reduktion

Weil die Dateitypen-Tabelle aus der Abbildung verschwindet, braucht der
Abschnitt „Dateitypen und technische Trennung" im Fließtext eine kurze
Ersatzformulierung, die den Kernsatz allein trägt (deckt sich mit dem
Kürzungsvorschlag aus Teil C.5):

> „Rechenlogik und Bildschirmanzeige liegen durchgehend in getrennten Dateien:
> 221 reine Rechendateien (`.ts`) stehen 153 Oberflächendateien (`.tsx`)
> gegenüber – zusammen 98 % des gesamten Programmcodes. Klassische HTML- und
> CSS-Dateien treten dagegen nur als Rahmen auf: React erzeugt die sichtbare
> Struktur zur Laufzeit, Tailwind CSS beschreibt die Gestaltung überwiegend
> durch Klassen direkt an den Komponenten."

Die Lesehilfe vor der Abbildung (Vorschlag in Teil C.1) darf mit der
reduzierten Fassung ebenfalls kürzer ausfallen, da kein vollständiger
Verzeichnisbaum mehr zu erklären ist:

> „Abbildung 2 zeigt, wie der Quellcode organisiert ist: oben die Zwei-Teilung
> in Anwendungscode und unterstützende Bereiche, darunter die 17 Fachbereiche
> und die wenigen gemeinsam genutzten Bausteine, die sie alle mitbenutzen. Der
> Kasten rechts zeigt an einem Beispiel, welchem Muster jeder Fachbereich im
> Mess-Teil der App intern folgt."

---

## Anhang — Prüfbefehle zum Nachvollziehen

Alle Zahlen dieser Analyse lassen sich im Projektverzeichnis reproduzieren:

```bash
# Alle Dateien (ohne Git-Verwaltung, Fremdbibliotheken, Build-Ergebnisse)
find . -type f -not -path './.git/*' -not -path './node_modules/*' \
  -not -path './functions/node_modules/*' -not -path './dist/*' | wc -l   # 453

# Verteilung nach Dateityp
find . -type f -not -path './.git/*' -not -path './node_modules/*' \
  -not -path './functions/node_modules/*' -not -path './dist/*' \
  | grep -o '\.[a-zA-Z0-9]*$' | sort | uniq -c | sort -rn

# Zeilen in src
find src -type f -exec cat {} + | wc -l                                   # 51 929

# Fachbereiche
ls -d src/features/*/ | wc -l                                             # 17

# Testfälle statt Testdateien
grep -rho "\bit(\|\btest(" tests/unit | wc -l                             # 921
grep -c "it(\|test(" tests/firestore.rules.test.ts                        # 45
```

---

*Erstellt am 06.09.2026 · Grundlage: Repository-Stand `main` @ `0b7d1fc`*
