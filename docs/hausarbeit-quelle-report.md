# Quellenmaterial für die Hausarbeit: Der Bericht-/PDF-Export-Bereich der E-App

> **Zweck dieser Datei:** Dies ist eine reine Sammlung von Fakten über den
> Report-Bereich der E-App (Code, Architektur, Verhalten, Entstehungsgeschichte) –
> **keine** fertige Ausarbeitung. Sie dient einer anderen KI-Instanz als
> Grundlage, um daraus ein prägnantes, gut lesbares Kapitel für Kilians
> Hausarbeit zu schreiben. Alles hier ist aus dem tatsächlichen Code des
> Projekts `MaierKilian/E-App` entnommen (Stand 06.09.2026), nicht erfunden oder
> angenommen.

## Live-Demo: direkt in den Bericht schauen

Die App hat einen Demo-Modus, der eine fertig befüllte Beispiel-Wohnung
(realistischer Fragebogen, ~18 Monate Zählerablesungen für Strom/Gas/Wasser,
viele abgeschlossene Mess-Checks) rein clientseitig lädt – ohne Konto, ohne
Firestore.

**Link:** https://e-app-info.web.app/reports?demo

Ablauf beim Öffnen: Ein Bestätigungsdialog fragt, ob die Beispiel-Wohnung
geladen werden soll ("Beispiel laden" antippen). Die App lädt danach die
Demo-Daten und springt auf die Profil-Übersicht (`/onboarding`, zeigt bei einem
vollständigen Profil das Dashboard). Von dort führt der Menüpunkt **„Bericht"**
in der unteren Navigation zum Report-Bereich (`/reports`) – dort sind alle
Abschnitte bereits mit den Demo-Daten gefüllt. (Ein technischer Grund, warum es
keinen Link gibt, der exakt auf der Berichtsseite landet: Der Demo-Lader
springt nach dem Laden fest auf `/onboarding`, unabhängig davon, von welcher
Seite aus der Demo-Link geöffnet wurde.)

Alternative (identisches Ergebnis): https://e-app-info.web.app/?demo

---

## 1. Was der Bereich ist

Der Report-Bereich (`/reports`, `ReportsPage.tsx`) erzeugt **einen** PDF-Bericht
aus den Daten, die die App über den Haushalt gesammelt hat – keinen von
mehreren Berichtstypen, sondern einen Bericht mit wählbaren **Abschnitten**:

- **Messungen** – die abgeschlossenen Checks (Duschkopf, Kühlschrank,
  Raumklima, Grundlast, Standby, Beleuchtung, Möbelabstand, Warmwasser-
  Wartezeit, Gefriergerät …)
- **Monitoring** – die Zählerstände/Verbrauchsdaten je Energieträger (Strom,
  Gas, Wärmepumpe, Wasser, Öl, Pellets …)

Zwei feste Bestandteile sind **nicht** abwählbar, weil sie den Bericht erst zu
einem Bericht machen:

- der **Haushalts-Steckbrief** (Gebäude-/Haushaltsdaten aus dem Fragebogen) am
  Anfang – Begründung im Code: „Ein Bericht ohne sein Objekt ist eine
  Zahlenliste."
- der **Handlungsplan** (offene Empfehlungen) am Ende – Begründung: „Er
  beantwortet ‚und jetzt?', und diese Frage stellt sich erst, wenn die Befunde
  gelesen sind."

Einen wählbaren „Umfang" (Kurz-/Langfassung) gibt es bewusst **nicht mehr**.
Zitat aus dem Code (`generateReportPdf.ts`): „Der Bericht ist die Summe seiner
Abschnitte […] und nicht einer von mehreren Berichtstypen. Jeder Abschnitt
zeigt alles, was er hat; eine Kurzfassung, die Ergebnisse weglässt, beantwortet
genau die Fragen nicht, wegen derer ein Bericht weitergegeben wird."

## 2. Der Bildschirm „Berichte" (UI)

Datei: `src/features/reports/ReportsPage.tsx`

- Eine kompakte Kopfkarte zeigt ein gezeichnetes „Papier"-Vorschau-Icon
  (Inline-SVG, ohne Text – bei dieser Größe wäre Text unlesbar) plus die
  Fakten, die tatsächlich im PDF landen würden (Anzahl Zähler, Ablesungen,
  erledigte Messungen, Zeitraum).
- Darunter zwei Umschalter (Häkchen-Zeilen) für die Abschnitte „Messungen" und
  „Monitoring". Ein Abschnitt ohne Daten ist deaktiviert und nennt in der
  Detailzeile, was fehlt (z. B. „Noch keine Ablesungen"). Der jeweils letzte
  aktive Abschnitt lässt sich nicht abwählen – ein leerer Bericht ist
  ausgeschlossen.
- Beim Monitoring-Abschnitt steht zusätzlich ein Zeitraum-Umschalter (7/30/90
  Tage/Alle) als zusammenhängendes Segmented-Control. Ohne eigene Wahl wird der
  Zeitraum automatisch so vorgeschlagen, dass der Bericht nicht leer bleibt
  (`suggestRangeDays`: der kürzeste Zeitraum, in dem mindestens ein Zähler zwei
  Ablesungen hat, sonst „Alle").
- Eine fixe Leiste unten trägt den Export-Button. Auf Geräten, die Dateien über
  das System teilen können (`canSharePdf()`, prüft `navigator.canShare`), zeigt
  er „Teilen" mit Share-Icon; sonst „Herunterladen". Kann geteilt werden, steht
  daneben zusätzlich ein zweiter, kleiner Download-Button – dazu mehr unter
  Punkt 7.

Vorschau und PDF nutzen **dieselben** aufbereiteten Daten (`useMemo`-Objekte
`monitoringData`/`measurementsData`), damit die Kopfkarte nie etwas anderes
zeigt als das erzeugte PDF.

## 3. Architektur: Daten trennen von Zeichnen

Der gesamte Bereich ist konsequent in zwei Schichten aufgeteilt:

**a) Reine Datenbausteine** (keine PDF-Logik, testbar ohne Renderer):

| Datei | Aufgabe |
|---|---|
| `profileReportData.ts` | Baut den Haushalts-Steckbrief (Gebäude/Haushalt/Anlagentechnik/Sanierungen) aus `OnboardingData`. |
| `measurementsReportData.ts` | Baut die Mess-Ergebnisse: erledigt/offen, gruppiert nach Gewerk, mit Raum-/Geräte-Aufschlüsselung, Sparpotenzial-Summe. |
| `monitoringReportData.ts` | Baut die Auswertung je Energieträger: Verbrauch, Hochrechnung, Kosten, Vergleich zur Vorperiode, Lieferungen (Tanks). |
| `actionPlanData.ts` | Baut den Handlungsplan aus den offenen Tipps der App (gruppiert nach Sofortmaßnahme/vorbereitend). |
| `thresholdReference.ts` | Liest Vergleichs-Richtwerte und deren Herkunft je Messung; baut das Quellenverzeichnis. |
| `reportTypes.ts` | Typ `ReportSections` (welche Abschnitte). |

**b) Zeichnende Schicht** (setzt die Daten ins PDF um):

| Datei | Aufgabe |
|---|---|
| `pdf/pdfKit.ts` (~1.550 Zeilen) | Das wiederverwendbare PDF-„Design-Kit" auf Basis von **jsPDF** – Cursor, Seitenumbruch, alle Bausteine (Kopf, Kennzahl-Kacheln, Tabellen, Befund-Karten, Vektor-Diagramme, Checklisten …). |
| `generateProfilePdf.ts`, `generateMeasurementsPdf.ts`, `generateMonitoringPdf.ts`, `generateActionPlanPdf.ts`, `generateSourcesPdf.ts` | Je ein „Kapitel-Schreiber": nimmt die Daten aus (a) und schreibt sie über das Kit ins Dokument. Jede Funktion lässt sich auch **einzeln** in ein bestehendes Kit schreiben (`withHeader`-Flag), damit derselbe Code sowohl für den Gesamtbericht als auch potenziell für Einzelabschnitte funktioniert. |
| `generateReportPdf.ts` | Der Zusammenbau: Deckseite, Inhaltsverzeichnis, ruft die Kapitel-Schreiber in Reihenfolge auf, füllt am Ende Seitenzahlen und Fußzeilen. |
| `pdf/format.ts` | Kleine Formatierungshelfer (Zahlen, Währung, Datum, Zeiträume, Dateiname-Slug). |
| `pdf/deliver.ts` | Ausliefern: Teilen (Web Share API) oder Download. |

Datenfluss beim Export (`ReportsPage.tsx` → `handleExport`/`handleDownload`):

```
Store-Daten (Onboarding, Ergebnisse, Ablesungen, Tarife, Tipps)
   │
   ├─ buildMeasurementsReportData(...)   ─┐
   ├─ buildMonitoringReportData(...)     ─┼─ reine Funktionen, liefern
   ├─ buildActionPlanData(...)           ─┘   Anzeigedaten (auch für die Vorschau)
   │
   └─ generateReportPdf({ sections, profile, measurements, monitoring, openTips, tipsByMeasurement })
        │
        ├─ fillProfile / fillMeasurements / fillMonitoring / fillActionPlan / fillSources
        │     (schreiben über PdfKit in dasselbe jsPDF-Dokument)
        │
        └─ ReportDocument { doc, fileName }
              │
              └─ deliverReport(...) ODER downloadReport(...)
```

## 4. Aufbau des PDF-Dokuments (Kapitelstruktur)

Reihenfolge, wie `generateReportPdf.ts` sie erzeugt:

1. **Deckseite**
   - Titel, Objektname (Profilname), welche Abschnitte enthalten sind, Datum.
   - **„Auf einen Blick"** – eine Zusammenfassungs-Kachelreihe mit bis zu drei
     Kennzahlen: Jahreskosten gesamt, geschätztes Sparpotenzial (als Spanne,
     z. B. „ca. 35–55 €"), Anzahl Befunde mit Handlungsbedarf. Erscheint nur,
     wenn mindestens eine der Zahlen vorliegt.
   - Balkenvergleich „Wohin die Jahreskosten gehen" je Energieträger (nur bei
     gewähltem Monitoring-Abschnitt und wenn mindestens ein Träger einen Preis
     trägt).
   - Inhaltsverzeichnis mit kurzer Meta-Zeile je Kapitel (z. B. „7 / 9 Checks
     erledigt · 3 mit Handlungsbedarf").
   - Fußblock „worauf die Zahlen beruhen": Messzeitraum, Ablesezeitraum, ein
     allgemeiner Hinweis (`cover.basisNote`).
2. **Kapitel „Haushalts-Steckbrief"** (immer dabei, eröffnet den Bericht)
   - Vier Blöcke aus beschrifteten Wertepaaren: **Gebäude** (Baujahr,
     Wohnfläche …), **Haushalt** (Personenzahl, Räume …), **Anlagentechnik**
     (Wärmeerzeuger mit Baujahr, Warmwasser, Photovoltaik …),
     **Sanierungen** (chronologisches Ereignis-Log, nur wenn ein
     Bestandsprofil das trägt).
   - Fehlende Angaben werden **benannt statt verschwiegen** („nicht
     angegeben") – siehe Punkt 6.
   - Fragen, die im Zuge der Fragebogen-Aufräum-Runde (04.–05.09.2026, siehe
     `CLAUDE.md`) entfallen sind (Gebäudeteil, Etagenzahl, Mieter/Eigentümer,
     Kamin, Smart-Home, Messgeräte-Auswahl, Dämmzustand/Fensteralter/Lüftung),
     tauchen im Steckbrief **nicht mehr als „nicht angegeben"** auf – nur
     Bestandsprofile mit einem echten alten Wert zeigen die Zeile noch
     (`retired()`-Funktion in `profileReportData.ts`).
3. **Kapitel „Messungen"** (abwählbar, nur wenn mind. eine Messung erledigt ist)
   - Kennzahlreihe (Fortschritt „7 / 9", Sparpotenzial-Spanne, Anzahl mit
     Handlungsbedarf) – entfällt hier, wenn die Deckseiten-Zusammenfassung
     dieselben Zahlen schon zeigt (keine Doppelung).
   - **Prioritätentabelle** über alle erledigten Messungen: sortiert nach
     Dringlichkeit (`high` → `elevated` → `medium` → `good`, dann nach
     Ersparnis), mit Messwert, Bewertung, **Vergleichs-Richtwert** (mit
     Fußnoten-Nummer ins Quellenverzeichnis), Messdatum, Ersparnis.
   - **Befund-Karten je Gewerk** (z. B. „Heizung", „Strom"): Titel, Messwert,
     Bewertungswort (farbig), Ersparnis-Spanne, textliche Einordnung
     (`measurements.<id>.result.summary.<rating>`), die **Empfehlungen der
     App** zu genau dieser Messung. Bei raum-/gerätebezogenen Messungen (z. B.
     Raumklima über mehrere Zimmer, zwei Kühlschränke) folgt eine
     Untertabelle mit den Einzelwerten je Raum/Gerät.
   - **Offene Messungen** als Checkliste am Ende, mit Kennzeichnung „verfügbar"
     bzw. „demnächst".
4. **Kapitel „Monitoring"** (abwählbar, nur wenn mind. eine Ablesung existiert)
   - Übersichtstabelle über alle ausgewerteten Träger (nur ab zwei Trägern mit
     Daten): Zeitraum in Tagen, Verbrauch, Jahres-Hochrechnung, Jahreskosten,
     Summenzeile.
   - Für jeden Energieträger mit Daten eine **eigene Seite**:
     - Verbrauchs-Balkendiagramm **pro Ablesezeitraum** (nicht absolut – sonst
       würde ein Jahresintervall automatisch den höchsten Balken ergeben),
       Balkenbreite nach echter Zeitdauer, gestrichelte Mittelwertlinie. Bei
       Gas/Öl/Pellets/Wärmepumpe liegt zusätzlich ein **Heizperioden-Band**
       (1.10.–30.4.) hinter dem Diagramm.
     - Kennzahl-Kacheln: aktueller Zählerstand, Verbrauch im Zeitraum,
       Tagesmittel, Jahres-Hochrechnung, Jahreskosten (mit Basis-Arbeitspreis),
       ein **spezifischer Kennwert** (kWh/m²/Jahr bei Wärme, Liter/Person/Tag
       bei Wasser – erst damit ist der Wert vergleichbar).
     - Warnhinweis, wenn die letzte Ablesung älter als 120 Tage ist (Zahlen aus
       so alten Daten sollen nicht wie aktuell wirken).
     - Trend-Badge im Vergleich zur vorherigen, gleich langen Periode.
     - Zählerstandsverlauf als Liniendiagramm.
     - Bei Tank-Trägern (Öl, Pellets, Flüssiggas): **Lieferübersicht** –
       Datum, Menge, Rechnungsbetrag, €/Einheit, Summenzeile. „Die
       Jahresaufstellung, die Ölkunden ohnehin von Hand führen."
     - Ablese-Historie (neueste zuerst), mit Hinweis, wenn gekürzt.
5. **Kapitel „Handlungsplan"** (immer dabei, schließt vor dem Quellenverzeichnis)
   - Dieselben **offenen** Tipps wie auf dem Tipps-Bildschirm der App, in
     derselben Reihenfolge, gruppiert in „Sofortmaßnahmen" (`isQuickWin`) und
     „vorbereitende Maßnahmen", mit demselben Ziel-Sortierhinweis („Sortiert
     nach deinem Ziel: Kosten sparen"), falls ein Ziel die Reihenfolge
     tatsächlich verändert hat. Je Zeile steht rechts entweder die
     Euro-Ersparnis (falls die Messung sie noch trägt) oder Aufwand
     (Minuten/Kosten) – nie beides.
   - Ist nichts mehr offen, erscheint eine Würdigung („alles erledigt") statt
     eines leeren Kapitels.
6. **Quellenverzeichnis** (nur wenn der Messungen-Abschnitt gewählt ist und
   Ergebnisse vorliegen)
   - Löst die Fußnoten-Nummern aus der Prioritätentabelle auf.
   - Auch das **Unbelegte** steht dort ausdrücklich: Jede Messung hat eine
     `ThresholdOrigin` (`'reference'` = belegte Fremdquelle mit URL/Stand,
     `'own'` = eigener, begründeter Richtwert der App, `'pending'` = noch
     offen) – nichts bleibt unmarkiert.

Danach werden die Seitenzahlen ins Inhaltsverzeichnis zurückgeschrieben (erst
nach dem Zeichnen aller Kapitel bekannt) und Fußzeilen mit Seite „x / y",
Objektname und Fußnote gesetzt.

## 5. Zentrale Leitgedanken (aus den Code-Kommentaren, wörtlich/sinngemäß)

Diese Prinzipien ziehen sich durch den gesamten Bereich und sind im Code selbst
begründet – vermutlich der ergiebigste Stoff für ein Kapitel über
Software-Design-Entscheidungen:

- **Der Bericht trifft kein zweites Urteil.** Handlungsplan, Bewertungsfarben
  und Richtwerte kommen aus genau denselben Funktionen, die auch die
  App-Oberfläche benutzt (`buildTips`, `isQuickWin`, `sortingGoals`,
  `ratingColor`, `MEASUREMENT_THRESHOLDS`, `resultSavingsEur`). Zitat aus
  `actionPlanData.ts`: „Es wird nichts nachgebaut. […] Ein Bericht, der anders
  ordnet als die App, wäre ein zweites Urteil über dieselbe Lage." Der Bericht
  hatte früher ein eigenes, unvollständiges Tipp-System (nur 2 von 9 Messungen
  hatten Text) – das wurde ersetzt.
- **Unsicherheit wird nicht versteckt.** Ersparnisse stehen als **Spanne**
  („ca. 35–55 €"), nicht als Punktwert – eine Summe aus lauter Spannen darf
  nicht als punktgenaue Zahl auftreten. Nur **gemessene** Ersparnisse
  (`isMeasuredSaving`) erscheinen im Bericht überhaupt; rein modellierte
  Beträge fallen heraus, stattdessen steht die gemessene physikalische Größe
  (°C, L, W).
- **Fehlendes wird benannt, nicht verschwiegen.** `fmtRow()` zeigt „nicht
  angegeben" statt eine Lücke leer zu lassen – „ein Bericht, der die Lücke
  einfach weglässt, verleitet dazu, die Zahlen für vollständig zu halten."
  Gleichzeitig verschwinden Zeilen zu abgeschafften Fragebogen-Fragen ganz
  (`retired()`), damit der Bericht keine Frage als offene Lücke vorhält, die
  gar nicht mehr gestellt wird.
- **Jeder Richtwert nennt seine Herkunft** (`ThresholdOrigin`, projektweite
  Konvention laut `CLAUDE.md`). Das Quellenverzeichnis macht Bewertungen
  nachprüfbar statt zu bloßen Behauptungen.
- **Alter wird kenntlich gemacht.** Warnhinweis ab 120 Tagen seit der letzten
  Ablesung; das Deckblatt nennt ausdrücklich den Mess- und Ablesezeitraum,
  „worauf die Zahlen beruhen".
- **Layout-Grundsätze des `PdfKit`:** eine gemeinsame Fluchtlinie für alles;
  drei optisch klar unterschiedene Ebenen (Bericht → Abschnitt → Gruppe);
  Farbe ausschließlich als Bedeutungsträger (Bewertung, Energieträger-Akzent),
  nie als Dekoration, und nie ohne begleitendes Wort; jedes Kapitel beginnt auf
  einer neuen Seite, damit der Beginn nicht vom Zufall der vorherigen Länge
  abhängt; Karte und zugehörige Tabelle werden zusammengehalten
  (`ensure`/`keepWith`), damit nichts optisch auseinanderreißt.
- **Technische Basis:** jsPDF, A4 in Punkt (pt), Palette identisch zu den
  CSS-Design-Tokens der App (`--fg`, `--primary`, `--muted`, `--rating-*` …) –
  „der Bericht soll aussehen wie die App auf Papier, nicht wie ein zweites
  Produkt". Eigene Vektor-Diagramme (Linien- und Intervallbalkendiagramm) mit
  echter, nicht-linearer Zeitachse. Sonderzeichen (Pfeile, tiefgestellte
  Ziffern) werden auf die Standard-Zeichensatz-Kodierung (Latin-1/CP1252)
  abgebildet, damit nichts als Kästchen erscheint.

## 6. Auslieferung: Teilen oder Download

Datei: `pdf/deliver.ts`

- `canSharePdf()` prüft, ob das Gerät Dateien über die Web Share API
  entgegennehmen kann.
- `deliverReport()` versucht zuerst `navigator.share(...)` (natürlicher Weg auf
  dem Telefon: Sichern, Mail, Messenger, Vorschau in einem Schritt); bricht der
  Nutzer den System-Dialog ab, gilt das als „cancelled", kein Fehler.
  Schlägt Teilen fehl oder ist es nicht verfügbar, fällt die Funktion auf
  `doc.save(fileName)` (klassischer Download) zurück.
- **Bekannte Falle, die zu einem zweiten Button geführt hat:** Unter Windows
  meldet `navigator.canShare` auch am **Desktop**-Browser `true` (Windows hat
  eine systemweite Freigabeleiste), die aber keine zuverlässige
  „Speichern"-Option zeigt – nur Ziel-Apps wie Teams/Outlook/WhatsApp. Deshalb
  gibt es seit einer Nutzerrückmeldung (04.09.2026) zusätzlich einen
  **eigenständigen, garantierten Download-Button** neben „Teilen"
  (`downloadReport()`), unabhängig vom Ergebnis der Share-Prüfung.
- Dateiname: `E-App-<Bezeichnung>[-<Objektname>]-<Datum>.pdf`
  (`reportFileName()`), Umlaute werden ausgeschrieben statt entfernt.

## 7. Entstehungsgeschichte (Kontext für „warum so gebaut")

Laut `CLAUDE.md` (Abschnitt „Abgeschlossene Vorhaben") kam der heutige
Steckbrief-/Handlungsplan-/Quellenverzeichnis-Aufbau aus einer Verbesserungs-
Runde im September 2026, ausgelöst durch konkrete Nutzungs-Rückmeldungen
(`docs/gefundene-probleme.md`):

- Neues Kapitel „Haushalts-Steckbrief" zu Beginn (Gebäude, Haushalt,
  Anlagentechnik, Sanierungshistorie) – vorher kannte der Bericht vom Profil
  nur Name und Räume.
- Neues Kapitel „Handlungsplan" – offene Tipps nach Aufwand gruppiert, nach
  eigenen Zielen sortiert (ersetzt ein eigenes, unvollständiges Tipp-System).
- Jede Bewertung zeigt seither den Vergleichs-Richtwert daneben, plus
  Quellenverzeichnis am Ende.
- Zusätzlicher direkter Download-Button, weil das System-Teilen am
  PC-Windows-Browser bisher „nur teilen" anbot, ohne verlässliche
  Speichern-Option (siehe Punkt 6).

Der einzige zum Report-Bereich gemeldete und in `docs/gefundene-probleme.md`
dokumentierte Punkt (#10, „Bericht am PC nur ‚teilen', kein direkter
Download") gilt als **umgesetzt** – kein bekannter offener Punkt zu diesem
Bereich zum Stand dieser Datei.

## 8. Für die Ausarbeitung – mögliche Ansatzpunkte (unausformuliert)

Reine Stichpunkte, keine fertigen Sätze – zur freien Verwendung:

- Trennung von reiner Datenaufbereitung (testbar ohne PDF-Renderer) und
  Zeichnen als Architektur-/Wartbarkeits-Beispiel.
- Wiederverwendung derselben Berechnungs- und Sortierlogik wie im
  Live-Bildschirm der App als Konsistenz-Prinzip („eine Quelle der Wahrheit").
- Umgang mit Unsicherheit in der Datenaufbereitung (Spannen statt Punktwerte,
  Kennzeichnung gemessen/geschätzt, Altersgrenze für Ablesungen) als Beispiel
  für verantwortungsvolle Darstellung berechneter/geschätzter Werte.
- Nachvollziehbarkeit/Wissenschaftlichkeit im Kleinen: Herkunfts-Kennzeichnung
  von Richtwerten (`ThresholdOrigin`) und ein Quellenverzeichnis, das auch das
  Unbelegte offenlegt statt es zu verstecken.
- Nutzerzentrierte Iteration: Die heutige Struktur entstand direkt aus
  dokumentierten Live-Test-Rückmeldungen (siehe Punkt 7) – Beispiel für
  agile/nutzergetriebene Weiterentwicklung.
- Plattform-Eigenheiten als Fallstrick: `navigator.canShare` unter Windows als
  Beispiel dafür, dass Web-APIs plattformübergreifend nicht das halten, was
  ihre Namen versprechen, und wie die App das kompensiert (zweiter,
  garantierter Weg).
- Reproduzierbare Demo-Daten (`demoProfile.ts`) als Beispiel für Testbarkeit/
  Vorführbarkeit ohne echte Nutzerdaten.

## 9. Quelldateien (zum Nachschlagen/Zitieren)

```
src/features/reports/
├── ReportsPage.tsx            – Bildschirm „Berichte" (UI, Export-Aktionen)
├── generateReportPdf.ts       – Zusammenbau des Gesamtberichts
├── generateProfilePdf.ts      – Kapitel „Haushalts-Steckbrief" (zeichnend)
├── generateMeasurementsPdf.ts – Kapitel „Messungen" (zeichnend)
├── generateMonitoringPdf.ts   – Kapitel „Monitoring" (zeichnend)
├── generateActionPlanPdf.ts   – Kapitel „Handlungsplan" (zeichnend)
├── generateSourcesPdf.ts      – Quellenverzeichnis (zeichnend)
├── profileReportData.ts       – Daten: Haushalts-Steckbrief
├── measurementsReportData.ts  – Daten: Messungen
├── monitoringReportData.ts    – Daten: Monitoring
├── actionPlanData.ts          – Daten: Handlungsplan
├── thresholdReference.ts      – Richtwerte + Quellenverzeichnis-Aufbau
├── reportTypes.ts             – Typ ReportSections
└── pdf/
    ├── pdfKit.ts               – PDF-Design-Kit (jsPDF-Wrapper, ~1550 Zeilen)
    ├── format.ts               – Zahl-/Datum-/Dateinamen-Formatierung
    └── deliver.ts              – Teilen/Download-Auslieferung
```

Ergänzend relevant: `src/features/demo/demoProfile.ts` (Demo-Datensatz),
`src/features/demo/enterDemo.ts` / `DemoLoader.tsx` (Demo-Einstieg über
`?demo`), `docs/gefundene-probleme.md` (#10) und `CLAUDE.md` (Abschnitt
„Bericht (PDF)" unter „Abgeschlossene Vorhaben") für den historischen Kontext.
