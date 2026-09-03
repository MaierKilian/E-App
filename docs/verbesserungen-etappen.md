# Verbesserungen – Etappen-Tracker

> **Arbeitsdokument.** Es löst die Sammelliste
> `weitere_Verbesserungen_der_Eapp.txt` für die noch offenen Punkte ab: dort
> steht *was* gemeldet wurde, hier steht *wie* es umgesetzt wird und wo wir
> stehen.
>
> **Nach jeder abgeschlossenen Etappe wird dieses Dokument aktualisiert** –
> Status, Datum, Commit. Es ist die einzige Quelle für „wo stehen wir".

## So wird gearbeitet

Eine Etappe pro Session. Einstieg:

```
/verbesserung          → nimmt die nächste offene Etappe
/verbesserung 3        → nimmt gezielt Etappe 3
/verbesserung status   → nur der Stand, ohne zu arbeiten
```

Jede Etappe endet mit: Typecheck grün, ESLint grün, Tests grün, Abnahmeliste
ehrlich abgehakt, Commit auf dem Arbeits-Branch, Push – und einer
aktualisierten Statuszeile hier. Den Merge nach `main` macht Kilian (siehe
„Der Merge nach `main` gehört dem Menschen" in `CLAUDE.md`); der Auto-Deploy
läuft erst danach.

**Die Etappen sind bewusst unterschiedlich groß.** Vor dem Start wird die
Größe genannt, damit sich nach verbleibendem Usage-Fenster entscheiden lässt,
was noch reinpasst.

### Wie die Schätzung zustande kommt

Kalibriert an Runde 5 (25.08.2026), wo der Usage-Stand mehrfach mitgeschrieben
wurde: Der Aufräum-Batch kostete rund **8 %**, die Standby-Etappe mit
Nacharbeiten rund **20 %**. Daraus:

| Größe | Usage (Erfahrungswert) | Dauer | Berührte Dateien | Zum Vergleich aus Runde 5 |
|---|---|---|---|---|
| **S** | 5–10 % | ~30 min | 1–3 | „Trendlinie bei einem Messwert" |
| **M** | 10–20 % | ~1 h | 4–8 | „Gefrierschrank-Check neu" |
| **L** | 20–35 % | ~2 h | 8–15 | „Frei wählbarer Zeitraum im Monitoring" |

Die Schätzung ist eine Schätzung. Ein unerwarteter Befund kann eine M-Etappe
auf L heben – **dann wird das gesagt, nicht durchgezogen.** Läuft das Fenster
mitten in einer Etappe aus, wird der erreichte Stand committet und im Tracker
als „angefangen" vermerkt; halbfertige Arbeit bleibt nie uncommittet liegen.

### Was in mein Fenster passt

| Restbudget | Vorschlag |
|---|---|
| **~10 %** | eine S-Etappe: 7, 9 oder 11 |
| **~20 %** | eine M-Etappe, oder zwei S |
| **~30 %** | eine L-Etappe, oder M + S |
| **~50 %** | L + M, oder drei M |
| **> 60 %** | 3 + 4 zusammen (Landkarte und Steckbrief gehören inhaltlich zusammen) |

Kilian nennt zu Beginn der Session Usage-Stand und Zeit bis zum Reset. Daraus
wird ein Vorschlag gemacht – **die Auswahl trifft er.**

## Stand

| # | Etappe | Punkte | Größe | ~Usage | Status | Abgeschlossen | Commit |
|---|---|---|---|---|---|---|---|
| 1 | Impressum und Datenschutzerklärung | 1.4 | M | 15 % | ✅ fertig | 2026-09-03 | `05c2b14` |
| 2 | Einwilligung vor Analytics | 1.3 | M | 15 % | ✅ fertig | 2026-09-03 | `05c2b14` |
| 3 | Die Feld-Landkarte | 21.1 (neu) | M | 15 % | ✅ fertig | 2026-09-03 | `b9aa6af` |
| 4 | Haushalts-Steckbrief im Bericht | 4.2a, 21.1 | L | 30 % | ✅ fertig | 2026-09-03 | `1faeb82` |
| 5 | Handlungsplan im Bericht | 4.2b | M | 20 % | ✅ fertig | 2026-09-03 | `7011fec` |
| 6 | Richtwerte mit Primärquellen | 4.1 | L | 30 % | offen ⚠️ | | |
| 7 | HTW raus aus dem Fragebogen | 1.5 | S | 8 % | ✅ fertig | 2026-09-03 | `29ea4ec` |
| 8 | Kellerklima statt Wohnraum-Maßstab | 18.1 | M | 18 % | ✅ fertig | 2026-09-03 | `5ac71ac` |
| 9 | Zwei kleine Nacharbeiten | 4.5, 8.3 | S | 8 % | ✅ fertig | 2026-09-03 | `fe7c714` |
| 10 | Warmwasser belastbar und transparent | 9.2, 9.3, 13.2 | M | 18 % | ✅ fertig | 2026-09-03 | `e06fa74` |
| 11 | Duschkopf-Empfehlung neu formulieren | 13.1 | S | 8 % | offen 💬 | | |
| 12a | Geräte bekommen eine Identität | 18.2 | M | 18 % | ✅ fertig | 2026-09-03 | `cc13d24` |
| 12b | Ein Ergebnis je Gerät | 18.2 | L | 30 % | ✅ fertig | 2026-09-03 | `7f84372` |
| 12c | Tipps, Bericht und Folgemessungen nachziehen | 18.2 | M | 18 % | ✅ fertig | 2026-09-03 | `cf6ee4d` |
| 12d | Der Raum wird benutzt | 18.2 | M | 18 % | offen | | |

⚠️ **Etappe 6 braucht Kilian am PC** – siehe dort. Die Quellen-Links lassen
sich in dieser Umgebung finden, aber nicht öffnen; sie müssen von Hand geprüft
werden. Am Handy ist die Etappe wenig sinnvoll.

💬 **Etappe 11 beginnt mit einem Vorschlag**, nicht mit Code – die Formulierung
wird abgestimmt, bevor sie gebaut wird.

**Abhängigkeiten:**

- **4 braucht 3.** Der Steckbrief schließt die Lücken, die die Landkarte
  überhaupt erst sichtbar macht.
- **5 braucht 4** nur lose (gemeinsames Kapitel-Gerüst im PDF); wer 5 zuerst
  macht, baut das Gerüst eben dort.
- **6 hat ein Risiko** (siehe dort): der Netzzugang dieser Umgebung erlaubt
  Suche, aber kein Abrufen einzelner Seiten.
- **12a → 12b → 12c** ist eine feste Kette. **12d** braucht 12b.
  Konzept: `docs/geraete-concept.md`. Nach 12b zeigt der Bericht kurzzeitig
  weniger als die App – **12c nicht liegen lassen.**
- Alles andere ist unabhängig und kann in beliebiger Reihenfolge kommen.

## Vorab geklärt (nichts mehr zu tun)

- **5.1 (Trend-Prozent)** – erledigt durch `9ad1c1e`. In Runde 5 hatte ich den
  Fehler nicht gefunden und den Punkt zur Rückfrage zurückgestuft; das war
  falsch. Der Jahresvergleich verlangte nur, dass die *Historie* weit genug
  zurückreicht, nicht dass im Vergleichsfenster Ablesungen liegen – bei einer
  385-Tage-Lücke wurde interpoliert (+52 % statt ~17 %).
- **1.2 (Verwalten-Button)** – identifiziert: `ProfileSwitcher.tsx:284`, der
  Knopf in der Wohnungs-/Profil-Auswahl. Es gibt in der ganzen App keinen
  zweiten. Was damit passieren soll, ist weiter offen.
- **10.1 (LED-Check)** – der Check selbst ist in Ordnung: `LightingRun.tsx:74`
  fängt die leere Raumliste mit Hinweis und „Raum anlegen" ab. Der gemeldete
  Befund ist mit hoher Wahrscheinlichkeit dasselbe Symptom wie 19.1 – ein
  hängengebliebener Fragebogen-Zustand, den erst das Löschen der Browserdaten
  gelöst hat. **Bitte einmal im Handy-Firefox gegenprüfen**, dann wird der
  Punkt geschlossen.

---

## Etappe 1 – Impressum und Datenschutzerklärung

> **Ziel:** Die App hat die zwei Rechtstexte, die sie als öffentlich
> erreichbares Telemedien-Angebot braucht – mit Platzhaltern dort, wo nur
> Kilian die Angaben liefern kann.
> Punkte: 1.4

### Ausgangslage

Es gibt **beides nicht**. Kein Impressum, keine Datenschutzerklärung, keine
Route dafür (`App.tsx` kennt weder `/impressum` noch `/datenschutz`), kein
Link im Footer oder in den Einstellungen. Die Einstellungen haben lediglich
einen Abschnitt „Datenschutz" mit einem Analytics-Schalter
(`SettingsPage.tsx:174`).

Verarbeitet wird trotzdem einiges, und das gehört in die Erklärung:

| Was | Wo im Code | Was das datenschutzrechtlich bedeutet |
|---|---|---|
| Firebase Hosting | `firebase.json` | Server-Logs mit IP-Adresse, Google Ireland/LLC |
| Firebase Auth | `src/features/auth/` | E-Mail, Anmeldezeitpunkte |
| Firestore | `src/lib/firebase.ts` | Profil, Ablesungen, Messergebnisse – Klardaten |
| Firebase Analytics | `src/features/analytics/analytics.ts` | Nutzungsstatistik, Gerätekennung (siehe Etappe 2) |
| Cloud Function `scanMeter` | `functions/index.js` | **Zählerfoto geht an die Gemini-API** |
| localStorage | `persist`-Middleware | Alles auch lokal, auch ohne Anmeldung |

Der Zähler-Scan ist der Punkt, den man leicht übersieht: Ein Foto des Zählers
verlässt das Gerät und wird von einem Google-Modell ausgewertet. Das muss in
der Erklärung stehen, mitsamt Zweck, Rechtsgrundlage und Speicherdauer.

Immerhin: **keine externen Ressourcen.** `index.html` lädt keine Google Fonts,
kein CDN, keine Tracking-Pixel; alle Bilder liegen im eigenen Bundle. Die
klassische „Google-Fonts-Abmahnung" greift hier nicht.

### Zu tun

- **`src/features/legal/ImprintPage.tsx`** – Impressum nach § 5 DDG (früher
  § 5 TMG) und § 18 Abs. 2 MStV. Platzhalter als sichtbare, nicht zu
  übersehende Marker (`[NAME]`, `[ANSCHRIFT]`, `[E-MAIL]`, `[TELEFON]`),
  nicht als Blindtext, der versehentlich live geht.
  Inhalt: Diensteanbieter, Kontakt, Verantwortlicher i. S. d. § 18 Abs. 2 MStV,
  Haftung für Inhalte (§ 7 Abs. 1, §§ 8–10 DDG), Haftung für Links,
  Urheberrecht, EU-Streitschlichtung (Art. 14 ODR-VO), Hinweis nach § 36 VSBG.
- **`src/features/legal/PrivacyPage.tsx`** – Datenschutzerklärung nach
  Art. 13 DSGVO, gegliedert nach Verarbeitungsvorgängen (Tabelle oben), je
  Vorgang: Zweck, Rechtsgrundlage (Art. 6 Abs. 1 lit. a/b/f), Empfänger,
  Drittlandübermittlung (Google LLC, EU-US Data Privacy Framework),
  Speicherdauer. Dazu die Betroffenenrechte (Art. 15–21) und das
  Beschwerderecht (Art. 77).
- **Ein gemeinsames `LegalPage`-Gerüst** – die zwei Seiten sind
  Fließtext-Seiten mit Überschriften; keine zwei Layouts bauen.
- **Routen** `/impressum` und `/datenschutz` in `App.tsx`, erreichbar **ohne
  Anmeldung** (das ist der Sinn eines Impressums).
- **Verlinkung** an drei Stellen: Einstellungen (neuer Abschnitt „Rechtliches"),
  Landing-Page-Footer, und aus dem Einwilligungs-Schirm der Etappe 2.
- **Texte auf Deutsch und Englisch.** Die englische Fassung bekommt den
  Hinweis, dass im Streitfall die deutsche gilt.

### Fertig, wenn

- Beide Seiten sind ohne Anmeldung erreichbar und von jeder Seite der App aus
  in höchstens zwei Tipps zu finden.
- Jeder Platzhalter ist im gerenderten Text als solcher erkennbar.
- Die Datenschutzerklärung nennt **alle sechs** Verarbeitungen aus der Tabelle,
  den Zähler-Scan eingeschlossen.
- Kein Rechtstext behauptet etwas, das der Code nicht tut (kein
  „wir setzen keine Cookies", solange Analytics läuft).
- Beide Sprachen vollständig, keine Mischsprache.

### Was ausdrücklich nicht dazugehört

Rechtsberatung. Der Text ist nach bestem Wissen aufgebaut und benennt die
tatsächlichen Verarbeitungen – geprüft werden muss er von einem Menschen mit
Zulassung, bevor die App öffentlich beworben wird.

---

## Etappe 2 – Einwilligung vor Analytics

> **Ziel:** Nichts wird auf dem Gerät gespeichert oder ausgelesen, bevor der
> Nutzer zugestimmt hat – außer dem, was die App zum Funktionieren braucht.
> Punkte: 1.3

### Ausgangslage – hier liegt ein echter Rechtsverstoß

Zwei Befunde, beide belegt:

**1. Analytics startet vor jeder Einwilligung.** `src/lib/firebase.ts:102`:

```ts
export const analyticsReady: Promise<Analytics | null> = isSupported().then(
  (ok) => (ok ? getAnalytics(app) : null),
)
```

Das läuft beim Import des Moduls, also beim App-Start. `getAnalytics()` legt
seine Kennung im Speicher des Geräts ab und feuert das automatische
`session_start`. Der Schalter wird erst **danach** angewandt –
`syncAnalyticsConsent()` ruft `setAnalyticsCollectionEnabled()` auf, wenn das
Kind schon im Brunnen liegt.

**2. Der Schalter steht auf „an".** `settingsStore.ts:73`: `analyticsEnabled: true`.
Das ist ein Opt-out.

§ 25 Abs. 1 TDDDG verlangt für das Speichern von Informationen auf der
Endeinrichtung und den Zugriff darauf eine **vorherige** Einwilligung. Die
Ausnahme in Abs. 2 gilt nur für unbedingt Erforderliches – Nutzungsstatistik
ist das nicht. Ein Opt-out-Schalter, der zudem zu spät greift, erfüllt das
nicht. Zusätzlich fehlt die Information nach Art. 13 DSGVO (Etappe 1).

Was **nicht** betroffen ist: der `localStorage` für Profil, Ablesungen und
Messergebnisse. Das ist der ausdrücklich gewünschte Dienst selbst und fällt
unter § 25 Abs. 2 Nr. 2. Ebenso das Theme im `<head>` von `index.html` – es
liest nur, was der Nutzer selbst eingestellt hat.

### Zu tun

- **`getAnalytics` erst nach Einwilligung.** `analyticsReady` wird von einer
  Konstante zu einer Funktion, die beim ersten Aufruf initialisiert – und die
  ohne Einwilligung `null` liefert, ohne Firebase Analytics überhaupt
  anzufassen.
- **Voreinstellung auf `false`** in `settingsStore.ts`. **Achtung Migration:**
  Bestandsnutzer haben `analyticsEnabled: true` im persistierten Zustand
  stehen – das ist aber keine Einwilligung, sondern die alte Voreinstellung.
  Deshalb ein *neues* Feld `analyticsConsent: 'granted' | 'denied' | null`
  mit `null` als Start; das alte Feld bleibt als abgeleiteter Wert erhalten,
  damit der Schalter in den Einstellungen weiter funktioniert.
- **Einwilligungs-Schirm beim ersten Start**: gleichwertige Knöpfe
  („Einverstanden" / „Nur Notwendiges"), kein Dark Pattern, mit Link auf die
  Datenschutzerklärung. Ablehnen ist genauso leicht wie Zustimmen – sonst ist
  die Einwilligung nach Art. 4 Nr. 11 DSGVO nicht freiwillig.
- **Widerruf jederzeit**: der bestehende Schalter in den Einstellungen bleibt,
  bekommt aber den Hinweis, dass ein Widerruf die künftige Erhebung beendet.
- **Nichts sperren.** Wer ablehnt, benutzt die App vollständig. Der Schirm
  erscheint einmal; die Entscheidung wird gespeichert.

### Fertig, wenn

- Ein frischer Browser lädt die App, und in den Entwicklertools ist **vor**
  der Entscheidung kein Analytics-Eintrag im Speicher und kein Aufruf an
  `google-analytics.com` zu sehen.
- „Nur Notwendiges" führt dazu, dass auch nach Neustart nichts erhoben wird.
- Ein Bestandsnutzer mit `analyticsEnabled: true` bekommt den Schirm **einmal**
  gezeigt und wird nicht stillschweigend als einwilligend behandelt.
- Der Widerruf in den Einstellungen wirkt sofort.
- Profil, Ablesungen und Messergebnisse funktionieren bei Ablehnung
  unverändert.

---

## Etappen 1 und 2 – übernommen statt neu gebaut (2026-09-03)

**Die Arbeit lag schon fertig da.** Auf dem nie gemergten Branch
`claude/sync-4skr8y` steht seit dem 23.08.2026 der Commit `8dca28f`
„Impressum, Datenschutzerklärung und Einwilligung nach DSGVO/TDDDG" – er
setzt beide Etappen um, mit genau dem Dateischnitt, den der Plan hier
vorsieht (`LegalPage`-Gerüst, `ImprintPage`, `PrivacyPage`, Einwilligungs-
Store). Der Etappenplan wurde gegen `main` geschrieben und konnte ihn deshalb
nicht sehen; „Es gibt beides nicht" stimmte für `main`, nicht fürs Repository.

Übernommen per Cherry-Pick, ein einziger Konflikt (`settingsStore.ts`):
`analyticsEnabled` fällt weg wie im übernommenen Stand, die seither
dazugekommenen Felder `pvPromptDismissed` und `plausibilityAccepted` bleiben.
Typecheck, ESLint, 754 Tests und der Produktions-Build sind grün; die
Übernahme bringt 17 Tests in `tests/unit/consent.test.ts` mit.

**Abnahme Etappe 1:**

- [x] Beide Seiten ohne Anmeldung erreichbar (`App.tsx` führt `/impressum` und
      `/datenschutz` am `FirstVisitGate` vorbei), verlinkt aus Fußzeile,
      Einstellungen, Landing Page und `/neu`.
- [x] Platzhalter sichtbar: `operator.ts` ist leer, fehlende Pflichtfelder
      markiert die Impressumsseite als „noch einzutragen".
- [x] Alle sechs Verarbeitungen genannt, der Gemini-Zählerscan eingeschlossen.
- [x] Kein Rechtstext behauptet etwas, das der Code nicht tut.
- [ ] **Weicht ab: nur deutsch, nicht zweisprachig.** Der übernommene Stand
      begründet das in `docs/legal.md` – die Rechtstexte sind die maßgebliche
      Fassung, die Bedienelemente ringsum (Banner, Fußzeile, Einstellungen)
      bleiben zweisprachig. Der Plan hier wollte beide Sprachen mit dem
      Hinweis, dass im Streitfall die deutsche gilt. Beides ist vertretbar –
      **Kilian entscheidet**, ob die englische Fassung nachgezogen wird.

**Abnahme Etappe 2:**

- [x] Analytics wird ohne Einwilligung gar nicht geladen: `lib/firebase.ts`
      initialisiert nicht mehr beim Import, `track()` prüft
      `hasAnalyticsConsent()` **vor** `loadAnalytics()`.
- [x] Bestandsnutzer werden nicht stillschweigend als einwilligend behandelt:
      `analyticsEnabled` wird beim Laden verworfen (Store-Version 3).
- [x] Widerruf wirkt sofort und löscht die `_ga`-Cookies (`cookies.ts`).
- [x] Ablehnen sperrt nichts; Profil, Ablesungen und Messergebnisse laufen
      unverändert (sie fallen unter § 25 Abs. 2 Nr. 2).
- [ ] **Im Browser noch zu prüfen:** dass in einem frischen Profil vor der
      Entscheidung kein Analytics-Eintrag im Speicher und kein Aufruf an
      `google-analytics.com` steht. Statisch ist der Weg dicht, der Beleg aus
      den Entwicklertools fehlt.

**Offen für Kilian:** Die Betreiberangaben in `src/features/legal/operator.ts`
sind leer. `docs/legal.md` listet neun Punkte, die ein Mensch mit Zulassung
prüfen sollte, bevor die App öffentlich beworben wird.

---

## Etappe 3 – Die Feld-Landkarte

> **Ziel:** Für jede Angabe des Fragebogens ist im Code hinterlegt, wer sie
> verwertet – und ein Test schlägt an, wenn ein Feld keinen Abnehmer hat.
> Punkte: neu aufgenommen als 21.1

### Ausgangslage – die Hälfte der Fragen läuft ins Leere

Auszählung über `OnboardingData` (30 Felder) gegen die drei Verwerter
`src/features/measurements` + `src/features/tips`, `src/features/monitoring`
und `src/features/reports`:

**Verwertet (14):** `profileName`, `personsCount`, `buildingYear`,
`livingArea`, `rooms`, `heatGenerators`, `hotWaterType`, `instruments`,
`completed`, `mode`, `goals`, `hasPV`, `appliances`, `appliancesAnswered`.

**Ohne Abnehmer (15):** `roomsCount`, `buildingType`, `locationMode`,
`postalCode`, `occupancyStatus`, `floors`, `windowAge`, `hasExtraFireplace`,
`ventilationType`, `insulationState`, `smartHomeDevices`, `renovations`,
`heatGeneratorYears`, `lastRenovationYear`, `renovationItems`.

(`profileImage` zählt nicht mit – ein Bild braucht keinen Verwerter.)

Diese 15 Felder werden erhoben, gespeichert, in die Cloud synchronisiert, im
Fragebogen zusammengefasst – und danach nie wieder gelesen. Zwei Sonderfälle:

- `renovations` und `renovationItems` fließen in `estimateEnvelope()`
  (`estimateEnergy.ts:88`), das aber **nur im Fragebogen selbst** benutzt wird
  (`StepRenovationLog.tsx:257`). Die Frage wertet sich selbst aus – das zählt
  nicht.
- `heatGeneratorYears` erreicht über `boilerAgeYears()` einen Tipp
  (`buildTips.ts:671`). Das ist ein echter Abnehmer, aber ein einzelner.

### Zu tun

- **`src/features/onboarding/fieldUsage.ts`** – eine Tabelle
  `Record<keyof OnboardingData, FieldUsage>`, wobei `FieldUsage` die Verwerter
  benennt (`'measurements' | 'monitoring' | 'report' | 'tips'`) plus eine
  Begründung im Klartext. Felder ohne Abnehmer bekommen `consumers: []` und
  eine Zeile, warum das (noch) so ist.
- **Ein Test, der nicht durchgehen lässt.** `tests/unit/fieldUsage.test.ts`
  prüft zweierlei:
  1. Die Tabelle deckt **jedes** Feld von `OnboardingData` ab – ein neues Feld
     ohne Eintrag lässt den Test rot werden. (Über `satisfies Record<keyof
     OnboardingData, …>` fängt das schon der Typechecker; der Test sichert,
     dass niemand den Typ aufweicht.)
  2. Die Menge der Felder ohne Abnehmer entspricht **genau** einer im Test
     festgehaltenen Liste. Wer ein Feld anschließt, muss die Liste kürzen –
     wer ein totes Feld hinzufügt, muss sie erweitern und dabei erklären.
- **Der Abschluss-Schirm „Wofür wir das nutzen"** am Ende des Fragebogens:
  eine ruhige Aufstellung, welche Angabe wo landet, gespeist aus derselben
  Tabelle. Kein Abzeichen an jeder einzelnen Frage – für einen neuen Nutzer,
  der noch nichts gemessen hat, sagt „Monitoring" an einer Frage nichts.
- **Dieselbe Aufstellung in der Profil-Übersicht**, wo sie nach ein paar
  Wochen Nutzung tatsächlich etwas erklärt.

### Fertig, wenn

- [x] `npx tsc -b --noEmit` schlägt fehl, wenn man `OnboardingData` um ein Feld
  erweitert, ohne die Tabelle zu pflegen. Probeweise ausprobiert: ein
  eingefügtes Feld erzeugt TS1360 in `fieldUsage.ts`, danach zurückgenommen.
- [x] Der Test benennt die toten Felder namentlich – `OHNE_ABNEHMER` in
  `tests/unit/fieldUsage.test.ts` listet alle 15 einzeln.
- [x] Der Abschluss-Schirm liest aus der Tabelle, hat also keine zweite
  Wahrheit. `FieldUsageSummary` importiert ausschließlich aus `fieldUsage.ts`.
- [x] Kein Feld wurde entfernt; `OnboardingData` ist unverändert.

### Unterwegs entschieden (2026-09-03)

- **`labelKey` ist optional, und das ist die Trennlinie.** Ein Feld ohne
  Beschriftung taucht in der Aufstellung nicht auf – `completed`, `mode`,
  `locationMode`, `profileImage` und `appliancesAnswered` sind innerer Zustand,
  keine beantwortete Frage. In der Tabelle stehen sie trotzdem, weil der Test
  jedes Feld abdecken soll.
- **`usageOf()` statt direktem Zugriff.** `satisfies` behält den engen Typ je
  Eintrag – ein Eintrag ohne `labelKey` kennt die Eigenschaft dann gar nicht.
  Für die Tabelle ist das genau richtig, zum Auslesen zu eng.
- **Die Auszählung des Plans stimmt.** Gegengeprüft: Auch `occupancyStatus`
  hat wirklich keinen Abnehmer – die Angabe steht zwar im Test-Profil von
  `buildTips`, wird dort aber nie gelesen.
- **Zwei vorhandene i18n-Schlüssel wiederverwendet, fünf neu.** 20 der
  Beschriftungen standen schon unter `onboarding.step8.labels`; neu sind nur
  `rooms`, `instruments`, `renovations`, `heatGeneratorYears`, `appliances`
  unter `onboarding.fieldUsage.labels`.

---

## Etappe 4 – Haushalts-Steckbrief im Bericht

> **Ziel:** Der PDF-Bericht beginnt mit einer Seite „Das ist dein Haushalt" –
> und verwertet damit auf einen Schlag die Felder, die Etappe 3 als tot
> ausgewiesen hat.
> Punkte: 4.2 (erster Teil), schließt den Großteil von 21.1

### Ausgangslage

Der Bericht kennt vom Profil **zwei** Felder: `profile.profileName` und
`profile.rooms`. Mehr steht nicht drin (Auszählung über
`src/features/reports/`). Ein Energieberater, dem man das PDF hinlegt, erfährt
also, wie die Wohnung heißt und welche Räume sie hat – nicht, wie alt das Haus
ist, womit geheizt wird oder wann zuletzt saniert wurde.

### Zu tun

- **Neues Kapitel** vor „Messungen", im Stil der vorhandenen Kapitel
  (Seitenumbruch je Kapitel ist schon da – siehe 4.3).
- **Vier Blöcke**, jeweils als beschriftete Wertepaare:
  - *Gebäude* – Typ, Baujahr, Wohnfläche, Geschosse, Dämmzustand, Fensteralter,
    Lüftung
  - *Haushalt* – Personen, Räume, Mieter/Eigentümer, Postleitzahl (nur die
    ersten zwei Stellen, siehe unten)
  - *Anlagentechnik* – Wärmeerzeuger mit Baujahr, Warmwasser, Kaminofen, PV,
    Smart-Home, vorhandene Messgeräte
  - *Sanierungen* – der Ereignis-Log aus `renovations`, chronologisch, mit dem
    ausdrücklichen Unterschied zwischen „nie saniert" (`[]`) und „nicht
    beantwortet" (`null`)
- **Fehlende Angaben werden benannt, nicht verschwiegen.** Ein Feld ohne
  Antwort erscheint als „nicht angegeben" – ein Bericht, der die Lücke
  versteckt, verleitet dazu, die Zahlen für vollständig zu halten.
- **Datensparsamkeit:** Die volle Postleitzahl macht den Bericht in Verbindung
  mit Wohnfläche und Baujahr gut identifizierbar. Zwei Stellen genügen für die
  Einordnung.
- **`fieldUsage.ts` nachziehen** – jedes hier angeschlossene Feld bekommt
  `'report'` als Abnehmer, und die Liste der toten Felder im Test schrumpft
  entsprechend.

### Fertig, wenn

- [~] **Zehn statt zwölf angeschlossen.** Übrig bleiben fünf: `profileImage`
  (ein Bild braucht keinen Verwerter), `roomsCount` und `locationMode` (rein
  steuernd), `lastRenovationYear` und `renovationItems` (beide aus
  `renovations` abgeleitet, das im Steckbrief steht). Der Plan nannte drei
  Kandidaten und rechnete mit zwölf; `renovationItems` gehört in dieselbe
  Kategorie wie `lastRenovationYear` und ist der vierte. Ein abgeleitetes Feld
  zusätzlich anzuschließen, hieße dieselbe Angabe zweimal in den Bericht zu
  schreiben – die Zahl wäre erreicht, der Bericht schlechter. Jede der fünf
  Begründungen steht in `fieldUsage.ts`.
- [x] Der Test aus Etappe 3 ist grün, weil die Liste gekürzt wurde – die
  Prüfung selbst ist unverändert.
- [x] Ein Schnellstart-Profil erzeugt ein lesbares Kapitel; ein Test hält
  fest, dass nicht jede Zeile leer ist.
- [x] Das Demo-Profil erzeugt ein vollständiges Kapitel – ein Test prüft, dass
  keine einzige Zeile „nicht angegeben" trägt.
- [x] Beide Sprachen: Die Tests übersetzen gegen `de.json` **und** `en.json`;
  ein fehlender Schlüssel fällt dort auf. Ein PDF-Export von Hand wurde in
  dieser Umgebung nicht durchgeführt – es fehlt ein PDF-Renderer.

### Unterwegs entschieden (2026-09-03)

- **Der Steckbrief ist kein wählbarer Abschnitt.** `reportTypes.ts` hielt
  bisher fest, Profildaten seien bewusst draußen: „Stammdaten, die der
  Empfänger ohnehin kennt". Die Begründung hält nicht – wer das PDF bekommt,
  ist typischerweise gerade jemand, der die Wohnung *nicht* kennt. Der Vermerk
  dort ist umgeschrieben, der frühere Beschluss (`04166d7`) damit ausdrücklich
  aufgehoben. Abwählbar wird er trotzdem nicht.
- **Inhalt getrennt vom Zeichnen.** `profileReportData.ts` baut die Zeilen,
  `generateProfilePdf.ts` zeichnet sie. Ohne das wäre der Steckbrief nur mit
  einem PDF-Renderer prüfbar, den diese Umgebung nicht hat.
- **Ein Fehler unterwegs gefunden:** Jahreszahlen liefen durch
  `Intl.NumberFormat` und wurden zu „2.005". Betraf Baujahr und
  Sanierungsjahre; ein eigener `year()`-Helfer rendert sie jetzt roh.

---

## Etappe 5 – Handlungsplan im Bericht

> **Ziel:** Der Bericht sagt nicht nur, wie es steht, sondern was zu tun ist –
> in der Reihenfolge, die zu den im Fragebogen genannten Interessen passt.
> Punkte: 4.2 (zweiter Teil)

### Ausgangslage

Die Tipps-Seite gruppiert offene Empfehlungen bereits nach Aufwand
(„Schnell erledigt" / „Braucht etwas Vorbereitung", Commit `a2cdfbd`,
`isQuickWin` in `buildTips.ts`) und sortiert sie nach Interessen
(`goalBonus` `:273`, `compareTips` `:295`). Im PDF kommt davon **nichts** an.

**Anmerkung zur Annahme:** Die *empfohlene Messreihenfolge* ist nicht nach
Interessen sortiert – sie ist die feste Reihenfolge im `MEASUREMENT_CATALOG`
(Duschkopf → Warmwasser-Wartezeit → Raumklima → Möbelabstand → LED → Grundlast
→ Standby → Kühlschrank → Gefrierschrank). Goal-sortiert sind nur die Tipps.
Diese Etappe zieht die Messreihenfolge nach, damit beide dieselbe Logik nutzen.

### Zu tun

- **Neues Kapitel „Was du als Nächstes tun kannst"** nach den Messungen.
- **Zwei Gruppen** wie auf der Tipps-Seite, `isQuickWin` wiederverwenden –
  keine zweite Einteilung.
- **Sortierung über `compareTips(a, b, data.goals)`** – dieselbe Funktion, die
  die App benutzt. Der Bericht darf nicht anders ordnen als der Bildschirm.
- **Summe des Sparpotenzials je Gruppe**, unter demselben Riegel wie im
  Rest der App: Nur Beträge, die die Messung selbst noch behauptet
  (`yieldsSaving` im Katalog, siehe `b6df00e`).
- **Die genannten Interessen stehen im Kapitelkopf** – sonst wirkt die
  Reihenfolge willkürlich. „Sortiert nach deinen Zielen: Kosten sparen, CO₂
  senken."
- **`MEASUREMENT_CATALOG`-Reihenfolge** um dieselbe Goal-Gewichtung ergänzen,
  damit die empfohlene Messreihenfolge zur Tipp-Reihenfolge passt. Die
  Katalog-Reihenfolge bleibt der Grundstock, die Interessen verschieben nur.
- **`goals` bekommt damit einen zweiten Abnehmer** – in `fieldUsage.ts`
  nachziehen.

### Fertig, wenn

- [x] Zwei Nutzer mit verschiedenen Interessen bekommen unterschiedlich
  sortierte Handlungspläne – die Sortierung ist `compareTips` mit `goalBonus`,
  unverändert übernommen.
- [x] Reihenfolge im PDF und auf der Tipps-Seite stimmen überein: Der Bericht
  sortiert nicht selbst, er bekommt die fertige Liste von `buildTips`.
- [x] Kein leeres Kapitel – `tips.allHandled`, derselbe Satz wie auf dem
  Bildschirm.
- [x] Kein Euro-Betrag ohne Deckung: Summen laufen durch `displaySavingEur`;
  trägt keiner der Tipps einen anzeigbaren Betrag, steht dort keine Zahl statt
  einer Null. Ein Test prüft beide Fälle.

### Unterwegs entschieden (2026-09-03)

- **Der Bericht bekommt jetzt die *offenen* Tipps.** Er baute seine Liste
  bisher mit `buildTips(profile, results)` – ohne `TipContext` und ohne den
  Filter auf erledigte und ausgeblendete. Ein Handlungsplan, der eine
  abgehakte Maßnahme wieder als offen führt, wäre falsch; die Reihenfolge wäre
  ohne denselben Kontext außerdem eine andere als auf dem Bildschirm.
- **Nichts nachgebaut, auch keine Texte.** Gruppentitel, Ziel-Zeile und der
  Leerfall nutzen dieselben i18n-Schlüssel wie die Tipps-Seite
  (`tips.groupQuick`, `tips.sortedByGoal`, `tips.allHandled`). Neu sind nur
  der Kapiteltitel und die Verzeichnis-Zeile.
- **`goalCategoryBonus` ist aus `buildTips` exportiert** und auf
  `MeasurementCategory` erweitert – die Obermenge, die zusätzlich `hot_water`
  kennt. Tipps ändern sich dadurch nicht, weil kein Tipp diese Kategorie
  trägt. Zwei Gewichtungen für dieselbe Frage („was ist diesem Nutzer
  wichtig?") wären zwei Gelegenheiten, auseinanderzulaufen.
- **Befund: Bei „CO₂ senken" ändert die neue Messreihenfolge nichts.** Der
  Katalog führt ohnehin mit Warmwasser und Wärme – die Gewichtung findet dort
  nichts zu verschieben. Bei „Komfort verbessern" greift sie: Raumklima und
  Möbelabstand rücken vor den Duschkopf. Ein Test hält beides fest, damit das
  Zusammenfallen niemand für einen Fehler hält; sortiert jemand den Katalog
  später um, schlägt er an.
- **Nicht belegt:** Das Layout des neuen Kapitels hat niemand gesehen – diese
  Umgebung hat keinen PDF-Renderer. Geprüft sind Inhalt, Reihenfolge und
  Übersetzungen.

---

## Etappe 6 – Richtwerte mit Primärquellen

> **Ziel:** Jede Bewertung im Export sagt, woran sie gemessen ist – und jeder
> Richtwert nennt seine Quelle mit Stand-Datum.
> Punkte: 4.1

### Ausgangslage – die halbe Arbeit ist schon getan

`generateMeasurementsPdf.ts:175` und `:253` drucken eine Spalte „Bewertung"
mit dem Wort („gut", „hoch") und **keinen** Vergleichsmaßstab.

Der Anschluss liegt aber bereit: `src/features/education/measurementThresholds.ts`
enthält `MEASUREMENT_THRESHOLDS` – fertige Richtwert-Tabellen für acht der
neun Checks, und **keine einzige Zahl steht dort im Quelltext**; jede Grenze
wird aus dem Mess-Modul importiert, das mit ihr rechnet. Genau das braucht der
Bericht. Es ist keine neue Tabelle zu bauen, sondern eine vorhandene zu nutzen.

Was fehlt: der LED-Check hat keinen Eintrag (er bewertet „Räume mit alter
Beleuchtung", nicht eine Messgröße), und **keine** Tabelle hat eine Quelle.

### Zu tun

- **`ThresholdTable` um `source: Source` erweitern** – der Typ existiert
  bereits in `educationContent.ts:9` samt `stand`-Feld für das Datum.
- **Für jeden der neun Richtwerte eine Primärquelle recherchieren** und
  eintragen. Anhaltspunkte, wo zu suchen ist:
  - Duschkopf-Durchfluss, Warmwasser-Wartezeit → DIN 1988-200,
    Umweltbundesamt „Wasser sparen"
  - Standby, Grundlast → EU-Ökodesign-Verordnung 1275/2008 (0,5 W / 1 W /
    8 W HiNA), Umweltbundesamt „Leerlaufverluste"
  - Raumtemperatur, Luftfeuchte → Umweltbundesamt „Richtig heizen und lüften",
    ASR A3.5, WHO-Leitlinien Innenraumfeuchte
  - Kühlschrank 5–7 °C, Gefrierschrank −18 °C → Bundeszentrum für Ernährung,
    Verbraucherzentrale
  - Möbelabstand → Herstellerangaben / VDI 6030
- **Neue Spalte „Richtwert" im PDF**, gespeist aus `MEASUREMENT_THRESHOLDS`.
  Bei mehrzeiligen Tabellen (Raumklima hat Bänder je Raumtyp) die für das
  Ergebnis einschlägige Zeile.
- **Quellenverzeichnis am Ende des Berichts** – die Fußnote je Zeile würde die
  Tabelle sprengen.
- **Nebenwirkung nutzen:** Damit sind auch die Richtwerte im Wissensbereich
  belegt. Der Punkt „Quellen zeigen weiter auf Wikipedia" aus dem
  Wissen-Ausbau ist für die Mess-Hintergründe damit erledigt (Glossar und FAQ
  bleiben offen).

### Quellenstand nach Kilians Prüfung (2026-09-03)

Neun Kandidaten durchgeklickt. **Alle Links funktionierten** – aber nicht auf
jedem stand, was wir brauchen. Bestätigt ist nur, was Kilian selbst gesehen
hat.

**Belegt:**

| Richtwert | Quelle |
|---|---|
| Raumtemperatur Wohnräume, Schlafzimmer, Küche | [UBA – Richtiges Heizen](https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/heizen-bauen/heizen-raumtemperatur) |
| Raumtemperatur Bad (dort 21–24 °C, unser Band 22–24 liegt darin) | [Verbraucherzentrale Energieberatung – Heizen](https://verbraucherzentrale-energieberatung.de/heizen/) |
| Luftfeuchte Wohnräume 40–60 %, Schimmel an kalten Oberflächen | [UBA – Wie lüfte ich richtig?](https://www.umweltbundesamt.de/themen/gesundheit/umwelteinfluesse-auf-den-menschen/schimmel/wie-luefte-ich-richtig-tipps-tricks-zur) |
| Duschkopf ≤ 9 l/min gut, 10–12 mittel, ab 14 hoch | [Verbraucherzentrale – Warmwasser sparen](https://www.verbraucherzentrale.de/wissen/energie/heizen-und-warmwasser/warmwasser-im-alltag-sparen-so-gehts-17752) |
| Kühlschrank 7 °C, Gefriergerät −18 °C | [BZfE – Lebensmittel richtig lagern](https://www.bzfe.de/kueche-und-alltag/kochen/lebensmittel-richtig-lagern) · [VZ – Gefrierschrank](https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/gefrierschrank-und-gefriertruhe-worauf-muss-ich-beim-kauf-achten-38681) |
| Möbelabstand 30 cm | [VZ – Heizung, 10 Tipps](https://www.verbraucherzentrale.de/wissen/energie/heizen-und-warmwasser/heizung-10-einfache-tipps-zum-heizkosten-sparen-13892) – **bereits umgesetzt**, `260a7ca` |
| Ökodesign-Grenzwerte Standby | [VO (EU) 2023/826](https://eur-lex.europa.eu/eli/reg/2023/826/oj/deu) – ersetzt die im Plan genannte 1275/2008, die aufgehoben ist |

**Verworfen:** UBA-Leerlaufverluste und UBA-Warmwasser (keine verwertbaren
Zahlen). Eine zunächst vielversprechende Verbraucherzentrale-Seite mit einer
vollständigen Raumtabelle enthielt diese Tabelle **nicht** – sie stammte aus
einer Suchzusammenfassung, nicht von der Seite. Lehre daraus: In dieser
Umgebung lässt sich suchen, aber nicht abrufen; **eine Suchzusammenfassung ist
kein Beleg.** Kandidaten werden künftig erst nach Kilians Sichtung eingetragen.

### Was als „Erfahrungswert der E-App" gekennzeichnet wird

Ohne Fremdquelle, ausdrücklich so benannt statt einer passend wirkenden
Fundstelle untergeschoben:

- **Keller 14–18 °C** und **Feuchte Keller/Waschküche 50–65 %**
- **Angenommene Kellerwand-Temperatur 12 °C** (begründet in `dewPoint.ts`)
- **Wartezeit** 15 / 30 / 60 s
- **Grundlast** 70 / 150 / 250 W
- **Standby** 5 / 20 W je Gerät
- **Verdeckte Heizkörperfläche** 15 % / 30 %; **blockiert unter 5 cm**
- **Kühlschrank-Randwerte** (unter 3 °C zu kalt, über 8 °C zu warm) und
  **Gefrier-Toleranz** (−16 / −20 °C) – belegt ist je nur der Zielwert
- **6 % Heizenergie je Grad** (`PERCENT_PER_DEGREE`). Der Kommentar dort nennt
  „breiter Konsens; Hochschule Biberach 2011 maß real 7–8 %" – **ungeprüft.**
- **Duschkopf-Kalibrierung**: 1 Dusche/Person/Tag, 5 Minuten, ΔT 27 K,
  Sparduschkopf 8 l/min, ~516 kWh je Person und Jahr
- **`CALIBRATION_PERSONS` = 2** und **`DEFROST_RECHECK_DAYS` = 182**

### Diese Etappe braucht Kilian am PC

Der Netzzugang dieser Umgebung erlaubt **Suche**, aber **kein Abrufen einzelner
Seiten**: `WebFetch` auf `umweltbundesamt.de` scheitert am Egress-Proxy
(`EGRESS_BLOCKED`), `curl` bekommt 403 auf den CONNECT-Tunnel. `WebSearch`
funktioniert und liefert Titel, URLs und Inhaltszusammenfassungen.

Praktisch heißt das: Eine Quelle lässt sich **finden und zitieren**, aber nicht
**verifizieren, dass der Deep-Link lädt**. Genau daran ist derselbe Punkt beim
Wissen-Ausbau schon einmal gescheitert.

**Vorgehen deshalb:** Auf die stabilste erreichbare Ebene verlinken (die
Themenseite statt der PDF-Unterseite), Titel und Stand-Datum vollständig
angeben, damit die Quelle auch bei totem Link auffindbar bleibt.

**Und die Etappe endet mit einer Prüfliste.** Alle recherchierten Links werden
am Ende als anklickbare Liste ausgegeben – Quelle, URL, welcher Richtwert
darauf beruht. Kilian klickt sie am PC einmal durch und meldet die toten
zurück; die werden dann ersetzt oder auf „Richtwert der E-App" umgestellt.
Solange die Liste nicht geprüft ist, gilt die Etappe als **angefangen**, nicht
als fertig.

Am Handy ist diese Etappe deshalb wenig sinnvoll. Wenn Kilian unterwegs ist:
eine andere nehmen.

### Fertig, wenn

- Jede Zeile der Mess-Übersicht im PDF nennt neben der Bewertung den Richtwert.
- Alle neun Checks haben eine Quelle mit Stand-Datum – auch der LED-Check,
  dann eben als Einordnung statt als Messgrenze.
- Keine Zahl steht doppelt: Der Bericht importiert aus
  `measurementThresholds.ts`, das aus den Mess-Modulen importiert.
- Nichts ist einer Quelle untergeschoben, die die Zahl nicht hergibt. Wo sich
  keine Primärquelle finden ließ, steht „Richtwert der E-App, hergeleitet aus
  …" – das ist ehrlicher als eine passend wirkende Fundstelle.
- Die Prüfliste der Links ist ausgegeben – und von Kilian am PC durchgeklickt.
  Erst dann steht die Etappe auf „fertig".

---

## Etappe 7 – HTW raus aus dem Fragebogen

> **Ziel:** Der Fragebogen erwähnt die HTW nicht mehr. Die Lerninhalte bleiben,
> erreichbar über den vorhandenen Knopf im Wissensbereich.
> Punkte: 1.5

### Ausgangslage

Der Rückbau ist zu zwei Dritteln erledigt: Der breite Umschalter auf der
Wissen-Seite ist weg (nur noch ein Icon-Knopf, [R1]), der Trust-Chip auf der
Landing-Page ist ersetzt ([R2]). Geblieben ist:

- **`Step1Profile.tsx:29`** – `htw_study` als eines von fünf Zielen im
  Fragebogen, mit Absolventenkappen-Icon (`:35`). **Das ist der Punkt.**
- `types/index.ts:10` – `'htw_study'` im `UserGoal`-Typ
- `buildTips.ts:269` – `htw_study: {}`, ein leerer Eintrag in der
  Goal-Gewichtung
- `settingsStore.ts:4` – Theme `'htw'` („HTW-Grün")
- `EducationPage.tsx`, `flashcardsContent.ts` – die Lerninhalte selbst

### Zu tun

- **`htw_study` aus `GOALS` in `Step1Profile.tsx` entfernen.**
- **Aus dem `UserGoal`-Typ entfernen** und den Eintrag in
  `GOAL_CATEGORY_BONUS` mit. Er war ohnehin leer – die Sortierung ändert sich
  nicht.
- **Migration in `migrateOnboardingData`** (`onboardingStore.ts`) – nicht im
  `merge`-Block des `persist`-Aufrufs. Ein Bestandsprofil mit
  `goals: ['save_costs', 'htw_study']` muss zu `['save_costs']` werden, und
  zwar auf **beiden** Ladewegen: beim Start und beim Cloud-Sync (siehe die
  Konvention in `CLAUDE.md`). Ein Profil, dessen einziges Ziel `htw_study`
  war, behält eine leere Liste – das ist zulässig, `goals` ist nirgends
  Pflicht.
- **Das Theme `'htw'` bleibt.** Es heißt „HTW-Grün", ist aber eine Farbwahl,
  keine inhaltliche Verknüpfung – und ein entferntes Theme würde bei jedem,
  der es eingestellt hat, das Aussehen der App ändern. (`index.html` fängt ein
  unbekanntes Theme zwar ab, aber unnötig ist es trotzdem.)
- **Die Lerninhalte bleiben unangetastet**, hinter dem Icon-Knopf.

### Fertig, wenn

- Der Fragebogen enthält an keiner Stelle das Wort HTW.
- Ein Bestandsprofil mit `htw_study` lädt fehlerfrei – aus dem localStorage
  **und** aus der Cloud. Beides einzeln prüfen.
- Die Tipp-Sortierung liefert für ein migriertes Profil dieselbe Reihenfolge
  wie vorher.
- Die Karteikarten und die HTW-Ansicht funktionieren unverändert.

---

## Etappe 8 – Kellerklima statt Wohnraum-Maßstab

> **Ziel:** Der Raumklima-Check bewertet die Luftfeuchte im Keller nach
> Keller-Maßstäben – als Teil des bestehenden Checks, nicht als zehnter Check.
> Punkte: 18.1 (Entscheidung: kellerspezifische Bewertung im Raumklima-Check)

### Ausgangslage

Die Temperatur ist raumtypabhängig: `COMFORT_BANDS` (`roomClimate.ts:47`) gibt
dem Keller 14–18 °C, dem Wohnzimmer 20–22 °C. Die Luftfeuchte ist es **nicht**:

```ts
export function rateHumidity(humidity: number): DimensionStatus {
  if (humidity < HUM_OPTIMAL_MIN) return 'tooDry'      // 40 %
  if (humidity > HUM_OPTIMAL_MAX) return 'tooHumid'    // 60 %
  return 'optimal'
}
```

Kein Raumbezug. Ein Keller mit 65 % relativer Feuchte bei 16 °C wird als
„zu feucht" gemeldet – dabei ist das dort unauffällig. Umgekehrt ist die
eigentliche Gefahr gar nicht erfasst: Schimmel entsteht nicht bei einer
Prozentzahl, sondern wenn warme, feuchte Luft auf eine kalte Oberfläche trifft
und dort der Taupunkt unterschritten wird. Im Sommer ist ein gelüfteter Keller
deshalb gefährlicher als ein geschlossener.

### Zu tun

- **`rateHumidity` bekommt den Raumtyp** – wie `rateTemperature` es schon tut.
  Signatur `rateHumidity(humidity: number, roomType?: RoomType)`, mit einem
  `HUMIDITY_BANDS`-Objekt neben `COMFORT_BANDS`. Keller und Waschküche
  bekommen ein eigenes Band (Richtwert 50–65 %), alles andere behält 40–60 %.
- **Taupunkt-Rechnung** als eigene, getestete Funktion (Magnus-Formel) – aus
  Temperatur und relativer Feuchte. Sie ist der eigentliche Erkenntnisgewinn
  und gehört in ein eigenes Modul, nicht in `roomClimate.ts` versteckt.
- **Ein kellerspezifischer Hinweis im Ergebnis**, wenn der Taupunkt der
  Kellerluft über der zu erwartenden Wandtemperatur liegt: die Lüftungsregel
  im Klartext („im Sommer nachts oder früh morgens lüften, nicht mittags").
- **Kompatibilität:** Gespeicherte Raumklima-Ergebnisse enthalten `humidity`
  als Zahl in `details`. Die Bewertung wird bei der Anzeige neu berechnet, die
  gespeicherte Zahl bleibt gültig – es ist kein Format-Wechsel, also keine
  Doppel-Lesung nötig. **Beim Bauen einmal gegenprüfen**, dass das wirklich so
  ist und nicht der Status mitgespeichert wird.
- **Der Wissensbereich zieht mit:** `MEASUREMENT_THRESHOLDS.room_temperature`
  importiert `HUM_OPTIMAL_MIN`/`MAX` – die Tabelle muss die neuen Bänder
  zeigen, ohne dass eine Zahl doppelt steht.

### Fertig, wenn

- [x] Ein Keller mit 16 °C und 65 % wird nicht mehr als „zu feucht" gemeldet.
- [x] Ein Wohnzimmer mit 65 % wird weiterhin als „zu feucht" gemeldet.
- [x] Die Taupunkt-Funktion hat eigene Tests mit von Hand nachgerechneten
  Werten (`tests/unit/dewPoint.test.ts`, neun Stück).
- [x] Der Check bleibt **einer**, die Gesamtzahl steht weiter auf 9 – am
  Katalog wurde nichts angefasst.
- [x] Ein gespeichertes Ergebnis öffnet sich fehlerfrei und behält seine
  Bewertung (siehe „Kompatibilität" unten).
- [x] Die Richtwert-Tabelle zeigt beide Bänder und den Taupunkt-Zusammenhang,
  weiter ohne eine einzige doppelt geführte Zahl.

### Unterwegs entschieden (2026-09-03)

- **Kompatibilität – die Annahme des Plans stimmte nur halb.** Richtig war:
  Der Run speichert nur Zahlen, keinen Status; die Bewertung entsteht beim
  Anzeigen neu. Übersehen war, dass der Ergebnis-Schirm **nur das Ergebnis
  bekommt, nicht den Raum** (`ResultProps` trägt allein `result`). Ohne das
  angewandte Band könnte er einen Keller gar nicht als Keller bewerten.
  Deshalb werden `humMin`/`humMax` mitgespeichert – genau wie
  `bandMin`/`bandMax` bei der Temperatur, dieselbe seit je bestehende Lösung
  für dasselbe Problem. Ein Altergebnis trägt sie nicht und fällt auf 40–60
  zurück, also auf die Bewertung, mit der es entstanden ist; ein Test hält
  fest, dass der Default genau diese Grenzen behält.
- **Die Extremschwelle ist jetzt relativ zum Band.** Statt eines zweiten
  Zahlenpaars (30 % / 70 %) gilt ein Abstand von 10 Prozentpunkten, analog zu
  `TEMP_EXTREME_TOLERANCE`. Für den Wohnraum ergibt das exakt die bisherigen
  Grenzen, für den Keller verschieben sie sich mit – eine Regel statt zweier
  Tabellen, die auseinanderlaufen können.
- **Nur Keller und Waschküche weichen ab.** Beide sind kühl und tragen
  regelmäßig Feuchte ein. Ein eigenes Band je Raumtyp wäre eine Genauigkeit,
  die die Sache nicht hergibt.
- **Die Wandtemperatur ist eine Annahme, keine Messung** (12 °C, oberer Rand
  der Erdreichtemperatur – die vorsichtigere Wahl, weil sie seltener warnt).
  Besser wäre ein Infrarot-Thermometer an der Wand; das setzt der Fragebogen
  nicht voraus. Steht so begründet in `dewPoint.ts`.
- **`HUM_OPTIMAL_MIN`/`MAX` sind entfallen** – nach dem Umbau der
  Richtwert-Tabelle ohne Verwender.
- **Nicht belegt:** Der Hinweis im Ergebnis wurde nicht im Browser gesehen.
  Geprüft sind Rechnung, Bewertung, Übersetzungen und der Produktions-Build.

---

## Etappe 9 – Zwei kleine Nacharbeiten

> **Ziel:** Zwei Befunde, die je für sich zu klein für eine Etappe sind.
> Punkte: 4.5, 8.3

### 4.5 – Abstände im kleinen Verlaufsdiagramm

**Ausgangslage:** Halb erledigt, an der falschen Stelle. Das große Diagramm
(`AbsoluteLineChart.tsx:121`) und der PDF-Verlauf (`pdfKit.ts:1212`) nutzen
seit `02a1f01` eine echte Datumsachse über `timeAxisPositions()`. Die kleine
Kachel auf der Monitoring-Übersicht nicht: `Sparkline.tsx` nimmt nur
`values: number[]` entgegen und rechnet mit festem `stepX` (`:38`). Eine
Ablesung nach einer Woche und eine nach drei Monaten stehen dort gleich weit
auseinander.

**Zu tun:** `Sparkline` bekommt optional die Daten zu den Werten und nutzt
`timeAxisPositions()`. Optional, weil die Komponente auch anderswo eingesetzt
wird – ohne Daten bleibt sie gleichmäßig, mit Daten wird sie ehrlich.

### 8.3 – Der Bildschirm nach „Speichern & Fertig"

**Ausgangslage:** Für die Pro-Raum-Checks wurde die Auto-Weiterleitung durch
einen Knopf ersetzt ([R4]). Der Timer lebt aber weiter und gilt für alle
übrigen Checks – `MeasurementRunner.tsx:101`:

```ts
const delay = justSaved.continuing ? SAVED_DELAY_CONTINUING_MS : SAVED_DELAY_MS
const tid = setTimeout(() => navigate(justSaved.nextHref), delay)
```

1600 ms bzw. 700 ms. `SavedInterstitial` rendert zwar einen Weiter-Knopf –
aber der Timer schießt trotzdem los, der Knopf kommt gegen ihn nicht an. Für
Grundlast, Standby, LED, Duschkopf, Kühl- und Gefrierschrank heißt das:
Der Bildschirm ist weg, bevor man ihn gelesen hat.

**Zu tun:** Den `setTimeout` ersatzlos entfernen. Der Knopf ist da, er trägt
den Namen des Ziels – das genügt. Wer nichts tut, bleibt stehen; das ist bei
einem Ergebnis-Schirm das gewünschte Verhalten.

### Fertig, wenn

- [x] Zwei Ablesungen im Abstand von einer Woche und drei Monaten stehen in der
  Übersichtskachel unterschiedlich weit auseinander.
- [x] Kein Check leitet mehr von selbst weiter; jeder wartet auf den Knopf.
- [x] Der Weiter-Knopf trägt in allen Checks den Namen des Ziels.

### Unterwegs entschieden (2026-09-03)

- **Die Abstandsrechnung steht in `sparklineGeometry.ts`, nicht in der
  Komponente.** Die Testumgebung kennt kein jsdom (`tests/**/*.test.ts`, reine
  Logik) – in der `.tsx` wäre die Rechnung nur über einen gerenderten Browser
  prüfbar gewesen. ESLint hat denselben Schnitt eingefordert
  (`react-refresh/only-export-components`). Nebenbei stehen die ViewBox-Maße
  jetzt an einer Stelle statt in Komponente und Rechnung getrennt.
- **`continuing` in `SavedState` ist mit dem Timer weggefallen.** Das Feld
  steuerte nur die kürzere Anzeigedauer beim Weitermessen und wurde sonst
  nirgends gelesen. Den Fall „weiter zum nächsten Raum" trägt `nextRoomName`,
  das den Knopf beschriftet.
- **Der Weiter-Knopf benennt das Ziel schon vorher** – „Weiter: Bad" oder
  „Zur Übersicht". Der allgemeine Fall („Weiter") ist nicht erreichbar:
  `handleSave` setzt entweder einen Raum samt Namen oder `/measurements`.

---

## Etappe 10 – Warmwasser belastbar und transparent

> **Ziel:** Die Warmwasser-Rechnungen benutzen, was gemessen wurde, und der
> Nutzer kann nachlesen, wie sie zustande kommen.
> Punkte: 9.2, 9.3, 13.2

### Ausgangslage – drei Befunde

**9.2 – Der „pro Zapfung"-Wert ignoriert die Duschkopfmessung.**
`hotWaterWait.ts:44` setzt für die Dusche pauschal `flowLpm: 9` an. Wer im
Duschkopf-Test 14 L/min gemessen hat, bekommt im Wartezeit-Check trotzdem eine
Rechnung mit 9. Die App hat den besseren Wert und benutzt ihn nicht.

**9.3 – Die Jahresrechnung ist in Ordnung, aber unsichtbar.** Die Personenzahl
fließt ein (`litersPerDraw * drawsPerPersonPerDay * persons * 365`), kalibriert
auf einen Zwei-Personen-Haushalt (`CALIBRATION_PERSONS`). Sauber gerechnet –
nur steht nirgends in der App, dass und wie.

**13.2 – Der Kommentar beschreibt eine andere Rechnung als der Code.** Über
`yearlyCostForFlow` (`showerhead.ts:60`) steht:

> „Davon werden ~60 % als Warmwasser angesetzt; die Energie zum Erwärmen folgt
> aus 1.16 Wh/(L·K) bei ΔT = 25 K."

Der Code kennt **keinen** 60-%-Faktor und rechnet mit `DELTA_T = 27`. Die
Rechnung selbst ist plausibel (ergibt ~516 kWh/Person·Jahr, deckt sich mit den
500–600 kWh aus der Literatur) – die Beschreibung daneben ist schlicht falsch.
Wer sie liest, um die Zahl zu prüfen, prüft die falsche Formel.

### Zu tun

- **Gemessenen Durchfluss verwenden.** Liegt ein Duschkopf-Ergebnis vor,
  benutzt der Wartezeit-Check für die Entnahmestelle „Dusche" den gemessenen
  Wert statt der 9 L/min. Ohne Messung bleibt der Richtwert – und das
  Ergebnis sagt, welcher der beiden benutzt wurde.
- **Den falschen Kommentar korrigieren.** Er beschreibt, was der Code tut:
  Duschminuten/Jahr × Durchfluss × ΔT 27 K × 1,163 Wh/(L·K), Kosten über den
  quellenabhängigen Warmwasserpreis aus `hotWaterEnergy.ts`.
- **„So gerechnet"-Aufklapper im Ergebnis** beider Checks: die Annahmen im
  Klartext (1 Dusche/Person/Tag, 5 Minuten, Kaltwasser 11 °C → 38 °C), die
  Formel, und was davon gemessen und was angenommen ist. Die Konstanten
  kommen aus dem Modul, nicht aus dem Text – dieselbe Regel wie bei den
  Richtwert-Tabellen.
- **`CALIBRATION_PERSONS` sichtbar machen** – dass die Werte auf zwei Personen
  kalibriert sind, ist eine Annahme, die der Nutzer kennen sollte.

### Fertig, wenn

- [x] Ein Duschkopf-Ergebnis von 14 L/min verändert das Ergebnis nachweislich
  (Test: Faktor 14/9 in der Menge je Zapfung).
- [x] Ohne Duschkopf-Messung rechnet der Check wie bisher – ein Test hält das
  fest, ebenso dass unbrauchbare Werte (0, negativ, NaN) auf den Richtwert
  zurückfallen.
- [x] Beide Module komplett durchgegangen. Gefunden wurden **vier** Stellen,
  nicht eine: der 60-%-Faktor und ΔT 25 K über `yearlyCostForFlow`, dazu im
  selben Kommentar die überholte Behauptung, die Kosten nutzten „nur den
  Strom-Arbeitspreis" (sie kommen längst aus `hotWaterEnergy.ts`), und im
  Wartezeit-Modul „gemessen ist allein die Wartezeit" sowie „typischer
  Durchfluss" – beides seit dieser Etappe nicht mehr wahr.
- [x] Der Aufklapper nennt jede Annahme und kennzeichnet je Zeile, ob sie
  gemessen oder angenommen ist.
- [x] Bestehende Ergebnisse öffnen sich unverändert: Der Durchfluss steht neu
  in den Details, Altergebnisse fallen auf den Richtwert der Entnahmestelle
  zurück – den, mit dem sie gerechnet wurden.

### Unterwegs entschieden (2026-09-03)

- **Der gemessene Durchfluss gilt nur an der Dusche.** Dort wurde gemessen;
  ein Waschbecken mit dem Duschkopf-Wert zu rechnen wäre schlechter als der
  Richtwert, nicht besser. Ein Test hält das für alle drei anderen
  Entnahmestellen fest.
- **Der Aufklapper klappt zu, nicht auf.** Die Zahl ist die Aussage, die
  Herleitung die Fußnote. Offen gestellt drängt sie sich vor das Ergebnis.
- **Ein Test bindet die Kalibrierung an die Rechnung.** Die im Aufklapper
  genannten ~516 kWh je Person und Jahr müssen aus den exportierten Konstanten
  folgen, sonst wird er rot. Damit kann der Fehler aus 13.2 – eine Beschreibung,
  die von der Rechnung abdriftet – an dieser Stelle nicht wiederkommen.
- **`CalculationNote` ist bewusst allgemein** (`measurements/CalculationNote.tsx`)
  und nicht warmwasser-spezifisch: Dieselbe Frage – was ist gemessen, was
  angenommen? – stellt sich bei Grundlast, Standby und Raumklima genauso.
- **Nicht belegt:** Der Aufklapper wurde nicht im Browser gesehen.

---

## Etappe 11 – Duschkopf-Empfehlung neu formulieren

> **Ziel:** Die Empfehlung sagt, was zu tun ist, ohne eine Genauigkeit zu
> behaupten, die die Messung nicht hergibt.
> Punkte: 13.1

### Ausgangslage

Aus der Meldung geht nicht hervor, was genau stört. Die heutigen Texte
(`de.json`, `measurements.showerhead.result`):

- `summary.high`: „Hoher Verbrauch – ein Sparaufsatz lohnt sich."
- `summary.medium`: „Mittlerer Verbrauch – hier ist noch Sparpotenzial."
- `chips`: „Sparaufsatz prüfen", „Kürzer duschen"
- `savingLabel`: „Ersparnis ≈ {{value}}"

Zwei Verdachtsmomente: „ein Sparaufsatz lohnt sich" ist eine Kaufempfehlung
ohne Kenntnis von Preis und Einbausituation. Und der Euro-Betrag steht
gleichberechtigt neben der Wassermenge, obwohl die Menge die belastbarere
Größe ist (sie folgt direkt aus der Messung, der Betrag zusätzlich über
Warmwasseranteil, Temperaturhub und Preis) – das steht so sogar im Code
kommentiert (`showerhead.ts:88`).

### Zu tun

- **Erst einen Vorschlag vorlegen**, dann bauen. Kilian entscheidet, was
  gemeint war. Richtung: die eingesparte **Wassermenge** nach vorn, den
  Euro-Betrag als Größenordnung dahinter, und statt „lohnt sich" die konkrete
  Handlung mit ihrer Bedingung („Ein Sparaufsatz für ~15 € bringt dich auf
  ~8 L/min – wenn dein Duschkopf ein Standardgewinde hat.").
- Die englische Fassung mitziehen.

### Fertig, wenn

- Die Formulierung ist mit Kilian abgestimmt, nicht geraten.
- Keine Aussage im Text behauptet mehr, als die Messung hergibt.
- Beide Sprachen gleichwertig.

---

## Etappe 12a – Geräte bekommen eine Identität

> **Ziel:** Die Geräteliste bildet ab, was wirklich in der Wohnung steht – mit
> stabiler Kennung je Gerät. Für den Nutzer ändert sich noch nichts außer der
> Möglichkeit, ein zweites Gerät einzutragen.
> Punkte: 18.2 · Konzept: `docs/geraete-concept.md` Abschnitte 3, 5

### Ausgangslage

`appliances` ist als **Menge** angelegt, nicht als Liste. `toggleAppliance`
(`appliances.ts:63`) sucht `findIndex((a) => a.kind === kind)` und *entfernt*
den vorhandenen Eintrag, statt einen zweiten anzulegen. Zwei Kühlschränke sind
heute nicht darstellbar, und `ApplianceEntry` (`types/index.ts:82`) hat kein
Feld, das zwei Geräte unterscheiden könnte.

### Zu tun

- **`ApplianceEntry` um `id: string` erweitern**, vergeben beim Anlegen,
  danach unveränderlich.
- **Migration in `migrateOnboardingData`** – nicht im `merge`-Block (siehe
  `CLAUDE.md`). Bestandsgeräte bekommen `id = kind`: Weil bisher je Art
  höchstens ein Eintrag existieren konnte, ist das eindeutig, deterministisch
  und kollisionsfrei – und passt zufällig genau auf die Altergebnis-Schlüssel,
  die 12b braucht.
- **`toggleAppliance` ablösen** durch `addAppliance` / `removeAppliance(id)`.
  Der Umschalt-Charakter bleibt für den häufigen Fall erhalten: Erstes Antippen
  legt an, Antippen des Häkchens entfernt.
- **`AppliancePicker` um „weiteres Gerät"** je Art. Ein Tipp mehr, und nur für
  die, die ihn brauchen – der Fragebogen wird nicht länger.
- **Optionaler Name je Gerät**, für zwei Geräte im selben Raum. Der Raum
  bleibt die Voreinstellung für die Benennung (das baut 12d aus).
- **`applianceInstances(appliances, wanted)`** als Gegenstück zu
  `roomInstances()` – liefert die Geräte, die einen Check bedienen, in stabiler
  Reihenfolge. Wird hier gebaut und getestet, aber noch von niemandem benutzt.
- **`hasAppliance`, `applianceRoom`, `skippedMeasurements` bleiben** und
  funktionieren unverändert – sie fragen nach Vorhandensein, nicht nach Anzahl.

### Fertig, wenn

- [x] Zwei Kühlschränke lassen sich eintragen und behalten ihre Kennung, wenn
  eines gelöscht wird. Zusätzlich geprüft: Eine gelöschte Kennung wird **nie
  neu vergeben** – sonst erbte das nächste Gerät das Ergebnis des gelöschten.
- [x] Ein Altprofil lädt aus localStorage **und** aus der Cloud fehlerfrei und
  hat danach `id = kind`; beide Wege sind einzeln getestet. Der Cloud-Weg
  zusätzlich auf Wiederholung: Ein zweiter Sync darf die Kennung nicht ändern.
- [x] Ein Haushalt ohne Geräte verhält sich exakt wie vorher – Test auf
  `skippedMeasurements`.
- [x] `applianceInstances` hat eigene Tests, das Kombigerät eingeschlossen.
- [x] Bei genau einem Gerät je Art sieht der Fragebogen aus wie vorher: Anzahl,
  Namensfeld und Löschknopf erscheinen erst ab dem zweiten Gerät.

### Unterwegs entschieden (2026-09-03)

- **Eine gelöschte Kennung wird nie wiederverwendet.** Das Konzept begründet,
  warum die Kennung kein Index sein darf; dieselbe Begründung schließt auch
  „kleinste freie Nummer" aus, denn die würde nach dem Löschen erneut vergeben.
  Neue Kennungen sind deshalb `kind-<zufällig>` – die Art vorn, damit der
  gespeicherte Zustand lesbar bleibt.
- **`updateAppliance` kam dazu**, im Plan nicht genannt. Raum und Name je Gerät
  zu setzen braucht einen Weg, der die Kennung nicht anfasst; `setRoom` lief
  vorher über `kind` und hätte bei zwei Geräten derselben Art beide getroffen.
- **Die Migration verdrängt auch dann nichts**, wenn im Speicher wider Erwarten
  zwei Geräte derselben Art stünden (von Hand bearbeiteter Zustand): Das zweite
  bekommt eine eigene Kennung, statt die erste zu überschreiben.
- **Nicht belegt:** Der umgebaute Picker wurde nicht im Browser gesehen.

> **12b ist noch nicht angefangen.** Bis dahin gilt weiter ein Ergebnis je
> Geräteart – `applianceInstances` ist gebaut, aber von niemandem benutzt.

---

## Etappe 12b – Ein Ergebnis je Gerät

> **Ziel:** Vier Geräte, vier Messungen, vier Ergebnisse. Der Fortschritt
> zählt Geräte statt Checks.
> Punkte: 18.2 · Konzept: `docs/geraete-concept.md` Abschnitte 3, 6

### Ausgangslage

`ApplianceGate.tsx:46` fragt einen Booleschen Wert. Das Ergebnis landet unter
`fridge` bzw. `freezer` – einmal je Haushalt. `measurementProgress()`
(`progress.ts:44`) gibt für alles ohne `perRoom` `{ done: 1, total: 1 }`
zurück, sobald irgendein Ergebnis existiert. Das zweite Gerät überschreibt das
erste, und der Fortschritt merkt es nicht.

### Zu tun

- **`perAppliance?: boolean` in `MeasurementMeta`**, gesetzt bei `fridge` und
  `freezer`.
- **`measurementProgress` und `countableMeasurements` erweitern.** Das ist die
  heikelste Stelle des ganzen Vorhabens: `progress.ts` ist ausdrücklich die
  *eine* Stelle, an der „wie viele Checks sind erledigt?" beantwortet wird –
  Ring, Zuhause-Karte und Gewerke-Kacheln hängen alle daran. Genau hier stand
  schon einmal „0/2" neben „9/9" (siehe Kopfkommentar der Datei).
- **Ergebnisschlüssel `fridge@<id>`** über dasselbe `instanceKey()`, das die
  Pro-Raum-Checks nutzen – kein zweites Schlüsselformat.
- **Rückfallkette für Altergebnisse:** `results['fridge@<id>'] ?? results['fridge']`
  für das **erste** Gerät seiner Art. Nicht umschreiben, nur finden – gemäß der
  Konvention „Gespeicherte Messergebnisse bleiben lesbar". Sobald das Gerät neu
  gemessen wird, gewinnt der neue Schlüssel.
- **Gerätewahl im Check:** Bei mehreren Geräten fragt der Check zuerst, welches
  gemessen wird – mit Fortschritt je Gerät, wie die Raumauswahl es tut. Bei
  genau einem Gerät entfällt die Frage.
- **Weiter-Knopf mit Zielnamen** wie bei den Pro-Raum-Checks: „Speichern &
  nächstes Gerät: Gefriertruhe Keller".

### Fertig, wenn

- [x] Zwei Kühlschränke ergeben zwei Ergebnisse; das zweite überschreibt das
  erste nicht (Schlüssel `fridge@<id>`).
- [x] Alle drei Anzeigen bekommen die Geräteliste durchgereicht und rechnen
  damit über dieselbe Funktion – im Code nachgezogen und getestet. **Im Browser
  nicht nachgesehen**, diese Umgebung rendert nicht.
- [x] Ein Bestandsnutzer sieht sein Ergebnis weiterhin, seinem ersten Gerät
  zugeordnet.
- [x] Ein Haushalt mit genau einem Gerät je Art erlebt keinen Unterschied –
  die Auswahl springt von selbst weiter.
- [x] Kein Doppelzählen: Das Altergebnis zählt **nur** für das erste Gerät
  seiner Art, ein Test hält das fest.

### Unterwegs entschieden (2026-09-03)

- **Der Ring zählt weiter Checks, nicht Instanzen.** Ein Geräte-Check ist eine
  Einheit und gilt erst als erledigt, wenn alle Geräte gemessen sind – dieselbe
  Regel, die für Pro-Raum-Checks schon galt. Der „echte Zwischenstand" aus der
  Abnahme entsteht dadurch, dass der Check nicht mehr nach der ersten Messung
  fertig meldet; die Gewerke-Kachel zeigt zusätzlich „2/4".
- **Kein zweites Schlüsselformat.** Der Runner trägt `roomKey` ohnehin
  generisch bis ins Ergebnis, die Geräte-Kennung läuft deshalb durch dieselbe
  Mechanik – die Auswahl navigiert auf `?room=<geräte-id>`.
- **Raum und Gerät laufen über einen gemeinsamen `nextOpen`-Wert** statt zweier
  paralleler Zweige im Runner. Sonst hätte jede Knopf-Stelle beide Fälle
  einzeln kennen müssen.
- **`applianceLabel` steht in einer eigenen Datei** – ESLint verlangt es
  (`react-refresh/only-export-components`), und prüfbar ist die Beschriftung
  dort ohnehin besser.

> ✅ **Von 12c eingeholt** (`cf6ee4d`). Tipps, Bericht und Folgemessungen lesen
> die Geräte-Ergebnisse jetzt.

---

## Etappe 12c – Tipps, Bericht und Folgemessungen nachziehen

> **Ziel:** Alles, was Ergebnisse liest, findet auch die gerätebezogenen –
> und der Gerätezähler darf wieder sinken.
> Punkte: 18.2 · Konzept: `docs/geraete-concept.md` Abschnitte 4, 6

### Ausgangslage

Drei Stellen lesen den nackten Schlüssel direkt und finden Instanz-Schlüssel
nie:

- **`followUps.ts:73`** – `results['fridge']`, Bewertung nicht `good` → wieder
  fällig. **`:80`** – `results['freezer']?.completedAt` gegen
  `DEFROST_RECHECK_DAYS = 182`.
- **`buildTips.ts`** – die Kühl- und Gefrier-Tipps.
- **`generateMeasurementsPdf.ts`** – die Mess-Übersicht.

Genau dieses Muster hat bei den Pro-Raum-Checks schon einmal „0/2" neben „9/9"
erzeugt.

### Zu tun

- **`pendingFollowUps` je Gerät.** Damit wird aus dem Zähler eine
  Zustandsaussage: Die Truhe im Keller ist ein halbes Jahr nach dem abgehakten
  Abtauen wieder dran, das Gefrierfach in der Küche noch nicht. Der
  `defrostDoneAt` aus dem `tipsStore` muss dafür je Gerät geführt werden – ein
  gemeinsamer Zeitstempel für vier Geräte wäre falsch.
- **Tipps je Gerät**, mit dem Gerätenamen im Text: „Deine Gefriertruhe im
  Keller ist stark vereist" statt „Dein Gefriergerät".
- **Bericht: eine Zeile je Gerät**, mit Namen. Zwei Zeilen „Kühlschrank"
  untereinander wären schlechter als eine – deshalb hängt das an der Benennung
  aus 12a.
- **Gerätekacheln in der Messungsliste** zeigen Fortschritt je Gerät.

### Fertig, wenn

- [x] Ein Gerät, dessen Abtauen ein halbes Jahr her ist, erscheint wieder als
  offen – und die anderen nicht. Gilt genauso für den Kühlschrank-Hinweis.
- [x] Tipp und Berichtszeile nennen das Gerät, sobald es mehrere gleichartige
  gibt. Bei einem einzigen bleibt der Text wie bisher – „Kühlschrank · Küche"
  unter „Dein Kühlschrank ist zu kalt" wäre eine Wiederholung.
- [x] Die Zahl im Bericht folgt derselben Rückfallkette wie die App.
- [x] **Eigens geprüft:** Ein Bestandsnutzer behält seine Abtau-Erinnerung.
  Sein Ergebnis **und** sein abgehakter Tipp liegen beide unter `freezer`;
  beide laufen über dieselbe Rückfallkette. Ein Test hält genau diesen Fall
  fest.

### Unterwegs entschieden (2026-09-03)

- **Der Abtau-Zeitstempel wurde nicht umgebaut.** Der Plan verlangte, ihn je
  Gerät zu führen – nötig war das nicht: Der `tipsStore` schlüsselt ohnehin
  nach Tipp-Kennung, und sobald die Tipps die Geräte-Kennung tragen
  (`freezer@<id>`), gilt „erledigt", „ausgeblendet" **und** der Zeitstempel
  automatisch je Gerät. Eine Änderung am Store wäre eine zweite Mechanik für
  dieselbe Sache gewesen.
- **Die Gefrier-Ersparnis stammt jetzt aus dem betroffenen Gerät**, nicht aus
  der Summe aller. Vorher hing an jedem Tipp die Summe über alle Geräte – bei
  einem Tipp je Gerät wäre das eine Behauptung über fremde Arbeit.
- **Ein Fehler nebenbei gefunden:** `tipsByMeasurement` baute den
  i18n-Schlüssel aus `tip.id` statt aus `textId`. Mit den neuen Tipp-Kennungen
  hätte der Bericht ab sofort rohe Schlüssel gedruckt („tips.items.fridge@…").
- **Nicht belegt:** Weder die Tipp-Liste noch das PDF wurden angesehen.

---

## Etappe 12d – Der Raum wird benutzt

> **Ziel:** Der Standort eines Geräts benennt, bewertet und verbindet – statt
> nur eine Vorauswahl zu treffen.
> Punkte: 18.2 · Konzept: `docs/geraete-concept.md` Abschnitt 7

### Ausgangslage

`ApplianceEntry.room` wird im Fragebogen erfasst (`AppliancePicker.tsx:44`) und
ausschließlich von `applianceRoom()` gelesen – zur Vorauswahl im Check. Er
bewertet nichts und benennt nichts.

### Zu tun

- **Benennen:** Der Gerätename entsteht aus Art und Raum – „Kühlschrank Küche",
  „Gefriertruhe Keller". Der frei getippte Name aus 12a bleibt der Ausweg für
  zwei Geräte im selben Raum.
- **Bewerten:** Ein Kühlschrank im 22 °C warmen Wohnzimmer arbeitet gegen ein
  anderes Gefälle als einer im 16 °C kühlen Keller. Die Gefriertruhe im
  unbeheizten Keller ist der Sparfall, über den sich etwas sagen lässt, das für
  die Küche nicht gilt.
- **Verbinden:** Steht das Gerät in einem Raum, der im Raumklima-Check bereits
  gemessen wurde (`room_temperature@basement#0`), benutzt der Check die
  **gemessene** Umgebungstemperatur statt einer Annahme – und sagt im Ergebnis,
  dass er das tut. Das ist die erste Verbindung zwischen zwei Checks in dieser
  App.
- **Ohne Messung bleibt es beim Richtwert.** Kein Check darf einen anderen zur
  Voraussetzung machen.

### Fertig, wenn

- Zwei Geräte derselben Art in verschiedenen Räumen sind überall am Namen
  auseinanderzuhalten – Check, Liste, Tipps, Bericht.
- Ein gemessener Kellerraum verändert die Aussage des Gefrier-Checks
  nachweislich, und das Ergebnis sagt, woher die Temperatur kommt.
- Ohne Raumklima-Messung rechnet der Check wie in 12b – keine stille
  Verschlechterung.
- Ein Gerät ohne Raumangabe funktioniert vollständig.

---

## Was dieser Plan nicht enthält

Die noch offenen Rückfragen aus `weitere_Verbesserungen_der_Eapp.txt`, für die
weiter eine Antwort fehlt:

- **1.2 (Verwalten-Button)** – der Knopf ist gefunden
  (`ProfileSwitcher.tsx:284`), aber was mit ihm geschehen soll, ist offen.
- **10.1 (LED-Check)** – wartet auf die Gegenprüfung im Handy-Firefox.
- **1.5 vollständiger HTW-Rückbau** – Etappe 7 löst den Fragebogen los, wie
  besprochen. Die Lerninhalte bleiben hinter dem Icon-Knopf; ob sie
  mittelfristig ganz verschwinden, ist damit nicht entschieden.
- **Methoden- und Quellenanhang im PDF** – bewusst zurückgestellt. Die
  Herleitungen wandern zuerst in den Wissensbereich (Etappe 10 legt mit dem
  „So gerechnet"-Aufklapper den Grundstein); ob sie später zusätzlich in den
  Export gehören, wird dann entschieden.
- **Vergleich zum vorigen Bericht** – nicht gewählt. Bräuchte eine Ablage
  erzeugter Berichte, die es noch nicht gibt.
