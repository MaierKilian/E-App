# Gefundene Probleme – Sammlung vom 04.09.2026

> Sammelt Kilians Testbefunde, kategorisiert (Bug / Problem / Verbesserung) und
> grob priorisiert. **Update 04.09.2026:** Auf Kilians Wunsch wurde direkt so
> viel wie möglich umgesetzt (Branch `claude/beheben-gefundene-probleme`) –
> Status je Punkt unten. Offen blieb nur Punkt 9, der eine eigene
> UX-Entscheidung braucht.

## Hoch – rechtlich/funktional kritisch

### 1. Firestore-Speicherung startet vor der Consent-Entscheidung
**Kategorie:** Bug · **Bereich:** Einwilligung / `src/lib/firebase.ts`
**Status:** ✅ Umgesetzt – `initializeFirestore()` läuft jetzt lazy über
`getDb()`, ausgelöst erst vom ersten echten Firestore-Zugriff. Geprüft: Jede
Aufrufstelle (Cloud-Sync, Profilbild-Sync, Wohnprofile, Feedback) läuft
ausschließlich für einen angemeldeten Nutzer – ein anonymer Erstbesucher löst
keine davon aus. Damit war die „Offene Frage" unten beantwortet: Ein Gate wie
bei Analytics reicht, eine grundsätzlich andere Cache-Strategie war nicht
nötig.

`initializeFirestore(app, { localCache: persistentLocalCache(...) })` läuft
auf Modulebene – sobald `firebase.ts` importiert wird, also bei jedem
Seitenaufruf, bevor React rendert und bevor der Cookie-Hinweis eine
Entscheidung eingesammelt hat. Legt eine IndexedDB-Datenbank auf dem Gerät an,
auch bei einem Besucher, der sich nie anmeldet.

Rechtlich fraglich: § 25 Abs. 2 Nr. 2 TDDDG verlangt „unbedingt erforderlich
für einen vom Nutzer ausdrücklich gewünschten Dienst" – vor jeder Interaktion
ist das nicht gegeben. `getAuth(app)` daneben ist unproblematischer (Prüfung
„ist schon jemand angemeldet?"). Analytics ist korrekt abgesichert (Etappe 2,
02.09.) und lädt nachweislich erst nach Zustimmung – nur Firestore fehlt die
gleiche Absicherung.

**Zu klären beim Beheben:** Firestore-Init hinter einen Gate ziehen, analog zu
`loadAnalytics()` – oder begründen, warum sie doch unter die Ausnahme fällt
(z. B. wenn sie sich als rein lokaler Cache ohne Netzwerkkontakt lesen lässt).
Erst prüfen, dann entscheiden.

### 6. Abstände bis 5 cm werden als „Gut" angezeigt
**Kategorie:** Bug · **Bereich:** `src/features/measurements/furniture_spacing/furnitureSpacing.ts`
**Status:** ✅ Umgesetzt – `answerFromDistance` wertet jetzt `<= 5 cm` (statt
`< 5 cm`) als blockiert. 5 cm ergibt dadurch dieselbe Antwortstufe wie 4 cm
(„Ja") statt wie 16 cm („Teilweise") und landet in der Gesamtbewertung bei
„elevated" („Teilweise blockiert") statt bei „medium" (generisch „Gut").
Tests ergänzt/angepasst.

Bestätigt anhand der Screenshots (4 cm, 5 cm, 16 cm) und des Codes.
`answerFromDistance()` unterscheidet nur drei Stufen: `< 5 cm` → „blockiert"
(Antwort 2), `5–29 cm` → „teilweise" (Antwort 1), `≥ 30 cm` → „frei"
(Antwort 0). **5 cm und 16 cm ergeben also exakt dieselbe Antwortstufe** –
keine Unterscheidung innerhalb der 5–30-cm-Spanne.

Zusätzlich verstärkt: In `rateFurniture()` geht diese eine Antwort nur mit
ihrem Gewicht (1 von max. 3) in eine **Gesamt-Ratio über alle drei Fragen**
ein (inkl. `cover`, `valve`, die hier meist „nein" sind, macht `maxScore`
gerne 10). Bei nur dieser einen Teilantwort bleibt die Ratio (~0.1) unter der
`elevated`-Schwelle (0.25) und landet bei Rating `medium`. Und `medium` wird
in der generischen Skala (`measurements.ratings.medium`, `de.json` Zeile 286)
mit **„Gut"** beschriftet – obwohl bei 5 cm laut eigenem Hinweistext („Unter
5 cm ist die Luftzufuhr praktisch unterbunden") konkreter Handlungsbedarf
besteht. Die App-eigene, feinere Beschriftung
(`measurements.furniture_spacing.result.ratings.medium` = „Kleinigkeit") wird
nur auf der Detailseite verwendet, in der Verlaufsliste dagegen die generische
(„Gut") – das verschärft den Eindruck zusätzlich.

**Zu klären beim Beheben:** Wahrscheinlich zwei Teile: (a) `answerFromDistance`
feiner staffeln, mindestens eine eigene Stufe für „an oder nahe der 5-cm-Grenze"
statt einer Stufe für die gesamte 5–30-cm-Spanne; (b) prüfen, ob `≤ 5 cm`
(nicht nur `< 5 cm`) schon als blockiert zählen soll, da der Hinweistext exakt
diese Grenze nennt.

### 7. Weiterzählen bei gedrückt gehaltenem Stepper-Button
**Kategorie:** Verbesserung · **Bereich:** `src/components/ui/Stepper.tsx`
(gemeinsame Komponente)
**Status:** ✅ Umgesetzt – Klicken und Halten (Pointer-Events, Maus/Touch)
löst nach 400 ms automatisches Weiterzählen aus, das sich mit jedem Schritt
beschleunigt (220 ms → min. 50 ms Intervall). Ein normaler kurzer Klick macht
weiterhin genau einen Schritt. Wirkt für alle fünf Einsatzstellen.

Die wiederverwendete `Stepper`-Komponente (+/- Buttons für Zahleneingaben)
reagiert nur auf einzelne Klicks (`onClick`), kein Press-and-Hold. Betrifft
alle fünf aktuellen Einsatzstellen: `Step1Profile.tsx`, `Step3Rooms.tsx`,
`RoomTemperatureRun.tsx`, `FurnitureSpacingRun.tsx`, `FridgeRun.tsx` – da die
Komponente zentral ist, wirkt eine Änderung dort für alle gleichzeitig.

Kilians Wunsch: Klicken und Halten soll automatisch weiterzählen, um größere
Werteingaben zu erleichtern (Beispiel-Screenshot: Abstand von 0 auf 16 cm
hochklicken).

**Zu klären beim Beheben:** Übliches Muster wäre ein Timer, der nach kurzer
initialer Verzögerung startet und sich beschleunigt (z. B. erst langsam, nach
~1 s schneller) – reine Wiederholung im Klick-Intervall ohne Beschleunigung
könnte bei großen Wertebereichen (z. B. 0–60 cm) immer noch mühsam sein.

### 8. Tipp „Vorlaufwasser auffangen" zeigt „rund 0 L" bei einem Altergebnis
**Kategorie:** Bug · **Bereich:** `src/features/tips/buildTips.ts` /
`src/features/measurements/hot_water_wait/`
**Status:** ⚠️ Teilweise umgesetzt – Teil (a): `buildTips.ts` und
`HotWaterWaitResult.tsx` prüfen jetzt explizit, ob `litersPerDraw`/
`litersPerYear` überhaupt vorhanden sind, statt fehlende Felder mit `?? 0` in
eine erfundene Nullmenge zu verwandeln. Fehlt die Datengrundlage (Altergebnis),
zeigen Tipp und Ergebnis-Seite einen eigenen Text ohne Literzahl
(`hot_water_wait_unknown`, „–" statt „0,0 L"). Teil (b) – Richtwert-Liter
generell durch qualitativen Text ersetzen, solange kein echter
Durchfluss-Test je Entnahmestelle existiert – bleibt offen, siehe „Offene
Fragen" (Verhaltensänderung über den Bugfix hinaus, Kilians Entscheidung).

Bestätigt anhand des Screenshots (24 s, „vor 33 Tagen gemessen", 0 L je
Zapfung, 0 L im Jahr) und des Codes. Seit gestern (Commit `e06fa74`,
03.09.2026) speichert der Warmwasser-Wartezeit-Check `litersPerDraw` und
`litersPerYear` in `details`. Diese konkrete Messung ist aber „vor 33 Tagen"
entstanden – **lange bevor** es diese Felder gab. `buildTips.ts` liest sie mit
`worst.details?.litersPerDraw ?? 0` (Zeile 586) – fehlt das Feld, wird daraus
still eine **echte Zahl „0"** statt eines fehlenden Werts, und genau die
erscheint im Tipptext.

Verstößt gegen die Projekt-Konvention „Gespeicherte Messergebnisse bleiben
lesbar" (CLAUDE.md) – die verlangt, bei geändertem Kodier-Format beide
Varianten zu lesen, nicht die alte stillschweigend als 0 zu interpretieren.

Kilians Vorschlag geht weiter als nur den Altbestand zu reparieren: Auch bei
einer **neuen** Messung ist der Durchfluss nur an der Dusche tatsächlich
gemessen (`measuredShowerFlowLpm`, siehe Punkt „Was gemessen ist und was
nicht" im Code-Kommentar von `hotWaterWait.ts`). Bei Badewanne, Küche und
Waschbecken ist die Literzahl schon heute ein Richtwert, keine Messung für
„dieses konkrete Objekt". Sein Wunsch: Solange für die gewählte Entnahmestelle
kein eigener Durchfluss-Test vorliegt, nur den Fakt („hier läuft Wasser
ungenutzt weg") ohne konkrete Literangabe zeigen, statt einer Zahl, die auf
einem generischen Richtwert beruht.

**Zu klären beim Beheben:** Zwei Teile, ggf. unterschiedlich dringlich –
(a) das akute Anzeigen von „0 L" bei fehlenden Altbestand-Feldern beheben
(kein Auffang-Tipp mit Zahl ohne Datengrundlage), und (b) grundsätzliche
Entscheidung, ob Richtwert-Literzahlen (nicht nur bei Dusche) generell durch
einen qualitativen Text ersetzt werden, solange kein echter Durchfluss-Test
für die jeweilige Entnahmestelle existiert – das wäre eine Verhaltensänderung
über den reinen Bugfix hinaus.

### 9. Warmwasser-Wartezeit ohne Raumzuordnung – Erweiterungspotenzial
**Kategorie:** Verbesserung · **Bereich:**
`src/features/measurements/hot_water_wait/`
**Status:** ⏸️ Zurückgestellt – bewusst nicht direkt umgesetzt. Anders als die
übrigen Punkte braucht das hier eine echte UX-Entscheidung (zweistufige
Auswahl erst Raum, dann Entnahmestelle? kombinierte Liste je Rauminstanz?),
nicht nur einen Bugfix – das sollte nicht ungefragt entschieden werden. Der
zugrundeliegende Datenverlust bei mehreren gleichartigen Entnahmestellen
(zweites Waschbecken überschreibt das erste) besteht weiterhin.

Bestätigt: „Wo misst du?" bietet nur die vier festen Entnahmestellen Dusche,
Badewanne, Küche, Waschbecken (`FIXTURE_ORDER` in `hotWaterWait.ts`) – ohne
Raumbezug. Kilians Punkt: Ein Haushalt kann mehrere Bäder haben, und ein Bad
kann Waschbecken, Wanne und Dusche gleichzeitig enthalten – die App fragt
aber nur den Stellentyp ab, nicht welches Bad gemeint ist.

Technisch mehr als nur eine fehlende Auswahl: `HotWaterWaitRun.tsx` setzt
`roomKey: fixture` (Zeile 52) – die Entnahmestelle selbst wird als Raum-
Schlüssel benutzt. Andere raumbezogene Checks (z. B. `furniture_spacing`,
`room_temperature`) nutzen dort echte Rauminstanzen wie `bathroom#0` /
`bathroom#1` (`roomInstances()` in `rooms.ts`). Bei zwei Bädern speichert der
Warmwasser-Check das Waschbecken-Ergebnis beider Bäder unter demselben
Schlüssel `hot_water_wait@washbasin` – **das zweite überschreibt das erste
kommentarlos**, nicht nur eine fehlende Detailtiefe, sondern echter
Datenverlust bei mehreren gleichartigen Entnahmestellen.

**Zu klären beim Beheben:** Auswahl vermutlich zweistufig (erst Raum, dann
Entnahmestelle im Raum) oder eine kombinierte Liste je Rauminstanz. Setzt
voraus, dass zu jedem Raumtyp die plausiblen Entnahmestellen bekannt sind
(Bad: alle vier, Küche: nur „Küche", ggf. Gäste-WC etc.) – ähnlich der
raumspezifischen Fragenzuordnung, die es beim Möbel-Abstands-Check schon gibt
(`ROOM_PRIMARY_KEY` in `furnitureSpacing.ts`).

### 10. Bericht am PC nur „teilen", kein direkter Download
**Kategorie:** Bug · **Bereich:** `src/features/reports/pdf/deliver.ts`
**Status:** ✅ Umgesetzt – Ansatz (b): Wo `canSharePdf()` zutrifft, steht jetzt
zusätzlich ein zweiter, eigener Download-Button neben „Teilen" (neue Funktion
`downloadReport()`), statt sich auf eine plattformabhängige Automatik zu
verlassen. Der bestehende Teilen-Weg bleibt unverändert.

Bestätigt anhand der Screenshots (Windows-Share-Dialog ohne erkennbare
„Speichern unter"-Option) und des Codes. `canSharePdf()`
(`deliver.ts:30`) prüft nur `navigator.canShare({ files: [...] })` – das ist
unter Windows in Chrome/Edge **auch am Desktop** `true`, weil Windows eine
systemweite Freigabe-Leiste für Dateien hat. Die App nimmt das als Signal
„Gerät kann teilen" und ruft `navigator.share(...)` auf (`deliverReport()`,
Zeile 51), **ohne** dass die Windows-Freigabeleiste zuverlässig eine
„Speichern"/Download-Option anbietet – sie zeigt nur Apps wie Teams, Outlook,
WhatsApp. Der Kommentar im Code (Zeile 6–9) geht erkennbar von „Teilen nur
aufs Handy sinnvoll, sonst Download-Rückfall" aus, aber die Prüfung selbst
erkennt „Desktop" nicht, sondern nur „Datei-Teilen technisch möglich" – und
das ist unter Windows-Desktop-Browsern eben auch der Fall.

Kilians Wunsch: einen direkten Download muss es unabhängig vom
Teilen-Ergebnis geben, nicht nur den (auf diesem System unzuverlässigen)
Umweg über die Systemfreigabe.

**Zu klären beim Beheben:** Denkbare Ansätze – (a) `canSharePdf()` zusätzlich
auf mobile Geräte eingrenzen (z. B. `navigator.userAgentData?.mobile` bzw.
bestehende Mobile-Erkennung, falls im Projekt schon vorhanden), oder (b) auf
dem Ergebnis-Screen grundsätzlich zwei getrennte Aktionen anbieten
(„Teilen" **und** „Herunterladen" nebeneinander) statt einer Automatik, die
sich pro Plattform für eine von beiden entscheidet.

---

### 16. „Optimal eingestellt" und „Sparpotenzial 12 %" gleichzeitig
**Kategorie:** Bug · **Bereich:** `fridge.ts`, `FridgeResult`
**Status:** ✅ Umgesetzt – bei 5,0 °C stand im Ergebnis „Sehr gut · Optimal
eingestellt – sparsam und sicher · Weiter so" und direkt darunter „Mögliches
Sparpotenzial ≈ 12 %". Beides zugleich kann nicht stimmen.

Ursache: `calcFridgeSaving` rechnete das Potenzial immer bis zur
Referenztemperatur von 7 °C hoch (`0,06 × (7 − gemessen)`), ohne den Status zu
beachten. Im guten Band 5–7 °C ergab das 0–12 %. Der Code widersprach damit
seiner eigenen Dokumentation – im Kommentar an `savingPct` stand bereits „0 bei
… ‚optimal' (nichts zu holen)" – und dem Rest der App: Die Empfehlungsliste
legt erst unter 5 °C einen Tipp an (`FRIDGE_COLD_C` in `buildTips`), der
Ergebnis-Schirm aber zeigte schon ab 6,9 °C einen Kasten.

Behoben an zwei Stellen: `calcFridgeSaving` rechnet nur noch bei „zu kalt", und
`FridgeResult` blendet den Kasten nur bei „zu kalt" ein. Die zweite Bedingung
ist nicht doppelt gemoppelt, sondern deckt **Altergebnisse** ab: Die tragen ein
bis 7 °C hochgerechnetes `savingPct` in den Details und werden nicht migriert.

Neue Testdatei `tests/unit/fridge.test.ts` – für `fridge.ts` gab es bis dahin
keine Tests. Sie hält den Gleichlauf fest: Was als „optimal" bewertet wird, hat
kein Potenzial, und die Grenze deckt sich mit der Schwelle der
Empfehlungsliste.

Nachgemessen im Browser über das ganze Band: 3 °C → 24 %, 4 °C → 18 %,
5/6/7 °C → kein Kasten, 8/9 °C → kein Kasten.

### 14. „Mit Strommessgerät gemessen" im Gefrierschrank-Check
**Kategorie:** Verbesserung · **Bereich:** `FreezerRun`, `freezer.ts`
**Status:** ✅ Umgesetzt – die optionale Vorher/Nachher-Messung ist raus. Sie
passte nicht in diesen Check: Sie verlangte, das Energiekostenmessgerät
stundenlang vor dem Abtauen laufen zu lassen, abzutauen und danach erneut zu
messen – ein Vorgang über Tage, abgefragt in einem Bildschirm, den man in einem
Zug ausfüllt. Der Check fragt jetzt nur noch: vereist? und wenn ja, wie stark?

Mitgegangen ist alles, was dadurch tot war: der Rechenzweig `'measured'` in
`calcFreezerSaving` samt `FreezerEnergy`, `avoidableCost` und `workPriceCt`,
das Hilfsmodul `energyMeter.ts` (einziger Nutzer war der Gefrierschrank) und die
Textbausteine `energyToggle`, `energyHint`, `before`, `after`, `hoursUnit`.

**Gespeicherte Ergebnisse bleiben lesbar** (Konvention aus CLAUDE.md): Alte
Ergebnisse tragen weiter `method: 2` und einen Euro-Betrag; `FreezerResult`
liest beides unverändert und weist sie weiter als Messung aus. Nur neu erhobene
Ergebnisse können das nicht mehr enthalten.

### 15. Info-Tab verspricht eine Temperaturmessung, die es nicht gibt
**Kategorie:** Problem · **Bereich:** `measurements.freezer.intro`, `FreezerRun`
**Status:** 🔍 Nur gesammelt – beim Aufräumen von #14 aufgefallen, nicht
angefasst.

Der Info-Tab des Gefrierschrank-Checks nennt als dritten Schritt „Optional
Temperatur messen", und zwei der fünf Detail-Tipps erklären, wie man das
Thermometer legt und warum −18 °C sinnvoll sind. Im Messen-Tab gibt es dafür
aber kein Feld – der Textbaustein `measurements.freezer.run.tempToggle`
existiert, wird jedoch nirgends verwendet. `FreezerResult` kann eine Temperatur
anzeigen (`details.temperature`), bekommt sie aber nur noch aus Altergebnissen.

Zwei Wege: Eingabe nachrüsten (dann wird der Info-Text wahr) oder die
Temperatur aus dem Info-Tab streichen. Kilians Entscheidung.

### 17. Fragebogen-Schritt „Gebäudehülle & Modernisierung" ohne Wirkung
**Kategorie:** Problem · **Bereich:** `sections.ts`, `Step2Building`,
`StepRenovationLog`
**Status:** ✅ Umgesetzt (04.09.) – Schritt aus der App genommen, Code unter
`archiv/onboarding-gebaeudehuelle/` erhalten.

Aufgefallen bei einer Durchsicht aller `OnboardingData`-Felder gegen ihre
tatsächlichen Lesestellen. Schritt 5 von 8 stellte vier Pflichtfragen –
Fensteralter, Dämmzustand, Lüftungstyp und den Sanierungs-Log. Keines der vier
Felder (`windowAge`, `insulationState`, `ventilationType`, `renovations`) wurde
von einer Messung, einem Tipp oder einer Monitoring-Rechnung gelesen; ihre
gesamte Wirkung waren vier Zeilen im PDF-Steckbrief. Die Effizienz-Einordnung,
die der Schritt aus den Sanierungen zeichnete (`estimateEnvelope()`), sah nur,
wer gerade in diesem Schritt stand – sie floss in nichts ein, was der Nutzer
später wiederfand.

Vier Pflichtfragen für vier PDF-Zeilen: der schlechteste Tausch im Fragebogen.
Der vollständige Weg geht jetzt über sieben statt acht Schritte.

Zwei Dinge sind bewusst geblieben:

- **Das Heizungs-Baujahr.** `StepRenovationLog` hat es nur angezeigt; erfasst
  wird es im Heizungs-Schritt. Der Tipp „Heizung prüfen/tauschen lassen"
  (`boilerAgeYears`) ist darum unberührt.
- **Die Felder selbst** in `OnboardingData`, Migration und Cloud-Sync.
  Bestandsprofile tragen echte Werte. Der Steckbrief zeigt sie weiter – aber
  nur bei vorhandenem Wert, statt einer Zeile „nicht angegeben" zu einer Frage,
  die niemand mehr gestellt bekommt.

Nicht angefasst: Die i18n-Schlüssel bleiben stehen (der Bericht braucht einen
Teil davon, der Rest hält das Archiv wiederherstellbar).

### 18. Messgeräte-Abfrage ohne Wirkung – Vorschlag: Info-Seite statt Auswahl
**Kategorie:** Problem (+ Verbesserungsvorschlag) · **Bereich:**
`Step6Instruments`, `instrumentOptions.ts`, `fieldUsage.ts`, Wissensbereich
**Status:** ✅ Umgesetzt (04.09.) – Kilians Entscheidung: Die Info ersetzt die
Auswahl **an Ort und Stelle** im Fragebogen, damit jeder sie beim Anlegen der
Wohnung zu sehen bekommt.

Kilians Befund aus dem Live-Test: Die Frage „Welche Messgeräte sind
vorhanden?" in Schritt 5 („Ausstattung") wirkt folgenlos, ebenso die
Sonderantworten „Keines" und „Nicht bekannt".

**Nachgeprüft – der Befund stimmt weitgehend.** `data.instruments` hat genau
eine funktionale Lesestelle in der ganzen App:

- `FurnitureSpacingRun.tsx:59` – steht ein `distance_meter` im Profil, ist im
  Möbelabstand-Check der optionale Messschritt vorangehakt. Sonst nicht. Der
  Check läuft in beiden Fällen vollständig.

Alles Weitere ist reine Wiedergabe des Eingegebenen: die Zusammenfassung in
`Step8Review`, eine Zeile im PDF-Steckbrief (`profileReportData.ts:160`) und
der Fortschrittsbalken (`sections.ts:167` zählt den Abschnitt erst als
erledigt, wenn irgendetwas gewählt ist – auch „Nicht bekannt").

Schärfer noch bei den Untertypen: **`modelTypes` hat keine einzige
Lesestelle.** Die fünf Typ-Listen (Quecksilberthermometer, Ultraschall-
Distanzmesser, Strommesszange …) werden erfasst, gespeichert, in der
Zusammenfassung angezeigt – und von keiner Rechnung, keinem Check und keinem
Tipp je gelesen. Es ist derselbe Tausch wie bei #17, nur ungünstiger: fünf
Geräte × bis zu fünf Untertypen für eine Steckbrief-Zeile.

Dazu kommt, dass der Eintrag in `fieldUsage.ts:103` mehr verspricht, als der
Code hält – „entscheidet, welche Checks angeboten werden" trifft nicht zu:
kein Check ist durch ein fehlendes Gerät gesperrt oder ausgeblendet. Auch der
Abschluss-Bildschirm „Wofür wir das nutzen" gibt diesen Satz an den Nutzer
weiter.

**Kilians Vorschlag:** die Abfrage durch eine Info-Seite ersetzen, die zeigt,
welche Messgeräte man für die App braucht, wofür genau, und welche Bauarten es
davon jeweils gibt. Fachlich schlüssig – die Information fließt dann in die
Richtung, in der sie tatsächlich Wert hat: Die App weiß, was ihre Checks
brauchen; der Nutzer weiß es nicht. Das vorhandene Material (fünf Geräte, 24
Untertypen) ist dafür bereits geschrieben und würde weiterverwendet statt
gelöscht.

**Was gebaut wurde.** An der Stelle der Frage steht jetzt „Was du zum Messen
brauchst": je Gerät ein Abzeichen (*Nötig* / *Optional* / *Zurzeit ungenutzt*),
darunter die Checks, die es verlangen, und aufklappbar die Bauarten – jede mit
einem Satz dazu, wofür sie taugt und wofür nicht (das Infrarot-Thermometer misst
Wände, nicht Raumluft; der Laser-Messer ist unter 20 cm ungenauer als der
Zollstock). Dazu zwei Blöcke, die es vorher nirgends gab: die Haushaltsmittel,
die kein Gerät sind, aber über Checks entscheiden (Messbecher für den
Duschkopf-Test; die Stoppuhr bringt die App mit; der Zählerstand lässt sich
abfotografieren), und die Liste der Checks, die **ganz ohne** Anschaffung
laufen – zurzeit fünf von neun.

**Der Inhalt ist abgeleitet, nicht abgeschrieben.** `MeasurementMeta` trägt neu
ein Pflichtfeld `instruments`; die Übersicht dreht diese Zuordnung in
`instrumentNeeds.ts` um („je Gerät, wofür"). Damit kann die Seite nicht falsch
werden: Nimmt ein Check seinen Mess-Schritt weg – wie der Gefrierschrank-Check
es mit der Strommessung getan hat –, verschwindet er hier von selbst. Ein Test
hält die Kopplung fest und verlangt zu jeder Bauart einen Erklärtext in beiden
Sprachen.

**Was dabei entschieden wurde**, ohne eigene Rückfrage:

- **Die Auswahl ist ganz entfallen**, „Keines"/„Nicht bekannt" eingeschlossen.
  Beides zählte nur für den Fortschrittsbalken.
- **Das Feld `instruments` bleibt** – wie bei #17. Ein Bestandsprofil trägt
  echte Werte: Sie haken die optionale Abstandsmessung im Möbelabstand-Check
  weiterhin vor und stehen im Steckbrief. Ein neues Profil bekommt die
  Steckbrief-Zeile gar nicht mehr, statt „nicht angegeben" zu einer Frage zu
  zeigen, die niemand gestellt hat.
- **Aus „Wofür wir das nutzen" ist `instruments` verschwunden** (kein
  `labelKey` mehr). Der Bildschirm soll erklären, wozu die *eigenen Antworten*
  dienen – eine Zeile zu einer nie gestellten Frage tut das Gegenteil.

**Zwei Nebenbefunde**, beide nicht angefasst:

- Der CO₂-Sensor steht jetzt sichtbar als „Zurzeit ungenutzt" in der Übersicht.
  Das ist die ehrliche Auskunft, aber keine Dauerlösung – siehe „Offene Fragen".
- `windowAge`, `insulationState`, `ventilationType` und `renovations` behielten
  bei #17 ihren `labelKey` und stehen deshalb weiter in „Wofür wir das nutzen" –
  als Angaben, die ein neues Profil nie macht. Derselbe Fall, den #18 für
  `instruments` gerade behoben hat.

### 19. Frage nach Kamin/Ofen ohne Wirkung
**Kategorie:** Problem · **Bereich:** `Step4Heating`, `fieldUsage.ts`,
`profileReportData.ts`
**Status:** ✅ Umgesetzt (04.09.) – Frage entfernt.

Kilians Befund: „Entferne die Frage ob ein Kamin/Ofen vorhanden ist, das ist
unnötig." Nachgeprüft und bestätigt: `hasExtraFireplace` hatte **keine einzige**
funktionale Lesestelle. Die gesamte Wirkung waren zwei Anzeigen des soeben
Eingegebenen – eine Zeile in der Zusammenfassung und eine im PDF-Steckbrief.
Der eigene `fieldUsage`-Eintrag sagte das sogar: „Dass er die
Verbrauchs-Einordnung verschiebt, wird noch nicht gerechnet."

Das Feld bleibt in `OnboardingData` (wie bei #17 und #18). Ein Unterschied zu
den bisherigen Fällen entscheidet dabei über die Steckbrief-Zeile: Der
Standardwert ist `false`, ein „Nein" ist also von „nie gefragt" nicht zu
unterscheiden. Deshalb steht die Zeile nur noch dort, wo ein Bestandsprofil
„ja" gesagt hat – das war eine echte Angabe.

Nebenbei behoben: Die PV-Antwort stand in der Abschluss-Zusammenfassung hinter
`isDetailed`, obwohl die Frage im Schnellstart genauso gestellt wird (der
Abschnitt „Heizung" ist `quick: true`). Wer den Schnellstart nahm, beantwortete
sie und fand sie in der Zusammenfassung nicht wieder.

### 20. Photovoltaik-Frage – halb angeschlossen
**Kategorie:** Verbesserung · **Bereich:** `buildTips.ts`, `fieldUsage.ts`
**Status:** ✅ Umgesetzt (04.09.).

Kilians Frage: „Hat die Photovoltaik-Frage einen tieferen Sinn? Oder bewirkt
sie etwas?" – mit dem Vorschlag, Tipps zum Verbrauch bei Sonnenschein
auszusprechen oder im Monitoring einen Solarstrom-Zähler einzublenden.

**Der zweite Teil existierte bereits.** `energyConfig.ts` legt bei
`hasPV === 'yes'` den Erzeugungszähler aufs Monitoring-Board
(`suggestedEnergyTypes`), und `MonitoringPage` zeigt eine Erinnerung, solange
noch kein Erzeugungswert erfasst ist. Anders als Kamin (#19) oder Messgeräte
(#18) war die Frage also kein totes Ende – aber ein halbes.

**Was fehlte, ist der erste Teil.** Die Angabe beantwortete „wie viel erzeuge
ich", nicht „was mache ich damit" – und dort liegt der eigentliche Hebel:
Selbst verbrauchter Strom ist so viel wert wie der Bezugspreis, eingespeister
nur so viel wie die Einspeisevergütung, und die ist seit Jahren die deutlich
kleinere Zahl. Neuer Tipp bei `hasPV === 'yes'`: große Verbraucher
(Spül-/Waschmaschine per Startzeitvorwahl, E-Auto, Warmwasser) in die
Mittagsstunden legen. Kostenlos, in Minuten getan – er landet damit bei den
Sofortmaßnahmen.

**Und „Geplant" war bis dahin die einzige Antwort ganz ohne Folge.** Sie
bekommt jetzt den Tipp, vor dem Angebotsvergleich die eigene Grundlast zu
messen: Wie groß die Anlage sinnvollerweise wird, hängt weniger vom Dach ab als
davon, wie viel Strom im Haus überhaupt bleiben kann. Der Tipp führt in den
Grundlast-Check und verschwindet, sobald der gemacht ist.

**Dabei gefunden und behoben:** Der neue Link-Tipp ging zunächst ohne
`action`-Text live – auf dem Knopf stand der rohe i18n-Schlüssel
`tips.items.pv_planned_base_load.action`. Aufgefallen ist das erst beim Ansehen
der Seite im Browser, nicht im Test. Es gibt jetzt einen: Jeder Tipp, der
irgendwohin führt, braucht in beiden Sprachen eine Beschriftung – mit einer
Zeile, die den Test rot werden lässt, wenn er gar keinen verlinkten Tipp mehr
zu prüfen findet.

### 21. Warmwasser-Frage – die folgenreichste Angabe, die man ihr nicht ansah
**Kategorie:** Verbesserung · **Bereich:** `hotWaterEnergy.ts`, `ShowerheadRun`,
`buildTips.ts`
**Status:** ✅ Umgesetzt (04.09.).

Kilians Frage: „Hat die Angabe der Warmwasseraufbereitung irgendeinen weiteren
Sinn? Ich möchte tote Enden im Fragebogen vermeiden."

**Sie ist kein totes Ende – im Gegenteil.** `hotWaterType` setzt im
Duschkopf-Check den Preis je nutzbarer Kilowattstunde
(`defaultHotWaterSource` → `eurPerKwhHeat`). Mit den Standardpreisen der App
kostet elektrisch erzeugte Wärme 0,354 €/kWh, Gas 0,133 €/kWh: Dieselbe Dusche
ergibt je nach Antwort eine gut zweieinhalbmal so hohe Zahl. Von allen Feldern
des Fragebogens hat kaum eines eine so kräftige Wirkung.

**Warum es sich trotzdem wie ein totes Ende anfühlt:** Diese Wirkung war
unsichtbar. Sie bestand aus einem vorausgewählten Chip mitten im Duschkopf-Check
– und niemand sieht einem Chip an, dass er aus dem Fragebogen stammt. Drei
Dinge sind deshalb dazugekommen:

1. **Die Vorbelegung sagt jetzt, woher sie kommt.** Über den Quellen-Chips steht
   „Vorbelegt aus deinem Profil („Wie Heizung"): Gas." – aber nur, solange die
   Auswahl unverändert ist und tatsächlich auf einer Angabe beruht.
2. **„Nicht bekannt" rät besser.** Bisher landete diese Antwort pauschal bei
   „elektrisch", auch wenn ein Gaskessel im Profil stand – der teuersten aller
   Quellen. Wer die Frage nicht beantworten konnte, bekam damit den
   unwahrscheinlichsten Fall unterstellt und eine Ersparnis, die um ein
   Mehrfaches danebenlag. Jetzt folgt sie dem Wärmeerzeuger und fällt nur ohne
   verwertbaren Erzeuger auf elektrisch zurück. Der Hinweis aus (1) bleibt in
   diesem Fall bewusst aus: Geraten ist nicht angegeben.
3. **Ein Tipp zieht die Folgerung.** Bei „Separates System" – also in aller Regel
   elektrisch – steht jetzt in den Empfehlungen, dass hier die teuerste
   Kilowattstunde des Hauses erzeugt wird und der Duschkopf-Test deshalb mehr
   bringt als anderswo. Der Tipp führt dorthin und tritt ab, sobald gemessen ist.

**Beim Nachrechnen korrigiert:** Die erste Fassung der Texte behauptete „grob
das Vierfache von Gas". Gegen die Standardpreise der App gerechnet sind es 2,65
– das Vierfache trifft auf Pellets zu, nicht auf Gas. Die Texte sagen jetzt „die
teuerste aller Quellen" und, wo eine Zahl steht, „gut zweieinhalbmal so teuer
wie Gas"; ein Test hält beides an der Rechnung fest.

### 22. Smart-Home-Frage ohne Wirkung
**Kategorie:** Problem · **Bereich:** `Step6Instruments`, `Step8Review`,
`fieldUsage.ts`, `profileReportData.ts`
**Status:** ✅ Umgesetzt (05.09.) – Frage entfernt.

Kilians Befund: „Bitte entferne die Smart-Home-Geräte. Die haben keinen
Mehrwert." Nachgeprüft und bestätigt – derselbe Fall wie #19: `smartHomeDevices`
hatte keine funktionale Lesestelle. Die drei Antworten (smartes Thermostat,
smarter Stromzähler, smarte Steckdosen) landeten in der Abschluss-Zusammenfassung
und in einer Zeile des PDF-Steckbriefs, sonst nirgends. Der eigene
`fieldUsage`-Eintrag stand seit Etappe 4 als offene Rechnung da: „Dass die
Empfehlungen schon Vorhandenes unterdrücken, steht weiter aus." Angeschlossen
wurde das nie.

Das Feld bleibt in `OnboardingData`, wie bei #17, #18 und #19. Die
Steckbrief-Zeile steht nur noch, wo tatsächlich Geräte eingetragen sind: Der
Standardwert ist die leere Liste, die von „nie gefragt" nicht zu unterscheiden
wäre (`retired()` in `profileReportData.ts`). Der `labelKey` ist weg, damit die
Angabe nicht länger in „Wofür wir das nutzen" steht – dort stünde sonst eine
Frage, die ein neues Profil nie beantwortet.

Entfallen sind auch die beiden i18n-Schlüssel, die nur die Frage selbst trug
(`onboarding.step6.smartHomeDevices`, `info.smartHome`). Die Bezeichnungen der
Gerätearten bleiben – der Steckbrief liest sie für Bestandsprofile.

### 23. Kühl- und Gefriergeräte auf eine eigene Seite
**Kategorie:** Verbesserung · **Bereich:** `sections.ts`, `StepAppliances`,
`Step6Instruments`
**Status:** ✅ Umgesetzt (05.09.).

Kilians Befund: „Das mit den Kühl- und Gefriergeräten finde ich gut. Kannst du
das auf eine eigene Seite des Fragebogens vor dieser Seite bitte verorten."

Die Frage stand seit #18 am Fuß des Schritts „Ausstattung", unterhalb der
Übersicht „Was du zum Messen brauchst" – eine Frage unter einer Auskunft, die
man erst freiscrollen musste (siehe Kilians Screenshot: Die Geräte-Auswahl
beginnt unterhalb der Zeile „Ganz ohne Messgerät: …"). Ausgerechnet diese Frage:
Sie ist die einzige des Fragebogens, die darüber entscheidet, welche Checks
überhaupt erscheinen – und ob der Fortschritt je bei 100 % ankommt.

Sie hat jetzt einen eigenen Schritt (`appliances`, neuer
`StepAppliances`-Baustein) unmittelbar **vor** „Ausstattung". Der vollständige
Fragebogen hat damit acht statt sieben Schritte; der Schnellstart bleibt
unberührt (`quick: false`). Auf der Seite selbst steht als Überschrift die Frage
(„Welche Geräte hast du?") statt der Bezeichnung ein zweites Mal – die trägt
schon der Seitenkopf.

„Ausstattung" ist damit die zweite Seite ohne jede Frage, wie „Preise & Kosten":
Sie zeigt nur noch die Messgeräte-Übersicht und gilt als erledigt, sobald sie
besucht wurde. Im Profil-Hub steht sie folgerichtig als „Optional".

**Zu entscheiden (siehe Offene Fragen):** Ob der Titel „Ausstattung" für eine
Seite, die nur noch die Messgeräte-Übersicht zeigt, noch der richtige ist.

### 24. Postleitzahl als totes Ende – Vorschlag: Klimaregion, Heizperiode, Gradtage
**Kategorie:** Verbesserung · **Bereich:** `seasonality.ts`, `Step7Location`,
`AbsoluteLineChart`, `fieldUsage.ts`
**Status:** ⚠️ Teilweise umgesetzt (05.09.) – **der Nutzen ist da, die
Postleitzahl aber weiterhin nicht angeschlossen.** Beim Bauen zeigte sich, dass
beides nicht zusammengehört; Begründung unten unter „Was daraus wurde".

Kilians Frage: „Wie können wir diese Info besser nutzen? Bis jetzt ist das ja
quasi ein totes Ende. Kann man daraus die Heizperiode vielleicht ableiten? Oder
Heiztage oder so? Dass man das dann im Monitoring einblenden kann? Zum
Überprüfen, ob wirklich nur in der Heizperiode geheizt wird?"

**Befund bestätigt.** `postalCode` hat genau eine Lesestelle: `coarsePostalCode`
kürzt sie auf zwei Ziffern und schreibt sie in den PDF-Steckbrief. Der eigene
`fieldUsage`-Eintrag benennt die Lücke seit Etappe 4 selbst: „Für Klimadaten und
regionale Preise wäre sie zusätzlich brauchbar, beides gibt es noch nicht."

**Der Anschlusspunkt existiert schon.** `monitoring/seasonality.ts` trägt ein
jahreszeitliches Verbrauchsprofil (`MONTH_SHARE`, an die BDEW-Standardlastprofile
angenähert) – und zwar **eines für ganz Deutschland**, ausdrücklich „gemittelt
über die Klimazonen". Daran hängen vier Rechnungen: die Jahres-Hochrechnung
(`readings.ts`), die Reichweite eines Tanks (`range.ts`), das Saisonprofil und
das Monitoring-Kapitel des Berichts (`monitoringReportData.ts`).

Die Postleitzahl regionalisiert dieses eine Profil. Das ist der elegante Weg:
**keine zweite Rechenkette**, dieselbe Regel wie beim Tank-Umbau – es ändern
sich Daten, nicht der Rechenweg. Ein Haus in Garmisch heizt länger als eines in
Freiburg; heute rechnet die App für beide mit derselben Kurve.

**Stufe 1 – ohne Netz, ohne Einwilligung (empfohlen).**
Eine kleine statische Tabelle im Code: PLZ-Präfix → Klimaregion → zwölf
Monatsmittel der Lufttemperatur (DWD-Klimareferenzperiode; die 15
TRY-Klimaregionen des DWD wären der passende Zuschnitt). Daraus folgen mit der
üblichen Konvention – Heiztag = Tagesmitteltemperatur unter der Heizgrenze von
15 °C, Gradtagzahl G20/15 nach VDI 3807 – drei Dinge:

1. **Regionalisiertes Saisonprofil.** Die Jahres-Hochrechnung wird genauer,
   ohne dass irgendwo eine neue Rechnung entsteht.
2. **Heizperioden-Band im Verlaufsdiagramm.** Die x-Achse von
   `AbsoluteLineChart` ist bereits eine echte Datumsachse – das Band ist ein
   Rechteck dahinter, kein Umbau. Damit ist auf einen Blick zu sehen, ob
   Verbrauch außerhalb der Heizperiode entsteht.
3. **Sommer-Check (Kilians eigentliche Frage).** Außerhalb der Heizperiode geht
   Gas/Öl praktisch vollständig ins Warmwasser. Liegt der Sommerverbrauch
   deutlich über diesem Sockel, läuft die Heizung, wenn sie nicht müsste –
   fehlende Sommerabschaltung, durchlaufende Zirkulationspumpe, zu hoch
   gesetzte Heizgrenze. Das ist ein echter, belegbarer Befund und der einzige
   Punkt der Liste, der aus der PLZ eine Handlung macht.

**Die ehrliche Grenze.** Langjährige Mittel sagen, was *normal* ist – nicht, wie
*dieser* Winter war. Eine echte Witterungsbereinigung („war der Mehrverbrauch
das Wetter oder ich?") braucht die tatsächlichen Gradtage des laufenden Jahres,
also eine Wetter-Schnittstelle (DWD, Open-Meteo). Das wäre **Stufe 2** und hat
Folgen, die über die Technik hinausgehen: Der Client stellt heute *keine einzige*
externe Netzanfrage; eine Wetterabfrage mit dem Standort des Nutzers wäre ein
neuer einwilligungsbedürftiger Dienst – neue Kategorie in `consent.ts`,
Datenschutzerklärung erweitern, `CONSENT_VERSION` erhöhen (siehe
„Rechtliches" in `CLAUDE.md`). Empfehlung: Stufe 1 zuerst, Stufe 2 nur, wenn
Kilian den Aufwand ausdrücklich will.

**Zu prüfen vor der Umsetzung:** Die Zuordnung PLZ-Präfix → Klimaregion und die
Monatsmittel müssen an der Quelle geprüft werden, nicht aus dem Gedächtnis
geschrieben. Nach der Konvention „Jeder Richtwert nennt seine Herkunft" gehört
die Quelle an die Tabelle (`ThresholdOrigin: 'reference'`).

**Was daraus wurde (05.09.).** Kilians eigentliche Frage – „läuft die Heizung
wirklich nur in der Heizperiode?" – ist umgesetzt. Die Klimatabelle ist es
nicht, und zwar aus einem Grund, der beim Bauen auffiel und die Reihenfolge
umgedreht hat:

*Die Frage braucht die Postleitzahl gar nicht.* Der bessere Maßstab für „ist
der Sommerverbrauch zu hoch?" ist nicht ein Klimamodell, sondern der Haushalt
selbst. Was im Hochsommer durch den Zähler geht, **ist** der
Warmwasser-Grundbedarf – gemessen, nicht modelliert. Gehalten wird er gegen den
erwarteten Bedarf aus der Personenzahl, den die App über den Duschkopf-Check
ohnehin kennt. Das ist genauer als jede Regionaltabelle, weil es das eigene
Haus beschreibt statt eines durchschnittlichen in derselben Gegend.

Umgesetzt sind deshalb:

- `monitoring/heatingPeriod.ts` – Heizperiode (1.10.–30.4., Konvention) und ein
  bewusst enger gefasstes Sommerfenster (15.6.–31.8., Richtwert der E-App):
  Mai und September tragen in kühlen Jahren echten Heizbedarf, und ein Befund,
  der einen kalten Mai als Fehler auslegt, wäre falsch.
- **Heizperioden-Band** hinter dem Verlaufsdiagramm der Wärmeträger. Dafür
  brauchte die Zeitachse eine Umkehrung (`offsetForTime` in `lib/timeAxis.ts`):
  Die Achse ist nicht zeit-proportional, ein beliebiges Datum lässt sich nur
  zwischen seinen Nachbarpunkten interpolieren – sonst säße die Bandkante neben
  der Linie, die sie einordnen soll.
- **Sommer-Check** als Karte unter dem Diagramm: gemessener Sommerverbrauch je
  Tag gegen den erwarteten Warmwasserbedarf, mit „So gerechnet"-Aufklapper.
  Ab dem Zweieinhalbfachen wird es deutlich – dann geht mehr als die Hälfte des
  Sommerverbrauchs für etwas anderes drauf als warmes Wasser: fehlende
  Sommerabschaltung, Zirkulationspumpe im Dauerlauf, zu hohe Heizgrenze. Alle
  drei lassen sich einstellen, ohne etwas zu kaufen.

Der Warmwasser-Maßstab wird aus den Konstanten des Duschkopf-Checks
**hergeleitet**, nicht danebengeschrieben; die Wirkungsgrade kommen aus
`hotWaterEnergy.ts`, das mit ihnen rechnet. Ändert der Duschkopf-Check seine
Annahmen, zieht der Sommer-Check mit.

**Warum die Klimatabelle nicht kam.** Diese Session hat keinen Netzzugang: Der
Egress-Proxy lehnt `opendata.dwd.de`, `open-meteo.com` und Wikipedia gleichermaßen
ab. Monatsmittel für 15 Klimaregionen aus dem Gedächtnis zu schreiben und als
`'reference'` zu kennzeichnen, wäre gegen die Konvention „Jeder Richtwert nennt
seine Herkunft" – und niemandem fiele es auf, wenn sie daneben lägen. Der
Regionalisierungs-Teil bleibt damit offen; er ist auch nach wie vor sinnvoll
(das Saisonprofil in `seasonality.ts` gilt weiterhin bundesweit einheitlich),
nur eben nicht ohne geprüfte Daten. Dieselbe Begründung wie bei den
Wikipedia-Quellen im Wissens-Tracker.

### 25. Standort-Schritt: Mieter/Eigentümer streichen, Standort sichtbar machen
**Kategorie:** Verbesserung · **Bereich:** `Step7Location`, `sections.ts`,
`fieldUsage.ts`
**Status:** ✅ Umgesetzt (05.09.) – Frage entfernt, Abschnitt heißt jetzt
„Standort". Die grafische Visualisierung ist nicht gekommen; Begründung unten.

Kilians Befund: „Die Frage ob Mieter oder Eigentümer würde ich streichen. Das
hat keinen großen Mehrwert finde ich. Vielleicht kann man den Standort dann auch
hier gleich schöner grafisch visualisieren und dann gleich relevante Infos
anzeigen an geeigneter Stelle."

**Mieter/Eigentümer.** Befund bestätigt: `occupancyStatus` wird nur angezeigt –
eine Zeile in der Zusammenfassung, eine im Steckbrief. Kein Tipp, keine Messung,
keine Rechnung liest die Angabe.

Ein Unterschied zu Smart-Home (#22) und Kamin (#19) gehört dazu: Dort war kein
sinnvoller Abnehmer in Sicht. Hier ist einer naheliegend und billig – die
Empfehlungen filtern bereits nach Zielen (`buildTips.ts`), und „neue Heizung",
„Dämmung", „PV-Anlage" sind für Mieter keine Empfehlung, sondern Frust. Es steht
also eine echte Wahl an: streichen, oder in überschaubarem Aufwand anschließen.
**Entschieden am 05.09.: streichen** – nach dem Nachzählen. Der Tipp-Katalog
enthält **genau einen** Eigentümer-Tipp (`old_boiler`, „Heizung prüfen oder
tauschen lassen"). Die PV-Tipps hängen an einer Angabe, die der Nutzer selbst
gemacht hat; Dämmungs-Tipps gibt es gar keine. Und selbst dieser eine Tipp ist
für Mieter nicht nutzlos: Das Alter des Kessels ist ihr Argument gegenüber der
Vermietung. Eine Pflichtangabe im Fragebogen für einen einzigen Tipp, den sie
nicht einmal sicher unterdrücken sollte, trägt sich nicht.

Die Zeile im PDF-Steckbrief bleibt für Bestandsprofile: Der Standardwert ist
`null`, „nie gefragt" ist also sauber von einer echten Angabe zu unterscheiden.

**Standort sichtbar machen.** Eine echte Karte scheidet aus: Kartenkacheln
kommen von einem fremden Server, das wäre derselbe Einwilligungsfall wie in #24
Stufe 2 – für ein Bild. Ohne jede Netzanfrage geht:

- eine schlichte Deutschland-Silhouette als Inline-SVG mit hervorgehobener
  Klimaregion (die App kennt ohnehin nur die Region, nicht die Adresse), und
- **die abgeleiteten Angaben direkt unter der Eingabe**: Klimaregion, normale
  Heizperiode (etwa „Ende September bis Anfang Mai"), Gradtagzahl – und ein
  Satz dazu, was das in der App bewirkt.

Damit hörte der Schritt auf, ein Formularfeld ohne Echo zu sein: Die Eingabe
antwortet sofort. Dasselbe Muster wie bei der PV- und der Warmwasser-Frage in
der Runde vom 04.09.

**Nicht umgesetzt (05.09.).** Beides – Silhouette wie abgeleitete Angaben –
hängt an der Klimatabelle aus #24, und die ist ohne geprüfte Daten nicht zu
haben. Eine Karte, die „deine Klimaregion" behauptet, ohne dass die Zuordnung
belegt ist, wäre hübscher als heute und weniger ehrlich. Der Schritt zeigt
deshalb vorerst nur die Postleitzahl.

**Nebenwirkung, die zur Entscheidung gehört:** Fällt Mieter/Eigentümer weg,
bleibt im Schritt „Standort & Wohnsituation" nur noch die freiwillige
Postleitzahl. Der Abschnitt hätte dann keine Pflichtangabe mehr – wie „Preise &
Kosten" und seit #23 auch „Ausstattung". Ein Name wie „Standort" wäre dann
passender als „Standort & Wohnsituation".

## Cookie-Banner & Rechtsseiten

### 2. Wiedereinstieg in die Cookie-Einstellungen
**Kategorie:** Verbesserung · **Bereich:** Datenschutzerklärung Abschnitt 9
**Status:** ↩️ Zurückgenommen (04.09.) – siehe #13. Der Button war umgesetzt
(`ConsentReopenButton`, unten rechts, Text „Möchtest du deine
Cookie-Einstellungen ändern?"), Kilian hat ihn nach dem Live-Test wieder
entfernen lassen: Der Fußzeilen-Link leistet dasselbe, ohne dauerhaft im Bild
zu stehen.

Der Button zum erneuten Festlegen der Präferenzen soll wie der Cookie-Hinweis
selbst unten rechts mitlaufen – als kleiner Button „Möchtest du deine
Cookie-Einstellungen ändern?". Abschnitt 9 der Datenschutzerklärung
entsprechend umschreiben (neue Methode statt aktuellem Verweis).

### 11. Cookie-Wiedereinstieg überlappt die Navigationsleiste
**Kategorie:** Bug · **Bereich:** `ConsentReopenButton`, `.glass-floating`
**Status:** ✅ Umgesetzt – Ursache war nicht die Position, sondern dass es gar
keine gab: `.glass-floating` in `index.css` setzte `position: relative`. Die
Datei liegt außerhalb der Tailwind-Layer und überstimmt damit jedes Utility,
also blieb das `fixed` am Knopf wirkungslos – er stand im Textfluss am Ende der
Seite und schob sich mit `right-3` sogar noch nach links aus dem Bild. Drei
Änderungen:

- `.glass-floating` setzt kein `position` mehr. Den Bezugsrahmen für das
  ::before-Overlay stellt das dort ohnehin gesetzte `transform: translateZ(0)`
  her. Nebenbei behoben: der Entdeck-Hinweis am Feedback-Knopf
  (`FeedbackButton`, `absolute right-0 top-11`) war aus demselben Grund nicht
  positioniert.
- Neue CSS-Variablen `--bottom-nav-h` (Höhe der mobilen Navigationsleiste) und
  `--floating-bottom` (Abstand für alles, was unten schwebt). Die `BottomNav`
  setzt ihre Höhe daraus, Cookie-Hinweis und Wiedereinstieg ihren Abstand –
  vorher stand „4.75rem" als Literal in jeder schwebenden Komponente und konnte
  von der echten Leistenhöhe abweichen.
- Auf dem Handy zeigt der Wiedereinstieg nur noch das Cookie-Symbol (runder
  Knopf, 2.75rem, also über der 44-px-Marke). Die ausgeschriebene Frage ergab
  eine Leiste über fast die volle Bildschirmbreite. Der zugängliche Name bleibt
  derselbe Satz (`aria-label`/`title`); ab `md` steht die Beschriftung wieder
  dabei, dort als „Cookie-Einstellungen" statt als Frage.

Gemessen (393 × 760, Chromium): Knopf 44 × 44 px, 12 px vom rechten Rand,
Unterkante 11 px über der Navigationsleiste; Cookie-Hinweis endet an derselben
Kante. Auf 1280 px breit: 16 px Abstand zu beiden Rändern, mit Beschriftung.

### 12. Cookie-Symbol verdeckt den „PDF teilen"-Knopf
**Kategorie:** Bug · **Bereich:** `BottomBar`, `ConsentReopenButton`
**Status:** ✅ Umgesetzt – Nachtrag zu #11. Der Wiedereinstieg wich zwar der
Navigationsleiste aus, nicht aber der festen Aktionsleiste, die auf den
Berichten („PDF teilen") und im Fragebogen („Weiter") darüber liegt. Beide
Leisten waren als kopierter Klassen-String in den Seiten aufgebaut und
rechneten mit `4rem` statt der echten Leistenhöhe – sie überlappten die
Navigationsleiste ihrerseits um vier Pixel.

Neue Komponente `components/BottomBar.tsx` für beide Leisten. Sie sitzt auf
`--bottom-nav-total` auf und misst sich selbst per `ResizeObserver` nach
`--bottom-bar-h`, worüber `--floating-bottom` das Schwebende nach oben schiebt.
Gemessen statt angenommen, weil die Berichte-Leiste über dem Knopf Status- und
Fehlerzeilen einblendet und dabei wächst.

Gemessen (393 × 760, Chromium): Berichte 12 px Abstand zur Leiste, Fragebogen
12 px; Leiste künstlich um 60 px erhöht → Knopf wandert um exakt 60 px mit und
nach dem Zurücksetzen zurück; auf einer Seite ohne Aktionsleiste steht
`--bottom-bar-h` wieder auf `0px`. Desktop (1280 px): Leiste am unteren Rand,
Knopf 16 px darüber.

### 13. Schwebender Cookie-Knopf wieder entfernt
**Kategorie:** Verbesserung · **Bereich:** `ConsentReopenButton` (entfällt)
**Status:** ✅ Umgesetzt – nimmt #2 zurück. Der dauerhaft schwebende Knopf muss
nicht sein: „Cookie-Einstellungen" steht am Fuß jeder Seite (`LegalFooter` im
App-Grundgerüst) und zusätzlich in den Einstellungen.

Rechtlich bleibt der Widerruf damit genauso leicht wie die Erteilung
(Art. 7 Abs. 3 Satz 4 DSGVO): ein dauerhaft erreichbarer Einstieg auf jeder
Seite, ohne Umweg über die Datenschutzerklärung. Das ist die Begründung, die
im `ConsentBanner` ohnehin schon steht.

Entfernt: `ConsentReopenButton.tsx`, seine Einbindung in `App.tsx` und der
Textbaustein `consent.reopen` (deutsch und englisch). Abschnitt 9 der
Datenschutzerklärung nennt jetzt Fußzeile und Einstellungen statt des
schwebenden Knopfes.

`--floating-bottom` und die `BottomBar` bleiben: Der Cookie-Hinweis vor der
ersten Entscheidung schwebt weiterhin unten und muss der Navigations- und der
Aktionsleiste weiter ausweichen (#11, #12).

### 3. Dritter Button im Cookie-Banner für erweiterte Einstellungen
**Kategorie:** Verbesserung · **Bereich:** `ConsentBanner`
**Status:** ✅ Umgesetzt – „Cookie-Einstellungen" ist jetzt ein eigener Button
in derselben Optik wie „Ablehnen"/„Akzeptieren", direkt darunter über deren
volle gemeinsame Breite.

„Cookie-Einstellungen" (aktuell ein Link) soll ein Button werden, gleich
prominent wie „Ablehnen" und „Akzeptieren", platziert direkt darunter über
die volle gemeinsame Breite beider Buttons.

### 4. Scroll-Position bleibt beim Routenwechsel stehen
**Kategorie:** Bug · **Bereich:** allgemein, nicht auf Rechtsseiten beschränkt
**Status:** ✅ Umgesetzt – neue `ScrollToTop`-Komponente in `App.tsx`, springt
bei jedem Pfadwechsel (nicht bei reinem Suchparameter-Wechsel) an den
Seitenanfang. Allgemeine Lösung, nicht auf die Rechtsseiten beschränkt.

Bestätigt: Keine Stelle im Projekt behandelt Scroll-Restoration; React Router
tut das nicht automatisch. Wechselt man die Seite, bleibt der Scroll-Y-Wert
stehen – am auffälligsten zwischen Impressum und Datenschutzerklärung
(unterschiedliche Seitenlängen), potenziell aber bei jeder Navigation in der
App. Beim Beheben: allgemeine Lösung (z. B. ein globaler Scroll-Reset bei
Routenwechsel), nicht nur für die Rechtsseiten.

---

## Landing Page

### 5. Sprache und Theme auf der Landing Page nicht einstellbar
**Kategorie:** Verbesserung · **Bereich:** `LandingPage.tsx`
**Status:** ✅ Umgesetzt – neue `LandingPickers`-Komponente, zwei kompakte
Dropdown-Buttons mittig in der Topbar zwischen Logo und „Anmelden".
Wiederverwendet `ThemePicker compact` (dieselbe Komponente wie im
Konto-Popover, für einen schmalen Slot bereits gebaut); die Sprachauswahl
ist neu (bisher nur inline in `SettingsPage.tsx`).

Bestätigt: Beide Bausteine existieren bereits (`ThemePicker` in
`src/components/ThemePicker.tsx`, Sprachumschaltung in `SettingsPage.tsx`),
aber nur hinter der Anmeldung erreichbar. Ein Erstbesucher kann auf der
Startseite weder Sprache noch Farbschema wechseln.

Kilians Vorschlag: zwei Dropdown-Buttons oben mittig zwischen Logo/„E-App"
und „Anmelden" – funktioniert laut ihm sowohl im Browser als auch mobil.

**Zu klären beim Beheben:** Wiederverwendung von `ThemePicker` prüfen (ist er
für einen schmalen Header-Slot gebaut oder für die Einstellungsseite
dimensioniert?) und ob die Sprachumschaltung schon als eigenständige
Komponente existiert oder nur inline in `SettingsPage.tsx` steckt.

---

## Offene Fragen für Kilian

- Bei #8 (b): Über den umgesetzten Bugfix hinaus – grundsätzlich auf
  qualitativen Text ohne Literzahl umstellen, solange für
  Badewanne/Küche/Waschbecken kein echter Durchfluss-Test existiert (nicht
  nur Dusche)? Wäre eine bewusste Verhaltensänderung, keine reine Korrektur.
- Bei #15: Temperatur-Eingabe im Gefrierschrank-Check nachrüsten (dann stimmt
  der Info-Tab) oder die Temperatur aus dem Info-Tab streichen?
- Bei #18: Der CO₂-Sensor steht in der neuen Übersicht als „Zurzeit ungenutzt".
  Soll er dort ganz verschwinden – oder ist ein CO₂-/Lüftungs-Check geplant,
  der ihn anschließt? Solange keins von beidem entschieden ist, bleibt er die
  einzige Zeile der Seite, die dem Nutzer nichts zu tun gibt.
- Bei #18: Soll die Übersicht zusätzlich im Wissensbereich stehen? Im
  Fragebogen sieht sie jeder genau einmal – beim Anlegen der Wohnung. Wer sie
  Wochen später vor dem Standby-Check wiederfinden will, hat dafür keinen Weg.
- Bei #17 (Nachtrag aus #18): Sollen `windowAge`, `insulationState`,
  `ventilationType` und `renovations` aus „Wofür wir das nutzen" verschwinden?
  Sie stehen dort als Angaben, die ein neues Profil nie macht.

- Bei #24: Die Klimatabelle (PLZ → Region → Monatsmittel) braucht geprüfte
  DWD-Daten, und diese Session kam nicht ins Netz. Soll sie in einer Session
  mit Netzzugang nachgezogen werden – dann kommen auch die Standort-Grafik und
  die abgeleiteten Angaben aus #25 –, oder bleibt die Postleitzahl als
  freiwillige Angabe ohne Wirkung stehen?

- Bei #23: „Ausstattung" heißt jetzt eine Seite, auf der nur noch die
  Übersicht „Was du zum Messen brauchst" steht. Soll der Schritt so heißen wie
  sein Inhalt (z. B. „Was du zum Messen brauchst") – oder bleibt „Ausstattung"?

- Bei #9: Welche Auswahl-Struktur für die Raumzuordnung – zweistufig
  (erst Raum, dann Entnahmestelle) oder eine kombinierte Liste je
  Rauminstanz? Bis zur Entscheidung bleibt der bestehende Datenverlust bei
  mehreren gleichartigen Entnahmestellen (z. B. zwei Waschbecken) bestehen.
