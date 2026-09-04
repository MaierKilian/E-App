# Gefundene Probleme – Sammlung vom 04.09.2026

> **Arbeitsdokument, noch nichts umgesetzt.** Sammelt Kilians Testbefunde,
> kategorisiert (Bug / Problem / Verbesserung) und grob priorisiert. Wird erst
> nach gemeinsamer Sichtung in Etappen überführt.

## Hoch – rechtlich/funktional kritisch

### 1. Firestore-Speicherung startet vor der Consent-Entscheidung
**Kategorie:** Bug · **Bereich:** Einwilligung / `src/lib/firebase.ts`

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

---

## Cookie-Banner & Rechtsseiten

### 2. Wiedereinstieg in die Cookie-Einstellungen
**Kategorie:** Verbesserung · **Bereich:** Datenschutzerklärung Abschnitt 9

Der Button zum erneuten Festlegen der Präferenzen soll wie der Cookie-Hinweis
selbst unten rechts mitlaufen – als kleiner Button „Möchtest du deine
Cookie-Einstellungen ändern?". Abschnitt 9 der Datenschutzerklärung
entsprechend umschreiben (neue Methode statt aktuellem Verweis).

### 3. Dritter Button im Cookie-Banner für erweiterte Einstellungen
**Kategorie:** Verbesserung · **Bereich:** `ConsentBanner`

„Cookie-Einstellungen" (aktuell ein Link) soll ein Button werden, gleich
prominent wie „Ablehnen" und „Akzeptieren", platziert direkt darunter über
die volle gemeinsame Breite beider Buttons.

### 4. Scroll-Position bleibt beim Routenwechsel stehen
**Kategorie:** Bug · **Bereich:** allgemein, nicht auf Rechtsseiten beschränkt

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

- Bei #1: Reicht ein Gate wie bei Analytics, oder muss die Cache-Strategie
  grundsätzlich anders aufgesetzt werden (z. B. Firestore erst bei Login
  initialisieren statt beim App-Start)?
- Bei #8: Nur den akuten Anzeigefehler (0 L bei Altbestand) beheben, oder
  grundsätzlich auf qualitativen Text ohne Literzahl umstellen, solange für
  Badewanne/Küche/Waschbecken kein echter Durchfluss-Test existiert (nicht
  nur Dusche)?
