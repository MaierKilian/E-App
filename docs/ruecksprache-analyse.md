# Analyse: Umsetzungsstand der Rücksprache-Punkte (E-App)

> Diese Datei ordnet die Punkte aus dem Rücksprache-Protokoll dem **aktuellen
> Stand des Codes** zu. Grundlage ist eine Analyse des Repositorys (Stand: nach
> Einführung von Firebase-Account-System, Cloud-Backend und Analytics).
>
> **Legende:** ✅ umgesetzt · 🟡 teilweise umgesetzt / Bausteine vorhanden ·
> ❌ noch nicht umgesetzt · 🗂️ organisatorisch (kein Code)

---

## Schnellüberblick

| Punkt aus dem Protokoll | Status |
| --- | --- |
| Accountsystem | ✅ |
| Online-Verfügbarkeit / Custom Domain | 🟡 (live auf Firebase-Subdomain, eigene Domain offen) |
| Nachricht ans Gründungszentrum | 🗂️ |
| Zwischenspeicherung unterbrochener Messungen | 🟡 (für Kühl-/Gefrierschrank umgesetzt) |
| Raumauswahl Bad/WC/Gäste-WC | 🟡 (Redundanz bereits reduziert) |
| Messgeräte – Zuordnung der Detailinfos | 🟡 (pro Gerät eigenes Detail-Panel) |
| Messkoffer-Konzept / 3 Nutzungsmodelle | ❌ als Modell, 🟡 Bausteine |
| Einsparpotenziale: kleine Beträge / qualitatives Feedback | 🟡 |
| Quellen / Pauschalwerte / 6 % je °C | 🟡 (6 %-Regel umgesetzt, Quellen v. a. im Wissensteil) |
| Gefrierschrank-Messung selbst testen | 🗂️ (Check existiert) |
| Variante „Messungen mit Kindern" | ❌ |
| Animationen / visuelle Hilfen | 🟡 (Bilder + 1 Video) |
| Testphase (14 Tage, Vorher/Nachher) | 🟡 (Bausteine: Monitoring, Berichte) |

---

## 1. Accountsystem & Online-Verfügbarkeit (Custom Domain)

**Accountsystem – ✅ umgesetzt.**
- Anmeldung/Registrierung über **Firebase Authentication** mit **E-Mail/Passwort**
  und **Google-Login** (`src/features/auth/auth.ts`, `src/features/auth/LoginPage.tsx`).
- Globaler Anmeldestatus (`src/store/authStore.ts`), Konto-Anzeige + Abmelden im
  Profilmenü (`src/components/ProfileMenu.tsx`).
- **Gast-Nutzung mit Einschränkung:** Messungen, Monitoring und Berichte sind nur
  für angemeldete Nutzer freigeschaltet (`src/components/LoginGate.tsx`,
  eingesetzt in `src/app/App.tsx`); freie Bereiche: Zuhause/Onboarding, Wissen.
- **Login bereits im Einstieg:** Auf dem letzten Slide der Einführung wählt der
  Nutzer „Anmelden/Registrieren" oder „Als Gast fortfahren"
  (`src/components/OnboardingIntro.tsx`).
- **Cloud-Backend:** Nutzerdaten (Profil, Messungen, Zählerstände, Tarife,
  Lernfortschritt, Entwürfe) werden pro Nutzer in **Firestore** gespiegelt und
  gerätübergreifend synchronisiert (`src/features/sync/cloudSync.ts`,
  Sicherheitsregeln in `firestore.rules`).
- **Profilbild/Avatar** mit Upload und Cloud-Sync (`src/components/AvatarPicker.tsx`,
  `src/components/ui/Avatar.tsx`, `src/lib/image.ts`).

**Online-Verfügbarkeit – 🟡 teilweise.**
- Die App ist **live auf der Firebase-Subdomain** (`e-app-info.web.app`),
  Deployment per `npm run deploy:firebase` (`firebase.json`, `.firebaserc`).
- Die **eigene Domain `e-app-beta.de`** ist in Firebase angelegt, aber noch nicht
  aktiv („Needs setup" – DNS-Einträge fehlen). Bewusst zurückgestellt.

**Nachricht ans Gründungszentrum – 🗂️** organisatorisch, kein Code-Bezug.

---

## 2. Zwischenspeicherung unterbrochener Messungen

**🟡 teilweise umgesetzt – genau für die kritischen Fälle.**
- Es gibt einen dedizierten **Entwurfs-Speicher** (`src/store/measurementDraftStore.ts`,
  persistiert in `localStorage` unter `eapp-measurement-drafts`), der bereits
  eingegebene Werte einer noch nicht abgeschlossenen Messung sichert.
- Genutzt wird er von den **langlaufenden Checks**, bei denen das Problem real ist:
  **Kühlschrank** (`fridge/FridgeRun.tsx`) und **Gefrierschrank**
  (`freezer/FreezerRun.tsx`) – diese laufen über Stunden/Tage (Temperatur
  stabilisiert sich, Strommessgerät zählt ~24 h). Eingaben bleiben beim Verlassen
  erhalten und werden beim Wiederöffnen geladen (`readDraft`/`setDraft`).
- Beim Abschluss der Messung wird der Entwurf verworfen (`clearDraft` in
  `MeasurementRunner.tsx`).
- **Bonus:** Über die neue Cloud-Synchronisation werden diese Entwürfe sogar
  gerätübergreifend gesichert.

**Offen:** Die **kürzeren** Checks (z. B. Duschkopf, Standby, Raumklima) speichern
ihre Zwischeneingaben (noch) nicht persistent – dort ist das Risiko gering, weil
sie in einem Zug erledigt werden. Eine durchgängige Absicherung „App mitten im
Ablauf verlassen" für **alle** Messungen ist noch nicht vorhanden.

---

## 3. Raum- und Messgeräteauswahl

**Raumbezeichnungen (Bad/WC/Gäste-WC) – 🟡 Redundanz bereits reduziert.**
- Aktuell existieren nur noch **„Bad" (`bathroom`)** und **„WC" (`toilet`)**
  (`src/types/index.ts`, `src/i18n/locales/de.json` → `bathroom: "Bad"`,
  `toilet: "WC"`).
- Ein früher vorhandenes **„Gäste-WC" (`guest_toilet`) wird automatisch zu „WC"
  zusammengeführt** (Migration in `src/store/onboardingStore.ts`). Die im Protokoll
  kritisierte Dreifach-Redundanz ist damit auf zwei klare Begriffe reduziert.
- **Möglicher nächster Schritt:** Klärung/Schärfung der Abgrenzung „Bad" vs. „WC"
  (z. B. erklärende Untertitel), falls weiterhin Verwechslungsgefahr besteht.

**Messgeräte – Zuordnung der Detailinfos – 🟡 strukturell gegeben.**
- In der Geräteauswahl (`src/features/onboarding/steps/Step6Instruments.tsx`)
  öffnet sich **pro ausgewähltem Gerät ein eigenes Detail-Panel**
  (`InstrumentPanel`) mit den passenden Subtypen und Empfehlungen
  (`instrumentOptions.ts`, `affiliateProducts.ts`). Die Info hängt also direkt am
  jeweiligen Gerät.
- **Möglicher nächster Schritt:** Die visuelle Zuordnung noch deutlicher machen
  (z. B. Gerätename als Überschrift im Panel, klarere Gruppierung), damit auf
  einen Blick erkennbar ist, zu welchem Gerät die Detailinfos gehören.

---

## 4. Messkoffer-Konzept & drei Nutzungsmodelle

**❌ als ausformuliertes Geschäftsmodell/Feature nicht umgesetzt** (kein
„Messkoffer"-Begriff oder Modus im Code). **🟡 Bausteine vorhanden:**

1. **Nutzung mit vorhandenen Geräten** – das Onboarding erfasst die vorhandenen
   Messgeräte des Nutzers (`Step6Instruments.tsx`, `instrumentOptions.ts`).
2. **Empfohlene Sensoren per externem Link** – Affiliate-Produkte je Gerätetyp
   sind angelegt (`affiliateProducts.ts`, `AffiliateLink`/`AffiliateCard`),
   aktuell mit **Platzhalter-URLs (`#`)** – die echten Links fehlen noch.
3. **Bereitgestellter Messkoffer** – **nicht vorhanden** (weder Auswahl noch
   zugehörige Logik).

**„Möglichst viele Tests mit möglichst wenigen Sensoren":** Die Checks sind
tendenziell so gebaut, dass viele **ohne Spezialgerät** auskommen (Schätzungen
und Faustregeln statt Pflichtmessung). Das ist eine konzeptionelle Tendenz, aber
**nicht** als ausdrückliche Koffer-/Sensor-Matrix abgebildet.

---

## 5. Darstellung der Einsparpotenziale

**🟡 teilweise umgesetzt.**
- Die Aggregation (`src/features/measurements/impact.ts`) summiert **nur positive
  Sparbeträge**; Messungen ohne Euro-Wert tragen **nicht** als eigener Betrag bei.
- **Nicht jede Empfehlung ist monetär** – mehrere Checks geben bewusst
  **qualitatives Feedback** statt eines Euro-Betrags:
  - Raumklima: Status „optimal / zu kalt / zu warm" (`room_temperature`).
  - Möbel-Abstands-Check: Bewertung + Tipps (`furniture_spacing`).
  - Grundlast-Check: zählt **explizit nicht** zum Sparpotenzial, nur Orientierung
    (Hinweistext im Ergebnis).

**Offen:** Eine gezielte Logik „**sehr kleine Beträge weniger hervorheben, aber in
der Gesamtsumme mitführen**" (z. B. über einen Schwellenwert/abgestufte
Darstellung) ist **noch nicht** implementiert – aktuell wird jeder positive
Euro-Wert gleichwertig angezeigt.

---

## 6. Belastbarkeit: Quellen, Pauschalwerte, 6 % je °C

**🟡 teilweise umgesetzt.**
- **6 %-Faustregel ist konkret im Code:**
  - Kühl-/Gefrierschrank: `PERCENT_PER_DEGREE = 0.06` (`fridge/fridge.ts`,
    Kommentar: „mehrere Quellen, teils 6–10 %").
  - Heizen/Raumklima: ebenfalls 6 % Heizenergie je °C (`room_temperature/roomClimate.ts`).
- **Pauschal-/Standardwerte bei fehlenden Angaben:** sinnvolle Defaults im Profil
  (`onboardingStore.ts`: 2 Personen, Baujahr 1990, 70 m² …) und Preis-Defaults
  (`tariffStore.ts`: 35 ct/kWh Arbeitspreis, 12 €/Monat Grundpreis). CO₂-Faktor
  0,38 kg/kWh als Pauschale (`impact.ts`).
- **Quellen/Belege:** Echte Quellenangaben gibt es im **Wissens-Bereich**
  (`EducationPage.tsx` → `SourceLink`, `educationContent.ts` mit Quellen).

**Offen:** In den **Mess-Ergebnissen selbst** sind die zugrunde liegenden Quellen
bisher **nur als Code-Kommentar** hinterlegt, nicht für Nutzer sichtbar. Eine
sichtbare Quellen-/Methodenangabe an den Ergebnissen wäre ein sinnvoller Ausbau.

**Gefrierschrank-Check selbst testen – 🗂️** organisatorisch (Eigentest); der
Check ist im Code vorhanden (`freezer/FreezerRun.tsx`, `freezer`-Config).

---

## 7. Variante „Messungen mit Kindern" & visuelle Hilfen

**Kindermodus – ❌ nicht umgesetzt.** Es gibt **keine** Abfrage
„allein / mit anwesenden Kindern / aktiv durch Kinder" und keinen spielerischen
Modus. (Treffer wie „Kinderzimmer" im Code beziehen sich auf den Raumtyp
`children_room`, nicht auf einen Kindermodus.)

**Visuelle Hilfen / Animationen – 🟡 teilweise.**
- Mess-Intros zeigen **Illustrationen** (`IntroHeroImage.tsx`) und beim
  **Duschkopf-Test ein echtes Video/Animation** (`public/measurements/showerhead.mp4`,
  `IntroHeroVideo.tsx`), vergrößerbar über `MediaLightbox.tsx`.
- Jeder Check hat eine **„So funktioniert's"-Anleitung** mit Schritten und
  ausklappbaren Details (i18n je Messung).

**Offen:** Durchgängige Animationen für **alle** Checks und ein kindgerechter,
spielerischer Ablauf fehlen noch.

---

## 8. Testphase (≈ 14 Tage, Vorher/Nachher)

**🟡 Bausteine vorhanden, geführte Testphase nicht.**
- **Zählerstände dokumentieren:** Das **Monitoring** erfasst Zählerstände über die
  Zeit inkl. Verlauf, Trends und Ablese-Erinnerung (`features/monitoring/*`,
  `store/readingsStore.ts`, `ReadingReminder`, Charts/Sparkline).
- **Messungen + Umsetzung:** Messungen und konkrete Empfehlungen/Tipps existieren
  (`features/measurements/*`, `features/tips/*`).
- **Vorher/Nachher dokumentieren:** Berichte/PDF-Export sind vorhanden
  (`features/reports/*`).

**Offen:** Eine **geführte 14-Tage-Testphase** als eigenes Feature (Phasen:
Erst-Erfassung → Maßnahmen → Zweit-Erfassung → automatischer Vorher/Nachher-
Vergleich) gibt es **nicht**. Die Daten dafür wären aber bereits vorhanden.

---

## Zusätzlich seit der Rücksprache umgesetzt (über das Protokoll hinaus)

- **Komplettes Firebase-Setup:** Hosting live, Authentication (E-Mail + Google),
  Firestore-Cloud-Backend mit Sicherheitsregeln, Daten-Synchronisation pro Nutzer.
- **Firebase Analytics:** automatische Ereignisse `page_view`, `login`, `sign_up`
  (`src/features/analytics/analytics.ts`, `lib/firebase.ts`).
- **Profilbild/Avatar** inkl. Upload und Cloud-Sync.
- **Gast-Einschränkungen** (LoginGate) als Motivation zur Registrierung.

---

## Wichtige offene Punkte / Empfehlungen

1. **DSGVO/Recht:** Es gibt **noch keinen Cookie-/Einwilligungsbanner und keine
   Datenschutzerklärung** im Code (Suche nach „consent/privacy/cookie" ohne
   Treffer). Da Analytics jetzt aktiv ist und Daten erhebt, ist das vor breiter
   Bewerbung dringend nachzuholen.
2. **Custom Domain `e-app-beta.de`** aktivieren (DNS-Einträge setzen).
3. **Affiliate-Links** mit echten URLs hinterlegen (aktuell Platzhalter `#`).
4. **Einsparpotenzial-Darstellung** um Schwellenwerte für „Kleinbeträge" ergänzen.
5. **Sichtbare Quellen/Methodik** an den Mess-Ergebnissen ergänzen.
6. **Konzept Messkoffer + 3 Nutzungsmodelle** als Auswahl/Feature ausarbeiten.
7. **Kindermodus** und durchgängige Animationen als spätere Ausbaustufe.
8. **Geführte Testphase** (Vorher/Nachher) als eigenes Modul auf Basis des
   bestehenden Monitorings.
