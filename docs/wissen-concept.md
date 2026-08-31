# Wissen-Konzept – Oberfläche und Inhalt der drei Bereiche

> Stand: 2026-08-31 · Aufwertung des Bereichs „Wissen" mit seinen drei
> Ansichten FAQ, Glossar und Messungen.
> **Noch nicht umgesetzt** – dies ist die abgestimmte Zielvorstellung.
>
> Arbeitsstand und Etappenschnitt: `wissen-etappen.md`.
> Berührt ausschließlich `src/features/education/` (ohne den HTW-Teil).

---

## 0. Leitgedanke

> **Die drei Bereiche bleiben. Sie werden nur endlich gut.**

Der Zuschnitt FAQ · Glossar · Messungen steht nicht zur Debatte. Was fehlt, ist
Handwerk an zwei Stellen: die Oberfläche macht den vorhandenen Inhalt
unauffindbar, und der Inhalt ist an drei Stellen unfertig.

Zwei Regeln tragen den Umbau:

1. **Additiv, nicht ersetzend.** Die Typen `FaqItem`, `GlossaryItem` und
   `MeasurementInfo` bleiben – sie bekommen ausschließlich *optionale* Felder.
   Kein bestehender Eintrag muss angefasst werden, damit die App läuft.
2. **Zahlen stehen an einer Stelle.** Wo der Wissensbereich einen Richtwert
   nennt, den eine Messung ebenfalls kennt, liest er ihn aus dem Mess-Modul
   statt ihn im Text zu wiederholen. Sonst behaupten zwei Stellen irgendwann
   Verschiedenes.

**Ausdrücklich nicht Teil dieses Vorhabens:** ein Artikel-Datenmodell,
Personalisierung aus dem Profil, eine Themen-Navigation, Rechner im Text,
Entscheidungsstrecken, Karteikarten. Der HTW-Teil (Icon-Button oben rechts,
`UniversityView`, `FlashcardsView`, `/lernen`) bleibt **unberührt**.

---

## 1. Der Befund

### 1.1 Oberfläche: dreimal dieselbe Konstruktion

`FaqView`, `GlossaryView` und `MeasurementsView` in `EducationPage.tsx` sind
dieselbe Bauart: ein Suchfeld über einer Liste zugeklappter Accordions. FAQ und
Glossar sind praktisch dieselbe Komponente, zweimal geschrieben – inklusive
zweier getrennter Suchfelder über je ein Array.

Daraus folgen vier Probleme:

| Problem | Auswirkung |
|---|---|
| Jede Karte gleich groß, gleich schwer | Keine Hierarchie – 12 identische Blöcke |
| ~72 px Karte für eine Zeile Text | 6 Einträge je Bildschirm; 31 Begriffe = 5 Bildschirme |
| Nichts verrät, was drin ist | Jeder Eintrag muss angetippt werden, um beurteilt zu werden |
| Keine Kategorien | Einzige Struktur der FAQ: „Beliebte" vs. „Alle" |

Der dritte Punkt ist im **Glossar** ein Konstruktionsfehler: Ein
Nachschlagewerk, in dem jede Definition erst aufgeklappt werden muss, ist kein
Nachschlagewerk. Man schlägt nach, indem man **überfliegt**.

### 1.2 Inhalt: drei konkrete Lücken

- **FAQ:** 12 Fragen. Es fehlen die Themen, an denen Haushalte tatsächlich
  hängenbleiben – Wärmepumpe, Balkonkraftwerk, Abrechnung lesen, Schimmel,
  Förderung, Thermostat-Zahlen.
- **Glossar:** 31 Begriffe, mit Schwerpunkt Technik. Ausgerechnet **Abrechnung**
  und **PV** – die beiden Felder mit dem meisten Erklärbedarf – fehlen fast
  vollständig.
- **Messungen:** 5 Hintergründe für **9** Messungen. `hot_water_wait`,
  `furniture_spacing`, `lighting` und `base_load` haben gar keinen Text. Die
  vorhandenen fünf sind ungegliederte Textwände und enden jeweils mit einem
  „So misst du: …", das den Messablauf dopplet.

### 1.3 Quellen

Alle 31 Glossar-Quellen zeigen über den Helfer `wiki()` auf die deutsche
Wikipedia. Der Kommentar im Code sieht selbst vor, sie „bei fachlicher Prüfung
durch Primärquellen zu ersetzen". Und Zeile 1 von `educationContent.ts` trägt
bis heute `// Erstentwurf – vom Nutzer zu prüfen.`

### 1.4 Nebenbefund: ein doppelt vergebener Name

Der Reiter „Messungen" im Wissen heißt genauso wie der Messbereich in der
unteren Navigationsleiste – lesen vs. durchführen. Die Verwechslung steht seit
Juni in `ux-roadmap.md`. Vorschlag: **„Hintergründe"**.

---

## 2. Die Oberfläche

### 2.1 Die Liste wird eine Liste

Heute: eine eigene `Card` je Eintrag, dazwischen 12 px Lücke. Künftig **ein**
Glass-Container mit Haarlinien-Trennern („inset grouped", iOS-Muster). Das
halbiert das visuelle Rauschen und bringt rund 10 statt 6 Einträge auf den
Schirm.

### 2.2 Teaser-Zeile

`AccordionItem` bekommt eine optionale zweite Zeile in `text-muted`. Man sieht,
was drin ist, ohne zu tippen:

```
 Alle · Heizen · Warmwasser · Strom · Lüften · Kosten     ← Kategorie-Chips
┌────────────────────────────────────┐
│ Wie viel Strom zieht Standby?   ⌄  │
│ 5 W Dauerlast ≈ 44 kWh im Jahr     │  ← Teaser, neu
├────────────────────────────────────┤  ← Haarlinie statt Lücke
│ Welche Raumtemperatur ist sinnvoll?⌄│
│ 20 °C Richtwert, ~6 % je Grad      │
└────────────────────────────────────┘
```

### 2.3 Eine Suche statt zwei

`SearchField` wird einmal gebaut und dreimal benutzt (heute zweimal geschrieben,
in „Messungen" fehlt sie ganz). Dazu: beim Scrollen oben klebend, mit
**Trefferzahl** und **hervorgehobener Fundstelle** im Text.

### 2.4 Kategorie-Chips

Wiederverwendbare Filterleiste über der Liste. Die Kategorien sind je Bereich
verschieden (FAQ nach Thema, Glossar nach Fachgebiet) – die Komponente ist
dieselbe.

### 2.5 Glossar: Definition immer sichtbar

Die wichtigste Einzeländerung. Zwei Zeilen Definition stehen offen da, „mehr"
klappt den Rest auf. Dazu klebende Buchstaben-Überschriften und eine
**A–Z-Leiste** am rechten Rand zum Springen:

```
┌────────────────────────────────────┐         ┌─┐
│ A                                  │         │A│
├────────────────────────────────────┤         │B│
│ Arbeitspreis            ct/kWh     │ ← Einheit│C│
│ Verbrauchsabhängiger Teil des      │         │D│ ← A–Z-Leiste
│ Energiepreises, mal Verbrauch …    │    mehr │…│
├────────────────────────────────────┤         └─┘
│ B                                  │
│ Brennwert / Heizwert       kWh/m³  │
```

### 2.6 Messungen: Struktur statt Textwand

Jeder Eintrag trägt **Icon und Gewerk-Farbe seiner Messung** aus
`MEASUREMENT_CATALOG` – der Wissens-Eintrag sieht damit aus wie die Messung, zu
der er gehört. Der Text bekommt vier feste Abschnitte:

> **Warum das zählt** · **Richtwerte** · **Was du beeinflussen kannst** ·
> **Häufige Fehler**

Die **Richtwerte-Tabelle** liest die echten Schwellen aus dem Mess-Modul
(`GOOD_MAX`, `MEDIUM_MAX` in `showerhead/showerhead.ts` usw.), statt sie im Text
zu wiederholen – Regel 2 aus Abschnitt 0. Unten ein Knopf **„Diese Messung
starten"** auf die bestehende Route `/measurements/:id`.

---

## 3. Der Inhalt

### 3.1 FAQ: 12 → ~30

| Thema | Fehlende Fragen |
|---|---|
| Heizen | Nachtabsenkung · Heizkurve · Was heißt Thermostat-Stufe 3? · Räume abdrehen · Heizkörper entlüften |
| Wärmepumpe | Lohnt sie im Altbau? · Was ist eine gute JAZ? · Braucht es Fußbodenheizung? |
| Strom | Balkonkraftwerk · Wärmepumpen-/Autostromtarif · Grundversorgung vs. Wechsel · Wäschetrockner · Induktion |
| Kosten | Abrechnung lesen · Abschlag anpassen · CO₂-Preis · Warum steigt mein Abschlag? |
| Feuchte | Schimmel – was tun? · Lüften bei Regen? · Luftentfeuchter sinnvoll? |
| Sanieren | Was bringt Dämmung wirklich? · Fenster tauschen oder nachrüsten? · Wo gibt es Förderung? |

### 3.2 Glossar: 31 → ~55

Schwerpunkt auf den beiden Feldern, in denen heute fast nichts steht:

- **Abrechnung:** Abschlag · Netzentgelt · Grundversorgung · CO₂-Preis · HT/NT ·
  Heizkostenverteiler · Wärmemengenzähler
- **PV:** kWp · Eigenverbrauchsquote · Einspeisevergütung · Wechselrichter ·
  Balkonkraftwerk · Wallbox
- **Bau:** Heizlast · Wärmebrücke · Taupunkt · Luftdichtheit · GEG ·
  Energieausweis (Bedarfs- vs. Verbrauchsausweis) · Effizienzhaus
- **Heizung:** Vorlauftemperatur · Nachtabsenkung · Zirkulation · Legionellen ·
  Einrohr-/Zweirohrsystem
- **Strom:** Grundlast · Lastgang · Scheinbares Aus

Neu je Begriff, wo es eine gibt: eine **Einheiten-/Formelzeichen-Zeile** –
U-Wert in W/(m²·K), JAZ dimensionslos, kWp. Für ein Energie-Glossar ist das der
Unterschied zwischen Lexikon und Fachreferenz. Dazu **„Verwandte Begriffe"** als
Chips am Ende eines Eintrags.

### 3.3 Messungen: 5 → 9

Die vier fehlenden Hintergründe schreiben, die fünf vorhandenen in die vier
Abschnitte aus 2.6 gliedern. Aus allen fliegt der Schluss-Satz „So misst du: …"
– die Anleitung steht im Messablauf.

### 3.4 Quellen

Primärquellen statt Wikipedia: Umweltbundesamt, BDEW, dena,
Verbraucherzentrale, BAFA/KfW, VDI/DIN. Jeweils mit **Stand-Datum**, weil Preise
und Förderbeträge veralten. Wikipedia bleibt nur, wo sie die beste allgemein
zugängliche Referenz ist.

Der Vermerk „Erstentwurf – vom Nutzer zu prüfen" fällt erst, wenn Kilian die
Texte gelesen hat – nicht schon, wenn sie geschrieben sind.

---

## 4. Datenmodell

Keine neuen Typen. Die drei bestehenden bekommen optionale Felder:

```ts
interface FaqItem {
  q: string
  a: string
  source?: Source
  popular?: boolean
  teaser?: string      // neu – die Zeile unter der Frage
  topic?: Topic        // neu – für die Kategorie-Chips
  related?: string[]   // neu – Verweise in die anderen beiden Bereiche
}
```

`GlossaryItem` zusätzlich `unit?: string` (Einheit/Formelzeichen),
`MeasurementInfo` zusätzlich `sections?` für die vier Abschnitte.

**Alle Felder optional.** Ein Eintrag ohne `teaser` rendert wie heute, ein
Eintrag ohne `topic` erscheint unter „Alle". Damit lässt sich die Oberfläche
(Etappe 1) ausliefern, bevor eine einzige Zeile Inhalt geschrieben ist.

---

## 5. Abnahme

1. Auf einem Bildschirm stehen rund 10 statt 6 Einträge.
2. Kein Eintrag muss angetippt werden, um zu beurteilen, ob er hilft.
3. Im Glossar ist jede Definition ohne Tippen lesbar.
4. Eine Suche, dreimal benutzt – mit Trefferzahl und markierter Fundstelle.
5. Alle 9 Messungen haben einen Hintergrund; keiner nennt einen Richtwert, den
   das Mess-Modul anders sieht.
6. Kein Reiter heißt mehr wie ein Bereich der unteren Navigationsleiste.
7. Jeder Eintrag hat eine Quelle mit Stand-Datum.
