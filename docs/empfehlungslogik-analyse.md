# Empfehlungslogik der E-App – Analyse als Wissensgrundlage

> **Zweck dieses Dokuments.** Es ist keine Hausarbeit und kein Fließtext, sondern
> eine geordnete Sammlung dessen, was im Code tatsächlich steht. Gedacht als
> Grundlage für einen Dokumentationsabschnitt über die Empfehlungsfunktion der
> E-App.
>
> **Stand:** 06.09.2026, Branch `claude/sync-9s7c6u`.
> **Erhebungsweise:** Vollständige Durchsicht der Ausgabepfade
> (`src/features/tips/`, `src/features/measurements/`, `src/features/reports/`)
> und beider Sprachdateien (`src/i18n/locales/de.json`, `en.json`).
>
> **Abgrenzung belegt/vermutet:** Alle Zahlen, Bedingungen und Zitate in
> Abschnitt 1–5 sind im Code nachgelesen. Abschnitt 6 enthält ausdrücklich
> gekennzeichnete Einschätzungen. Was sich nicht aus dem Code ableiten lässt,
> steht unter 5.5 („Was der Code *nicht* belegt").

---

## 1. Zweck der Empfehlungsfunktion

Die E-App erhebt Daten auf drei Wegen – Fragebogen (Haushaltsprofil), neun
angeleitete Messungen und Zählerstände im Monitoring – und übersetzt sie in
konkrete Handlungsvorschläge. Die Empfehlungsfunktion ist damit die Stelle, an
der aus Messwerten Handlungen werden; ohne sie bliebe die App eine
Datensammlung.

Zwei Leitsätze stehen als Kommentar im Code selbst und prägen den gesamten
Katalog:

1. **Laientauglichkeit als Ausschlusskriterium.**
   > „Jeder Tipp muss ohne Handwerker umsetzbar sein – die App misst, was ein
   > Laie selbst messen kann, und soll dann nichts empfehlen, wofür er jemanden
   > rufen müsste." (`buildTips.ts`)

   Deshalb trägt jede Empfehlung ihren Zeitaufwand (`effortMinutes`) und ihre
   Anschaffungskosten (`costEur`) mit; danach wird auch sortiert.

2. **Belegbarkeit vor Vollständigkeit.** Ein Euro-Betrag erscheint nur, wo die
   Rechnung ohne geschätzte Nutzungshäufigkeit auskommt (siehe 2.3). Sonst
   nennt die Empfehlung die gemessene Menge – Liter, Prozent, Watt, kWh.

Eine dritte Unterscheidung ist am 06.09.2026 dazugekommen: **Maßnahme oder
Befund** (`Tip.kind`). Sie trennt, was der Nutzer tun und abhaken kann, von
dem, was die App lediglich beobachtet hat (siehe 2.5).

---

## 2. Grundprinzip der Empfehlungslogik

### 2.1 Vier Ausgabekanäle, eine Quelle

| Kanal | Ort im Code | Was dort erscheint |
|---|---|---|
| **Empfehlungsseite** (`/tipps`) | `buildTips.ts` → `TipsPage.tsx` | Der personalisierte Katalog: 18 Empfehlungsarten, 21 Textbausteine |
| **Ergebnisseite je Messung** | `<check>/…Result.tsx` + i18n `measurements.<id>.result.*` | Bewertungsabhängige Einordnung und checkspezifische Hinweislisten |
| **PDF-Bericht, Kapitel „Handlungsplan"** | `actionPlanData.ts` | Dieselben offenen Empfehlungen, nach Aufwand gruppiert |
| **Folgemess-Anstöße** | `followUps.ts` | Hinweispunkte, eine Messung zu wiederholen |

Fachlich wichtig: **Der Bericht baut nichts nach.** Er verwendet `buildTips`,
`isQuickWin` und `displaySavingEur`, also dieselben Funktionen wie der
Bildschirm. Der Code begründet das ausdrücklich:

> „Ein Bericht, der anders ordnet als die App, wäre ein zweites Urteil über
> dieselbe Lage." (`actionPlanData.ts`)

Dasselbe Muster bei der empfohlenen **Mess-Reihenfolge** (`order.ts`): Sie
nutzt die Ziel-Gewichtung der Empfehlungen (`goalCategoryBonus`), damit nicht
zwei verschiedene Ordnungen für dieselbe Frage entstehen.

### 2.2 Ein Tipp je Befund, nicht je Messung

Der Raumklima-Check kann aus einer einzigen Messung bis zu fünf verschiedene
Empfehlungen erzeugen (zu warm, zu kalt, zu feucht, zu trocken, Zugluft) – und
zwar je Raum ausgewertet. Umgekehrt erzeugen mehrere gleichartige Geräte je
eine eigene Empfehlung: Zwei zu kalte Kühlschränke sind zwei Aufgaben, mit
eigener Kennung, damit „erledigt" je Gerät gilt.

Wo ein Befund mehrere Räume betrifft, trägt **ein** Raum die Empfehlung – und
zwar der mit dem größten Hebel, nicht der mit dem absolut höchsten Messwert
(siehe 5.1).

### 2.3 Wann ein Euro-Betrag erscheinen darf

Zwei Regeln, gebündelt in `savingsDisplay.ts`:

- **`isMeasuredSaving`** – „Jede Größe der Rechnung muss gemessen, vom Nutzer
  angegeben oder ein Preis sein. Sobald eine Nutzungshäufigkeit oder ein
  Verbrauch geschätzt wird, entfällt der Betrag."
- **`MIN_DISPLAY_EUR = 20`, Rundung auf `EUR_ROUNDING_STEP = 5`** – Kleinbeträge
  liegen innerhalb der Modellunsicherheit; ein centgenauer Punktwert wäre
  Schein-Genauigkeit. Angezeigt wird eine Spanne (±20 %).

Die Begründung im Code ist bemerkenswert offen:

> „Der Grund ist nicht Vorsicht, sondern Verteidigbarkeit: Eine Zahl, deren
> größte Unsicherheit in einer erfundenen Häufigkeit steckt („1,5 Duschen pro
> Tag"), lässt sich in keiner Vorführung begründen. Eine gemessene Wassermenge
> dagegen schon."

**Wirkung:** Nur vier der neun Messungen tragen überhaupt `yieldsSaving`
(Standby, Gefriergerät, Warmwasser-Wartezeit, Raumtemperatur), und faktisch
zeigt nur noch **Standby** einen Euro-Betrag an. Duschkopf, Kühlschrank und
Raumtemperatur nennen stattdessen Prozent oder Liter.

### 2.4 Reihenfolge der Empfehlungen

`compareTips` sortiert in fünf Stufen:

1. **Sofortmaßnahme** (`isQuickWin`: `costEur === 0 && effortMinutes <= 15`)
2. **Ziel-Gewicht** des Gewerks (`GOAL_CATEGORY_BONUS`)
3. **Euro-Ersparnis** absteigend
4. **Kosten** aufsteigend
5. **Aufwand** aufsteigend

Der Vorrang der Sofortmaßnahmen ist bewusst gesetzt und begründet: Eine reine
€-Sortierung schob „Sofa vom Heizkörper wegrücken" hinter „smarte Thermostate
für 120 €". Das Ziel wirkt **innerhalb** der Gruppen, nicht darüber.

Die Ziel-Gewichtung (`GOAL_CATEGORY_BONUS`) ist dabei nur für zwei der fünf
Ziele belegt:

| Ziel | Gewichtung | Begründung im Code |
|---|---|---|
| `reduce_co2` | Wärme 2, Warmwasser 2, Strom 1 | Wärme trägt den größten CO₂-Hebel |
| `improve_comfort` | Wärme 2, Warmwasser 1 | Raumklima und Zugluft zuerst |
| `save_costs` | – | „Die vorhandene €-Sortierung *ist* die Antwort" |
| `track_readings` | – | Wirkt in der Navigation, nicht in der Reihenfolge |
| `curiosity` | – | Keine sachliche Reihenfolge wäre besser |

Nur Ziele, die die Reihenfolge tatsächlich verändern, werden dem Nutzer als
„Sortiert nach deinem Ziel" angezeigt (`sortingGoals`) – ein „Sortiert nach:
Kosten sparen" wäre eine Behauptung ohne Deckung.

### 2.5 Maßnahme oder Befund

`Tip.kind` unterscheidet zwei Arten von Einträgen:

- **`action`** (Standard): etwas, das der Nutzer tut und danach hinter sich hat.
  Trägt Aufwand, Kosten und einen Erledigt-Haken.
- **`finding`**: eine Beobachtung der App – ein steigender Verbrauch, eine
  unerklärte Grundlast. Steht in einer eigenen Gruppe („Was auffällt") vor den
  Maßnahmen, ohne Aufwandsangabe und ohne Haken, und zählt nicht in den
  Fortschrittsbalken.

Die Begründung ist nicht nur konzeptionell: Der Erledigt-Status liegt dauerhaft
in `tipsStore.doneIds` (localStorage). Ein abgehakter Befund wäre also nie
wieder erschienen, auch wenn der Zustand fortbesteht. Befunde treten
stattdessen von selbst ab, sobald ihre Bedingung nicht mehr zutrifft.

Aktuell sind drei Einträge Befunde: `consumption_up_*`, `base_load` und
`base_load_unexplained`.

---

## 3. Systematische Übersicht aller Empfehlungen

### 3.1 Der Empfehlungskatalog (`buildTips.ts`)

Gruppiert nach Datenquelle. „Wirkung" nennt, was statt oder neben dem Text
erscheint.

#### A. Aus Messungen abgeleitet (Strom)

| Bedingung | Empfehlung | Logik / Begründung | Wirkung | Aufwand/Kosten |
|---|---|---|---|---|
| Standby-Ersparnis > 0 € | **Standby abschalten** – Steckdosenleiste mit Schalter, größter Posten wird namentlich genannt | Bewertung ab > 5 W Gesamtleistung; die vermeidbaren Kosten entsprechen den vollen Jahreskosten | **Euro-Betrag** (der einzige im Katalog) | 15 min / 15 € |
| Räume mit Altlampen vorhanden | **Auf LED umstellen** – dort anfangen, wo täglich am längsten Licht brennt | Räume sind nach Nutzungsintensität priorisiert (`ROOM_PRIORITY` 1–3); der erste trägt den Tipp | Anzahl offener Räume | 20 min / 25 € |
| Kühlschrank < 5 °C | **Kühlschrank wärmer stellen** – 5 bis 7 °C reichen, jedes Grad wärmer spart rund 6 % Strom | Unter dem empfohlenen Band ist die Kühlung unnötig energieintensiv | – (kein €, da kein gerätespezifischer Verbrauch bekannt) | 2 min / 0 € |
| Kühlschrank > 7 °C | **Kühlschrank kälter stellen** – Zielband 5–7 °C | Lebensmittelsicherheit, nicht Energie – die gegenläufige Empfehlung | – | 2 min / 0 € |
| Gefriergerät vereist | **Gefrierfach abtauen** | Eisschicht erhöht den Verbrauch (5/12/30 % je Stufe) | Euro nur aus Altergebnissen | 60 min / 0 € |
| Grundlast auffällig, **kein** Standby-Ergebnis | **Dauerverbraucher aufspüren** → führt in den Standby-Check | Die Grundlast sagt, *dass* etwas zieht, nicht *was* – der Tipp ist ein Wegweiser | Befund, mit Link | 20 min / 15 € |
| Grundlast auffällig, Standby gemessen, Rest noch auffällig | **Rest der Grundlast aufspüren** – „von 250 W erklärt der Standby-Check 18 W" | Der Standby-Check erklärt die Grundlast selten ganz; Dauerläufer (Kühlgeräte, Umwälzpumpe, Router) tauchen dort nicht auf | Befund, ohne Link | 20 min / 0 € |

#### B. Aus Messungen abgeleitet (Wasser / Warmwasser)

| Bedingung | Empfehlung | Logik / Begründung | Wirkung | Aufwand/Kosten |
|---|---|---|---|---|
| Duschkopf-Durchfluss > 9 L/min | **Sparduschkopf aufschrauben** – Ziel rund 8 L/min | Ersparnis folgt allein aus der Messung: `(Durchfluss − 8) / Durchfluss`; Personenzahl, Duschdauer und Temperaturhub kürzen sich weg | **Liter/Jahr** statt Euro | 10 min / 20 € |
| Wartezeit auf Warmwasser nicht „gut" (> 15 s) | **Vorlaufwasser auffangen** – Gießkanne oder Eimer, für Pflanzen, Putzen, Toilette | Die Wartezeit ist gemessen, die Zapfhäufigkeit ein typischer Wert je Person – deshalb kein Euro | **Liter/Jahr**; ohne Datengrundlage eigener Text ohne Zahl | 1 min / 0 € |

#### C. Aus Messungen abgeleitet (Heizen / Raumklima)

Alle fünf hängen am selben Check und nennen ihren Raum, damit gegensätzliche
Befunde nicht wie ein Widerspruch aussehen.

| Bedingung | Empfehlung | Logik / Begründung | Wirkung |
|---|---|---|---|
| Temperatur über dem Komfortband des Raumtyps | **Raumtemperatur senken** – ein Grad spart rund 6 % Heizenergie | Faustregel, belegt (Verbraucherzentrale RLP); der Raum mit dem größten `savingPercent` trägt den Tipp | **Prozent Heizenergie** |
| Temperatur mehr als 2 K unter dem Band | **Raum nicht auskühlen lassen** – niedrige Dauerstufe statt Abschalten | Auskühlung führt zu Feuchte und Schimmelrisiko; Wiederaufheizen ist ineffizient | – |
| Luftfeuchte über dem Band des Raumtyps | **Gegen Feuchte lüften** – 2–3× täglich 5 min stoßlüften | Band raumtypabhängig: Wohnraum 40–60 %, Keller/Waschküche 50–65 % | – |
| Luftfeuchte unter dem Band | **Luft ist zu trocken** – kürzer lüften, nicht überheizen | Trockene Luft ist im Winter Folge des Aufheizens kalter Außenluft | – |
| Zugluft-Index ≥ 1 (spürbar) | **Zugluft abdichten** – selbstklebendes Dichtungsband | Der zugigste Raum trägt den Tipp | – |
| Möbel-Abstands-Check nicht „gut" | **Heizkörper frei räumen** – ab etwa 30 cm kommt die Wärme im Raum an | Zielwert 30 cm, belegt | – |

#### D. Ohne Messung, allein aus dem Fragebogen

| Bedingung | Empfehlung | Logik / Begründung | Aufwand/Kosten |
|---|---|---|---|
| Gas- oder Ölkessel ≥ 20 Jahre | **Heizungstausch prüfen** – Hinweis auf staatliche Förderung | Übliche Nutzungsdauer 20–25 Jahre; der größte Einzelhebel eines Hauses. Filtert korrekt auf `gas_boiler`/`oil_boiler` – eine alte Wärmepumpe löst ihn nicht aus | 240 min / 8.000 € |
| `hasPV === 'yes'` | **Große Verbraucher in die Sonnenstunden legen** – Startzeitvorwahl, E-Auto, Warmwasser | Selbst verbrauchter Strom ist den Bezugspreis wert, eingespeister nur die Vergütung | 5 min / 0 € |

Der hohe Aufwand beim Heizungstausch ist **bewusst** hinterlegt, damit der Tipp
in die Gruppe „Braucht etwas Vorbereitung" fällt und keine Sofortmaßnahme
verdrängt.

#### E. Aus Zählerständen (Monitoring)

| Bedingung | Empfehlung | Logik / Begründung | Wirkung |
|---|---|---|---|
| Jahresverbrauch ≥ 10 % über dem Vorjahr, **Strom oder Wasser** | **Mehr … als im Vorjahr** – „Das ist gemessen, nicht geschätzt. Geh der Ursache nach" | Der einzige Befund aus echtem Verbrauch über Zeit; beide Vergleichsjahre müssen von Ablesungen gedeckt sein | Mehrmenge + Kosten, Link in den Verlauf |
| dasselbe, **Gas/Öl/Pellets/Wärmepumpe** | dieselbe Meldung **mit Witterungsvorbehalt**: „Die Menge ist gemessen; die Ursache noch nicht. Ein kälteres Jahr erklärt beim Heizen einen Teil davon" | Bei Wärmeträgern ist ein Jahresunterschied oft witterungsbedingt; die Wärmepumpe zählt trotz Gewerk „Strom" dazu, weil sie heizt | dito |

### 3.2 Empfehlungen auf den Ergebnisseiten der Messungen

Ein zweiter, vom Katalog unabhängiger Ausgabeweg. Jeder Check liefert je
Bewertungsstufe eine Einordnung (`result.summary.<rating>`); einige zusätzlich
eigene Hinweislisten.

| Check | Stufen | Zusätzliche Empfehlungsebene |
|---|---|---|
| Duschkopf | 3 | Hinweis zum Gewinde (½ Zoll); ausdrücklich **keine** Kaufempfehlung, plus Hinweis, dass „Eco"/„sparsam" keine geschützten Begriffe sind |
| Warmwasser-Wartezeit | 4 | Vorschläge zur Weiterverwendung; „So gerechnet"-Aufklappung |
| Raumklima | 3 (+ je Dimension) | Eigene Statustexte je Dimension (Temperatur, Feuchte, Zugluft) **und** ein Kondensat-Hinweis für Keller (siehe 5.2) |
| Möbel-Abstand | 4 | **Bauartabhängige Hinweislisten**: je drei Punkte für Heizkörper, Fußbodenheizung, Infrarotplatte, Ofen (siehe 5.3) |
| LED | 4 | Kaufhilfe: Fassung (E27/E14/GU10), Farbtemperatur 2700 K, Lumen statt Watt |
| Grundlast | 4 | „Funnel" in den Standby-Check; Vorher/Nachher-Vergleich mit Messtoleranz |
| Standby | 3 | Geräteaufschlüsselung, vermeidbarer Anteil |
| Kühlschrank | 3 | Zielband 5–7 °C in jeder Stufe genannt |
| Gefriergerät | 4 | Eigene Handlungsempfehlung je Eisstufe (`advice`: nicht nötig / kann warten / lohnt sich / jetzt) |

### 3.3 Folgemess-Anstöße (`followUps.ts`)

Keine Textempfehlungen, sondern Hinweispunkte in Navigation und Messungsliste:

| Anlass | Bedingung | Begründung |
|---|---|---|
| Grundlast erneut messen | Nach der Grundlast wurde Standby, Kühl- oder Gefriergerät gemessen, und seither sind ≥ 2 Tage vergangen | Die Grundlast ist die einzige Messung, deren Wirkung der Nutzer selbst nachprüfen kann – aber nur beim zweiten Mal. Nur diese drei Checks senken sie überhaupt |
| Kühlschrank erneut messen | Letztes Ergebnis nicht „gut" | Die Stufe wurde noch nicht (oder nicht erfolgreich) angepasst; je Gerät einzeln |
| Gefriergerät erneut messen | Abtauen abgehakt, seither ≥ 182 Tage, keine neue Messung | Direkt nach dem Abtauen ist das Gerät erwartbar eisfrei – erst wenn sich wieder Eis bilden konnte, sagt das Ergebnis etwas Neues |

### 3.4 Plausibilitätshinweise im Fragebogen (`plausibility.ts`)

Keine Handlungsempfehlungen, sondern Rückfragen bei unplausiblen Eingaben:
< 12 oder > 150 m² je Person, < 6 oder > 80 m² je Zimmer. Bewusst weit außerhalb
des Üblichen (25–80 bzw. 15–40 m²) angesetzt, um Fehlalarme zu vermeiden. Ein
weggeklickter Hinweis gilt nur für **diese** Wertekombination – wer später 700
statt 70 eintippt, sieht ihn wieder.

---

## 4. Auslösebedingungen und Entscheidungslogik

### 4.1 Die Kette von der Eingabe zur Empfehlung

```
Fragebogen ─┐
Messungen  ─┼─→ buildTips() ─→ compareTips() ─┬─→ Empfehlungsseite (Bildschirm)
Zählerstände┘        │                        └─→ Handlungsplan (PDF)
                     │
                     └─ Filter: erledigt / ausgeblendet (tipsStore)
```

`buildTips` ist **zustandslos**: Die Liste wird bei jedem Aufruf neu aus Profil,
Messergebnissen und Zählerständen abgeleitet. Der `tipsStore` merkt sich nur,
was der Nutzer damit gemacht hat. Praktische Folge: Eine Empfehlung verschwindet
von selbst, sobald ihre Bedingung nicht mehr zutrifft.

### 4.2 Bewertungsschwellen je Messung

Diese Schwellen entscheiden, ob überhaupt eine Empfehlung entsteht. Die Spalte
**Herkunft** folgt der projekteigenen Kennzeichnung (`ThresholdOrigin` in
`measurementThresholds.ts`): `reference` = belegte Quelle, `own` = begründeter
eigener Richtwert, `pending` = noch offen.

| Messung | Stufen | Herkunft |
|---|---|---|
| Duschkopf | gut ≤ 9, mittel ≤ 12, darüber hoch (L/min); Zielwert 8 | `reference` |
| Warmwasser-Wartezeit | kurz ≤ 15 s, spürbar ≤ 30, lang ≤ 60, darüber sehr lang | **`pending`** – „Die Stufen sind gewachsen, nicht hergeleitet" |
| Raumklima Temperatur | Komfortband je Raumtyp (siehe unten); ab 3 K Abweichung „deutlich" | `reference` |
| Raumklima Feuchte | Wohnraum 40–60 %, Keller/Waschküche 50–65 % | `reference` |
| Möbel-Abstand | Ziel 30 cm, blockiert ≤ 5 cm; Verdeckung ab 15 % teilweise, ab 30 % blockiert; Gesamtbewertung über Gewichtungs-Ratio (0,25 / 0,55) | `reference` (30 cm), teils `own` |
| LED | Punktesumme der offenen Räume nach Nutzungspriorität (1–3): 0 gut, ≤ 2 mittel, ≤ 5 erhöht, darüber hoch | `own` |
| Grundlast | **Bevorzugt Anteil am Jahresverbrauch**: ≤ 25 % gut, ≤ 35 % mittel, ≤ 50 % erhöht. Nur ohne Ablesungen absolut: ≤ 70 / 150 / 250 W | **`pending`** |
| Standby | gut ≤ 5 W, mittel ≤ 20 W, darüber hoch | **`pending`** – die Ökodesign-Grenze von 0,5 W ist eine Bauvorschrift, kein Maßstab für Bestandsgeräte |
| Kühlschrank | gut 5–7 °C, zu kalt < 3 °C, zu warm > 8 °C; 6 % Mehrverbrauch je Grad kälter | `reference` |
| Gefriergerät | vier Eisstufen mit Mehrverbrauch 0 / 5 / 12 / 30 % | `own` |

Die **Komfortbänder** im Einzelnen (`COMFORT_BANDS`) – sie sind der Grund, warum
eine feste Temperaturschwelle für die Empfehlungen nicht funktioniert:

| Raumtyp | Band | Raumtyp | Band |
|---|---|---|---|
| Wohn-, Ess-, Arbeitszimmer | 20–22 °C | Bad | 22–24 °C |
| Küche | 18–20 °C | Keller | 14–18 °C |
| Schlaf-, Kinderzimmer, Flur, Hauswirtschaftsraum | 16–18 °C | | |

Die **Nutzungspriorität der Räume** beim LED-Check (`ROOM_PRIORITY`) staffelt
sich analog: Wohnzimmer, Küche und Arbeitszimmer zählen 3 Punkte, Ess-, Kinder-,
Schlafzimmer, Bad und Flur 2, Toilette, Hauswirtschaftsraum, Keller und
Treppenhaus 1. Die Summe der offenen Räume ergibt die Bewertung – ein einzelnes
vergessenes Kellerlicht erzeugt damit keine dringende Empfehlung.

### 4.3 Textvarianten desselben Tipps

Drei Empfehlungen wechseln ihren Text abhängig von der Datenlage – fachlich
relevant, weil hier die Ehrlichkeit der Ausgabe geregelt wird:

| Tipp | Variante | Auslöser |
|---|---|---|
| Standby | `standby` / `standby_named` | Ob das größte Gerät eine Bezeichnung trägt (Altergebnisse haben nur den Typ) |
| Warmwasser-Wartezeit | `hot_water_wait` / `hot_water_wait_unknown` | Ob Literangaben vorliegen. Fehlen sie (Altergebnis), erscheint ein Text **ohne Zahl** statt einer erfundenen Null |
| Verbrauchstrend | `consumption_up` / `consumption_up_heating` | Ob der Energieträger witterungsabhängig ist |

### 4.4 Empfehlungen, die aufeinander aufbauen

Drei Abhängigkeiten sind im Code angelegt:

1. **Grundlast → Standby → Rest.** Der Grundlast-Befund führt zunächst in den
   Standby-Check. Ist der erledigt, entscheidet die Restleistung
   (`Grundlast − gefundener Standby`), ob ein zweiter Befund erscheint. Der Rest
   wird an denselben Schwellen gemessen wie die Grundlast selbst – bewusst keine
   zweite Skala.
2. **Grundlast → Nachmessen.** Nur Standby, Kühl- und Gefriergerät lösen den
   Anstoß zum Nachmessen aus; Duschkopf und LED nicht, weil sie in der Grundlast
   nicht auftauchen.
3. **Duschkopf → Warmwasser-Wartezeit.** Die Wartezeit-Rechnung verwendet den
   tatsächlich gemessenen Duschkopf-Durchfluss, wenn er vorliegt, statt eines
   Pauschalwerts.

### 4.5 Gegenläufige Empfehlungspaare

Vier Paare können gleichzeitig erscheinen und sind deshalb bewusst mit Raum-
oder Gerätebezug versehen:

- Raumtemperatur senken ↔ Raum nicht auskühlen lassen (verschiedene Räume)
- Gegen Feuchte lüften ↔ Luft ist zu trocken (verschiedene Räume)
- Kühlschrank wärmer ↔ Kühlschrank kälter (verschiedene Geräte)

Der Code begründet den Raumbezug ausdrücklich: Ohne ihn stünden die Texte
„unvermittelt nebeneinander und läsen sich wie ein Widerspruch, statt zwei
verschiedene Räume zu meinen."

---

## 5. Besonderheiten und fachlich relevante Zusammenhänge

### 5.1 Ein Raum, ein Messwert – die Extremum-Regel

Wo mehrere Räume betroffen sind, wählt die App den Raum mit dem größten
**Hebel** (`savingPercent`), nicht mit dem höchsten Messwert. Der Unterschied
entsteht, weil das Komfortband raumtypabhängig ist: Ein Wohnzimmer mit 24 °C
liegt 2 K über seinem Band, ein Schlafzimmer mit 21 °C aber 3 K. Würden Raumname
und Prozentwert getrennt ermittelt, nennte die Empfehlung Zahlen, die zusammen
nie gemessen wurden. Dieselbe Regel gilt für Feuchte, Zugluft und die
Warmwasser-Entnahmestelle.

### 5.2 Der Keller als Sonderfall – und eine Inkonsistenz

Die App behandelt Keller und Waschküche gesondert: eigenes Feuchteband (50–65 %)
und, auf der Ergebnisseite, eine **Taupunktrechnung** (`dewPoint.ts`). Sie
nimmt eine Wandtemperatur von 12 °C an (Erdreich in 1–2 m Tiefe, bewusst der
vorsichtigere obere Rand) und warnt, wenn der Taupunkt der Kellerluft sie
erreicht:

> „Schimmel entsteht nicht durch eine Prozentzahl … Im Sommer nachts oder früh
> morgens lüften, nicht mittags: Warme Außenluft bringt mehr Feuchte herein, als
> sie hinausträgt."

**Relevant für die Dokumentation:** Dieser fachlich korrekte Rat steht nur auf
der Ergebnisseite. Die Empfehlung `humidity_high` im Katalog rät pauschal zu
„2–3× täglich 5 Minuten stoßlüften" – für einen Keller im Sommer das Gegenteil
des Richtigen. Die App enthält also beide Aussagen an verschiedenen Stellen.
Das ist ein dokumentierter offener Punkt (`docs/gefundene-probleme.md`, #38b).

### 5.3 Bauartabhängige Hinweise beim Möbel-Abstand

Der Möbel-Abstands-Check ist die einzige Messung mit vollständig
bauartabhängiger Logik: Für Heizkörper, Fußbodenheizung, Infrarotplatte und Ofen
gibt es je eigene Befund-Schlüssel **und** eigene Hinweislisten – von „keine
langen Vorhänge davor" (Heizkörper) über „Möbel mit Füßen wählen"
(Fußbodenheizung) bis „nichts auf oder an die Platte hängen; sie wird über 90 °C
heiß" (Infrarot). Zusätzlich hängt die abgefragte Hauptfrage am Raumtyp
(`ROOM_PRIMARY_KEY`).

### 5.4 Bewusste Vereinfachungen

| Vereinfachung | Ort | Folge |
|---|---|---|
| Standby wird mit **24 h/Tag** angesetzt | `standby.ts` | Die Moduldoku nennt es selbst „bewusste Näherung … keine exakte Abrechnung" |
| Vermeidbare Standby-Kosten = **volle** Jahreskosten | `standby.ts` | Unterstellt vollständige Abschaltbarkeit; für Router oder Set-Top-Box nicht zutreffend |
| Keine Witterungsbereinigung | `readings.ts` | Der Jahresvergleich ist saisonal unbereinigt; seit 06.09. nennt der Text bei Wärmeträgern den Vorbehalt, die Auslöseschwelle bleibt bei 10 % |
| Kein externer Netzzugriff | gesamte App | Klimaregion, Gradtagzahlen und regionale Preise fehlen – bewusst, weil eine Wetterabfrage ein einwilligungsbedürftiger Dienst wäre |
| Raumanteil an den Heizkosten nach **Grundfläche** | `roomClimate.ts` | Die Heizlast hängt an der Hüllfläche; deshalb wird bewusst nur die relative Einsparung ausgegeben, kein Euro-Betrag |
| CO₂-Schätzung über den Strompreis | `impact.ts` | 0,38 kg/kWh, ausdrücklich „bewusst grob" |

### 5.5 Was der Code *nicht* belegt

Diese Punkte sollten in einer Dokumentation **nicht** behauptet werden:

- **Keine Wirksamkeitsmessung.** Die App prüft an keiner Stelle, ob eine
  umgesetzte Empfehlung tatsächlich Einsparung gebracht hat – mit einer
  Ausnahme: Der Grundlast-Vorher/Nachher-Vergleich weist einen Unterschied nur
  dann aus, wenn er größer als die Messtoleranz ist. Das ist die einzige
  Stelle, an der die App nachweist statt schätzt.
- **Keine Nutzerdaten zur Akzeptanz.** „Erledigt"-Häkchen liegen nur lokal im
  Browser; es gibt keine Auswertung, welche Empfehlungen befolgt werden.
- **Keine Priorisierung nach Wirtschaftlichkeit im engeren Sinn.** Es wird keine
  Amortisationszeit gerechnet. Die Sortierung nutzt Aufwand, Kosten und
  Ersparnis getrennt, nicht deren Verhältnis.
- **Keine individuelle Gebäudesimulation.** Faustregeln (6 %/K) und
  Pauschalanteile ersetzen jede bauphysikalische Rechnung.
- **Der Fragebogen wirkt schwächer, als er wirkt scheint.** Mehrere Felder
  wurden mangels Abnehmer entfernt (Kamin, Smart-Home, Etagenzahl,
  Postleitzahl, Mieter/Eigentümer). Nur `hasPV`, `heatGenerators` samt Baujahr,
  `appliances`, `rooms`, `livingArea`, `personsCount` und `goals` haben
  funktionale Wirkung auf Empfehlungen oder Messungen.

### 5.6 Offene Punkte, die im Code selbst benannt sind

Bemerkenswert für eine wissenschaftliche Dokumentation: Die Einschränkungen sind
nicht rekonstruiert, sondern **im Projekt dokumentiert**. Drei Schwellen sind
ausdrücklich als `pending` markiert („Ohne Beleg"), und
`docs/gefundene-probleme.md` führt 51 geprüfte Befunde samt Status. Die
Kennzeichnungspflicht ist als Konvention festgeschrieben:

> „Jeder Richtwert nennt seine Herkunft. `ThresholdOrigin` ist `reference`
> (belegte Quelle), `own` (Richtwert der E-App, begründet) oder `pending` (noch
> offen) – nie unmarkiert." (`CLAUDE.md`)

Ebenfalls im Repository dokumentiert und für die Bewertung relevant: Die
Trennung von Befund und Maßnahme wirkt derzeit nur auf dem Bildschirm; im
PDF-Handlungsplan werden Befunde noch in die Aufwandsgruppen einsortiert.

---

## 6. Hinweise für die spätere wissenschaftliche Dokumentation

*Dieser Abschnitt enthält Einschätzungen, keine Code-Befunde.*

### 6.1 Vorschlag für 2–3 Seiten

| Abschnitt | Umfang | Form |
|---|---|---|
| **1. Zweck und Anforderungen** | ~1/3 Seite | Fließtext |
| **2. Aufbau der Empfehlungslogik** | ~2/3 Seite | Fließtext + Abbildung |
| **3. Übersicht der Empfehlungen** | ~3/4 Seite | Tabelle |
| **4. Entscheidungsgrundlagen und Schwellenwerte** | ~1/2 Seite | Tabelle + kurzer Fließtext |
| **5. Grenzen und offene Punkte** | ~1/2 Seite | Fließtext |

### 6.2 Was in den Fließtext gehört

Die **Argumente**, nicht die Aufzählungen. Vier Punkte tragen den Abschnitt und
sind das, was eine Prüferin honoriert:

1. **Die Laientauglichkeit als Ausschlusskriterium** – die App empfiehlt
   bewusst nichts, was einen Handwerker braucht. Das erklärt, warum der
   Katalog so klein ist.
2. **Die Euro-Disziplin** – dass ein Betrag nur erscheint, wenn keine
   geschätzte Nutzungshäufigkeit darin steckt, und dass die App stattdessen
   Liter oder Prozent nennt. Hier lässt sich am besten zeigen, dass eine
   bewusste Entscheidung getroffen wurde.
3. **Sofortmaßnahmen vor Wirkung** – die Sortierung folgt nicht dem Geld,
   sondern der Umsetzbarkeit. Das ist eine begründete Abweichung von der
   naheliegenden Lösung.
4. **Befund ≠ Maßnahme** – warum ein Verbrauchsanstieg nicht abhakbar ist. Ein
   gutes Beispiel dafür, dass Interaktionsdesign und Fachlogik zusammenhängen.

### 6.3 Was als Tabelle besser wirkt

- Die **Empfehlungsübersicht** (Abschnitt 3.1) – zusammengefasst auf etwa 10–12
  Zeilen. Empfehlung, Auslöser, Aufwand/Kosten genügen; die Begründungsspalte
  eher weglassen oder auf Schlagworte kürzen.
- Die **Schwellenwerte** (4.2), gekürzt auf Messung, Grenzwerte, Herkunft. Die
  Spalte „Herkunft" ist das eigentlich Interessante, weil sie die drei
  unbelegten Schwellen offenlegt.

### 6.4 Ob eine Abbildung Mehrwert hat

**Ja, genau eine.** Ein schlichtes Flussdiagramm der Kette
*Datenquellen → `buildTips` → Sortierung → zwei Ausgabekanäle* (Schema in 4.1)
macht in einem Bild klar, was sonst eine halbe Seite Text braucht – besonders
die Aussage, dass Bildschirm und PDF **dieselbe** Quelle nutzen.

Ein vollständiger Entscheidungsbaum über alle 18 Empfehlungen wäre dagegen
unübersichtlich und würde die Tabelle nur doppeln. Falls ein zweites Bild
gewünscht ist, lohnt eher die Kette *Grundlast → Standby → Restleistung* (4.4):
Sie zeigt aufeinander aufbauende Empfehlungen an einem konkreten Fall.

### 6.5 Was weggelassen werden kann

- Dateinamen, Funktionsnamen und i18n-Schlüssel. Sie gehören allenfalls in eine
  Fußnote, nicht in den Text.
- Die Zwei-Format-Lesbarkeit gespeicherter Ergebnisse, Migrationen,
  Persistenz-Kodierung – technisch interessant, für die Empfehlungslogik ohne
  Belang.
- Die Textvarianten (4.3) im Einzelnen. Ein Satz genügt: dass die App bei
  fehlender Datengrundlage einen Text ohne Zahl zeigt, statt eine Null zu
  erfinden.
- Die vollständige Liste der Ergebnistexte je Bewertungsstufe. Dass es je Check
  drei bis vier abgestufte Einordnungen gibt, ist die Aussage; die Texte selbst
  sind Anhang-Material.

### 6.6 Ein Hinweis zur Haltung

Der stärkste Punkt dieses Abschnitts ist nicht, was die App kann, sondern **wo
sie sich zurückhält**: kein Euro-Betrag ohne Deckung, keine erfundenen
Klimadaten, drei Schwellen offen als unbelegt markiert, entfernte
Fragebogen-Felder ohne Abnehmer. Das lässt sich in zwei oder drei Sätzen als
bewusste Entwurfsentscheidung darstellen und ist glaubwürdiger als eine
Aufzählung von Funktionen. Wichtig dabei: Die offenen Punkte nicht beschönigen –
sie sind im Projekt selbst dokumentiert und damit ohnehin nachprüfbar.
