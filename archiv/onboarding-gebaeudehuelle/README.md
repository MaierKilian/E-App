# Archiv: Fragebogen-Schritt „Gebäudehülle & Modernisierung"

Stillgelegt am **04.09.2026**. Der Code ist vollständig erhalten, wird aber
nicht mehr gebaut, getypt oder gelintet (`tsconfig.app.json` sammelt nur
`src/`, `eslint.config.js` ignoriert `archiv/`).

## Was der Schritt war

Schritt 5 von 8 des vollständigen Fragebogens, aus zwei Bausteinen:

| Datei | Inhalt |
|---|---|
| `Step2Building.tsx` | Ungefähres Alter der Fenster, Dämmzustand (Selbsteinschätzung), Lüftungstyp |
| `StepRenovationLog.tsx` | Sanierungs-Ereignisse als Log, Alter des Wärmeerzeugers, Effizienz-Einordnung der Gebäudehülle, Förder-Hinweis |

## Warum er entfallen ist

Eine Durchsicht aller Fragebogen-Felder gegen ihre tatsächlichen Lesestellen
ergab: Die vier Pflichtangaben dieses Schritts (`windowAge`,
`insulationState`, `ventilationType`, `renovations`) wurden von **keiner**
Messung, **keinem** Tipp und **keiner** Monitoring-Rechnung gelesen. Ihre
gesamte Wirkung waren vier Zeilen im PDF-Steckbrief.

Die Effizienz-Einordnung (`estimateEnvelope()`) rechnete zwar – aber ihr
Ergebnis sah ausschließlich, wer gerade in diesem Schritt stand. Sie floss in
nichts ein, was der Nutzer später wiederfand.

Vier Pflichtfragen für vier PDF-Zeilen war der schlechteste Tausch im
Fragebogen.

## Was bewusst nicht mitgegangen ist

- **Das Heizungs-Baujahr** (`heatGeneratorYears`) wird im Heizungs-Schritt
  erfasst, nicht hier. `StepRenovationLog` hat es nur *angezeigt*. Der Tipp
  „Heizung prüfen/tauschen lassen" (`boilerAgeYears` in `buildTips.ts`) ist
  darum unberührt.
- **Die Felder selbst** bleiben in `OnboardingData`, in der Migration und im
  Cloud-Sync. Bestandsprofile tragen echte Werte; die sollen nicht
  verschwinden. Der Steckbrief zeigt sie weiterhin – aber nur, wenn ein Wert
  da ist, statt einer Zeile „nicht angegeben" zu einer Frage, die niemand mehr
  gestellt bekommt.
- **Die i18n-Schlüssel** (`onboarding.step2.windowAgeOptions.*`,
  `onboarding.step5.*`, `onboarding.renovationLog.*`,
  `onboarding.step7renovation.*`) stehen weiter in `de.json`/`en.json`. Der
  Bericht braucht einen Teil davon, und der Rest hält dieses Archiv
  wiederherstellbar.

## Wiederherstellen

1. Beide `.tsx` zurück nach `src/features/onboarding/steps/`.
2. In `src/features/onboarding/sections.ts`: `'building'` in die `SectionId`-Union
   und den Abschnitts-Eintrag (mit `icon: Layers`) wieder zwischen `prices` und
   `equipment` einsetzen.
3. In `src/features/onboarding/OnboardingPage.tsx`: beide Imports und den
   `building`-Eintrag in `SECTION_BODIES` zurückholen.
4. In `tests/unit/sections.test.ts`: `'building'` in die id-Liste und die vier
   Feld-ids zurück in `ERHOBEN`.
5. Optional: die Zeilen in `Step8Review.tsx` und die `retired()`-Filterung in
   `src/features/reports/profileReportData.ts` zurücknehmen.

Der Commit, der den Schritt stillgelegt hat, enthält alle fünf Änderungen im
Zusammenhang.
