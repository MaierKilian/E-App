# Wissen-Ausbau – Etappen-Tracker

> **Arbeitsdokument.** Konzept und Begründungen stehen in `wissen-concept.md`;
> hier steht der Arbeitsstand und was je Etappe als „fertig" gilt.
>
> **Nach jeder abgeschlossenen Etappe wird dieses Dokument aktualisiert** –
> Status, Datum, Commit. Es ist die einzige Quelle für „wo stehen wir".

## So wird gearbeitet

Eine Etappe pro Session. Der Einstieg ist immer derselbe:

```
/wissen          → nimmt die nächste offene Etappe
/wissen 3        → nimmt gezielt Etappe 3
/wissen status   → nur der Stand, ohne zu arbeiten
```

Jede Etappe endet mit: Typecheck grün, ESLint grün, Tests grün, Commit auf dem
Arbeits-Branch, Push – und einer aktualisierten Statuszeile hier. Den Merge nach
`main` macht Kilian (siehe „Der Merge nach `main` gehört dem Menschen" in
`CLAUDE.md`); der Auto-Deploy läuft erst danach.

## Stand

| # | Etappe | Status | Abgeschlossen | Commit |
|---|---|---|---|---|
| 1 | Gemeinsame Oberfläche | ✅ fertig | 2026-08-31 | `f127375` |
| 2 | FAQ – Themen und Fragen | ✅ fertig | 2026-08-31 | `63dabfc` |
| 3 | Glossar – Nachschlagen statt Aufklappen | ⬜ offen | – | – |
| 4 | Messungen – Struktur, Richtwerte, Einstieg | ⬜ offen | – | – |

**Abhängigkeiten:** 2, 3 und 4 brauchen alle Etappe 1 – untereinander sind sie
unabhängig und können in beliebiger Reihenfolge kommen.

Etappe 1 trägt die anderen drei: Stehen Liste, Suche, Chips und Teaser, ist der
Rest Inhalt. Weil alle neuen Felder optional sind, lässt sich Etappe 1
ausliefern, bevor eine Zeile Inhalt geschrieben ist.

**Nicht Teil dieses Vorhabens:** Artikel-Datenmodell, Personalisierung aus dem
Profil, Themen-Navigation, Rechner im Text, Entscheidungsstrecken,
Karteikarten. Der HTW-Teil bleibt unberührt.

---

## Etappe 1 – Gemeinsame Oberfläche

> **Ziel:** Die drei Ansichten sehen aus wie ein System und lassen sich
> überfliegen – **ohne dass sich ein einziger Inhalt ändert**.
> Referenz: Konzept Abschnitte 2.1 bis 2.4.

### Ausgangslage

`FaqView` und `GlossaryView` (`EducationPage.tsx:104` und `:180`) sind dieselbe
Komponente, zweimal geschrieben, mit je eigenem Suchfeld. `MeasurementsView`
hat gar keine Suche. `AccordionItem` rendert je Eintrag eine eigene `Card`.

### Zu tun

- **`LookupList`** – ein Glass-Container mit Haarlinien-Trennern statt einer
  Karte je Eintrag. Ersetzt das `space-y-3` aus lauter `Card`s.
- **`AccordionItem`** um `teaser?: string` erweitern – eine Zeile `text-muted`
  unter dem Titel, sichtbar solange zugeklappt.
- **`SearchField`** einmal bauen, dreimal einsetzen. Beim Scrollen oben klebend,
  mit Trefferzahl und hervorgehobener Fundstelle.
- **`TopicChips`** – wiederverwendbare Filterleiste; die Kategorien kommen je
  Bereich von außen.
- **Leerzustand** mit Vorschlag statt eines grauen Satzes.
- Drei optionale Felder in den Content-Typen: `teaser?`, `topic?`, `related?`
  (plus `unit?` am Glossar, `sections?` an den Mess-Infos). Alles optional,
  nichts bricht.

### Fertig, wenn

- Kein Eintrag muss angetippt werden, um beurteilt zu werden.
- Alle drei Ansichten haben dieselbe Suche, mit Trefferzahl.
- Kein Inhalt hat sich geändert; ohne `teaser` rendert ein Eintrag wie vorher.
- A11y bleibt: `aria-expanded`, Fokusring, Tastaturbedienung der Chips.

### Ergebnis (2026-08-31)

Neu unter `src/features/education/lookup/`: `search.ts` (Faltung, Hervorhebung,
Vorschau, Ausschnitt), `LookupList.tsx`, `SearchField.tsx`, `FilterChips.tsx`,
`topics.ts`, `NoResults.tsx`, `Highlight.tsx`, `useLookup.ts`.
`Accordion.tsx` ist darin aufgegangen und entfallen – eine Zeile ist jetzt Teil
der Liste, keine eigene Karte mehr. 38 Unit-Tests auf `search.ts`.

Drei Dinge kamen beim Ansehen im Browser dazu, die auf dem Papier nicht
absehbar waren:

1. **Die Vorschau braucht zwei Zeilen.** Einzeilig brach sie nach rund fünf
   Wörtern ab („Die App hilft dir, mit einfachen, geführten Mes…") und kostete
   mehr Platz, als sie an Auskunft gab.
2. **Die Fundstelle war unsichtbar.** Wer „Wärme" suchte, bekam „Lohnt sich ein
   hydraulischer Abgleich?" ohne erkennbaren Grund – das Wort stand im
   zugeklappten Text. Jetzt zeigt die Zeile bei einer Suche den Ausschnitt
   rund um den Treffer (`searchPreview`, `snippetAround`).
3. **Angebrochene Abkürzungen am Kürzungsende** („… genutzt wird (z. B …")
   werden abgeräumt (`trimDanglingTail`).

Nebenbei behoben: Der alte `AccordionItem` trug ein `aria-label="Aufklappen"`
auf dem Knopf. Das **ersetzt** den zugänglichen Namen – Screenreader lasen
„Aufklappen" statt der Frage. Der Titel ist jetzt der Name, der Hinweis steht
als `sr-only` daneben.

Bewusst **nicht** gemacht: das im Konzept erwähnte `sections?`-Feld an
`MeasurementInfo`. Seine Form entscheidet Etappe 4, wenn sie weiß, was sie
braucht; ein ungenutztes Feld auf Verdacht wäre geraten.

---

## Etappe 2 – FAQ: Themen und Fragen

> **Ziel:** Die FAQ ist nach Themen gegliedert und beantwortet die Fragen, die
> Haushalte wirklich stellen. Referenz: Konzept 3.1.

### Zu tun

- Kategorie-Chips (Heizen · Wärmepumpe · Strom · Warmwasser · Lüften & Feuchte ·
  Kosten · Sanieren · App).
- „Beliebte Fragen" wächst von 3 auf 5. Darunter statt „ALLE FRAGEN" die
  Gruppierung nach Thema mit Zwischenüberschriften.
- Teaser für jede Frage.
- Anker je Frage, damit eine einzelne Frage verlinkbar wird.
- **Inhalt: 12 → ~30 Fragen** nach der Tabelle in Konzept 3.1.
- Quellen dieser Etappe auf Primärquellen mit Stand-Datum umstellen.

### Fertig, wenn

- Jede Frage hat Thema, Teaser und eine Quelle mit Stand-Datum.
- Eine Kategorie lässt sich filtern, ohne dass die Suche danebensteht.

### Ergebnis (2026-08-31)

**12 → 35 Fragen**, alle mit Thema und stabiler Kennung. Neu dazugekommen sind
23: Heizen (Thermostat-Zahlen, Nachtabsenkung, Heizkurve, Räume abdrehen,
Entlüften, Möbel vorm Heizkörper), Wärmepumpe (Altbau, JAZ, Fußbodenheizung),
Warmwasser (Temperatur/Legionellen, Zirkulation), Lüften (Regen, Schimmel),
Strom (Balkonkraftwerk, Wärmepumpentarif, Grundversorgung, Wäschetrockner),
Kosten (Abrechnung lesen, Abschlag, CO₂-Preis) und Sanieren (Dämmung, Fenster,
Förderung).

Oberfläche: Themen-Chips (die Leiste aus Etappe 1 geht damit an), „Beliebte
Fragen" von 3 auf 5, darunter Themenblöcke mit Zwischenüberschrift statt einer
Liste „ALLE FRAGEN", und ein Anker je Frage – `/education#faq-co2-preis` klappt
die Frage auf und springt sie an.

Neu am Datenmodell: `FaqItem.id` (trägt den Anker – **niemals nachträglich
ändern**, sonst brechen alle Verweise) und ein gemeinsamer `Source`-Typ mit
optionalem `stand`. 13 neue Tests in `faqContent.test.ts` prüfen Eindeutigkeit
der Kennungen, Ankertauglichkeit, Themenzuordnung, Mindestlänge der Antworten
und das Stand-Format.

**Inhaltlich korrigiert:** Die alte Antwort „Werden meine Daten irgendwohin
übertragen?" behauptete, die App verarbeite alles lokal und Cloud-Funktionen
seien Zukunft. Das stimmt seit dem Firebase-Backend nicht mehr – angemeldete
Nutzer synchronisieren ihr Profil nach Firestore, der Zähler-Scan schickt ein
Foto an eine Cloud Function, und es läuft eine anonyme Nutzungsstatistik. Die
Frage heißt jetzt „Wo liegen meine Daten?" und beschreibt beide Fälle.

### Offen geblieben: die Quellen

Die Umstellung von Wikipedia auf Primärquellen (UBA, BDEW, dena,
Verbraucherzentrale, BAFA/KfW) **konnte nicht gemacht werden**: Die
Netzwerk-Richtlinie dieser Umgebung blockiert externe Hosts – jeder Aufruf
endet mit 403 am Gateway. Unverifizierte Deep-Links in eine ausgelieferte App
zu schreiben, wäre schlechter als der Ist-Zustand: Ein toter Link ist
schädlicher als ein Wikipedia-Link.

Vorbereitet ist alles: Der `Source`-Typ trägt `stand`, die Oberfläche zeigt es
an, und wo eine Zahl altert (CO₂-Preis, Förderung), steht der Stand bereits
dran und die Jahreszahl im Text. Es fehlt nur das Ersetzen der URLs – ein
Arbeitsschritt mit Netzzugang, entweder in einer lokalen Sitzung oder von
Kilian.

---

## Etappe 3 – Glossar: Nachschlagen statt Aufklappen

> **Ziel:** Das Glossar lässt sich überfliegen wie ein Glossar.
> Referenz: Konzept 2.5 und 3.2.

### Zu tun

- **Definition immer sichtbar** – zwei Zeilen offen, „mehr" klappt den Rest auf.
  Das ist die wichtigste Einzeländerung des ganzen Vorhabens.
- Klebende Buchstaben-Überschriften und **A–Z-Leiste** am rechten Rand zum
  Springen.
- Kategorie-Chips (Heizen · Strom · Wasser · Bau · Wirtschaft).
- **Einheiten-/Formelzeichen-Zeile** je Begriff, wo es eine gibt.
- **„Verwandte Begriffe"** als Chips am Ende eines Eintrags (`related`).
- **Inhalt: 31 → ~55 Begriffe**, Schwerpunkt Abrechnung und PV (Konzept 3.2).
- Quellen auf Primärquellen mit Stand-Datum.

### Fertig, wenn

- Keine Definition muss aufgeklappt werden, um gelesen zu werden.
- Die A–Z-Leiste springt zu jedem belegten Buchstaben.
- Jeder Begriff mit physikalischer Größe zeigt seine Einheit.

---

## Etappe 4 – Messungen: Struktur, Richtwerte, Einstieg

> **Ziel:** Der Bereich deckt alle Messungen ab, ist gegliedert und führt in die
> Messung. Referenz: Konzept 2.6 und 3.3.

### Ausgangslage

`MEASUREMENT_INFOS` kennt 5 von 9 Messungen. Es fehlen `hot_water_wait`,
`furniture_spacing`, `lighting` und `base_load`. Die fünf vorhandenen sind
ungegliederte Absätze, die jeweils mit „So misst du: …" enden.

### Zu tun

- Icon und Gewerk-Farbe je Eintrag aus `MEASUREMENT_CATALOG`.
- Vier feste Abschnitte: **Warum das zählt · Richtwerte · Was du beeinflussen
  kannst · Häufige Fehler**.
- **Richtwerte-Tabelle aus dem Mess-Modul**, nicht aus dem Text: `GOOD_MAX` /
  `MEDIUM_MAX` in `showerhead/showerhead.ts` und die Entsprechungen der anderen
  Checks. Damit kann die Wissens-Seite nie etwas anderes behaupten als die
  Messung selbst.
- Knopf **„Diese Messung starten"** → `/measurements/:id` (Route existiert).
- **Inhalt: 5 → 9.** Die vier fehlenden schreiben, die fünf vorhandenen
  gliedern, das „So misst du: …" überall streichen.
- **Reiter umbenennen:** „Messungen" → **„Hintergründe"**. Beendet die
  Namensgleichheit mit der unteren Navigationsleiste (offen seit
  `ux-roadmap.md`, Juni 2026).

### Fertig, wenn

- Alle 9 Messungen haben einen Hintergrund in vier Abschnitten.
- Kein Richtwert steht doppelt: die Tabelle liest die Schwellen aus dem Modul.
- Von jedem Eintrag führt ein Knopf in die zugehörige Messung.
- Kein Reiter heißt mehr wie ein Bereich der Bottom-Nav.

---

## Offen / bewusst nicht in diesem Vorhaben

- **Personalisierung** („Bei dir"-Bänder aus Profil und Messergebnissen),
  **Themen-Navigation**, **Rechner im Text**, **Entscheidungsstrecken** – im
  ersten Anlauf vorgeschlagen, als zu großer Eingriff verworfen. Die Notizen
  dazu stehen in der Versionsgeschichte dieses Dokuments, falls das Thema
  später wieder aufkommt.
- **Karteikarten und HTW-Teil** – bleiben unberührt.
- **Illustrationen und Cover** – Politur, später.
- **Fachliche Endabnahme der Inhalte** – der Vermerk „Erstentwurf – vom Nutzer
  zu prüfen" in `educationContent.ts` fällt erst, wenn Kilian die Texte geprüft
  hat.
