# Impressum, Datenschutz und Cookies in der E-App – Referenz für die schriftliche Ausarbeitung

**Zweck dieses Dokuments.** Es erklärt, welche rechtlichen Anforderungen die
E-App erfüllen muss, wie sie technisch umgesetzt sind, was in den Rechtstexten
grob drinsteht und **warum** jeweils so entschieden wurde. Es ist als
**Faktenquelle** für die Erstellung einer Dokumentation gedacht, nicht als
fertiger Fließtext.

**Stand:** 05.09.2026. Alle Angaben sind aus dem Quellcode belegt; die
maßgebliche Datei steht jeweils dabei.

> ⚠️ **Wichtiger Vorbehalt, der in einer Ausarbeitung nicht fehlen darf:** Die
> Rechtstexte der E-App sind nach bestem Wissen aufgebaut und benennen die
> tatsächlich stattfindenden Verarbeitungen. **Eine juristische Prüfung
> ersetzen sie nicht** und hat bislang nicht stattgefunden. Abschnitt 8 listet
> die konkret offenen Punkte. Formulierungen wie „rechtskonform" oder
> „DSGVO-konform" sollten in der Ausarbeitung vermieden werden; korrekt ist
> „nach den einschlägigen Vorschriften aufgebaut, juristisch ungeprüft".

---

## 1. Die drei Bausteine und ihre Rechtsgrundlagen

Drei verschiedene Pflichten aus drei verschiedenen Gesetzen greifen ineinander.
Sie werden in der Praxis oft vermengt („Cookie-Banner wegen DSGVO"), sind aber
sauber zu trennen – das ist ein guter Punkt für die Ausarbeitung:

| Baustein | Rechtsgrundlage | Frage, die er beantwortet |
|---|---|---|
| **Impressum** | § 5 DDG (seit 2024 Nachfolger des § 5 TMG), § 18 Abs. 2 MStV | *Wer* betreibt dieses Angebot und wie ist er erreichbar? |
| **Datenschutzerklärung** | Art. 13 DSGVO | *Welche* personenbezogenen Daten werden *wofür* und *auf welcher Rechtsgrundlage* verarbeitet? |
| **Einwilligung („Cookie-Banner")** | § 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO | Darf auf dem *Endgerät* gespeichert und gelesen werden – und darf danach verarbeitet werden? |

**Die wichtigste Abgrenzung:** § 25 TDDDG regelt den **Zugriff auf das
Endgerät** und gilt unabhängig davon, ob dabei personenbezogene Daten anfallen.
Die DSGVO regelt die **anschließende Verarbeitung**. Für Google Analytics
braucht die App deshalb beides: die Einwilligung nach § 25 Abs. 1 TDDDG für das
Setzen der Cookies **und** Art. 6 Abs. 1 lit. a DSGVO für die Auswertung.

---

## 2. Das Impressum

### 2.1 Warum die Pflicht besteht und in welchem Umfang

Impressumspflichtig sind „geschäftsmäßige, in der Regel gegen Entgelt
angebotene" digitale Dienste. Die E-App ist ein **privates, nicht
geschäftsmäßiges Projekt** ohne entgeltliche Leistungen – das steht auch so auf
der Seite. Daraus folgt ein **reduzierter Pflichtumfang**
(`src/features/legal/operator.ts`):

**Erforderlich:**
- Name (Vor- und Nachname der natürlichen Personen)
- ladungsfähige Anschrift (kein Postfach)
- eine E-Mail-Adresse für die unmittelbare Kontaktaufnahme
- inhaltlich Verantwortlicher nach § 18 Abs. 2 MStV, da redaktionelle Inhalte
  (Wissensbereich, Ratgebertexte) angeboten werden

**Nicht erforderlich**, solange nicht geschäftsmäßig gehandelt wird:
Registergericht und -nummer, Umsatzsteuer-Identifikationsnummer (§ 27a UStG),
Aufsichtsbehörde, Angaben zur Berufshaftpflicht.

### 2.2 Was auf der Seite steht

Route `/impressum`, Datei `ImprintPage.tsx`. Abschnitte:

1. **Anbieter** – Namen, Anschrift, dazu der Satz, dass es sich um ein privates,
   nicht-geschäftsmäßiges Projekt ohne entgeltliche Leistungen handelt
2. **Kontakt** – E-Mail-Adresse als `mailto:`-Link, Telefon optional
3. **Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV** – fällt auf den
   Betreibernamen zurück, wenn kein abweichender gesetzt ist
4. **Verbraucherstreitbeilegung** – Erklärung nach § 36 VSBG, nicht an
   Schlichtungsverfahren teilzunehmen
5. **Haftung und Urheberrecht**
6. Stand der Texte (`LEGAL_LAST_UPDATED`)

### 2.3 Die technische Lösung: eine einzige Datenquelle mit Selbstkontrolle

Zwei Entwurfsentscheidungen sind hier erwähnenswert:

**(a) Eine einzige Quelle.** Sämtliche Betreiberangaben stehen ausschließlich in
`src/features/legal/operator.ts`. Impressum **und** Datenschutzerklärung lesen
von dort; im Text der Seiten steht kein einziger Wert fest. Wer den Betreiber
wechselt, ändert eine Datei – ein klassisches Konsistenzproblem („der Name
steht an vier Stellen, drei sind veraltet") entsteht gar nicht erst.

**(b) Sichtbare Selbstkontrolle.** `missingOperatorFields()` prüft die
Pflichtfelder (`name`, `street`, `postalCode`, `city`, `email`). Fehlt eines,
zeigt die Impressumsseite eine rote Warnung „Impressum unvollständig" und
markiert jede einzelne Lücke im laufenden Text mit „noch einzutragen". Die
Begründung dahinter: **Ein unvollständiges Impressum soll nicht unbemerkt online
gehen können.** Die Warnung verschwindet automatisch, sobald alle Felder gefüllt
sind – seit dem 05.09.2026 ist das der Fall.

Eine verwandte Feinheit: `addressLines()` gibt eine **leere** Liste zurück,
solange Straße oder Ort fehlen. Sonst stünde unter „Anbieter" nur
„Deutschland" – formal gefüllt, inhaltlich wertlos.

---

## 3. Die Datenschutzerklärung

Route `/datenschutz`, Datei `PrivacyPage.tsx`, dreizehn Abschnitte.

### 3.1 Der Grundgedanke: Datensparsamkeit als Architekturentscheidung

Abschnitt 2 der Erklärung beschreibt das Leitprinzip, und es ist keine
Absichtserklärung, sondern beschreibt die tatsächliche Architektur: Die E-App
ist **als lokale Anwendung gebaut**. Wohnungsprofil, Messergebnisse und
Zählerstände liegen zunächst ausschließlich im Browser. Erst mit einer Anmeldung
werden sie zusätzlich im Konto gespeichert. Ohne Anmeldung verlässt – außer den
drei ausdrücklich genannten Ausnahmen (Zählerstand-Scan, Rückmeldung,
Nutzungsstatistik) – nichts das Gerät.

Für eine Ausarbeitung ist das der interessanteste Punkt: **Datenschutz ist hier
eine Frage der Architektur, nicht der Texte.** Wer die Verarbeitung gar nicht
erst stattfinden lässt, muss sie auch nicht rechtfertigen (Art. 25 DSGVO,
Datenschutz durch Technikgestaltung).

### 3.2 Die Abschnitte im Überblick

| # | Abschnitt | Was verarbeitet wird | Rechtsgrundlage |
|---|---|---|---|
| 1 | Verantwortlicher | Betreiberangaben aus `operator.ts` | – |
| 2 | Grundgedanke | (kein Verarbeitungstatbestand, sondern Einordnung) | – |
| 3 | Aufruf der Anwendung | Server-Logs: IP, Zeit, Datei, Datenmenge, Browser, Betriebssystem | Art. 6 Abs. 1 lit. f (berechtigtes Interesse: sichere Auslieferung) |
| 4 | Speicherung auf dem Endgerät | `localStorage` und IndexedDB: Profil, Messungen, Zählerstände, Tarife, Lernfortschritt, Theme, Sprache, Einwilligung, Sitzungstoken, Offline-Cache | § 25 Abs. 2 Nr. 2 TDDDG – **einwilligungsfrei**, weil unbedingt erforderlich |
| 5 | Konto und Anmeldung | E-Mail, Anzeigename, Profilbild, Nutzerkennung (Firebase Authentication) | Art. 6 Abs. 1 lit. b (Nutzungsverhältnis) |
| 6 | Speicherung im Konto | Profil, Messergebnisse, Zählerstände, Tarife, Einstellungen in Cloud Firestore, Standort `eur3 (europe-west)` | Art. 6 Abs. 1 lit. b |
| 7 | Zählerstand per Foto | Bild an eigene Cloud Function (`europe-west1`), von dort an die Gemini-API; Bild wird nicht dauerhaft gespeichert, übernommen wird nur die Zahl | Art. 6 Abs. 1 lit. b, nur bei aktiver Auslösung |
| 8 | Rückmeldungen | Text, Stimmung, Kategorie, Seite, App-Version; nur bei ausdrücklicher Zustimmung zusätzlich Screenshot und E-Mail | Art. 6 Abs. 1 lit. a bzw. lit. f |
| 9 | Nutzungsstatistik | Google Analytics 4: Cookies `_ga`, `_ga_<ID>` (bis 2 Jahre), zufällige Nutzerkennung, Seiten, Ereignisse, ungefährer Standort, Gerät, Browser | **§ 25 Abs. 1 TDDDG + Art. 6 Abs. 1 lit. a** – nur mit Einwilligung |
| 10 | Empfänger und Auftragsverarbeitung | Google Ireland Limited (Art. 28 DSGVO), GitHub B.V. | – |
| 11 | Speicherdauer | lokal bis zur Löschung; Konto bis zur Löschung; Rückmeldungen nach Auswertung; Analytics max. 14 Monate | – |
| 12 | Rechte der betroffenen Person | Auskunft (15), Berichtigung (16), Löschung (17), Einschränkung (18), Übertragbarkeit (20), Widerspruch (21), Widerruf (7 III), Beschwerde (77) | – |
| 13 | Änderungen | Zusage, bei neuen einwilligungsbedürftigen Diensten erneut zu fragen | – |

### 3.3 Zwei inhaltliche Besonderheiten

**Drittlandübermittlung.** Abschnitt 9 benennt ausdrücklich, dass eine
Übermittlung in die USA an Google LLC nicht ausgeschlossen ist, verweist auf die
Zertifizierung unter dem EU-US Data Privacy Framework und ergänzende
Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO) – und sagt zugleich, dass
sich ein Zugriff US-amerikanischer Behörden **trotz dieser Garantien nicht
vollständig ausschließen** lässt. Diese Offenheit ist bewusst.

**Das CDN der Texterkennung.** Schlägt der Gemini-Scan fehl, läuft ersatzweise
eine Texterkennung vollständig im Browser (Tesseract.js). Das Bild verlässt das
Gerät dabei nicht – der Browser lädt aber einmalig Programm- und Sprachdateien
von einem Content-Delivery-Netz (jsDelivr, `tessdata.projectnaptha.com`) und
überträgt dabei die IP-Adresse an Dritte. Auch das steht in der Erklärung,
obwohl es leicht zu übersehen wäre. Sauberer wäre, diese Dateien selbst
auszuliefern; das ist als offener Punkt notiert (Abschnitt 8).

### 3.4 Sprache

Die Rechtstexte stehen **nur auf Deutsch** – sie sind die rechtlich maßgebliche
Fassung. Die Bedienelemente ringsum (Banner, Fußzeile, Einstellungsdialog) sind
zweisprachig. Begründung: Eine übersetzte Rechtserklärung wäre eine zweite
Fassung, die auseinanderlaufen kann; welche dann gilt, wäre unklar.

---

## 4. Die Einwilligung („Cookies")

### 4.1 Die entscheidende Unterscheidung: notwendig oder einwilligungsbedürftig

§ 25 Abs. 1 TDDDG verlangt eine Einwilligung für das Speichern von
Informationen auf dem Endgerät und den Zugriff darauf. **Ausnahme**
(§ 25 Abs. 2 Nr. 2): Die Speicherung ist für einen vom Nutzer *ausdrücklich
gewünschten* Dienst **unbedingt erforderlich**.

Daraus folgt die Aufteilung in `src/features/legal/consent.ts`:

| Kategorie | Inhalt | Einwilligung nötig? |
|---|---|---|
| **notwendig** | Theme, Sprache, Wohnungsdaten, Messergebnisse, Anmeldung, Offline-Cache, die gespeicherte Einwilligung selbst | nein (§ 25 Abs. 2 Nr. 2 TDDDG) |
| **Nutzungsstatistik** | Google Analytics 4 | **ja** |

Derzeit ist genau **ein** Zweck einwilligungsbedürftig. Der Speicher für die
Einwilligungsentscheidung selbst ist notwendig – sonst müsste bei jedem Aufruf
neu gefragt werden.

### 4.2 Wie die Einwilligung technisch durchgesetzt wird

Der Punkt, der eine Umsetzung von einem bloßen Banner unterscheidet: **Ohne
Einwilligung wird Google Analytics gar nicht erst geladen.** Vier Stufen:

1. `lib/firebase.ts` initialisiert Analytics **nicht** beim Start der App; die
   Initialisierung liegt hinter `loadAnalytics()`.
2. `track()` in `features/analytics/analytics.ts` prüft `hasAnalyticsConsent()`
   **vor** dem Aufruf von `loadAnalytics()` – das SDK würde allein durch das
   Laden Cookies setzen.
3. `App.tsx` ruft bei jeder Änderung der Entscheidung `applyAnalyticsConsent()`.
4. Beim Widerruf: Erfassung aus, Googles offizieller Opt-out-Schalter
   `window['ga-disable-<Mess-ID>'] = true` als zweite Verteidigungslinie, und
   die `_ga`-Cookies werden gelöscht (`features/legal/cookies.ts`).

Nachgewiesen in `tests/unit/consent.test.ts` und im Browser geprüft: Vor einer
Entscheidung entstehen weder `_ga`-Cookies noch Anfragen an
Google-Analytics-Hosts.

**Eine verwandte Korrektur aus demselben Gedankengang:** Firestore legte beim
App-Start sofort eine IndexedDB-Datenbank auf dem Gerät an – bei jedem Aufruf,
noch bevor React rendert und bevor der Hinweis überhaupt eine Entscheidung
eingesammelt hatte, auch bei Besuchern, die sich nie anmelden. Das ließ sich mit
„unbedingt erforderlich" nicht begründen. `getDb()` verschiebt die
Initialisierung auf den ersten tatsächlichen Zugriff; alle Firestore-Aufrufe
stehen ohnehin in Funktionen, die nur für angemeldete Nutzer laufen. Ohne
Anmeldung bleibt der Gerätespeicher unberührt (`src/lib/firebase.ts`).

### 4.3 Die Gestaltung des Banners – vier Regeln, jede rechtlich begründet

Aus `features/legal/ConsentBanner.tsx`. Das ist der Abschnitt, der sich für eine
Ausarbeitung am besten eignet, weil hier Gestaltung und Recht unmittelbar
zusammenhängen:

1. **Kein Overlay, keine Sperre.** Der Hinweis liegt als schwebende Karte unten
   und lässt die App bedienbar. Ein Blocker wäre nicht nötig – ohne Einwilligung
   wird ohnehin nichts geladen – und würde die Nutzung nur stören.
2. **„Ablehnen" und „Akzeptieren" sind identisch gestaltet**: gleiche Größe,
   Farbe, Gewicht, nebeneinander auf einer Ebene. Ein farbig hervorgehobenes
   „Akzeptieren" neben einem blassen „Ablehnen" wäre ein **Dark Pattern** und
   machte die Einwilligung unwirksam, weil sie dann keine *freiwillige*
   Willensbekundung im Sinne des Art. 4 Nr. 11 DSGVO mehr wäre.
3. **Kein Schließen ohne Entscheidung, aber auch kein Zwang.** Es gibt kein „X",
   das den Hinweis wegräumt, ohne eine Wahl zu speichern – Wegklicken ist keine
   Einwilligung. Wer nichts entscheidet, bekommt schlicht keine Statistik.
4. **Widerruf so leicht wie die Erteilung** (Art. 7 Abs. 3 DSGVO): Derselbe
   Dialog ist dauerhaft über die Fußzeile und die App-Einstellungen erreichbar.
   „Cookie-Einstellungen" ist dabei ein eigener, gleich prominenter Button und
   kein kleiner Link.

Ergänzend: Ausgangspunkt jeder Auswahl ist `NONE` – **alle Zwecke aus**
(Privacy by Default, Art. 25 Abs. 2 DSGVO).

### 4.4 Nachweis und Versionierung

Zwei Mechanismen, die über das Übliche hinausgehen:

**Nachweisbarkeit (Art. 7 Abs. 1 DSGVO).** Gespeichert wird nicht nur *ob*,
sondern eine `ConsentDecision` mit `version` und `decidedAt` (ISO-8601-Zeit) –
die Entscheidung ist damit dokumentiert.

**Versionierung.** `CONSENT_VERSION` (derzeit `1`) ist an die Entscheidung
gebunden. Eine gespeicherte Entscheidung mit älterer Version gilt als **nicht
mehr gültig**; der Hinweis erscheint erneut. Der Grund: Kommt ein neuer
einwilligungsbedürftiger Dienst dazu, deckt die alte Einwilligung ihn nicht ab –
sie stillschweigend weiterzuverwenden wäre unzulässig. Die Wartungsregel lautet
deshalb: **neue Kategorie in `consent.ts` + Abschnitt in der
Datenschutzerklärung + `CONSENT_VERSION` erhöhen.**

---

## 5. Rechtsgrundlagen auf einen Blick

Diese Tabelle eignet sich als Abbildung – sie zeigt, dass nicht alles
„Einwilligung" ist:

| Verarbeitung | Rechtsgrundlage | Warum diese |
|---|---|---|
| Server-Logs beim Aufruf | Art. 6 I f DSGVO | berechtigtes Interesse an sicherer Auslieferung; ohne Logs kein Betrieb |
| Speicherung im Browser | § 25 II Nr. 2 TDDDG | unbedingt erforderlich für den gewünschten Dienst |
| Anmeldung, Cloud-Speicherung | Art. 6 I b DSGVO | Erfüllung des Nutzungsverhältnisses; Nutzung ohne Konto bleibt möglich |
| Zählerstand-Scan | Art. 6 I b DSGVO | nur auf aktive Auslösung durch den Nutzer |
| Rückmeldung | Art. 6 I a / f DSGVO | Einwilligung durch Absenden; Verbesserung der Anwendung |
| Google Analytics | § 25 I TDDDG **+** Art. 6 I a DSGVO | Endgerätezugriff und Verarbeitung, beides nur mit Einwilligung |

---

## 6. Eingesetzte Dienstleister

| Dienst | Anbieter | Wofür | Ort |
|---|---|---|---|
| Firebase Hosting | Google Ireland Limited, Dublin | Auslieferung der App | – |
| GitHub Pages | GitHub B.V., Amsterdam | zweite Auslieferung | – |
| Firebase Authentication | Google Ireland Limited | Anmeldung | – |
| Cloud Firestore | Google Ireland Limited | Konto-Daten | `eur3 (europe-west)`, EU |
| Cloud Functions | Google Ireland Limited | Zählerstand-Scan | `europe-west1` |
| Gemini-API | Google | Ziffernerkennung | – |
| Google Analytics 4 | Google Ireland Limited | Nutzungsstatistik | ggf. USA |
| jsDelivr / tessdata | Dritte (CDN) | Dateien der Texterkennung | – |

---

## 7. Wartungsregeln (aus `docs/legal.md`)

- **Neuer einwilligungsbedürftiger Dienst** (Tracking, Karten, eingebettete
  Videos, Werbung, externe Schriften …): Kategorie in `consent.ts`, Abschnitt in
  `PrivacyPage.tsx`, `CONSENT_VERSION` erhöhen, `LEGAL_LAST_UPDATED` anpassen.
- **Geänderte Verarbeitung** (neuer Anbieter, neue Region, neue Datenart):
  Abschnitt und `LEGAL_LAST_UPDATED` anpassen.
- **Neue öffentliche Seite** außerhalb der App: Links auf `/impressum` und
  `/datenschutz` nicht vergessen.
- **Betreiberwechsel:** ausschließlich `operator.ts`.

---

## 8. Grenzen und offene Punkte

Diese Punkte sind bewusst offen und sollten in einer Ausarbeitung als offen
dargestellt werden:

1. **Keine juristische Prüfung.** Die Texte sind nach bestem Wissen aufgebaut,
   aber von keiner rechtskundigen Person geprüft worden.
2. **Anschrift im Impressum.** Angegeben ist die des Campus Wilhelminenhof der
   HTW Berlin, wo das Projekt entsteht. Diensteanbieter im Sinne des § 5 DDG
   sind aber die Personen, die das Angebot betreiben – nicht der Ort, an dem es
   entstanden ist. Ein Personenname unter einer Hochschulanschrift behauptet
   eine Zustellbarkeit unter dieser Adresse; das trifft nur zu, wenn die
   Hochschule Post für diese Personen entgegennimmt. Für ein Studienprojekt
   vertretbar, für ein öffentlich beworbenes Angebot zu klären.
3. **Auftragsverarbeitungsverträge (Art. 28 DSGVO)** mit Google und GitHub: Die
   Erklärung setzt voraus, dass sie bestehen. Für Firebase geschieht das über
   das Google Cloud Data Processing Addendum – dass es akzeptiert ist, sollte
   bestätigt werden.
4. **Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)** existiert nicht.
5. **Gemini-Bedingungen** (Datenverwendung, Speicherdauer, Standort) sollten
   gegen die aktuell geltenden Google-Bedingungen abgeglichen werden.
6. **Tesseract-CDN**: Selbstauslieferung der Dateien würde den Drittanbieter
   vollständig entfallen lassen.
7. **Feedback-Screenshots** können unbeabsichtigt personenbezogene Inhalte
   enthalten; Aufbewahrungsdauer und Löschkonzept fehlen.
8. **Geteilte Wohnprofile**: Ob dabei eine gemeinsame Verantwortlichkeit
   (Art. 26 DSGVO) entsteht, ist ungeklärt.
9. **Speicherdauern** sind teils nur allgemein beschrieben; die genannten
   14 Monate für Analytics sollten in der GA4-Property gegengeprüft werden.
10. **Zuständige Aufsichtsbehörde** ist nur allgemein beschrieben und könnte
    konkret benannt werden.

---

## 9. Wo was im Quellcode steht

| Datei | Zweck |
|---|---|
| `src/features/legal/operator.ts` | Betreiberdaten, Vollständigkeitsprüfung, `LEGAL_LAST_UPDATED` |
| `src/features/legal/ImprintPage.tsx` | Impressum, Route `/impressum` |
| `src/features/legal/PrivacyPage.tsx` | Datenschutzerklärung, Route `/datenschutz` |
| `src/features/legal/LegalPage.tsx` | gemeinsames Gerüst, Unvollständigkeits-Hinweis |
| `src/features/legal/consent.ts` | Einwilligungs-Store, Kategorien, Version, Nachweis |
| `src/features/legal/ConsentBanner.tsx` | Hinweis beim ersten Besuch, Gestaltungsregeln |
| `src/features/legal/ConsentSettings.tsx` | Dialog „Cookie-Einstellungen" (Widerruf) |
| `src/features/legal/LegalFooter.tsx` | Fußzeile mit den Pflichtlinks |
| `src/features/legal/cookies.ts` | Löschen der `_ga`-Cookies beim Widerruf |
| `src/features/analytics/analytics.ts` | setzt die Einwilligung technisch durch |
| `src/lib/firebase.ts` | verzögerte Initialisierung von Firestore und Analytics |
| `tests/unit/consent.test.ts` | Tests zu Einwilligung, Version und Impressum |
| `docs/legal.md` | Wartungsanleitung im Repository |

---

## 10. Hinweise für die Weiterverarbeitung

- **Paragraphen und Artikel unverändert übernehmen** – sie sind geprüft
  zugeordnet. Insbesondere nicht „§ 5 TMG" schreiben: Die Norm heißt seit 2024
  § 5 DDG.
- **Keine Konformitätsbehauptungen.** Siehe Vorbemerkung und Abschnitt 8.
- **Gute Kandidaten für Abbildungen:** die Drei-Bausteine-Tabelle (Abschnitt 1),
  die Rechtsgrundlagen-Landkarte (Abschnitt 5), die vierstufige Durchsetzung der
  Einwilligung als Ablaufdiagramm (Abschnitt 4.2).
- **Gute Kandidaten für eine Diskussion/Reflexion:** Datenschutz durch
  Architektur statt durch Texte (3.1), Dark Patterns bei Einwilligungsdialogen
  und warum gleichwertige Buttons keine Designfrage sind (4.3), die
  Versionierung der Einwilligung als Antwort auf ein Wartungsproblem (4.4),
  sowie die Selbstkontrolle des Impressums als Beispiel dafür, wie sich eine
  organisatorische Pflicht in eine technische Prüfung übersetzen lässt (2.3).
