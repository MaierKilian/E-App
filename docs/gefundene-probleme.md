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

## Offene Fragen für Kilian

- Bei #1: Reicht ein Gate wie bei Analytics, oder muss die Cache-Strategie
  grundsätzlich anders aufgesetzt werden (z. B. Firestore erst bei Login
  initialisieren statt beim App-Start)?
