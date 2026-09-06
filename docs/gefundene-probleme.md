# Gefundene Probleme – Sammlung vom 04.09.2026

> Sammelt Kilians Testbefunde, kategorisiert (Bug / Problem / Verbesserung) und
> grob priorisiert. **Update 04.09.2026:** Auf Kilians Wunsch wurde direkt so
> viel wie möglich umgesetzt (Branch `claude/beheben-gefundene-probleme`) –
> Status je Punkt unten. Offen blieb nur Punkt 9, der eine eigene
> UX-Entscheidung braucht.
>
> **Nachtrag 06.09.2026:** Die Punkte **#38–#50** haben eine andere Herkunft –
> sie stammen nicht aus einem Live-Test, sondern aus einer Durchsicht des
> gesamten Empfehlungs-Katalogs auf Kilians Frage hin. Eigener Abschnitt
> „Durchsicht des Empfehlungs-Katalogs", nur gesammelt, nichts geändert.

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

- Der CO₂-Sensor stand zunächst sichtbar als „Zurzeit ungenutzt" in der
  Übersicht. **Am 05.09. erledigt** – siehe den Nachtrag am Ende dieses Punkts.
- `windowAge`, `insulationState`, `ventilationType` und `renovations` behielten
  bei #17 ihren `labelKey` und stehen deshalb weiter in „Wofür wir das nutzen" –
  als Angaben, die ein neues Profil nie macht. Derselbe Fall, den #18 für
  `instruments` gerade behoben hat.

**Nachtrag (05.09.) – die beiden offenen Fragen sind entschieden.**

*Der CO₂-Sensor verschwindet aus der Übersicht.* Kein Check im Katalog liest
ihn, und es steht auch keiner an – alle neun Einträge sind `available: true`,
eine Lüftungs-Messung gibt es nicht einmal als Entwurf. Die Seite heißt
„Was du zum Messen brauchst": Ein Gerät, das keine Messung liest, braucht man
dafür nicht, und es war die einzige Zeile, die dem Nutzer nichts zu tun gab.

Die Rolle `unused` **bleibt** im Modul, gefiltert wird erst an der Anzeige
(`instrumentsToShow()`). Damit gilt weiter, was die Übersicht ausmacht:
abgeleitet, nicht gepflegt. Liest eines Tages ein Check den CO₂-Wert, steht der
Sensor von selbst wieder da – eine ausgetragene Liste müsste jemand daran denken
zu ergänzen. Die Lücke zu benennen bleibt so eine Aufgabe der Entwicklung, wo
sie hingehört, statt eine des Nutzers. Zwei Tests halten beides fest.

*Die Übersicht steht jetzt auch im Wissensbereich* – als vierter Reiter
„Ausrüstung" neben FAQ, Glossar und Hintergründen. Im Fragebogen sieht man sie
genau einmal, beim Anlegen der Wohnung; wer Wochen später vor dem Standby-Check
wissen will, was er braucht, hatte dafür keinen Weg. Bewusst **dasselbe
Bauteil**, keine zweite Fassung: Der Inhalt ist aus `MEASUREMENT_CATALOG`
abgeleitet, eine Kopie liefe über kurz oder lang auseinander.

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
**Status:** ⚠️ Teilweise umgesetzt (05.09.) – geblieben ist das
Heizperioden-Band im Verlaufsdiagramm. Der Sommer-Check dazu war kurz da und ist
auf Kilians Wunsch wieder entfernt worden; die Postleitzahl ist weiterhin nicht
angeschlossen. Begründungen unten unter „Was daraus wurde".

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

Gebaut wurden daraufhin zwei Dinge – geblieben ist eines:

- **Geblieben: das Heizperioden-Band** hinter dem Verlaufsdiagramm der
  Wärmeträger (`monitoring/heatingPeriod.ts`, Heizperiode 1.10.–30.4. als
  Konvention). Dafür brauchte die Zeitachse eine Umkehrung (`offsetForTime` in
  `lib/timeAxis.ts`): Die Achse ist nicht zeit-proportional, ein beliebiges
  Datum lässt sich nur zwischen seinen Nachbarpunkten interpolieren – sonst
  säße die Bandkante neben der Linie, die sie einordnen soll. Das Band ordnet
  ein und bewertet nicht.
- **Wieder entfernt: der Sommer-Check.** Eine Karte unter dem Diagramm, die den
  gemessenen Sommerverbrauch gegen den erwarteten Warmwasserbedarf hielt und
  daraus einen Befund ableitete (fehlende Sommerabschaltung, Zirkulationspumpe,
  Heizgrenze). Sie war fertig, getestet und im Browser geprüft; Kilian hat sie
  nach dem Ansehen wieder streichen lassen. Mit ihr sind der abgeleitete
  Warmwasser-Maßstab und die beiden Hilfs-Exporte entfallen, die es nur für sie
  gab (`HEAT_CONVERSION` in `hotWaterEnergy.ts`, `consumptionInWindow` in
  `readings.ts`) – beide Dateien stehen wieder exakt auf ihrem vorherigen Stand.

Was davon bleibt, ist der Gedanke dahinter, falls die Frage wiederkommt: Der
Maßstab für „ist der Sommerverbrauch zu hoch?" muss nicht aus einem Klimamodell
kommen. Der gemessene Sommerverbrauch **ist** der Warmwasser-Grundbedarf des
Haushalts – genauer als jede Regionaltabelle, weil er das eigene Haus
beschreibt.

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
**Status:** ✅ Umgesetzt (05.09.) – erst die Frage entfernt, dann auf Kilians
Wunsch **der ganze Schritt**: Übrig blieb nur die freiwillige Postleitzahl, und
die ist selbst ein totes Ende (siehe #24). Der Code liegt unter
`archiv/onboarding-standort/`.

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
belegt ist, wäre hübscher als heute und weniger ehrlich.

**Und damit fiel der Schritt ganz.** Kilians Folgerung, nachdem nur noch die
Postleitzahl übrig war: „Bitte die Standort-Abfrage aus dem Onboarding
entfernen, da sie ja scheinbar keine Verwendung hat und ein totes Ende ist."
Richtig – ein eigener Schritt für ein freiwilliges Feld ohne Wirkung trägt sich
nicht. Der vollständige Fragebogen hat seither **sieben statt acht Schritte**.

`postalCode` und `locationMode` bleiben in `OnboardingData`: Bestandsprofile
tragen echte Werte, und wenn die Klimaregion je kommt, ist die Angabe für diese
Profile schon da. Steckbrief und Abschluss-Zusammenfassung zeigen sie nur noch,
wo tatsächlich eine eingetragen ist. Der Schritt-Code liegt mit Begründung und
Wiederherstellungs-Anleitung unter `archiv/onboarding-standort/`.

**Nebenwirkung, die zur Entscheidung gehört:** Fällt Mieter/Eigentümer weg,
bleibt im Schritt „Standort & Wohnsituation" nur noch die freiwillige
Postleitzahl. Der Abschnitt hätte dann keine Pflichtangabe mehr – wie „Preise &
Kosten" und seit #23 auch „Ausstattung". Ein Name wie „Standort" wäre dann
passender als „Standort & Wohnsituation".

### 26. „Dein Zuhause": Gebäudeteil, Zimmerzahl und Etagen
**Kategorie:** Problem · **Bereich:** `Step1Profile`, `sections.ts`,
`fieldUsage.ts`, `profileReportData.ts`
**Status:** ✅ Umgesetzt (05.09.) – zwei Fragen entfernt, eine auf den
Schnellstart beschränkt.

Kilians Befund: „Ich denke Gebäudeteil kann man entfernen, da derzeit totes Ende
und kein Mehrwert. Anzahl der Zimmer kann auch weg, da danach ja sowieso
eingegeben wird welche Zimmer existieren. Anzahl der Etagen kann auch weg, da
das auch ein totes Ende ist."

**Gebäudeteil und Etagen: bestätigt.** Beide waren *Pflichtangaben* mit je einer
Lesestelle – einer Zeile im PDF-Steckbrief. Nichts im Code verzweigt danach, ob
jemand in einer Wohnung oder einem Haus lebt (`'apartment'`/`'house'` kommen
außerhalb der Auswahl selbst nirgends vor); `floors` wäre für eine
Hüllflächen-Abschätzung brauchbar gewesen, gelesen hat es dort nie jemand. Beide
Fragen sind raus.

Die Felder bleiben in `OnboardingData`. Für den Steckbrief gilt dabei dieselbe
Unterscheidung wie beim Kamin (#19): Beide haben einen Standardwert, der von
„nie gefragt" nicht zu unterscheiden ist – `'apartment'` und `1`. Deshalb steht
im Bericht nur noch, was darüber hinausgeht: ein „Haus" und eine Etagenzahl
größer eins. Beides kann nur ein Bestandsprofil gesagt haben.

**Zimmerzahl: der Befund stimmt, aber nur für den vollständigen Fragebogen.**
Kilians Begründung – die Räume werden ja gleich danach einzeln erfasst – trifft
genau dort zu, und dort ist die Frage jetzt weg. Im **Schnellstart** gibt es
diesen zweiten Schritt aber nicht (Abschnitt „rooms" ist `quick: false`). Dort
ist die Zimmerzahl die einzige Größenangabe neben der Fläche und die Grundlage
der Plausibilitätsprüfung „m² je Zimmer" (`effectiveRoomCount` in
`plausibility.ts`). Sie auch dort zu streichen, hätte diese Prüfung für
Schnellstart-Profile still abgeschaltet – ohne dass es jemandem aufgefallen
wäre.

Deshalb: im vollständigen Fragebogen entfernt, im Schnellstart geblieben. Das
setzt Kilians Begründung um statt nur seinen Satz. Falls ihm die Zimmerzahl auch
im Schnellstart nicht gefällt, ist es eine Zeile – dann fällt die
„m² je Zimmer"-Prüfung dort mit weg.

**Was der Schritt dadurch wird:** „Dein Zuhause" trägt jetzt fünf statt sieben
Pflichtangaben – Profilname, Wohnfläche, Personen, Baujahr, Ziele – und passt
im vollständigen Fragebogen ohne Scrollen auf einen Bildschirm.

### 27. Ziel-Frage: eigene Seite, neues Ziel, und ein Ziel, das etwas bewirkt
**Kategorie:** Verbesserung · **Bereich:** `StepGoals`, `goals.ts`,
`sections.ts`, `OnboardingPage`
**Status:** ✅ Umgesetzt (05.09.).

Kilians Wunsch: „Die Frage nach deinen Zielen verdient eine eigene Seite im
Fragebogen." Dazu ein neues Ziel „Zählerstände tracken", eine Ziel-abhängige
Landung nach dem Fragebogen – und: „wie das gerade mit diesen kleinen Buttons
umgesetzt wird, ist nicht sehr ansprechend."

**Drei Dinge, die dabei zusammenkamen.**

1. **Eigene Seite (Schritt 2).** Die Frage stand am Fuß von „Dein Zuhause",
   unter Fläche, Personenzahl und Baujahr – sie ist keine Gebäudeangabe. Als
   fünf kleine Chips nebeneinander sah sie außerdem aus wie eine Nebensache,
   obwohl sie die einzige Angabe ist, die die Reihenfolge von Messungen und
   Empfehlungen verschiebt. Sie hat jetzt volle Karten in der Bauart der
   Modus-Auswahl (`Step0Mode`): Symbol, Titel und **ein Satz, was die Wahl
   bewirkt** – je Ziel der tatsächliche Effekt aus `GOAL_CATEGORY_BONUS`, nicht
   eine allgemeine Beschreibung.

2. **Nebenbei behoben: der Schnellstart konnte nie 100 % erreichen.** Die Frage
   wurde nur im vollständigen Fragebogen *gestellt* (`{detailed && …}` in
   `Step1Profile`), aber in **beiden** als Pflichtangabe *gezählt* (`field('goals')`
   im Abschnitt „home", der `quick: true` ist). Ein Schnellstart-Profil trug
   damit dauerhaft eine offene Angabe, die es nie zu Gesicht bekam. Die neue
   Seite ist `quick: true` – die Frage wird jetzt gestellt, wo sie gezählt wird.

3. **Das Ziel entscheidet, wo man landet.** Bis dahin endete der Fragebogen für
   jeden im Messbereich. Jetzt: „Zählerstände verfolgen" → Monitoring, „Neugier
   / Wissen aufbauen" → Wissensbereich, alles andere → Messungen. Die Zuordnung
   steht in `onboarding/goals.ts`, `OnboardingPage` kennt keinen Pfad mehr.

**Die Rangfolge, weil die Auswahl mehrfach ist:** Wer „Kosten senken" *und*
„Zählerstände verfolgen" ankreuzt, kann nicht an zwei Orten landen. Es gewinnt
das speziellere Ziel – die drei Mess-Ziele führen alle in denselben Bereich, die
beiden anderen an je genau einen. Es geht dabei nur um den **ersten
Bildschirm**; jeder Bereich bleibt über die Navigation erreichbar.

Damit die Regel nicht nur im Code steht, zeigt die Seite sie an: Unter den
Karten läuft eine Zeile mit, die den Bereich nennt, in dem man landen wird, und
sich beim Antippen sofort ändert. Dasselbe Muster wie bei der PV- und der
Warmwasser-Frage – eine Angabe, der man ihre Wirkung ansieht.

**Neues Ziel `track_readings`.** In `GOAL_CATEGORY_BONUS` bewusst leer: Das Ziel
sagt nichts darüber, welches Gewerk den Nutzer interessiert, seine Wirkung liegt
in der Navigation. Ein Test hält fest, dass jedes Ziel des Typs eine Karte hat
und auf einen Bereich zeigt, den die Navigation wirklich führt.

### 28. Räume gleichen Typs: kein eigener Name, keine eigene Fläche
**Kategorie:** Problem · **Bereich:** `Step3Rooms`, `RoomTypePicker`,
`types/index.ts` (`RoomEntry`), `measurements/rooms.ts`, `roomAreas.ts`,
`onboardingStore`
**Status:** ✅ Umgesetzt (05.09.) – Kilians Entscheidung: „so wie du
empfiehlst", also mit einzeln löschbaren Räumen und stabilen Kennungen.

Kilians Befund am Schritt „Räume": „Wenn man 2 Räume des gleichen Typs hat, hat
man keine Möglichkeit die Räume sinnvoll individuell zu benennen. Auch die
Quadratmeterzahl kann man nicht individuell einstellen."

**Bestätigt, und die Ursache liegt eine Ebene tiefer als die Oberfläche.**
`RoomEntry` beschreibt einen *Raumtyp*, nicht einen Raum:

```ts
interface RoomEntry { type: RoomType; count: number; areaSqm?: number; heatTransfer?: … }
```

`count` ist die Anzahl, alle übrigen Angaben gelten für den Typ. Zwei
Kinderzimmer teilen sich damit zwangsläufig eine Fläche und eine Wärmeübergabe.
Es gibt keine Stelle, an der ein einzelner Raum etwas Eigenes sagen könnte.

**Der Rest der App kennt einzelne Räume längst.** `roomInstances()` klappt
`type + count` in Instanzen mit stabilem Schlüssel (`bedroom#0`, `bedroom#1`)
auf, und die beiden Pro-Raum-Checks – Raumklima und Möbelabstand – speichern
ihre Ergebnisse einzeln unter `room_temperature@bedroom#1`. Die App **misst**
also je Raum, sie kann ihn nur nicht **beschreiben**. Der Fragebogen ist die
einzige Stelle, die noch in Typen denkt.

**Was daraus praktisch folgt – drei Dinge, nicht nur ein Schönheitsfehler:**

1. *Man weiß nicht, welchen Raum man misst.* In der Raum-Ansicht der Messungen
   (`ByRoomView`) stehen „Kinderzimmer 1" und „Kinderzimmer 2" – die Nummer
   kommt aus der Position im Array, nicht aus etwas, das der Nutzer je gesehen
   hat. Wer eine Woche später weitermisst, kann nicht wissen, welches der
   beiden er schon gemacht hat.
2. *Die Fläche trägt einen Geldbetrag.* `resolveRoomArea` speist
   `calcRoomTempSaving` in `RoomTemperatureRun` – daraus entsteht die
   Einsparung in €/Jahr für diesen Raum. Ein 9-m²-Kinderzimmer und ein
   18-m²-Kinderzimmer bekommen heute denselben Betrag. Einer der beiden ist
   um den Faktor zwei falsch.
3. *Eine Antwort aus dem Check überschreibt beide Räume.* Fehlt die
   Wärmeübergabe, erhebt der Möbelabstand-Check sie selbst und ruft
   `setRoomHeatTransfer(type, transfer)` – das schreibt auf **den Typ**. Wer im
   Kinderzimmer 1 „Fußbodenheizung" antwortet, hat sie stillschweigend auch im
   Kinderzimmer 2 stehen, und der Check dort stellt ab sofort die falschen
   Fragen, ohne je gefragt zu haben.

**Kein Bug, obwohl es im Screenshot so aussieht:** Beim Erhöhen der Anzahl von
1 auf 2 springt das m²-Feld von 70 auf 35. Das ist der *Platzhalter*, kein
eingetragener Wert – `resolveRoomArea` verteilt die Wohnfläche gewichtet auf die
Räume, und bei zwei Esszimmern in 70 m² Wohnfläche sind das je 35. Die Rechnung
stimmt und ist bereits je Instanz gedacht. Nur eingeben kann man sie nicht
je Instanz.

**Vorschlag: `count` durch eine Instanzliste ersetzen, nach dem Muster der
Geräte.** Genau dieses Problem ist bei den Kühl- und Gefriergeräten schon
gelöst (#Sammelliste, „mehrere Geräte gleicher Art"), und die Lösung dort ist
erprobt:

```ts
interface RoomEntry {
  type: RoomType
  instances: RoomInstanceEntry[]   // Länge ersetzt count
}
interface RoomInstanceEntry {
  id: string                 // stabil, siehe unten
  name?: string              // „Zimmer Lena" – leer heißt: Typ + Nummer benennen ihn
  areaSqm?: number
  heatTransfer?: HeatTransferType
}
```

**Der Schlüssel muss stabil bleiben, sonst erben Räume fremde Messwerte.** Der
Kommentar an `ApplianceEntry` beschreibt die Falle: Löscht man den ersten von
zwei Einträgen, rutscht `#1` auf `#0` und erbt dessen Ergebnis – der Nutzer
sieht eine Messung, die er woanders gemacht hat. Für Räume ist das heute nur
deshalb harmlos, weil man Instanzen gar nicht einzeln löschen kann. Sobald es
Namen gibt, will man genau das.

Deshalb dieselbe Antwort wie bei den Geräten: Die Instanz bekommt eine eigene,
unveränderliche `id`, und **die Bestandsräume erben als `id` genau ihren
bisherigen Schlüssel** (`bedroom#0`, `bedroom#1`, … in `migrateOnboardingData`).
Dann gilt `roomKey === instance.id` in beide Richtungen, jedes gespeicherte
Ergebnis findet weiter seinen Raum, und ein Löschen verschiebt nie wieder
jemanden. Neue Räume bekommen eine frische, nie wiederverwendete `id`.

**Oberfläche:** Die Kachel bekommt beim Aufklappen eine Zeile je Raum – Name
(Eingabefeld), m², Wärmeübergabe, Löschen – plus „Weiteren hinzufügen". Der
Name erscheint wie bei den Geräten **erst ab dem zweiten Raum**; bei einem
Kinderzimmer wäre „Kinderzimmer 1" eine Nummerierung ohne Gegenstück. Der
Stepper entfällt, die Anzahl ist die Länge der Liste.

`roomLabel()` ist der einzige Ort, an dem der Name durchschlagen muss – alle
rund 15 Anzeigestellen (Messungen, Tipps, Bericht, Startseite) gehen durch ihn.

**Umgesetzt wie vorgeschlagen.** `RoomEntry` trägt jetzt `instances`, die Länge
ersetzt `count`; Name, Fläche und Wärmeübergabe stehen je Raum. Der Stepper ist
der Zeilenliste gewichen – Namensfeld und Löschen erscheinen wie bei den Geräten
erst ab dem zweiten Raum. `resolveRoomArea` rechnet je Raum statt je Raumart,
`setRoomHeatTransfer` adressiert über den Raumschlüssel, `roomLabel` lässt den
eigenen Namen alles schlagen und trägt ihn damit durch Messungen, Tipps, Bericht
und Startseite.

**Die Migration ist der Kern.** Ein Altprofil mit `count: 2` bekommt exakt
`children_room#0` und `children_room#1` – genau die Schlüssel, unter denen seine
Messergebnisse schon liegen. Fläche und Wärmeübergabe erben alle Instanzen des
Typs: Dass beide Kinderzimmer dieselbe Fläche hatten, war im Altprofil keine
Angabe, sondern die einzig mögliche Darstellung. Ein Test hält das fest, ein
zweiter, dass eine gelöschte Kennung nie wieder vergeben wird.

`parseRoomKey` liest den hinteren Teil nicht mehr als Zahl (neue Räume tragen
dort eine zufällige Kennung) und dient nur noch dazu, die Raumart eines
**verwaisten** Schlüssels zu lesen – ein gelöschter Raum lässt sein Ergebnis
zurück, und „Schlafzimmer" ist dort eine bessere Auskunft als eine leere Zeile.

Abnahme: `tsc -b`, 949 Tests (22 neue), ESLint, Build grün; im Browser mit einem
Altprofil in der `count`-Form durchgespielt – Kennungen erhalten, zwei
Kinderzimmer getrennt benannt (9 m² / 18 m²), Fußbodenheizung nur im ersten
gesetzt, ersten gelöscht und geprüft, dass „Zimmer Max" mit seinen Angaben
bleibt.

### 29. Wärmeübergabe kennt nur zwei Bauarten – und kein „unbeheizt"
**Kategorie:** Problem · **Bereich:** `types/index.ts` (`HeatTransferType`),
`Step3Rooms`, `furnitureSpacing.ts`, `FurnitureSpacingRun`, `sections.ts`
**Status:** ✅ Umgesetzt (05.09.) – Kilians Entscheidung: „so wie du
empfiehlst", also mit Kachelofen in der Raumliste, Direktstrom beim Erzeuger und
rein qualitativen Fragensätzen ohne neue Zahlen.

Kilians Befund: „Außerdem kann man nur Heizkörper und Fußbodenheizung
auswählen. Der Nutzer könnte aber auch Infrarotheizplatten haben oder einen
alten Holzkachelofen."

**Bestätigt.** `HeatTransferType` ist `'radiator' | 'underfloor'`, und die
Angabe ist **Pflicht für jeden Raum** (`sections.ts`: `rooms.every(r =>
Boolean(r.heatTransfer))`). Wer Infrarotplatten hat, muss „Heizkörper"
behaupten, um den Fragebogen zu Ende zu bringen.

**Die Lücke ist größer als die zwei genannten Bauarten.** Zur Auswahl stehen
13 Raumtypen, darunter Keller, Dachboden und Treppenhaus. Für einen unbeheizten
Keller ist *jede* der beiden Antworten falsch, und trotzdem verlangt der
Fragebogen eine. „Unbeheizt" fehlt als Antwort – dabei ist es genau die
Angabe, die den Möbelabstand-Check in diesem Raum überflüssig macht.

**Wo die Angabe wirkt:** genau an einer funktionalen Stelle – dem
Möbelabstand-Check. `questionKeys(underfloor, roomType)` wählt zwischen zwei
Fragensätzen: beim Heizkörper Abstand/Verkleidung/Ventil, bei der
Fußbodenheizung fußlose Möbel/Teppich/Raumthermostat. Dazu der Steckbrief im
Bericht und die Zusammenfassung in der Übersicht.

**Vorschlag: fünf Antworten statt zwei, und für jede ein ehrlicher Fragensatz.**

| Antwort | Fragensatz im Möbelabstand-Check |
|---|---|
| Heizkörper | wie heute (`RADIATOR_KEYS`, Küche/Bad-Variante) |
| Fußbodenheizung | wie heute (`UNDERFLOOR_KEYS`) |
| **Infrarotheizplatte** | neu: freie Abstrahlfläche, nichts davor/darunter, Fühler nicht verbaut |
| **Einzelofen / Kachelofen** | neu: Abstand zu Möbeln, freie Luftzirkulation – der Rest der Bewertung greift dort nicht |
| **Unbeheizt** | Check erscheint in diesem Raum gar nicht |

Zwei Dinge daran sind Fachentscheidungen, keine Programmierung:

1. *Der Kachelofen ist kein Übergabe-System im selben Sinn.* Ein Heizkörper
   verteilt Wärme, die woanders erzeugt wurde; ein Kachelofen erzeugt sie im
   Raum. Er gehört fachlich zum Wärmeerzeuger (`HeatGeneratorType` kennt
   `wood_stove` bereits) und steht hier nur, weil der Nutzer ihn als „das, was
   den Raum warm macht" erlebt. Ihn in die Raumliste aufzunehmen ist eine
   bewusste Entscheidung für die Nutzersicht gegen die Fachsystematik – meines
   Erachtens die richtige, aber sie sollte benannt sein.
2. *Infrarot ist zugleich eine Erzeuger-Lücke.* `HeatGeneratorType` hat keine
   Direktstromheizung. Wer nur mit Infrarotplatten heizt, kann das im
   Heiz-Schritt gar nicht angeben – und ohne Erzeuger fehlt die Grundlage für
   Heizkosten und Einsparungen. Die Raum-Antwort allein schließt diese Lücke
   nicht.

**Umgesetzt wie vorgeschlagen.** `HeatTransferType` hat fünf Werte; die
Erweiterung ist rein additiv, Bestandsangaben bleiben gültig. Der
Möbelabstand-Check bekommt zwei neue Fragensätze mit eigenen Gewichten,
Befundtexten und Erklärtext – und „unbeheizt" nimmt ihn über
`skipWhenUnheated` aus dem Raum, in der Auswahl wie im Fortschritt. Ohne diesen
Riegel stünde er in jedem Keller als offene Aufgabe, die niemand erledigen kann,
und der Ring käme nie auf 100 %.

`HeatGeneratorType` hat jetzt `electric_direct` (Direktstrom: Infrarot,
Konvektor, Nachtspeicher). Damit hat ein Infrarot-Haushalt erstmals eine
Kostengrundlage – die Raum-Angabe sagt, *wie* die Wärme in den Raum kommt, nicht
*woher* sie stammt.

**Keine neuen Richtwerte.** Beide Fragensätze bleiben rein qualitativ
(ja/teilweise/nein). Das war Absicht: Ein Mindestabstand zum Ofen ist eine
Brandschutzgröße aus der Aufstellanleitung des Geräts, keine Effizienzgröße, die
sich mitteln lässt – der Befundtext verweist deshalb auf die Anleitung und den
Schornsteinfeger, statt eine Zahl zu nennen, für die hier keine geprüfte Quelle
vorliegt. Es entsteht also kein `ThresholdOrigin: 'pending'`.

**Gespeicherte Ergebnisse.** `details.transfer` trägt die Bauart als Zahlcode;
Altergebnisse kennen nur `underfloor: 0|1`. `decodeTransfer` liest beide Formate
– die Konvention „Gespeicherte Messergebnisse bleiben lesbar".

**Beim Bauen aufgefallen und mitkorrigiert:** Zwei Texte nannten weiter „rund
10 cm Luft vor dem Heizkörper", obwohl der Richtwert im September auf 30 cm
angehoben wurde (Verbraucherzentrale, siehe `DISTANCE_TARGET_CM`). Die App
rechnete mit 30 und schrieb 10.

Abnahme: `tsc -b`, 969 Tests (20 neue), ESLint, Build grün; im Browser
durchgespielt – fünf Antworten je Raum, Wohnzimmer auf Infrarot und Keller auf
unbeheizt gesetzt, der Keller steht in der Raumauswahl des Checks nicht mehr,
das Wohnzimmer zeigt die Infrarot-Fragen und das Ergebnis die
Infrarot-Befunde.
### 30. Räume-Kachel fächert sich vertikal auf
**Kategorie:** Problem · **Bereich:** `Step3Rooms`, `RoomTypePicker`
**Status:** ✅ Umgesetzt (05.09.).

Kilians Befund direkt nach #28/#29: „Kann man das auch anders lösen, dass sich
das nicht so extrem hoch vertikal auffächert? Ich finde das nicht hübsch."

**Bestätigt – gemessen 780 px für zwei Räume.** Zwei Ursachen, die sich
multipliziert haben: Die Kachel ist eine von zwei Rasterspalten und innen nur
rund 127 px breit, also muss alles untereinander. Und die Wärmeübergabe aus #29
belegt fünf Zeilen – **je Raum**. Dazu kam, dass die Nachbarspalte leer blieb,
während die gewählte Kachel in die Höhe wuchs.

**Umgesetzt: gewählte Kachel über beide Spalten, Wärmeübergabe einklappbar.**

- `RoomTypePicker` bekommt `expandSelected`: Eine gewählte Kachel läuft über
  beide Spalten. Damit stehen rund 340 px statt 127 zur Verfügung – Name,
  Fläche und Löschen passen in **eine** Zeile, und die leere Nachbarspalte ist
  weg. Im Check (`RoomCreateSheet`) bleibt das Flag aus: Dort steht unter der
  Kachel nur eine Hinweiszeile, die keine Breite braucht.
- Die Wärmeübergabe ist eine Zeile, die den gewählten Wert nennt und zum Ändern
  aufklappt. **Solange sie unbeantwortet ist, steht sie offen** – sie ist eine
  Pflichtangabe, und eine zugeklappte Zeile sähe aus, als sei schon etwas
  beantwortet. Aufgeklappt stehen die fünf Antworten als Chips nebeneinander mit
  Umbruch: zwei Reihen statt fünf.

**Was das bringt** (gemessen im Browser, 430 px breit):

| Zustand | vorher | nachher |
|---|---:|---:|
| ein Raum, beantwortet | ~390 px | **155 px** |
| zwei Räume, beide offen | ~780 px | **315 px** |
| zwei Räume, beide beantwortet | ~780 px | **246 px** |

Die Höhe wächst jetzt nur noch dort, wo eine Entscheidung aussteht.

### 31. Ziel-Seite: Kartenstapel statt Auswahlliste
**Kategorie:** Problem · **Bereich:** `StepGoals`, de/en
**Status:** ✅ Umgesetzt (05.09.).

Kilians Befund an der neuen Ziel-Seite: „Hier finde ich das UI nicht schön,
sieht ziemlich gevibecoded aus."

**Bestätigt, und die Ursache ist benennbar: ein kopierter Zuschnitt.** Die
Zielkarten stammten von der Modus-Auswahl (`Step0Mode`) – dort sind es **zwei**
Karten für **eine** Entscheidung ganz am Anfang, da trägt das Gewicht. Fünfmal
für eine *Mehrfach*auswahl kopiert kippte es in vier Punkten:

1. **Nur dreieinhalb von fünf Optionen passten auf den Bildschirm** – auf einer
   Seite, deren einzige Aufgabe das Vergleichen ist.
2. **Die Zeile „Danach startest du hier" lag unter dem Fold.** Genau die
   Wirkung, wegen der die Seite gebaut wurde (#27), bekam niemand zu sehen.
3. **Der Kreis rechts sagte „nur eine Wahl".** Kreis ist die Radio-Konvention;
   hier sind mehrere möglich. Der Hinweis darauf stand als letzter Halbsatz
   eines dreizeiligen Fließtexts.
4. **Alles gleich laut** – Titel fett, Beschreibung fast so groß, jede Karte
   mit eigenem Schlagschatten. Fünf gleichwertige Blöcke ergeben keine
   Rangfolge, sondern einen Stapel.

**Umgesetzt: kompakte Zeilenliste.**

- Eine Gruppe mit Trennlinien statt fünf schwebender Karten.
- Je Zeile Symbol, Titel und **eine** Zeile Wirkung – klein und gedämpft.
- Haken im abgerundeten **Quadrat** statt im Kreis, plus leichter Primary-Ton
  auf der ganzen Zeile.
- „Mehrfachauswahl möglich" als eigenes Label über der Liste.
- Untertitel auf einen Satz gekürzt; die Beschreibungen so gekürzt, dass sie
  den Titel **nicht wiederholen** („Zählerstände verfolgen" / „Verlauf über
  Monate sehen" statt „Zählerstände ablesen und den Verlauf über Monate
  sehen").

**Ergebnis** (gemessen bei 430 × 932, dem Format aus Kilians Screenshot): Die
Ziel-Zeile endet bei 617 px, die Seite ist **nicht mehr scrollbar** – alle fünf
Optionen und die Landung stehen gleichzeitig im Blick.

### 32. PV-Frage: Antwort „Geplant" entfernt
**Kategorie:** Verbesserung · **Bereich:** `Step4Heating`, `types`, `buildTips`,
`onboardingStore`, `fieldUsage`, de/en
**Status:** ✅ Umgesetzt (05.09.).

Kilians Wunsch: „Das ‚geplant' bei der Photovoltaik bitte entfernen."

**Was daran hing.** `'planned'` hatte genau **einen** funktionalen Abnehmer: den
Tipp `pv_planned_base_load` („vor der Auslegung die eigene Grundlast messen").
Den Erzeugungszähler im Monitoring schaltete der Wert nie frei – das tut allein
`'yes'` (`energyConfig.ts`). Mit der Antwort ist deshalb auch der Tipp entfallen;
er wäre sonst toter Code gewesen, den keine Antwort mehr auslösen kann.

**Bestandsprofile werden migriert, nicht liegengelassen.** Anders als bei den
früher entfernten Fragen (Kamin, Gebäudeteil) verschwindet hier nicht die ganze
Frage, sondern nur eine ihrer Antworten – die Frage steht weiter auf der Seite.
Ein Profil mit `'planned'` hätte deshalb eine Frage gezeigt, bei der **nichts
ausgewählt** ist, obwohl `sections.ts` sie als beantwortet zählt.
`migrateOnboardingData` zieht den Wert auf `'no'`: „geplant" heißt sachlich,
dass noch keine Anlage steht. Ein Test hält das fest
(`tests/unit/pvMigration.test.ts`).

**Was dadurch verlorengeht** – bewusst benannt: Wer eine Anlage plant, bekommt
den Rat, vorher die Grundlast zu messen, nicht mehr. Das war der einzige Ort,
an dem die App vor einer Anschaffung zu einer Messung riet. Soll dieser Rat an
anderer Stelle wieder auftauchen (z. B. im Grundlast-Check selbst), wäre das
eine eigene Änderung.


### 33. Tipp „Warmwasser aus dem eigenen Gerät" wirkt fehl am Platz
**Kategorie:** Verbesserung · **Bereich:** `buildTips`, `fieldUsage`, de/en,
`tests/unit/buildTips.test.ts`
**Status:** ✅ Umgesetzt (05.09.) – Tipp entfernt.

Kilians Befund aus dem Live-Test: „Entferne bitte diesen Tipp, der ist komisch."
Auf dem Empfehlungs-Board stand er als **einzige** offene Maßnahme („0 von 1").

**Warum er komisch wirkt.** Er ist der einzige Tipp, der ohne jede Messung
entsteht – allein aus einer Fragebogen-Antwort. Alle anderen Empfehlungen
berichten über etwas, das der Nutzer selbst erhoben hat; dieser erzählt
stattdessen einen Preisvergleich („zweieinhalbmal so teuer wie Gas"), aus dem
für ihn nichts folgt außer: miss den Duschkopf. Diesen Weg zeigt der
Messungen-Bereich ohnehin. Dazu kam die Kulisse: Ein frisches Profil bekam
dadurch ein Board mit genau einer Maßnahme, die keine ist – ein
Fortschrittsbalken „0 von 1" über einem Absatz Text.

**Was bleibt.** Die Warmwasser-Angabe verliert nichts von ihrer eigentlichen
Wirkung: Der Duschkopf-Check rechnet weiter je Quelle mit einem anderen
€/kWh-Preis und nennt die Herkunft seiner Vorbelegung. `fieldUsage` führt
`hotWaterType` deshalb nur noch unter `measurements`.

> **Nachtrag (05.09., aus #36):** Dieser Absatz gilt nicht mehr. Wenige Stunden
> später ist auch die Vorbelegung im Duschkopf-Check entfallen – der Check
> rechnet keinen €-Betrag mehr, sondern einen Prozentsatz, in dem sich der
> Preis herauskürzt. `hotWaterType` steht seither nur noch im PDF-Steckbrief.
> Zusammen mit diesem Punkt hat die Frage damit **beide** Abnehmer verloren.

**Nebenbefund im Test.** `hot_water_electric` war der einzige Tipp, den die
Profil-Fälle des Tests „beschriftet jeden Tipp, der irgendwohin führt"
erzeugten – seine Kanarienvogel-Zeile (`geprueft > 0`) schlug beim Entfernen
sofort an, wie vorgesehen. Die Fälle tragen jetzt zusätzlich Messergebnisse,
denn alle verbliebenen verlinkten Tipps hängen an Messungen, nicht am
Fragebogen.

### 34. Standard-Wasserpreis auf 2,40 €/m³
**Kategorie:** Verbesserung · **Bereich:** `priceConfig`,
`tests/unit/monitoringReport.test.ts`
**Status:** ✅ Umgesetzt (05.09.) – Kilians Vorgabe.

Der Standardwert im Schritt „Preise & Kosten" stand auf 4,50 €/m³ und liegt
jetzt bei **2,40 €/m³**. Der Wert steht an genau einer Stelle
(`PRICE_META.water.defaultWork` in `priceConfig.ts`) und wirkt dadurch überall
zugleich: Monitoring-Kosten, Bericht, Duschkopf-Check und
Warmwasser-Wartezeit.

**Was der Wert abbildet.** 2,40 €/m³ ist der Frischwasserpreis. Die
Abwassergebühr – in vielen Gemeinden noch einmal ähnlich hoch – steckt nicht
darin. Für die Ersparnis beim Duschen wäre die Summe beider Posten die
passendere Größe, weil warmes Wasser, das man nicht verbraucht, auch nicht
abgeleitet wird; die App rechnet mit dem eingetragenen Preis – wer beides
zusammenrechnen will, trägt die Summe in das Feld ein. Genau dafür ist es da.

**Nebenbefund im Test.** `monitoringReport.test.ts` hatte den alten Wert als
Zahl im Erwartungswert stehen (1642,50 €) und wurde rot. Der Test liest den
Standard jetzt aus `PRICE_META`: Geprüft wird, **dass** der Standard greift,
nicht wie hoch er gerade ist – die nächste Preisänderung macht ihn nicht mehr
rot.


### 35. Modus-Wahl: zwei Aufzählungen, die nicht stimmten
**Kategorie:** Bug (Text) · **Bereich:** `de/en` (`onboarding.step0`),
`tests/unit/sections.test.ts`
**Status:** ✅ Umgesetzt (05.09.) – Aufzählungen neu geschrieben.

Kilians Frage zum Bildschirm „Los geht's": „Stimmt das, was hier so steht?"
Geprüft gegen `sections.ts` – drei Befunde.

**(a) Falsch: „Tarife für die €-Ersparnis" als Vorteil von „Vollständig".** Der
Schritt „Preise & Kosten" steht auf `quick: true` (`sections.ts`), ist also in
**beiden** Wegen drin. Das Bullet nannte als Unterschied etwas, das keiner ist.
Der echte Unterschied sind genau drei Schritte: Räume, Geräte und die
Messgeräte-Übersicht.

**(b) Meist nicht eingelöst: „Erste Spartipps" im Schnellstart.** Nachgerechnet,
welche Tipps ein Schnellstart-Profil ohne jede Messung bekommt: bei einer
Gasheizung ohne eingetragenes Baujahr und ohne PV **keinen einzigen**. Nur ein
Kessel ab 20 Jahren (`old_boiler`) oder eine vorhandene PV-Anlage
(`pv_self_consumption`) lösen etwas aus. Das ist strukturell richtig –
Empfehlungen entstehen aus Messungen, nicht aus dem Fragebogen –, nur versprach
der Bildschirm etwas anderes. Der am selben Tag entfernte Warmwasser-Tipp
(#33) hat einen weiteren Fall wegfallen lassen.

**(c) Fehlte: das Ziel.** „Dein Ziel" ist seit dem 05.09. Schritt 2 in beiden
Wegen und entscheidet sichtbar, wo der Fragebogen endet (`goals.ts`) – in den
Aufzählungen kam es nicht vor.

**Neu:**

| | bisher | jetzt |
|---|---|---|
| Schnellstart | Wohnfläche & Personen · Heizungsart · Erste Spartipps | Wohnfläche, Personen & Baujahr · Dein Ziel · Heizung, Warmwasser & Tarife |
| Vollständig | Alles aus dem Schnellstart · Räume & Geräte · Tarife für die €-Ersparnis | Alles aus dem Schnellstart · Räume & Wärmeübergabe · Geräte, die Messungen freischalten |

Jede Zeile nennt jetzt etwas, das der jeweilige Weg tatsächlich tut, und der
Unterschied ist der echte. Ein Test in `sections.test.ts` hält die Aufteilung
fest („unterscheidet die beiden Wege in genau drei Schritten"): Wer einen
Schritt umhängt, wird daran erinnert, die Texte mitzuändern – genau der Fehler,
der hier aufgefallen ist.

**Nicht geändert, bewusst:**

- **Zeitangabe „8–10 Min"** für den vollständigen Weg ist optimistisch: Der
  Räume-Schritt allein verlangt Raumtypen wählen, Instanzen benennen und je
  Instanz die Wärmeübergabe. Bei sechs Räumen ist man damit nah an zehn
  Minuten, bevor die Geräte kommen.
- **„Du kannst den Modus wechseln"** stimmt nur *während* des Fragebogens
  (Zurück auf Schritt 1 führt zur Modus-Wahl). Danach öffnet „Bearbeiten" den
  Profil-Hub, nicht die Modus-Wahl. Der zweite Halbsatz stimmt ganz: Der Hub
  zeigt alle acht Abschnitte, auch die übersprungenen.


### 36. Duschkopf-Test fragt das Warmwasser ein zweites Mal
**Kategorie:** Problem (Bedienung/Logik) · **Bereich:**
`showerhead/ShowerheadRun.tsx`, `showerhead/hotWaterEnergy.ts`,
`hot_water_wait/HotWaterWaitRun.tsx` (Vorbild)
**Status:** ✅ Umgesetzt (05.09.) – **weitergehend als vorgeschlagen.** Kilians
Entscheidung: „Macht das hier überhaupt so wirklich Sinn, den
Warmwassererzeuger anzugeben? Ich finde, man kann das weglassen und dann im
Ergebnis einfach prozentuale Angaben machen." Die Frage ist damit nicht zur
Auskunft geworden, sondern ganz entfallen – siehe „Was daraus wurde".

Kilians Beobachtung: „Ich finde es komisch, hier nochmal das ‚Warmwasser über‘
auszuwählen? Das hat man doch bereits im Onboarding gemacht."

**Befund bestätigt – und es sind sogar zwei verschiedene Fragen.** Der
Fragebogen fragt nach dem *Verhältnis* zur Heizung (`HotWaterType`:
„wie Heizung", „eigenes Gerät", „separates System", „nicht bekannt"), der Check
fragt nach dem *Energieträger* („Strom / Durchlauferhitzer", „Gas",
„Wärmepumpe", „Öl", „Pellets"). Zwei Vokabulare für eine Tatsache. Der Nutzer
erlebt das als dieselbe Frage – und hat recht damit, denn die Übersetzung
zwischen beiden existiert bereits: `defaultHotWaterSource()` verknüpft
`hotWaterType` mit den Wärmeerzeugern und liefert genau den Träger, den die
Chips zur Wahl stellen. Die App **weiß die Antwort schon** und fragt trotzdem.

**Warum die Auswahl überhaupt dasteht.** Sie tut genau eine Sache: Sie setzt
`eurPerKwhHeat()` und damit den €-Betrag im Ergebnis. Auf die eigentliche
Messung – Liter je Minute – hat sie **keinen Einfluss**. Sie ist ein
Auswertungs-Parameter, kein Mess-Schritt.

**Genau dieser Fall ist im Nachbar-Check schon entschieden.** Die
Warmwasser-Wartezeit braucht den Wasserpreis für dieselbe Art Rechnung und
stellt ihn nicht als Frage voran, sondern als schmale Zeile unter den
Auswerten-Knopf, mit Stiftsymbol und Modal. Der Kommentar dort sagt die Regel:
„Der Wasserpreis gehoert zur Auswertung, nicht in den Messablauf."
(`HotWaterWaitRun.tsx`). Der Duschkopf-Test macht mit seinem Parameter das
Gegenteil – fünf große Chips oberhalb der Stoppuhr.

**Vorschlag: aus der Frage eine Auskunft mit Korrekturmöglichkeit machen.**
Statt der Chip-Reihe eine Zeile im selben Muster wie der Wasserpreis:

> Warmwasser über **Gas** · laut deinem Profil ✏️

Tippen öffnet die fünf Träger. Damit verschwindet die Doppelfrage, die Angabe
aus dem Fragebogen wird zum ersten Mal *sichtbar* wirksam statt nur
vorausgewählt, und wer eine Gastherme fürs Bad und einen Durchlauferhitzer für
die Küche hat, kann weiterhin korrigieren.

**Nebenbefund (a): der erklärende Satz erscheint oft gar nicht.** Der Text
„Vorbelegt aus deinem Profil …" hängt an `hotWaterSourceFromProfile()`. Auf
Kilians Screenshot fehlt er – die Funktion hat also `false` geliefert. Das
passiert bei „nicht bekannt" und bei jedem Erzeuger ohne Zuordnung. Ohne den
Satz sieht die Auswahl aus wie eine Frage, die niemand gestellt hat.

**Nebenbefund (b): `electric_direct` fehlt in der Zuordnung.** `GEN_TO_SOURCE`
kennt `gas_boiler`, `oil_boiler`, `pellets`, `heat_pump` – nicht aber
`electric_direct`, den mit #29 (05.09.) neu eingeführten Erzeuger
(Infrarotplatten, Konvektoren, Nachtspeicher). Wer nur damit heizt, landet über
den Rückfall zwar bei „elektrisch" – also zufällig richtig –, aber
`hotWaterSourceFromProfile()` sagt „nicht aus dem Profil" und unterdrückt den
Hinweis. Eine Zeile in der Tabelle behebt das. Auch `solar_thermal` und
`wood_stove` sind nicht zugeordnet; dort ist der Rückfall auf Strom aber
inhaltlich fragwürdig (Solarthermie *ist* meist Warmwasser) – siehe „Offene
Fragen".

**Nebenbefund (c): die Reihenfolge der Erzeuger entscheidet.**
`defaultHotWaterSource()` nimmt den **ersten** zugeordneten Erzeuger aus der
Liste. Bei „Wärmepumpe + Gaskessel" hängt das Ergebnis daran, in welcher
Reihenfolge die Häkchen im Fragebogen stehen – nicht daran, was das Warmwasser
tatsächlich macht.

---

### Was daraus wurde

Kilians Einwand war der stärkere. Die vorgeschlagene Auskunft-Zeile hätte die
Frage höflicher gestellt – nötig war sie trotzdem nicht, denn **der Euro-Betrag
selbst musste gehen.**

**Die Rechnung, die das entscheidet.** Kosten und Wassermenge sind beide linear
im Durchfluss. Im Verhältnis kürzt sich deshalb jeder Faktor weg, der für beide
Durchflüsse derselbe ist:

    Ersparnis / Kosten = (Durchfluss − 8) / Durchfluss

Personenzahl, Duschhäufigkeit, Duschdauer, Temperaturhub **und der Arbeitspreis
der Warmwasserquelle** stehen in Zähler und Nenner gleich. Der Prozentsatz ist
damit die einzige Kennzahl des Checks, in der nichts steckt, was nicht gemessen
wurde – die Frage nach der Quelle konnte am Ergebnis also nie etwas ändern. Ein
Test hält die Eigenschaft fest: dieselbe Messung bei einem Ein- und einem
Fünf-Personen-Haushalt ergibt denselben Prozentsatz.

**Der Euro-Betrag war ohnehin die letzte seiner Art.** Weil der Check seine
Details mit `savingEstimated: 1` markiert, zeigten ihn Empfehlungen,
Wirkungs-Summe und PDF-Bericht längst nicht mehr (`isMeasuredSaving`). Nur der
Ergebnis-Schirm griff über `displaySavingEur` direkt auf den Rohwert zu und
lief damit an der eigenen Regel der App vorbei. Die Anzeige ist also nicht
ärmer geworden, sondern erstmals einheitlich.

**Was jetzt im Ergebnis steht** (nachgefahren an der Demo-Wohnung, 14,3 L/min):

> Ein Sparduschkopf mit 8 L/min braucht **44 % weniger** – an Wasser und an der
> Energie, die es erwärmt.
> *Hochgerechnet auf deinen Haushalt sind das rund 22.995 Liter im Jahr.*

Der Prozentsatz führt, die Jahresmenge steht dahinter – sie ist die einzige
Zahl, die noch über Duschhäufigkeit und -dauer läuft.

**Was mitging:**

- Die Auswahl im Mess-Schritt, `hotWaterEnergy.ts` und sein Test liegen unter
  `archiv/duschkopf-warmwasserquelle/` (mit README).
- `yearlyCost` und `yearlySaving` sind aus `calcShowerhead` entfallen, dafür
  `savingPct`. Die drei Konstanten der Energierechnung (ΔT, Kaltwassertemperatur,
  Wh je Liter und Kelvin) trugen allein die Kosten und sind mit ihnen weg.
- `yieldsSaving` ist im Katalog gestrichen – derselbe Riegel wie beim
  LED-Check: Ein vor dem Umbau gespeichertes `yearlySaving` käme sonst über
  `resultSavingsEur` in Wirkungs-Summe und Bericht zurück.
- Der Duschkopf-Tipp hängt jetzt am **gemessenen Durchfluss** statt an einem
  Euro-Betrag; sonst wäre er mit dem Betrag verschwunden. Ein Test deckt beide
  Fälle ab (neues Ergebnis und Altergebnis).
- Ergebnisse von vor dem Umbau tragen kein `savingPct`. Der Ergebnis-Schirm
  rechnet es aus dem gespeicherten Durchfluss nach, statt sie mit „0 %"
  abzuspeisen – gespeicherte Ergebnisse werden nie migriert.

**Die Nebenbefunde (a) bis (c) haben sich erledigt** – sie betrafen alle die
Vorbelegung, die es nicht mehr gibt.

**Was offen bleibt:** `hotWaterType` – die Warmwasser-Frage im Fragebogen –
verliert damit ihren einzigen funktionalen Abnehmer und steht nur noch im
Steckbrief des Berichts. Das ist dieselbe Lage, die bei Kamin/Ofen (#19),
Smart-Home (#22), Gebäudeteil (#26) und Postleitzahl (#24) zur Streichung der
Frage geführt hat. `fieldUsage.ts` sagt das jetzt so; die Entscheidung über die
Frage selbst steht bei Kilian – siehe „Offene Fragen".

### 37. Duschkopf-Test, Reiter „Messen": drei Karten, nur eine misst
**Kategorie:** Verbesserung (Gestaltung) · **Bereich:**
`showerhead/ShowerheadRun.tsx`, `components/ui/Stepper.tsx`
**Status:** ✅ Umgesetzt (05.09.) – in der vorgeschlagenen Reihenfolge, auf
Kilians „Den Rest gerne so umsetzen wie du gesagt hast".

Kilians Eindruck: „Ich finde diese Seite sieht sehr gevibecoded aus."

**Der Eindruck hat konkrete Ursachen.** Nachgesehen, was auf dem Bildschirm
konkurriert – und woran der Nachbar-Check es besser macht:

**(a) Die Reihenfolge steht auf dem Kopf.** Ganz oben steht die Füllmenge, ein
Wert, der praktisch nie verändert wird („Standard 5 L") und trotzdem fünf
Bedienelemente bekommt. Darunter der Auswertungs-Parameter aus #36. Das
eigentliche Messgerät – die Stoppuhr – steht als drittes, auf dem Handy am
Rand des sichtbaren Bereichs. Der Nutzer steht mit dem Eimer unter der Dusche
und muss an zwei Karten vorbeiscrollen, bevor er „Start" sieht.

**(b) Drei verschiedene Beschriftungs-Konventionen auf einem Bildschirm.**
„Füllmenge" und „Warmwasser über" stehen *in* ihren Karten, „Stoppuhr" steht
als graue Überschrift *über* einer Karte, „Manuell (s)" steht wieder *in* einer.
Nichts davon ist falsch; zusammen wirkt es zusammengesetzt statt gebaut.

**(c) Stoppuhr und manuelle Eingabe stehen gleichzeitig da** und stellen
dieselbe Frage zweimal. Der Wartezeit-Check zeigt die manuelle Korrektur erst,
wenn die Stoppuhr gelaufen ist (`seconds > 0`) – dort ist sie eine Korrektur,
hier eine zweite Bedienweise ohne Vorrang. Dazu die technische Beschriftung
„Manuell (s)" mit der Einheit in Klammern, dem Platzhalter „z. B. 30" *im* Feld
und einem zweiten „s" *neben* dem Feld.

**(d) Der Auswerten-Knopf steht ausgegraut am Fuß**, ohne zu sagen, was fehlt.
Auch das ist im Wartezeit-Check bereits gelöst: Dort steht statt der toten
Schaltfläche ein Satz, der den nächsten Schritt nennt – mit ausdrücklicher
Begründung im Code.

**(e) Der Füllmengen-Regler ist handgebaut und kann deshalb weniger als der
gemeinsame.** Vier Knöpfe in zwei Breiten (`w-10` für ±1, `w-12` für ±0,1) –
daher die unruhige Zeile. Vor allem aber: Es sind einfache `onClick`-Knöpfe.
Das Halten-und-Weiterzählen aus **#7** steckt in `components/ui/Stepper.tsx`
und wirkt hier **nicht**. Wer von 5,0 auf 8,0 will, tippt dreimal – wer auf
6,5 will, fünfmal.

**Vorschlag – ein Bildschirm, der der Reihenfolge des Tuns folgt:**

1. **Stoppuhr nach oben**, als einzige große Karte. Sie ist das Gerät.
2. **Füllmenge darunter**, kompakt: gemeinsamer `Stepper` mit `step={0.1}`.
   Durch das beschleunigte Halten ersetzt ein Knopfpaar die vier von heute.
3. **Manuelle Sekunden** in die Stoppuhr-Karte, sichtbar erst nach dem Stoppen
   – wie beim Wartezeit-Check, und beschriftet als das, was sie ist
   („Zeit korrigieren").
4. **Warmwasser-Quelle** als schmale Zeile unter den Auswerten-Knopf (#36).
5. **Statt ausgegrautem Knopf** der Hinweis, was noch fehlt.

Damit hat der Bildschirm eine Karte für die Messung, eine kleine für den
Parameter und zwei Zeilen für die Auswertung – statt dreier gleich schwerer
Karten in beliebiger Ordnung.

**Nebenbefund: der gemeinsame `Stepper` zeigt seinen Wert doppelt.** Er
rendert zwischen „−" und „+" selbst den rohen Wert. Kühlschrank, Raumklima und
Möbelabstand stellen ihn aber neben eine große, formatierte Anzeige – der Wert
steht dort also zweimal, einmal unformatiert („5") und einmal formatiert
(„5,0 °C"). Vermutlich der Grund, warum der Duschkopf-Test sich seinen eigenen
Regler gebaut hat. *Aus dem Code gelesen, nicht am Gerät nachgeprüft.*

---

### Was daraus wurde

Umgesetzt wie vorgeschlagen. Der Reiter „Messen" hat jetzt **eine** große Karte
– die Stoppuhr, mit einem Satz darüber, was zu tun ist – und darunter eine
schmale Zeile für die Füllmenge. Die manuelle Zeiteingabe erscheint erst nach
dem Stoppen, beschriftet als „Zeit korrigieren"; statt des ausgegrauten Knopfes
steht der Satz, was noch fehlt. Am Gerät nachgefahren (Demo-Wohnung,
430 × 932 px): „Start" steht ohne Scrollen im Bild.

Der `Stepper` hat die Option `showValue` bekommen. Damit fällt der handgebaute
Regler weg – die Füllmenge läuft über den gemeinsamen und kann seither
erstmals das beschleunigte Halten aus #7. Dazu rundet der `Stepper` jetzt auf
die Nachkommastellen seiner Schrittweite: Bei `step = 0,1` lieferte
fortgesetztes Addieren sonst 5,199999999999999 statt 5,2 – sichtbar, sobald
eine Karte den Wert mit einer Nachkommastelle formatiert.

**Nicht angefasst, bewusst:** die doppelte Wertanzeige in Kühlschrank,
Raumklima und Möbelabstand. Die Option, die sie behebt, ist jetzt da; sie dort
zu setzen ist eine eigene Änderung an drei Checks, die niemand gemeldet hat –
siehe „Offene Fragen".

---

## Durchsicht des Empfehlungs-Katalogs (06.09.2026)

> Andere Herkunft als die Punkte davor: nicht aus einem Live-Test, sondern aus
> Kilians Frage „Machen die Empfehlungen alle Sinn? Ist das schlüssig und
> vertretbar?". Geprüft wurden alle 19 Tipp-Texte (`tips.items.*` in beiden
> Sprachen), ihre Auslösebedingungen in `buildTips.ts` und die Rechenwege
> dahinter. **Kein Tipp ist fachlich falsch** – die Euro-Disziplin
> (`isMeasuredSaving` + `MIN_DISPLAY_EUR`), der Raum- und Gerätebezug und die
> offen markierten `pending`-Schwellen sind strenger als üblich. Die folgenden
> Punkte sind Widersprüche zur eigenen Messung, fehlende Vorbehalte und zwei
> Textfehler. Alles nur gesammelt, nichts geändert.

### 38. Feuchte-Tipps ignorieren das raumtypabhängige Band
**Kategorie:** Bug · **Bereich:** `buildTips.ts:156-157`, `roomClimate.ts`
**Status:** ⚠️ Teil (a) umgesetzt (06.09.) – der Tipp liest jetzt `humMin`/
`humMax` aus dem Ergebnis (`humidityBandOf()`, dasselbe Muster wie `bandOf`),
mit Rückfall auf den Wohnraum-Wert für Altergebnisse. Vier Tests halten beide
Richtungen fest. Teil (b), der Lüftungsrat für Keller, bleibt offen – siehe
„Offene Fragen".

`HUMID_MAX = 60` und `HUMID_MIN = 40` stehen als feste Zahlen in `buildTips.ts`.
Der Raumklima-Check kennt aber raumtypabhängige Bänder (`HUMIDITY_BANDS`: Keller
und Waschküche 50–65 %) und **speichert das angewandte Band als `humMin`/`humMax`
im Ergebnis** – `RoomTemperatureRun.tsx` begründet das ausdrücklich damit, dass
eine nachgelagerte Ansicht „einen Keller sonst nicht als Keller bewerten" könne.
`buildTips` liest die beiden Felder nicht.

Folge, in beide Richtungen:

- **Keller mit 62 % rF:** Der Check bewertet ihn als unauffällig, der Tipp sagt
  „62 % Luftfeuchte – zu hoch". Ergebnis-Seite und Empfehlung widersprechen sich.
- **Keller mit 45 % rF:** Der Check sagt „zu trocken" (Bandgrenze 50), der Tipp
  schweigt (Grenze 40). Ein Befund ohne Empfehlung.

Das ist derselbe Fehler, den derselbe Code drei Zeilen darüber bei der
Temperatur ausdrücklich vermeidet: „Das Komfortband ist raumtypabhängig und
steckt im Ergebnis (bandMin/bandMax) – feste Werte hier hätten z. B. ein
Schlafzimmer bei 17 °C fälschlich als ‚zu kalt' gemeldet."

**(b) Der Lüftungsrat ist für Keller sachlich verkehrt.** `humidity_high` sagt
„Lüfte zwei- bis dreimal am Tag für 5 Minuten mit weit offenem Fenster". Für
Wohnräume im Winter richtig. Im Keller im Sommer ist es der klassische Fehler:
Warme Außenluft kondensiert an kalten Kellerwänden, Lüften **erhöht** die
Feuchte. Der Text ist raumtyp-blind formuliert – obwohl die App für genau diesen
Fall bereits eine Taupunktrechnung besitzt (`dewPoint.ts`, aus der
Kellerklima-Bewertung).

**Zu klären beim Beheben:** (a) ist mechanisch – `humMin`/`humMax` aus den
Details lesen, mit Rückfall auf `DEFAULT_HUMIDITY_BAND` für Altergebnisse,
analog zu `bandOf()`. (b) braucht eine Entscheidung: eigener Textbaustein für
Keller/Waschküche (Lüften in den kühlen Stunden, im Sommer eher nicht) oder ein
Verweis auf den Taupunkt statt eines Prozentwerts.

### 39. Raumtemperatur-Tipp: Grad und Prozent können aus verschiedenen Räumen stammen
**Kategorie:** Bug · **Bereich:** `buildTips.ts:640` vs. `645-647`
**Status:** ✅ Umgesetzt (06.09.) – der Raum mit dem größten `savingPercent`
trägt den Tipp, und Raumname, Grad und Prozent stammen seither aus **einem**
Ergebnis. Bewusst dieser Raum und nicht der absolut wärmste: Der Tipp will zum
Handeln bewegen, also zeigt er dorthin, wo am meisten zu holen ist.

Der Tipp bildet zwei **unabhängige** Extrema über dieselbe Raummenge:
`warmest` ist das Maximum der Temperatur, `warmPercent` das Maximum von
`savingPercent`. Weil das Komfortband je Raumtyp verschieden ist, sind das nicht
zwingend dieselben Räume:

| Raum | gemessen | Band max | ΔT |
|---|---|---|---|
| Wohnzimmer | 24 °C | 22 °C | 2 K |
| Schlafzimmer | 21 °C | 18 °C | 3 K |

Der Tipp nennt dann „Wohnzimmer hat 24 °C" und trägt daneben die Prozentzahl des
Schlafzimmers.

Es ist exakt der Fehlertyp, der beim Warmwasser-Tipp bereits behoben und mit
einem Test festgehalten wurde (`buildTips.test.ts:170`, „nimmt Wartezeit und
Menge des Warmwasser-Tipps aus derselben Entnahmestelle"). Der Kommentar dort
beschreibt die Wirkung wörtlich: „Zahlen, die zusammen nie gemessen wurden."

**Zu klären beim Beheben:** Naheliegend ist, den Raum über `savingPercent` zu
wählen statt über die absolute Temperatur – das ist der Raum mit dem größten
Hebel, und der Tipp will zum Handeln bewegen. Dann stimmen Raumname, Temperatur
und Prozentwert wieder aus einer Quelle.

### 40. Kühlschrank-Tipp rät genau an die Grenze zum Gegentipp
**Kategorie:** Bug · **Bereich:** `tips.items.fridge`, `buildTips.ts:160-161`
**Status:** ✅ Umgesetzt (06.09.) – der Text nennt jetzt „5 bis 7 °C" statt
„7 °C reichen", in beiden Sprachen. `REFERENCE_TEMP` in `fridge.ts` bleibt bei
7: Eine Änderung dort verschöbe die ausgewiesene Ersparnis und ließe
gespeicherte Ergebnisse mit dem alten Prozentwert stehen – das ist eine eigene
Entscheidung, keine Textkorrektur.

„Dreh den Regler eine Stufe zurück – **7 °C reichen**" rät auf exakt den Wert,
ab dem der gegenteilige Tipp greift: `FRIDGE_WARM_C = 7`, und `fridge_warm` sagt
dann „{{temp}} °C ist **zu warm für sichere Lagerung**". Wer dem ersten Tipp
folgt und bei 7,3 °C landet, bekommt beim nächsten Messen die umgekehrte
Empfehlung.

Der zweite Tipp nennt selbst das richtige Ziel: „bis du bei 5–7 °C liegst". Der
erste sollte dieselbe Spanne nennen (oder deren Mitte), statt der Obergrenze.
Hinzu kommt, dass 7 °C auch lebensmittelhygienisch der obere Rand ist – aktiv
dorthin zu raten ist die unglücklichste Wahl innerhalb des eigenen guten Bandes.

Die Rechnung selbst ist konsistent: `REFERENCE_TEMP = 7` in `fridge.ts`, und der
Tipp löst bei `< GOOD_MIN` aus. Es geht allein um den Zielwert im Text – und
darum, dass `savingPct` bei einem Ziel von 6 °C entsprechend kleiner ausfiele.

**Zu klären beim Beheben:** Ob nur der Text auf „5–7 °C" umgestellt wird oder
auch `REFERENCE_TEMP` auf die Bandmitte rutscht. Das zweite ändert die
ausgewiesene Ersparnis und damit gespeicherte Ergebnisse – die bleiben lesbar,
zeigen aber weiter den alten Prozentwert.

### 41. Englische Kühlschrank-Titel sagen das Gegenteil ihres eigenen Textes
**Kategorie:** Bug · **Bereich:** `en.json`, `tips.items.fridge` / `fridge_warm`
**Status:** ✅ Umgesetzt (06.09.) – „Set the fridge warmer" / „Set the fridge
colder" sagen jetzt dasselbe wie ihr Fließtext; der Tippfehler ist mit weg.

| Schlüssel | Titel (EN) | Text (EN) |
|---|---|---|
| `fridge` | „Turn the fridge **up**" | „Turn the dial **down** one notch" |
| `fridge_warm` | „Turn the fridge **down**" | „Turn the dial **up** one notch" |

„Turn the fridge up" liest sich im Englischen als *kälter stellen* – der Titel
sagt also das Gegenteil dessen, was zwei Zeilen darunter steht, und beide Tipps
sind gleichermaßen betroffen. Die deutschen Titel („wärmer stellen" / „kälter
stellen") sind eindeutig.

Dazu ein sichtbarer Tippfehler im selben Eintrag: „7 °C is plenty,
and**each** degree warmer" – das Leerzeichen fehlt.

Der übrige Abgleich beider Sprachfassungen ist sauber: identische Schlüsselmenge
(alle `reasonNoRoom`, alle Plural-Varianten), identische Zahlenwerte und
Platzhalter, keine fehlenden Vorbehalte auf einer Seite.

### 42. LED-Tipp nennt zwei verschiedene Preise auf derselben Karte
**Kategorie:** Bug · **Bereich:** `buildTips.ts:461`, `tips.items.lighting`
**Status:** ✅ Umgesetzt (06.09.) – der Text behauptet keine Amortisation mehr
(„spart das im ersten Jahr wieder ein"), sondern sagt, **wo** sich der Tausch
am schnellsten rechnet: dort, wo täglich am längsten Licht brennt. Damit steht
die 3-€-Angabe nicht mehr gegen die 25 € der Aufwandszeile, sondern erklärt
sie – 25 € ist die Ausstattung mehrerer Räume, 3 € die einzelne Lampe. Der
Halbsatz steht jetzt auch in der Einzelraum-Variante.

Der Text sagt „eine Ersatz-LED kostet **rund 3 €**". Die Aufwandszeile derselben
Karte entsteht aus `costEur: 25` und zeigt „**ab 25 €**". Beides steht
gleichzeitig sichtbar.

Beide Zahlen sind für sich vertretbar – 3 € je Lampe, 25 € für die Ausstattung
mehrerer Räume –, aber unerklärt nebeneinander wirken sie wie ein Fehler. Die
€-Angaben der App sind sonst durchgehend so gebaut, dass sie sich gegenseitig
stützen.

**Nebenbefund im selben Tipp:** „spart das im ersten Jahr wieder ein" gilt nur
bei nennenswerter Brenndauer. Eine selten genutzte Kellerlampe amortisiert eine
3-€-LED nicht in einem Jahr. Die Mehrraum-Variante (`reason_other`) mildert das
mit „Fang dort an, wo täglich am längsten Licht brennt" – die Einzelraum-Variante
(`reason_one`) hat diesen Halbsatz nicht und behauptet die Amortisation pauschal.

### 43. Verbrauchstrend ohne Witterungsvorbehalt
**Kategorie:** Problem · **Bereich:** `buildTips.ts:133, 746-788`,
`tips.items.consumption_up`
**Status:** ⚠️ Textlich umgesetzt (06.09.) – Gas, Öl, Pellets und Wärmepumpe
bekommen einen eigenen Befund (`consumption_up_heating`): „Die Menge ist
gemessen; die Ursache noch nicht. Ein kälteres Jahr erklärt beim Heizen einen
Teil davon." Strom und Wasser behalten den bisherigen Text – dort wäre der
Vorbehalt falsch. Die **Auslöseschwelle** ist unverändert bei 10 %; sie
sauber zu setzen verlangt Gradtagzahlen und bleibt an #24 gebunden.

Der Tipp sagt: „Das ist gemessen, nicht geschätzt. Geh der Ursache nach, bevor
sie sich über ein weiteres Jahr summiert." Für **Strom** ist das uneingeschränkt
richtig und der am besten belegte Befund der ganzen Liste.

Für **Gas, Öl, Pellets und Wärmepumpe** fehlt der entscheidende Vorbehalt: Ein
Jahr kann schlicht kälter gewesen sein. Der Satz „gemessen, nicht geschätzt"
stimmt für die Mehrmenge, wird vom Nutzer aber auf die *Ursache* bezogen – und
die ist bei Wärmeträgern ohne Gradtagbereinigung offen.

Verschärfend: `CONSUMPTION_RISE_MIN = 0.1` liegt in derselben Größenordnung, in
der Heizjahre allein witterungsbedingt auseinanderliegen. Der Tipp feuert bei
Wärmeträgern also regelmäßig auf etwas, das keine Ursache im Haushalt hat. Die
genaue Schwankungsbreite wäre an DWD-Gradtagzahlen zu belegen, nicht zu schätzen.

Die App weiß um die Lücke – das Heizperioden-Band aus #24 ordnet genau das ein,
und die Gradtagbereinigung steht dort als offener Punkt. Der Tipp erwähnt sie
mit keinem Wort.

**Zu klären beim Beheben:** Ohne DWD-Daten (siehe #24) geht kein rechnerischer
Ausgleich. Möglich wäre aber sofort ein eigener Textbaustein für Wärmeträger:
derselbe Befund, ergänzt um „ein kälteres Jahr erklärt einen Teil davon" – und
gegebenenfalls eine höhere Auslöseschwelle als bei Strom.

### 44. Standby trägt den einzigen Euro-Betrag – und ist am schwächsten abgesichert
**Kategorie:** Problem · **Bereich:** `buildTips.ts:425-443`, `standby.ts`
**Status:** 🔍 Nur gesammelt.

Nach der Umstellung vom 05.09. ist Standby praktisch der einzige Tipp, der noch
einen Euro-Betrag zeigt (der Gefrierschrank nur noch aus Altergebnissen). Drei
Dinge sprechen dagegen, ausgerechnet ihn zu beziffern:

1. **Die Rechnung unterstellt 24 h/Tag Standby.** Die Moduldoku von `standby.ts`
   sagt das selbst: „durchgängig 24 h/Tag Standby angenommen … bewusste
   Näherungen zur Veranschaulichung, keine exakte Abrechnung." Das ist eine
   angenommene Nutzungshäufigkeit – genau die Größe, deren Vorkommen
   `isMeasuredSaving` zum Ausschlusskriterium erklärt („Sobald eine
   Nutzungshäufigkeit oder ein Verbrauch geschätzt wird, entfällt der Betrag").
   Der Check setzt trotzdem kein `savingEstimated`.
2. **`avoidableCost` unterstellt vollständige Abschaltung.** Bei medium/high
   werden die kompletten Jahreskosten als vermeidbar ausgewiesen. Für Fernseher
   und Konsole trifft das zu, für Router, Set-Top-Box oder ein Gerät mit Uhr
   nicht – und der Tipptext („Häng die Geräte an eine Steckdosenleiste") nimmt
   keinen davon aus.
3. **Der Tipp prüft `isMeasuredSaving` nicht.** Der Gefrierschrank-Tipp
   (`:532`) tut es, Standby nicht – er nimmt den Rohwert aus `savingForId`.
   Heute ohne Wirkung, weil kein Standby-Ergebnis `savingEstimated` trägt; es
   ist aber genau der Riegel, den `impact.ts` als „Riegel gegen Geister-Beträge"
   beschreibt.

Dazu kommt, was CLAUDE.md ohnehin vermerkt: Die Auslöseschwelle steht auf
`pending` („Ohne Beleg"). Von den drei unbelegten Schwellen (Standby, Grundlast,
Warmwasser-Wartezeit) trägt damit ausgerechnet die eine einen Euro-Betrag.

**Nebenbefund:** Wegen `avoidable = rating === 'good' ? 0 : cost` springt der
Betrag an der Schwelle unstetig – 5,0 W ergibt 0 €, 5,1 W die vollen
Jahreskosten von rund 45 kWh.

### 45. PV-Tipp rät zu Dingen, die die App nicht geprüft hat
**Kategorie:** Problem · **Bereich:** `buildTips.ts:824-832`,
`tips.items.pv_self_consumption`
**Status:** 🔍 Nur gesammelt.

Der Grundgedanke stimmt und ist gut belegt: Eigenverbrauch ist den Bezugspreis
wert, Einspeisung nur die Vergütung. Drei der genannten Maßnahmen stehen aber
ohne Prüfung da:

- **„heize Warmwasser um die Mittagszeit auf"** gilt nur bei elektrischer
  Warmwasserbereitung oder Wärmepumpe. Bei einem Gaskessel mit Speicher bringt
  Mittagssonne dafür nichts. Die App **kennt** `hotWaterType` – ausgerechnet das
  Feld, das laut offener Frage zu #36 gerade keinen funktionalen Abnehmer mehr
  hat. Hier wäre einer, und ein sachlich zwingender.
- **„lade E-Auto"** spricht etwas an, das der Fragebogen nie erhebt.
- **Volleinspeisung** ist nicht ausgenommen. Wer nach § 21 EEG volleinspeist,
  soll und darf den Strom nicht selbst verbrauchen – für ihn ist der ganze Tipp
  verkehrt. `hasPV` kennt nur ja/nein/geplant, die Betriebsart nicht.

**Zu klären beim Beheben:** Der Warmwasser-Satz ließe sich sofort an
`hotWaterType` hängen (und gäbe der Frage damit ihre Aufgabe zurück). Für
Volleinspeisung wäre entweder eine neue Fragebogen-Antwort nötig oder ein
Halbsatz im Tipp („sofern du Überschuss einspeist") – das zweite ist billiger
und ehrlich.

### 46. Duschkopf-Tipp: Werbeaussage und fehlender Anlagenvorbehalt
**Kategorie:** Problem · **Bereich:** `tips.items.showerhead`
**Status:** 🔍 Nur gesammelt.

„**gleiches Duschgefühl**" ist eine Produktbehauptung, die die App nicht
einlösen kann – sie hängt am Modell und am Leitungsdruck. Sie steht zudem quer
zu der Vorsicht, mit der #16 die Kaufempfehlung aus den Duschkopf-Ergebnistexten
genommen und darauf hingewiesen hat, dass „Eco"/„sparsam" keine geschützten
Begriffe sind.

Fachlich fehlt ein Vorbehalt: An **drucklosen (offenen) Warmwasserspeichern**
darf der Auslauf nicht durch einen Durchflussbegrenzer gedrosselt werden. Bei
hydraulisch geregelten Durchlauferhitzern verschiebt weniger Durchfluss die
Auslauftemperatur. Beides ist kein Ausschluss, aber ein Satz wert, bevor jemand
20 € ausgibt.

Der Auslöser selbst ist sauber: `showerFlow > GOOD_MAX` (9 L/min), Zielwert
`EFFICIENT_FLOW_LPM = 8` – Text und Konstante stimmen überein.

### 47. Zugluft-Tipp: kein Bezug zur Lüftung, und er nennt den falschen Raum
**Kategorie:** Problem (+ kleiner Bug) · **Bereich:** `buildTips.ts:715-726`,
`tips.items.draft`
**Status:** ⚠️ Teil (b) umgesetzt (06.09.) – der Tipp nennt jetzt den
zugigsten Raum, wie alle anderen Raum-Befunde ihr Extremum nennen. Teil (a),
der fehlende Querbezug zur Lüftung, bleibt offen.

**(a) Kein Querbezug zur Feuchte.** „Selbstklebendes Dichtungsband … abziehen,
andrücken, fertig" steht ohne jeden Hinweis darauf, dass Abdichten den
Luftwechsel senkt. Im selben Raum kann gleichzeitig „Gegen Feuchte lüften"
(#38) stehen – die beiden Tipps kennen einander nicht. Bei einem Fenster mit
intakter Rahmendichtung ist außerdem nicht Band die Lösung, sondern das
Nachstellen der Beschläge.

**(b) `drafty[0]` statt des schlimmsten Raums.** Zeile 724 nimmt das
**zuerst gemessene** zugige Zimmer, nicht das zugigste. Alle anderen Raum-Tipps
nehmen konsequent das Extremum (`warmest`, `coldest`, `wettest`, `driest`). Bei
drei zugigen Räumen benennt der Tipp damit einen beliebigen.

### 48. „Luft ist zu trocken" ab 40 % – auf einer Schwelle ohne Beleg
**Kategorie:** Verbesserung · **Bereich:** `tips.items.humidity_low`
**Status:** 🔍 Nur gesammelt.

Der Tipp meldet ab unter 40 % rF „sehr trocken, **das reizt die Atemwege**" –
eine Gesundheitsaussage auf einem Wert, der im Winter in geheizten Wohnungen der
Normalfall ist. Bei kalter Außenluft lässt sich ohne Befeuchtung kaum mehr
erreichen; der Rat „kürzer lüften und nicht überheizen" ist zwar physikalisch
richtig, führt aber selten unter die Schwelle zurück.

Die Empfehlung ist damit die einzige der Liste, die einen Zustand beanstandet,
den der Nutzer im Winter kaum abstellen kann – und sie tut es in
gesundheitlicher Sprache.

**Zu klären beim Beheben:** Entweder die Untergrenze für Wohnräume in der
Heizzeit absenken, oder den Text entschärfen (Hinweis statt Beanstandung: „im
Winter normal, unangenehm wird es erst darunter"). Beides betrifft
`DEFAULT_HUMIDITY_BAND` bzw. nur den Tipptext – zu entscheiden.

### 49. Grundlast und Standby werden nie miteinander verrechnet
**Kategorie:** Verbesserung · **Bereich:** `buildTips.ts:544`
**Status:** ✅ Umgesetzt (06.09.) – auf Kilians Wunsch.

Der Grundlast-Tipp verschwindet, sobald **irgendein** Standby-Ergebnis existiert
(`!results['standby']`). Das ist bewusst so gebaut und getestet
(`buildTips.test.ts:112`, „lässt den Grundlast-Tipp weg, sobald der
Standby-Check erledigt ist") – der Tipp versteht sich als Wegweiser, und der ist
nach dem Standby-Check erfüllt.

Fachlich bleibt trotzdem eine Lücke: Der Standby-Check **erklärt** die Grundlast
in aller Regel nicht. Die wird von Kühlgeräten, Heizungspumpe, Router und
Lüftung getragen, nicht von Bereitschaftsschaltungen. Bei 250 W Grundlast und
18 W gefundenem Standby bleiben 232 W unerklärt – und der Hinweis darauf ist
weg, weil formal „gemessen" wurde.

Die App hat beide Zahlen und vergleicht sie an keiner Stelle. Der eigentliche
Erkenntnisgewinn läge genau dort: „Von deinen 250 W hast du 18 W gefunden – die
übrigen 232 W ziehen woanders." Das ist zugleich der Weg zu den Verdächtigen,
die die App ohnehin kennt (Kühlgeräte aus dem Fragebogen, PV-Wechselrichter,
Heizungspumpe).

**Was gebaut wurde.** Der Grundlast-Befund verschwindet nicht mehr, sobald
*irgendein* Standby-Ergebnis vorliegt. Stattdessen entscheidet die
**Restleistung**, ob noch etwas zu sagen ist:

```
Rest = Grundlast − im Standby-Check gefundene Watt
```

Bleibt ein Rest, tritt `base_load_unexplained` an die Stelle des alten
Hinweises: „Von 250 W Grundlast erklärt der Standby-Check 18 W – 232 W ziehen
woanders", dazu die Dauerläufer, die im Standby nicht auffallen (Kühl- und
Gefriergeräte, Umwälzpumpe, Router, Lüftung, Aquarium) und der Rat, sie mit
demselben Messgerät einzeln nachzumessen.

**Die entscheidende Frage war, wann ein Rest „nennenswert" ist** – und dafür
ist bewusst *keine* neue Zahl entstanden. Der Rest wird an denselben Schwellen
gemessen wie die Grundlast selbst (`rateBaseLoad`): Wäre er allein noch
auffällig, ist er einen Befund wert; liegt er unter `GOOD_MAX` (70 W, der
Bereich, in dem Kühlschrank und Router ohnehin liegen), hat der Standby-Check
die Grundlast hinreichend erklärt und die App schweigt. Dieselbe Regel wie beim
Tank-Umbau: es ändern sich Daten, nicht der Rechenweg.

Bewusst **ohne** den Anteil am Jahresverbrauch, mit dem `rateBaseLoad` sonst
bevorzugt rechnet – der `share` steckt nicht in den Details des Ergebnisses,
und ihn hier neu zu bilden hieße, eine zweite Bewertungsgrundlage einzuführen.

**Kein Link.** Weitere Dauerläufer gehören nicht in den Standby-Check: Dessen
`avoidableCost` weist den gemessenen Verbrauch als vollständig abschaltbar aus,
was für einen Kühlschrank falsch wäre. Der Befund informiert, er schickt nicht
weiter.

**Grenzfälle, die Tests festhalten:** 0 W gefundener Standby heißt „die ganze
Grundlast ist unerklärt" (und ist von „nicht gemessen" zu unterscheiden);
Altergebnisse ohne `totalWatts` werden aus ihrer Geräteliste summiert, in beiden
Kodierungen (`dev{i}` und `dev{i}_{type}`); mehr Standby als Grundlast – meist
zu verschiedenen Zeiten gemessen – ergibt keinen Befund, statt eine negative
Restleistung zu behaupten.

**Offen geblieben:** Beide Messungen können weit auseinanderliegen; die
Differenz ist dann nur bedingt aussagekräftig. Der Befund nennt darum den
Zeitpunkt der Grundlast-Messung („gemessen vor X Tagen"), rechnet aber keine
Altersgrenze ein – die wäre eine erfundene Schwelle.

### 50. Schwellen in `buildTips.ts` doppelt gepflegt
**Kategorie:** Problem · **Bereich:** `buildTips.ts:155-161`
**Status:** ✅ Umgesetzt (06.09.) – alle vier Zahlen kommen jetzt aus ihrer
Quelle: `GOOD_MIN`/`GOOD_MAX` aus `fridge.ts`, das Feuchteband über
`humidityBandOf()` aus dem Ergebnis (mit `DEFAULT_HUMIDITY_BAND` als
Rückfall). In `buildTips.ts` steht keine dieser Grenzen mehr als Zahl.

Vier Zahlen stehen dort ein zweites Mal, statt importiert zu werden:

| in `buildTips.ts` | Original |
|---|---|
| `FRIDGE_COLD_C = 5` | `GOOD_MIN` in `fridge.ts` |
| `FRIDGE_WARM_C = 7` | `GOOD_MAX` in `fridge.ts` |
| `HUMID_MIN = 40` | `DEFAULT_HUMIDITY_BAND.min` |
| `HUMID_MAX = 60` | `DEFAULT_HUMIDITY_BAND.max` |

Der Duschkopf-Tipp macht es in derselben Datei richtig:
`import { GOOD_MAX as SHOWER_GOOD_MAX }`. Auch die Wissens-Tabellen
(`measurementThresholds.ts`) halten die Regel ein und enthalten keine einzige
Grenze als Zahl.

Es ist die Ursache hinter #38 und ein Risiko für #40: Wer `GOOD_MAX` im
Kühlschrank ändert, ändert die Empfehlung nicht mit – der Check bewertete dann
anders, als der Tipp rät.

### 51. „Was soll man da abhaken?" – Befunde sind keine Maßnahmen
**Kategorie:** Bug · **Bereich:** `buildTips.ts`, `TipsPage.tsx`, `tipsStore.ts`
**Status:** ✅ Umgesetzt (06.09.).

Kilians Einwand zum Trend-Tipp aus dem Live-Test: „Kann man mit den Tipps auch
anders umgehen? Was soll man da abhaken? Das sind ja eher Infos als Tipps."

**Der Einwand trifft mehr als die Optik.** Zwei der Einträge sind keine
Aufgaben, sondern Beobachtungen: der steigende Verbrauch
(`consumption_up_*`) und die unerklärte Grundlast (`base_load`). Beide sagen,
dass etwas auffällt – nicht, was zu tun ist. Sie trugen trotzdem alles, was
eine Maßnahme trägt: einen Aufwand-Chip („10 Min · kostenlos" – für „sieh dir
den Verlauf an" eine erfundene Angabe), einen Erledigt-Haken und einen Platz
in der Gruppe „Sofort machbar".

**Der Haken war dabei nicht bloß sinnlos, sondern schädlich.** Er landet in
`tipsStore.doneIds` und liegt dauerhaft im localStorage. Ein einmal abgehakter
Verbrauchsanstieg wäre damit **nie wieder** erschienen – auch im nächsten Jahr
nicht, wenn der Verbrauch weiter steigt. Genau der Befund, der die App am
besten belegen kann, ließ sich mit einem Klick dauerhaft stummschalten.

**Was gebaut wurde.** `Tip.kind` unterscheidet `action` von `finding`
(Standard: `action`, es ändert sich also nichts an bestehenden Tipps). Ein
Befund

- steht in einer **eigenen Gruppe „Was auffällt"** ganz oben – vor den
  Maßnahmen, weil er der Grund für sie ist,
- trägt **keinen Aufwand-Chip** und **keinen Erledigt-Haken**,
- zählt **nicht in den Fortschrittsbalken** (sonst könnte er bei dauerhaft
  steigendem Verbrauch nie 100 % erreichen – derselbe Fehler, den die
  Ziel-Frage im Fragebogen hatte, siehe #27),
- kommt für „Fang hier an" nicht in Frage, und
- behält das „×" zum Ausblenden: „gesehen, weg damit" bleibt möglich.

Befunde treten ohnehin von selbst ab, sobald sie nicht mehr zutreffen – der
Grundlast-Hinweis tat das schon vorher, sobald der Standby-Check vorlag.

**Zwei Nebenbefunde, beim Nachsehen im Browser gefunden und mitbehoben:**

- In der Liste „Ausgeblendet" stand `tips.items.consumption_up_electricity.title`
  als **roher i18n-Schlüssel**. Sie las den Titel über `tip.id` statt über
  `tip.textId ?? tip.id` – betroffen war jeder Tipp, der sich seinen Text mit
  anderen teilt, also auch ein zweiter Kühlschrank (`fridge@fridge-abc`).
- Der **Wirkungsbalken** blieb als leere graue Spur stehen, wo kein
  Euro-Betrag steht (bei jeder gemessenen Menge und jedem Befund – auch in
  Kilians Screenshot zu sehen). Er vergleicht €-Beträge untereinander;
  ohne einen solchen behauptete er eine Skala, auf der der Eintrag gar nicht
  liegt. Jetzt trägt die Zeile nur die Zahl.

Nachgesehen im Browser (Demo-Wohnung, 430 × 932 px, Zählerstände auf zwei volle
Jahre verlängert): „Was auffällt · 2" steht oben, beide Trend-Karten ohne Chip
und ohne Haken, der Fortschritt zählt 8 statt 10 Einträge, und der
Gas-Befund trägt den Witterungsvorbehalt aus #43, der Strom-Befund nicht.

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
- Bei #17 (Nachtrag aus #18): Sollen `windowAge`, `insulationState`,
  `ventilationType` und `renovations` aus „Wofür wir das nutzen" verschwinden?
  Sie stehen dort als Angaben, die ein neues Profil nie macht.

- Bei #24/#25: Der Standort-Schritt ist entfallen, die Postleitzahl wird also
  gar nicht mehr erhoben. Soll die Klimaregion in einer Session **mit**
  Netzzugang nachgezogen werden (geprüfte DWD-Monatsmittel je Region)? Dann
  bekäme die Abfrage erstmals einen echten Abnehmer – das regionalisierte
  Saisonprofil wirkt sofort in Jahres-Hochrechnung, Tank-Reichweite und
  Bericht – und der Schritt käme aus dem Archiv zurück. Sonst bleibt es dabei.

- Bei #23: „Ausstattung" heißt jetzt eine Seite, auf der nur noch die
  Übersicht „Was du zum Messen brauchst" steht. Soll der Schritt so heißen wie
  sein Inhalt (z. B. „Was du zum Messen brauchst") – oder bleibt „Ausstattung"?

- Bei #9: Welche Auswahl-Struktur für die Raumzuordnung – zweistufig
  (erst Raum, dann Entnahmestelle) oder eine kombinierte Liste je
  Rauminstanz? Bis zur Entscheidung bleibt der bestehende Datenverlust bei
  mehreren gleichartigen Entnahmestellen (z. B. zwei Waschbecken) bestehen.

- Bei #32: Der Rat „vor der PV-Auslegung die Grundlast messen" ist mit der
  Antwort „geplant" entfallen. Soll er an anderer Stelle wieder auftauchen –
  etwa als Hinweis im Grundlast-Check selbst?
- Bei #29 (neu, aus der Umsetzung): Das Intro-Bild des Möbelabstand-Checks
  zeigt einen Heizkörper – auch dann, wenn der Raum eine Infrarotplatte oder
  einen Ofen hat. Eigene Bilder je Bauart, oder bleibt das eine Illustration
  für den Check als Ganzes?
- Bei #29 (neu): Die Ergebnis-Zusammenfassung je Bewertungsstufe
  (`result.summary`) ist für Heizkörper formuliert („Wärme verteilt sich
  ungleichmäßig"). Für Infrarot und Ofen trifft sie ungefähr zu, die Befunde
  darunter tragen das Genaue. Eigene Sätze je Bauart nachziehen?

- Bei #36 (neu, aus der Umsetzung): Die Warmwasser-Frage im Fragebogen
  (`hotWaterType`) hat jetzt **keinen funktionalen Abnehmer mehr** – sie steht
  nur noch im Steckbrief des Berichts. Bei Kamin/Ofen, Smart-Home, Gebäudeteil
  und Postleitzahl war genau das der Grund zu streichen. Soll die Frage
  entfallen (Schritt „Heizung & Warmwasser" behält seine übrigen Fragen), oder
  bleibt sie für den Steckbrief stehen? Eine dritte Möglichkeit: Sie bekommt
  eine Aufgabe – etwa einen Tipp für „separates System" (Warmwasser aus einem
  eigenen Gerät im Sommer ist oft der teuerste Weg). Der wäre aber neu zu
  belegen, nicht bloß anzuschließen.
- Bei #37 (neu, aus der Umsetzung): Der gemeinsame `Stepper` kann seinen Wert
  jetzt verbergen (`showValue={false}`). Soll das in Kühlschrank, Raumklima und
  Möbelabstand gesetzt werden? Dort steht der Wert heute zweimal – einmal roh
  („5"), einmal formatiert („5,0 °C"). Drei kleine Änderungen, die niemand
  gemeldet hat; deshalb nicht ungefragt gemacht.
- Bei #37: Nach dem Korrigieren der Zeit zeigt die Stoppuhr weiter ihren
  eigenen, alten Stand (z. B. 00:01,5, während im Feld 21 s steht). Der
  Wartezeit-Check verhält sich genauso – soll das Feld die Uhr zurücksetzen,
  oder bleibt die Uhr das Protokoll dessen, was wirklich lief?

**Aus der Durchsicht des Empfehlungs-Katalogs (#38–#51):**

Die Bugs ohne Entscheidungsbedarf sind am 06.09. umgesetzt (#38a, #39, #40
textlich, #41, #42, #43 textlich, #47b, #49, #50, #51). Offen sind noch die Punkte,
die eine Festlegung brauchen:

- **Bei #45 – und damit zugleich bei #36:** Der PV-Tipp rät „heize Warmwasser um
  die Mittagszeit auf", was nur bei elektrischer Bereitung oder Wärmepumpe
  stimmt. Damit gibt es einen **sachlich zwingenden Abnehmer für
  `hotWaterType`** – die Frage, die oben als abnehmerlos zur Streichung steht.
  Das ändert die Lage bei #36: Statt zu entscheiden, ob die Frage entfällt,
  wäre sie hier anzuschließen. Anders als der vorgeschlagene „separates
  System"-Tipp ist dafür nichts neu zu belegen – es geht nur darum, einen Satz
  wegzulassen, wo er nicht zutrifft.
- **Bei #40 (Rest):** Der Text nennt jetzt „5 bis 7 °C". Soll auch
  `REFERENCE_TEMP` in `fridge.ts` von 7 auf die Bandmitte rutschen? Das
  verkleinert die ausgewiesene Ersparnis und lässt Altergebnisse mit dem alten
  Prozentwert stehen – deshalb nicht ungefragt gemacht.
- **Bei #43 (Rest):** Der Witterungsvorbehalt steht im Text. Soll die
  **Auslöseschwelle** für Wärmeträger über die 10 % hinaus angehoben werden?
  Sauber setzen ließe sie sich erst mit Gradtagzahlen (#24); ein pauschal
  höherer Wert wäre geraten, nur eben in die vorsichtige Richtung.
- **Bei #44:** Soll der Standby-Tipp seinen Euro-Betrag behalten? Er ist nach
  dem 05.09. praktisch der letzte der App – und beruht auf einer angenommenen
  24-h-Nutzung, also genau der Größe, die `isMeasuredSaving` sonst ausschließt.
  Drei Wege: Betrag streichen (dann trägt der Tipp die gemessenen Watt),
  `savingEstimated` setzen (dann fällt er über die bestehende Regel), oder die
  Annahme im Text offenlegen.
- **Bei #48:** Untergrenze der Luftfeuchte für Wohnräume in der Heizzeit senken,
  oder den Text von einer Beanstandung zu einem Hinweis abschwächen?
- **Bei #38b und #46:** Beide betreffen Texte, die für einen Sonderfall verkehrt
  sind (Kellerlüften im Sommer; Sparduschkopf am drucklosen Speicher). Je ein
  Halbsatz genügt – oder es bleibt bewusst beim allgemeinen Rat, weil der
  Sonderfall selten ist. Zu entscheiden.
