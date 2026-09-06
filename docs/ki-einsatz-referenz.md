# KI-Einsatz in der Entwicklung der E-App – Referenz für die schriftliche Ausarbeitung

**Zweck dieses Dokuments.** Es beschreibt, *wie* im Verlauf dieses Projekts mit
einem KI-Assistenten (Claude Code, Anthropic) zusammengearbeitet wurde: in
welcher Rolle, mit welchen Regeln, an welchen Beispielen belegbar. Es ist als
**Faktenquelle** für ein Kapitel der Hausarbeit gedacht, nicht als fertiger
Fließtext – die Formulierungen dürfen frei umgeschrieben werden, die Belege
(Dateien, Commits, Zitate) nicht ohne Prüfung verändert werden.

**Stand:** 06.09.2026, Commit `ef22463`. Jede Aussage ist an einer Datei, einem
Commit oder einem Zitat aus dem Repository festgemacht. Wo das Repository
keinen Beleg hergibt, sagt Abschnitt 8 das ausdrücklich – solche Stellen
gehören nicht unbelegt ins Kapitel, sondern sollten aus der eigenen Erinnerung
ergänzt oder offen als Lücke benannt werden.

**Projektkontext:** Studienprojekt an der HTW Berlin (Campus Wilhelminenhof),
Autoren Kilian Maier und Johan Uhle (siehe Impressum, `src/features/legal/operator.ts`).
Die E-App ist eine deutschsprachige Energie-Analyse-Anwendung (React 19,
TypeScript, Tailwind CSS v4) mit Firebase-Backend (Auth, Firestore, eine Cloud
Function für den Zähler-Scan mit Gemini).

---

## 1. Welche Art von KI-Einsatz das war

Wichtig für eine saubere Darstellung: Es handelte sich nicht um ein
Chat-Fenster, in dem fertiger Code kopiert und eingefügt wurde, sondern um
einen **agentischen Coding-Assistenten** (Claude Code), der über viele
Sitzungen hinweg direkt im Repository arbeitete – Dateien lesen und ändern,
Tests ausführen, den Verlauf einsehen, Commits erstellen. Das unterscheidet
den Einsatz von einer reinen Frage-Antwort-Nutzung in drei Punkten, die für
eine Ausarbeitung relevant sind:

1. **Der Assistent hatte Zugriff auf den tatsächlichen Code**, nicht nur auf
   Beschreibungen davon. Vorschläge ließen sich damit gegen das bestehende
   Verhalten prüfen, statt aus dem Nichts zu entstehen (Beispiele in
   Abschnitt 5).
2. **Die Zusammenarbeit war über eine Projektdatei geregelt**
   (`CLAUDE.md`, im Repository, versioniert wie der Code selbst) – nicht über
   informelle Absprachen, die verloren gehen. Diese Datei legt Arbeitsweise,
   Konventionen und – zentral – die Grenzen der Autonomie des Assistenten
   fest.
3. **Jede Sitzung begann mit einem Abgleich**, nicht mit einer leeren Seite:
   Stand von `main` gegen den Arbeitsbranch vergleichen, offene Punkte aus der
   Befundliste referieren, dann erst weiterarbeiten. Das Projekt „erinnert
   sich" also über Dateien, nicht über das Gedächtnis eines einzelnen Chats.

---

## 2. Die Rollenaufteilung: Werkzeug mit klaren Grenzen, nicht Autopilot

Für eine Hausarbeit ist genau dieser Punkt der Unterschied zwischen „die KI
hat das gemacht" und „die KI wurde kontrolliert eingesetzt". Die Regeln dazu
stehen wörtlich in `CLAUDE.md` und wurden über das ganze Projekt eingehalten:

> „**Claude mergt nicht nach `main` und pusht nicht nach `main`** – auch dann
> nicht, wenn alle Prüfungen grün sind." (`CLAUDE.md`, Abschnitt „Branches")

Begründung im selben Dokument: Ein Push auf `main` löst automatisch das
Deployment auf Firebase Hosting und GitHub Pages aus – jede Änderung wäre
sofort live. Bis zum 25.08.2026 wurde noch direkt auf `main` entwickelt; seither
liegt der Zeitpunkt des Live-Schaltens ausschließlich beim Menschen. Das ist
eine bewusst getroffene Governance-Entscheidung, keine technische
Notwendigkeit – und sie zeigt, dass die Kontrolle über das Endergebnis nicht
an die KI abgegeben wurde.

Eine zweite, ebenso wörtlich dokumentierte Regel betrifft neue Beobachtungen
aus der Nutzung (`docs/gefundene-probleme.md`):

> „Arbeitsweise: erst sammeln, kategorisieren (Bug/Problem/Verbesserung) und
> in die Datei eintragen, **ohne** Code zu ändern; erst wenn Kilian
> ausdrücklich „umsetzen" sagt, wird gebaut."

Die KI durfte hier also Befunde recherchieren, bestätigen oder widerlegen und
vorschlagen – aber nicht eigenständig entscheiden, was davon in die App
kommt. Ein konkreter Beleg, dass diese Grenze nicht nur auf dem Papier stand:
Punkt 9 der Befundliste (Raumzuordnung bei der Warmwasser-Wartezeit) wurde
bewusst **nicht** umgesetzt, obwohl eine technische Lösung nahegelegen hätte,
weil er „eine echte UX-Entscheidung braucht … das sollte nicht ungefragt
entschieden werden" (`docs/gefundene-probleme.md`, Punkt 9). Die KI hat den
Punkt also identifiziert, analysiert und zwei Lösungswege skizziert – die Wahl
zwischen ihnen ausdrücklich offengelassen.

---

## 3. Sparring bei Code-Struktur und Konventionen

Hier lässt sich der Beratungsanteil am klarsten belegen, weil die
Konventionen selbst im Projekt dokumentiert sind und ihre Begründung
mitschreiben.

### 3.1 Ein wiederkehrendes Muster: „eine Liste, alles andere leitet sich ab"

Mehrfach im Projekt taucht dieselbe Struktur-Idee auf, statt gleiche
Information an mehreren Stellen von Hand zu pflegen:

| Registry | Datei | Leitet daraus ab |
|---|---|---|
| Welches Feld hat welchen Zweck | `src/features/onboarding/fieldUsage.ts` | Ob ein Feld genutzt wird (per Typecheck erzwungen) |
| Welche Messung existiert | `src/features/measurements/catalog.ts` | Welche Messgeräte-Übersicht angezeigt wird (`instrumentNeeds.ts`) |
| Welche Schritte gibt es | `src/features/onboarding/sections.ts` | Fortschrittsanzeige, Modus-Filter (Schnellstart/Vollständig) |
| Welche Ziele gibt es | `src/features/onboarding/goals.ts` | Gewichtung von Empfehlungen und Messreihenfolge |

Diese Wiederholung ist kein Zufall, sondern eine im Projekt explizit gemachte
Regel: Ein früherer Zustand hatte dieselbe Information an bis zu fünf Stellen
unabhängig kodiert – Folge war unter anderem, dass die Fortschrittsanzeige
100 % zeigen konnte, während einzelne Abschnitte noch offene Angaben
meldeten (`docs/onboarding-referenz.md`, Abschnitt 7). Die Gegenmaßnahme
(eine Quelle, der Rest wird abgeleitet) ist ein Strukturvorschlag, der sich im
Code nachweisen lässt – nicht nur behauptet wird.

### 3.2 Konventionen mit dokumentierter Begründung

`CLAUDE.md` hält mehrere Konventionen fest, die typischerweise aus einem
konkreten Fehlerfall entstanden sind und seither gelten:

- **Feld-Migrationen gehören in `migrateOnboardingData`, nicht in den
  `merge`-Block der `persist`-Middleware.** Begründung: Ein Cloud-Sync
  schreibt per `setState` direkt in den Store und geht am `merge` vorbei –
  eine Migration nur dort hätte Altprofile aus der Cloud unmigriert
  ankommen lassen.
- **Raum- und Geräte-IDs werden nie geändert oder wiederverwendet.**
  Begründung: Eine laufende Nummer würde beim Löschen nachrutschen und ein
  Messergebnis versehentlich einem anderen Raum zuordnen. Abgesichert durch
  `tests/unit/roomMigration.test.ts`.
- **Jeder Richtwert trägt eine Herkunftsmarkierung** (`ThresholdOrigin`:
  `'reference'` | `'own'` | `'pending'`) – eine belegte Quelle, eine eigene
  begründete Faustregel, oder ein ausdrücklich offener Punkt, aber nie ein
  unmarkierter Wert.
- **Jede Messung nennt ihre Messgeräte** (`MeasurementMeta.instruments`) –
  ein leeres Array ist die gültige Aussage „braucht keins", nicht eine
  vergessene Angabe.

Diese Regeln sind insofern für die Ausarbeitung interessant, als sie zeigen,
dass die Zusammenarbeit nicht bei „Code, der funktioniert" endete, sondern bei
Konventionen, die spätere Fehler derselben Art strukturell verhindern sollen.

### 3.3 Grenze: die ursprüngliche Technologiewahl ist im Repository nicht belegt

Ehrlich zu benennen ist, dass sich **nicht** rekonstruieren lässt, ob und wie
die grundlegende Technologieentscheidung (React 19 + TypeScript + Tailwind
CSS v4, Zustand als State-Management, Firebase als Backend) mit der KI
beraten wurde – diese Wahl war bereits gesetzt, bevor die heutige, dokumentierte
Arbeitsweise (Tracker-Dateien, `CLAUDE.md`) entstand, und aus den vorhandenen
Dateien lässt sich dazu kein Gespräch belegen. **Diese Lücke sollte in der
Ausarbeitung entweder offen benannt oder aus der eigenen Erinnerung ergänzt
werden**, statt sie unbelegt auszuschmücken. Was sich dagegen sehr wohl
belegen lässt, ist die laufende Beratung bei Entscheidungen *innerhalb* des
gesetzten Stacks (siehe 3.1–3.2) – das ist die belastbarere und zugleich
ehrlichere Geschichte für ein Hausarbeits-Kapitel.

---

## 4. Fehler finden und beheben: kein Copy-Paste, sondern ein Prüfschritt

Der Ablauf bei gemeldeten Problemen folgte durchgehend demselben Muster, das
sich an mehreren Einträgen in `docs/gefundene-probleme.md` nachweisen lässt:
**Befund übernehmen → im Code nachprüfen → Ursache benennen → Fix vorschlagen
→ Test schreiben oder anpassen → im Browser bestätigen.** Drei Beispiele mit
Beleg:

**Beispiel 1 – ein Schwellenwert-Fehler mit doppeltem Effekt (Punkt 6).**
Gemeldet war: Ein Möbelabstand von 5 cm wurde als „Gut" angezeigt. Die Prüfung
im Code ergab zwei ineinandergreifende Ursachen, nicht nur eine: Erstens
unterschied `answerFromDistance()` nur zwischen `< 5 cm` und `5–29 cm`, sodass
5 cm und 16 cm dieselbe Bewertungsstufe erhielten. Zweitens hing das Rating am
Ende von einem generischen Text-Baustein ab (`measurements.ratings.medium` =
„Gut"), der die feinere, App-eigene Beschriftung („Kleinigkeit") in der
Verlaufsliste überschrieb. Behoben wurden beide Ursachen, mit begleitendem
Test.

**Beispiel 2 – ein logischer Widerspruch, den der eigene Code-Kommentar schon
verriet (Punkt 16).** Ein Kühlschrank bei 5,0 °C zeigte gleichzeitig „Optimal
eingestellt" **und** „Sparpotenzial ≈ 12 %" – ein Widerspruch in sich.
Auffällig beim Nachlesen: Der Kommentar im Code sagte bereits, das
Sparpotenzial solle bei „optimal" null sein – die Berechnung tat das nur
nicht. Die Rechnung hing schlicht nicht am Bewertungsstatus. Der Fix band
beide Stellen aneinander und eine neue Testdatei (`tests/unit/fridge.test.ts`)
hält den Gleichlauf seither fest.

**Beispiel 3 – eine Zähler-Rechnung, die bei runden Werten unsinnige Ergebnisse
lieferte (Punkte 38/39).** Ein Grundlast-Check mit ganzzahligen Zählerständen
wies teils „Ermittelte Grundlast –" statt einer Zahl aus, teils eine
Jahresersparnis von 381.209 € bei 145.703 W Grundlast – physikalisch
unmöglich für einen Haushalt. Die Prüfung zeigte, dass eine grobe
Zähleranzeige (keine Nachkommastelle) bei kurzen Messintervallen zu einer
Scheingenauigkeit von 20 % statt 2 % führte und Ausreißer nicht abgefangen
wurden. Der Fix rechnet die tatsächliche Ableseungenauigkeit ein und fängt
unplausible Werte ab, statt sie unkommentiert weiterzureichen.

Wichtig für die Darstellung: In allen drei Fällen bestand die Arbeit nicht
darin, „der KI zu glauben", sondern Ursache und Fix **anhand des Codes und
anschließend im Browser** zu verifizieren – der Fehlerbericht in
`docs/gefundene-probleme.md` enthält jeweils den Beleg („Bestätigt anhand des
Screenshots …", „Nachgemessen im Browser über das ganze Band …"), nicht nur
die Behauptung, ein Fehler sei behoben.

---

## 5. Texte überarbeiten: Anwendungstexte und Rechtstexte

### 5.1 Anwendungstexte

Zwei Beispiele zeigen, dass Textarbeit nicht nur Stil betraf, sondern auch
inhaltliche Richtigkeit:

- **Ein Rechenfehler in einer Erklärung.** Ein Hinweistext zur
  Warmwasserquelle behauptete zunächst, elektrisch erzeugte Wärme koste
  „grob das Vierfache" von Gas. Gegen die tatsächlichen Standardpreise der
  App nachgerechnet ergibt sich das 2,65-fache – das Vierfache trifft auf
  Pellets zu, nicht auf Gas. Der Text wurde korrigiert und ein Test hält die
  Zahl seither an der Rechnung fest (Punkt 21, `docs/gefundene-probleme.md`).
- **Ein sichtbarer i18n-Fehler, der erst beim Ansehen im Browser auffiel.**
  Ein neuer Tipp-Text ging zunächst ohne Übersetzung live – auf dem Knopf
  stand der rohe Schlüssel `tips.items.pv_planned_base_load.action` statt
  eines lesbaren Textes. Gefunden wurde das nicht durch den Test, sondern
  durchs Ansehen der Seite; seither gibt es dafür einen Test, der genau
  diese Fehlerklasse abfängt (Punkt 20).

### 5.2 Rechtstexte – mit ausdrücklichem Vorbehalt

Impressum und Datenschutzerklärung (`/impressum`, `/datenschutz`) wurden mit
KI-Unterstützung erstellt, aber **nicht** als fertiges, autoritatives Ergebnis
behandelt. Der Vorbehalt steht wörtlich im Projekt:

> „Sie sind nach bestem Wissen aufgebaut und benennen die tatsächlichen
> Verarbeitungen – **eine juristische Prüfung ersetzen sie nicht.**"
> (`CLAUDE.md`)

`docs/legal.md` führt zusätzlich eine Liste mit zehn konkreten Punkten, die
„von einem Rechts-/Datenschutzexperten geprüft werden" sollten – etwa ob die
Auftragsverarbeitungsverträge mit Google akzeptiert sind, ob die im Impressum
angegebene Hochschul-Anschrift für ein privates Angebot zulässig ist, oder ob
die genannte 14-monatige Analytics-Aufbewahrung mit der tatsächlichen
GA4-Konfiguration übereinstimmt. Das ist für eine Ausarbeitung ein
brauchbares Beispiel für **verantwortungsbewussten** KI-Einsatz bei
rechtlich heiklen Texten: die KI hat einen begründeten Entwurf geliefert und
gleichzeitig benannt, wo genau ihre Kompetenz endet.

### 5.3 Referenzdokumente für die Ausarbeitung selbst

Bemerkenswert für das Kapitel ist ein weiterer, reflexiver Anwendungsfall:
Für die Hausarbeit wurden eigene Referenzdokumente erstellt
(`docs/onboarding-referenz.md`, `docs/rechtliches-referenz.md` – und dieses
Dokument selbst), die Fakten aus dem Code aufbereiten, aber ausdrücklich
**keine** fertige Prosa liefern sollen:

> „Es ist als **Faktenquelle** für die Erstellung einer Dokumentation gedacht,
> nicht als fertiger Fließtext – die Formulierungen dürfen frei umgeschrieben
> werden, die Zahlen, Feldnamen und Wirkungsketten nicht."
> (`docs/onboarding-referenz.md`)

Diese Dokumente warnen zusätzlich ausdrücklich vor Übertreibung:

> „**Vorsicht bei Superlativen:** Formulierungen wie „vollständig",
> „automatisch" oder „genau" sollten an den Grenzen … gemessen werden."

Das ist selbst ein Beleg dafür, dass der KI-Einsatz nicht auf unreflektierte
Übernahme ausgelegt war, sondern auf **belegte, überprüfbare** Aussagen –
auch wenn es um die Beschreibung der eigenen Arbeit ging.

---

## 6. Typische Prompts: kurz, ergebnisorientiert, nicht schrittweise vorgegeben

Charakteristisch für die Zusammenarbeit war, dass Anweisungen in der Regel
**kurz und zielgerichtet** formuliert waren – sie beschrieben, *was* anders
sein soll und *warum*, nicht *wie* es implementiert werden soll. Die folgenden
Beispiele sind wörtliche oder sinngemäße Zitate aus `docs/gefundene-probleme.md`
(dort als „Kilians Befund"/„Kilians Frage" protokolliert) und zeigen die
Bandbreite:

> „Bitte entferne die Smart-Home-Geräte. Die haben keinen Mehrwert."

> „Die Frage ob Mieter oder Eigentümer würde ich streichen. Das hat keinen
> großen Mehrwert finde ich. Vielleicht kann man den Standort dann auch hier
> gleich schöner grafisch visualisieren und dann gleich relevante Infos
> anzeigen an geeigneter Stelle."

> „Wie können wir diese Info besser nutzen? Bis jetzt ist das ja quasi ein
> totes Ende. Kann man daraus die Heizperiode vielleicht ableiten? […] Zum
> Überprüfen, ob wirklich nur in der Heizperiode geheizt wird?"

> „Kannst du das auf eine eigene Seite des Fragebogens vor dieser Seite bitte
> verorten."

> „Hat die Angabe der Warmwasseraufbereitung irgendeinen weiteren Sinn? Ich
> möchte tote Enden im Fragebogen vermeiden."

Auffällig an diesen Beispielen: Keiner der Prompts nennt eine Datei, eine
Funktion oder eine Implementierung. Die Übersetzung „welches Feld betrifft
das, welche Datei muss sich ändern, welche Tests brauchen ein Update" lag bei
der KI – die fachliche Einordnung („lohnt sich das?", „was streichen wir,
was bauen wir an?") beim Menschen. Wo eine Entscheidung strukturell größere
Tragweite hatte (siehe Abschnitt 2, Punkt 9), wurde ausdrücklich zurückgefragt
statt vorentschieden.

Für wiederkehrende, mehrstufige Vorhaben (Fragebogen-Umbau, Tank-Umbau,
Wissens-Ausbau, Verbesserungsliste) trat neben die freie Sprache ein
leichtgewichtiges, wiederverwendbares Protokoll: kurze Befehle wie
„`/etappe status`" oder „`/verbesserung`" riefen eine vordefinierte
Arbeitsweise ab – „eine Etappe pro Session, danach Tracker aktualisieren und
den Arbeitsbranch pushen" (`CLAUDE.md`). Das reduzierte den nötigen Prompt-Text
auf ein Minimum, ohne die Nachvollziehbarkeit zu verlieren: Der Fortschritt
steht dauerhaft in `docs/*-etappen.md`, nicht nur im Chatverlauf.

---

## 7. Umfang: was daraus entstanden ist

Zur Einordnung des Umfangs, mit Beleg:

| Vorhaben | Umfang | Tracker |
|---|---|---|
| Fragebogen-Umbau (ab 24.08.2026) | 6 Etappen + Vorarbeit | `docs/questionnaire-etappen.md` |
| Tank-Umbau (ab 30.08.2026) | 4 Etappen | `docs/tank-etappen.md` |
| Wissen-Ausbau (ab 31.08.2026) | 4 Etappen | `docs/wissen-etappen.md` |
| Verbesserungsliste (ab 04.09.2026) | 15 Etappen | `docs/verbesserungen-etappen.md` |
| Live-Test-Runde (04.–06.09.2026) | 43 einzeln kategorisierte Befunde (Bug/Problem/Verbesserung), davon zum Stand dieses Dokuments 2 bewusst zurückgestellt | `docs/gefundene-probleme.md` |

Diese Struktur – klein geschnittene, einzeln abgeschlossene und dokumentierte
Arbeitspakete statt einer großen, unstrukturierten „KI schreibt die App"
-Anweisung – ist selbst ein Aspekt der Methodik, der sich für die Ausarbeitung
eignet: Nachvollziehbarkeit entstand durch die **Größe der Schritte** und
ihre **Dokumentation**, nicht dadurch, dass am Ende alles funktionierte.

---

## 8. Grenzen dieses Dokuments

1. **Die ursprüngliche Technologie- und Architekturwahl** (siehe 3.3) ist aus
   dem Repository nicht rekonstruierbar und sollte nicht unbelegt behauptet
   werden.
2. **Informelle Rücksprachen ohne Textspur** (mündliche Absprachen, gelöschte
   Chat-Nachrichten, Entscheidungen, die nie in einer Tracker-Datei landeten)
   fehlen hier zwangsläufig. Was hier steht, ist das, was das Repository
   hergibt – nicht die vollständige Geschichte der Zusammenarbeit.
3. **Dieses Dokument wurde selbst mit KI-Unterstützung erstellt**, auf
   ausdrücklichen Wunsch, als Faktengrundlage für das Hausarbeits-Kapitel. Das
   sollte im Kapitel nicht verschwiegen werden – es ist im Sinne der in
   Abschnitt 5.3 beschriebenen Praxis konsequent, es transparent zu machen.
4. **Nicht jede hier beschriebene Konvention war beim ersten Anlauf richtig.**
   Ein Beispiel, das zur Ehrlichkeit dieses Dokuments gehört: Eine
   „Sommer-Check"-Auswertung wurde vollständig gebaut, getestet und im
   Browser geprüft – und nach Ansicht wieder verworfen, weil die zugrunde
   liegende Klimatabelle mangels geprüfter Quelle nicht seriös zu befüllen
   war (`docs/gefundene-probleme.md`, Punkt 24). Auch das ist Teil des
   realen Ablaufs, nicht nur die Erfolge.

---

## 9. Hinweise für die Weiterverarbeitung

- **Zitate aus Abschnitt 6 wörtlich kennzeichnen**, wenn sie im Kapitel
  auftauchen (Quelle: `docs/gefundene-probleme.md`) – sie sind reale
  Aussagen, keine nachträglich konstruierten Beispiele.
- **Gute Gliederungsachse:** Werkzeugcharakter (Abschnitt 2) → Beratung bei
  Struktur (3) → Beratung bei Fehlern (4) → Beratung bei Texten (5) →
  konkrete Interaktionsform (6) → Umfang (7). Diese Reihenfolge baut vom
  „Warum kontrolliert" zum „was konkret" auf.
- **Vorsicht bei Formulierungen wie „die KI hat entschieden".** Durchgehend
  belegbar ist stattdessen: die KI hat recherchiert, Optionen benannt,
  einen Vorschlag mit Begründung geliefert und umgesetzt, **nachdem** eine
  Freigabe vorlag oder eine bestehende Regel das erlaubte (siehe Abschnitt 2)
  – mit Punkt 9 als dokumentiertem Gegenbeispiel, wo bewusst nicht
  entschieden wurde.
- **Guter Beleg gegen den Eindruck „blind übernommen":** Abschnitt 8, Punkt 4
  (verworfener Sommer-Check) und Abschnitt 5.2 (Rechtstexte mit
  Prüfvorbehalt) zeigen beide, dass Vorschläge der KI im Projekt tatsächlich
  auch abgelehnt oder eingeschränkt wurden.
