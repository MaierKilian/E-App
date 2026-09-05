# Archiv: Fragebogen-Schritt „Standort"

Stillgelegt am **05.09.2026**. Der Code ist vollständig erhalten, wird aber
nicht mehr gebaut, getypt oder gelintet (`tsconfig.app.json` sammelt nur
`src/`, `eslint.config.js` ignoriert `archiv/`).

## Was der Schritt war

Schritt 7 von 8 des vollständigen Fragebogens, aus zwei Fragen – am Ende nur
noch aus einer:

| Angabe | Stand |
|---|---|
| Postleitzahl (freiwillig) | bis zuletzt im Schritt |
| Mieter oder Eigentümer (`occupancyStatus`) | schon am 05.09. entfernt, siehe Punkt 25 |

## Warum er entfallen ist

Beide Fragen liefen ins Leere, und keine der beiden ließ sich mit vertretbarem
Aufwand anschließen.

**Mieter/Eigentümer** hätte nachgezählt genau *einen* Tipp gefiltert
(`old_boiler`, „Heizung prüfen oder tauschen lassen"). Dämmungs-Tipps gibt es
keine, die PV-Tipps hängen an einer Angabe, die der Nutzer selbst macht. Und
dieser eine Tipp ist für Mieter nicht nutzlos: Das Alter des Kessels ist ihr
Argument gegenüber der Vermietung.

**Die Postleitzahl** hatte eine einzige Lesestelle: `coarsePostalCode` kürzt sie
auf zwei Ziffern für den PDF-Steckbrief. Der naheliegende Abnehmer wäre eine
Klimaregion gewesen – sie würde das bundesweit einheitliche Saisonprofil in
`monitoring/seasonality.ts` regionalisieren und wäre damit sofort in der
Jahres-Hochrechnung, der Tank-Reichweite und dem Bericht wirksam. Dafür braucht
es geprüfte Monatsmittel je Region (DWD); ohne sie wären die Zahlen erfunden,
und die Konvention „Jeder Richtwert nennt seine Herkunft" schließt das aus.
Details in Punkt 24 von `docs/gefundene-probleme.md`.

Damit blieb ein eigener Schritt für ein freiwilliges Feld ohne Wirkung. Der
vollständige Fragebogen hat seither sieben statt acht Schritte.

## Was bewusst nicht mitgegangen ist

- **Die Felder selbst** (`postalCode`, `locationMode`, `occupancyStatus`)
  bleiben in `OnboardingData`, in der Migration und im Cloud-Sync.
  Bestandsprofile tragen echte Werte; die sollen nicht verschwinden. Kommt die
  Klimaregion je, ist die Angabe für diese Profile schon da.
- **Steckbrief und Zusammenfassung** zeigen beide Angaben weiterhin – aber nur,
  wenn ein Wert da ist (`retired()` in `profileReportData.ts`, Bedingung in
  `Step8Review.tsx`), statt einer Zeile „nicht angegeben" zu einer Frage, die
  niemand mehr gestellt bekommt.
- **`onboarding.step8.labels.postalCode`** und
  `onboarding.step8.sections.location` bleiben in `de.json`/`en.json`: Bericht
  und Zusammenfassung lesen sie.

## Wiederherstellen

1. `Step7Location.tsx` zurück nach `src/features/onboarding/steps/`.
2. In `src/features/onboarding/sections.ts`: `'location'` in die
   `SectionId`-Union und den Abschnitts-Eintrag (mit `icon: MapPin`, `quick:
   false`, einem optionalen `postalCode`-Feld) wieder zwischen `equipment` und
   `review` einsetzen.
3. In `src/features/onboarding/OnboardingPage.tsx`: Import und den
   `location`-Eintrag in `SECTION_BODIES` zurückholen.
4. In `tests/unit/sections.test.ts`: `'location'` in die id-Liste und
   `'postalCode'` zurück in `ERHOBEN`.
5. **Die i18n-Schlüssel neu anlegen** – anders als beim Archiv
   „Gebäudehülle" sind sie hier mit dem Schritt entfernt worden, weil sie sonst
   als tote Strings stehen geblieben wären: `onboarding.sectionTitles.location`,
   der Block `onboarding.step7` (`subtitle`, `postalCode`,
   `postalCodePlaceholder`, `optionalHint`) und `info.location`, je in `de.json`
   und `en.json`. Die Texte stehen im Commit, der den Schritt stillgelegt hat.
6. Optional: die `retired()`-Filterung der Postleitzahl in
   `profileReportData.ts` und die Bedingung um den Standort-Abschnitt in
   `Step8Review.tsx` zurücknehmen.

Der Commit, der den Schritt stillgelegt hat, enthält alle Änderungen im
Zusammenhang.
