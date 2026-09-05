# Rechtliches: Impressum, Datenschutz und Einwilligung

Diese Datei beschreibt, **wo** die Rechtstexte und die Einwilligungs-Logik
liegen und **was** bei Änderungen an der App zu tun ist. Sie ersetzt keine
Rechtsberatung – die offenen Punkte am Ende sind bewusst als solche markiert.

## Betreiberdaten

`src/features/legal/operator.ts` ist die **einzige** Stelle mit Betreiberdaten.
Solange dort Pflichtfelder leer sind, zeigt die Impressumsseite einen roten
Hinweis „Impressum unvollständig" und markiert jede Lücke einzeln. Der Hinweis
verschwindet automatisch, sobald alle Felder gefüllt sind – ein unvollständiges
Impressum kann so nicht unbemerkt online gehen.

**Seit dem 05.09.2026 sind alle Pflichtfelder gefüllt** (Kilian Maier und Johan
Uhle, E-Mail-Adresse), der Hinweis erscheint also nicht mehr. Offen bleibt die
Frage der Anschrift – siehe „Von einem Rechts-/Datenschutzexperten prüfen
lassen", Punkt 10.

Pflicht für ein **privates, nicht-geschäftsmäßiges** Angebot (§ 5 DDG,
§ 18 Abs. 2 MStV): Name, ladungsfähige Anschrift (kein Postfach), E-Mail.
Nicht erforderlich, solange nicht geschäftsmäßig gehandelt wird: Registergericht
und -nummer, USt-IdNr. (§ 27a UStG), Aufsichtsbehörde, Berufshaftpflicht.

## Aufbau

| Datei | Zweck |
| --- | --- |
| `features/legal/operator.ts` | Betreiberdaten + Stand der Texte (`LEGAL_LAST_UPDATED`) |
| `features/legal/ImprintPage.tsx` | Impressum, Route `/impressum` |
| `features/legal/PrivacyPage.tsx` | Datenschutzerklärung, Route `/datenschutz` |
| `features/legal/LegalPage.tsx` | Gemeinsames Gerüst der Rechtstexte |
| `features/legal/consent.ts` | Einwilligungs-Store (`eapp-consent`), Kategorien, Version |
| `features/legal/ConsentBanner.tsx` | Hinweis beim ersten Besuch |
| `features/legal/ConsentSettings.tsx` | Fenster „Cookie-Einstellungen" (Widerruf/Änderung) |
| `features/legal/LegalFooter.tsx` | Fußzeile mit den Pflichtlinks |
| `features/legal/cookies.ts` | Löschen der `_ga`-Cookies beim Widerruf |
| `features/analytics/analytics.ts` | Setzt die Einwilligung technisch durch |

Die Rechtstexte stehen **nur auf Deutsch** – sie sind die rechtlich maßgebliche
Fassung. Die Bedienelemente ringsum (Banner, Fußzeile, Einstellungen) sind
zweisprachig (`consent.*`, `legal.*` in `src/i18n/locales/`).

## Wie die Einwilligung technisch wirkt

Ohne wirksame Einwilligung wird Google Analytics **gar nicht geladen**:

1. `lib/firebase.ts` initialisiert Analytics nicht mehr beim Start. Die
   Initialisierung liegt hinter `loadAnalytics()`.
2. `track()` prüft `hasAnalyticsConsent()`, **bevor** es `loadAnalytics()` ruft.
3. `App.tsx` ruft bei jeder Änderung der Entscheidung `applyAnalyticsConsent()`.
4. Beim Widerruf: Erfassung aus, `window['ga-disable-<Mess-ID>'] = true`,
   `_ga`-Cookies gelöscht.

Geprüft in `tests/unit/consent.test.ts` und im Browser: Vor einer Entscheidung
entstehen weder `_ga`-Cookies noch Anfragen an Google-Analytics-Hosts.

## Bei Änderungen an der App

* **Neuer einwilligungsbedürftiger Dienst** (Tracking, Karten, eingebettete
  Videos, Werbung, externe Schriften …):
  1. eigene Kategorie in `consent.ts` ergänzen,
  2. Abschnitt in `PrivacyPage.tsx` ergänzen,
  3. **`CONSENT_VERSION` erhöhen** – sonst gilt die alte Einwilligung weiter,
     obwohl sie den neuen Zweck nicht abdeckt,
  4. `LEGAL_LAST_UPDATED` anpassen.
* **Geänderte Verarbeitung** (neuer Anbieter, neue Region, neue Datenart):
  Abschnitt in `PrivacyPage.tsx` und `LEGAL_LAST_UPDATED` anpassen.
* **Neue öffentliche Seite** außerhalb der App (wie `public/neu/index.html`):
  Links auf `/impressum` und `/datenschutz` nicht vergessen.

## Von einem Rechts-/Datenschutzexperten prüfen lassen

Diese Punkte sind bewusst offen und lassen sich nicht aus dem Code beantworten:

1. **Auftragsverarbeitungsverträge (Art. 28 DSGVO)** mit Google (Firebase,
   Gemini) und GitHub: Die Datenschutzerklärung setzt voraus, dass sie
   abgeschlossen sind. Für Firebase geschieht das über die Google Cloud
   Data Processing Addendum – bitte bestätigen, dass sie akzeptiert ist.
2. **Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)**: für private
   Projekte je nach Umfang erforderlich; existiert bislang nicht.
3. **Gemini-Zählerscan**: ob die von Google für die Gemini-API zugesagten
   Bedingungen (Datenverwendung, Speicherdauer, Standort) zu der hier
   beschriebenen Verarbeitung passen, sollte gegen die aktuell geltenden
   Google-Bedingungen abgeglichen werden.
4. **Tesseract.js lädt Programm- und Sprachdateien von einem CDN**
   (jsDelivr, tessdata.projectnaptha.com) und überträgt dabei die IP-Adresse an
   Dritte. In der Datenschutzerklärung ist das benannt. Sauberer wäre, diese
   Dateien selbst auszuliefern – dann entfällt der Drittanbieter vollständig.
5. **Feedback-Screenshots** können unbeabsichtigt personenbezogene Inhalte
   enthalten. Aufbewahrungsdauer und Löschkonzept sollten festgelegt werden.
6. **Geteilte Wohnprofile**: Wenn mehrere Personen ein Profil nutzen,
   verarbeiten sie wechselseitig Daten. Ob und wann hier eine gemeinsame
   Verantwortlichkeit (Art. 26 DSGVO) entsteht, ist zu klären.
7. **Speicherdauer** der Feedback-Einträge und Konto-Daten ist in der
   Erklärung nur allgemein beschrieben und sollte konkretisiert werden.
8. **Analytics-Aufbewahrung**: Die Erklärung nennt 14 Monate. Bitte in der
   GA4-Property gegenprüfen (Verwaltung → Datenaufbewahrung) und ggf. anpassen.
9. **Zuständige Aufsichtsbehörde** ergibt sich aus dem Wohnsitz; sie wird in
   der Erklärung nur allgemein beschrieben und kann konkret benannt werden.
10. **Anschrift im Impressum**: Angegeben ist der Campus Wilhelminenhof der HTW
    Berlin, wo das Projekt entsteht. Diensteanbieter nach § 5 DDG sind aber die
    Personen, die das Angebot betreiben – nicht der Ort seiner Entstehung. Ein
    Personenname unter einer Hochschulanschrift behauptet Zustellbarkeit unter
    dieser Adresse; das trifft nur zu, wenn die Hochschule Post für diese
    Personen entgegennimmt. Für ein Studienprojekt vertretbar, vor öffentlicher
    Bewerbung zu klären.


## Ausführliche Erklärung für Außenstehende

`docs/rechtliches-referenz.md` erklärt Zweck, Inhalt und Begründung der drei
Bausteine (Impressum, Datenschutzerklärung, Einwilligung) im Zusammenhang –
gedacht als Faktenquelle für die schriftliche Ausarbeitung, nicht für die
Wartung. Diese Datei hier bleibt die Wartungsanleitung.
