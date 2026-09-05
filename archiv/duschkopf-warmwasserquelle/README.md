# Archiv: Warmwasserquelle im Duschkopf-Test

Stillgelegt am **05.09.2026**. Der Code ist vollständig erhalten, wird aber
nicht mehr gebaut, getypt oder gelintet (`tsconfig.app.json` sammelt nur
`src/`, `eslint.config.js` ignoriert `archiv/`, `vitest.config.ts` sammelt nur
`tests/`).

## Was das war

Eine Auswahl aus fünf Energieträgern (Strom/Durchlauferhitzer, Gas, Wärmepumpe,
Öl, Pellets) im Reiter „Messen" des Duschkopf-Tests, oberhalb der Stoppuhr.
Dazu `hotWaterEnergy.ts` mit drei Funktionen:

| Funktion | Aufgabe |
|---|---|
| `eurPerKwhHeat` | Arbeitspreis je nutzbarer Kilowattstunde Wärme, je Träger |
| `defaultHotWaterSource` | Vorauswahl aus `hotWaterType` + Wärmeerzeugern |
| `hotWaterSourceFromProfile` | Kam die Vorauswahl aus einer Angabe – oder ist sie ein Rückfall? |

## Warum sie entfallen ist

Kilians Beobachtung beim Live-Test: „Ich finde es komisch, hier nochmal das
‚Warmwasser über' auszuwählen? Das hat man doch bereits im Onboarding
gemacht." – Punkt 36 der gefundenen Probleme.

Nachgesehen hat sich der Einwand als der stärkere von zweien erwiesen. Die
Auswahl beeinflusste **nur** einen Euro-Betrag im Ergebnis, nie die Messung.
Und dieser Euro-Betrag ist mit demselben Umbau entfallen, weil die Ersparnis
als Prozentsatz auskommt:

    Ersparnis / Kosten = (Durchfluss − 8) / Durchfluss

Kosten und Wassermenge sind beide linear im Durchfluss. Im Verhältnis kürzt
sich deshalb **alles** weg, was nicht gemessen ist – Personenzahl,
Duschhäufigkeit, Duschdauer, Temperaturhub und eben der Arbeitspreis der
Warmwasserquelle. Die Frage konnte am Ergebnis also nichts ändern.

Dazu kam ein Befund, der ohnehin fällig war: Der Euro-Betrag war die **einzige
€-Anzeige der App, die an `isMeasuredSaving` vorbeilief**. Weil der Check seine
Details mit `savingEstimated: 1` markiert, zeigten Empfehlungen, Wirkungs-Summe
und PDF-Bericht ihn längst nicht mehr – nur der Ergebnis-Schirm griff über
`displaySavingEur` direkt auf den Rohwert zu.

## Was davon nützlich bleiben könnte

`eurPerKwhHeat` ist die einzige Stelle der App, die Arbeitspreise verschiedener
Energieträger auf **nutzbare** Kilowattstunden umrechnet (Heizwert und
Wirkungsgrad bzw. Arbeitszahl je Träger). Wer eine Wärme-Rechnung baut, die
Träger vergleichen muss, findet hier die Annahmen und ihre Herkunft.

## Was daran hängen blieb

`hotWaterType` (die Warmwasser-Frage im Fragebogen) verliert damit ihren
einzigen funktionalen Abnehmer; sie steht nur noch im Steckbrief des PDF-
Berichts. Das ist dieselbe Lage, die bei Kamin/Ofen, Smart-Home, Gebäudeteil
und Postleitzahl zur Streichung der Frage geführt hat – die Entscheidung dazu
steht bei Kilian, siehe „Offene Fragen" in `docs/gefundene-probleme.md`.
