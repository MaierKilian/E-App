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

## Cookie-Banner & Rechtsseiten

### 2. Wiedereinstieg in die Cookie-Einstellungen
**Kategorie:** Verbesserung · **Bereich:** Datenschutzerklärung Abschnitt 9
**Status:** ✅ Umgesetzt – neuer, dauerhaft eingeblendeter Button unten rechts
(`ConsentReopenButton`, wie der Cookie-Hinweis positioniert), Text „Möchtest
du deine Cookie-Einstellungen ändern?", erscheint erst nach einer getroffenen
Entscheidung. Abschnitt 9 der Datenschutzerklärung beschreibt die neue
Methode zusätzlich zum bisherigen Button.

Der Button zum erneuten Festlegen der Präferenzen soll wie der Cookie-Hinweis
selbst unten rechts mitlaufen – als kleiner Button „Möchtest du deine
Cookie-Einstellungen ändern?". Abschnitt 9 der Datenschutzerklärung
entsprechend umschreiben (neue Methode statt aktuellem Verweis).

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
- Bei #9: Welche Auswahl-Struktur für die Raumzuordnung – zweistufig
  (erst Raum, dann Entnahmestelle) oder eine kombinierte Liste je
  Rauminstanz? Bis zur Entscheidung bleibt der bestehende Datenverlust bei
  mehreren gleichartigen Entnahmestellen (z. B. zwei Waschbecken) bestehen.
