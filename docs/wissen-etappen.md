# Wissen-Umbau – Etappen-Tracker

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
| 1 | Fundament: Artikel-Modell und „Bei dir"-Band | ⬜ offen | – | – |
| 2 | Neue Gliederung: Themen, eine Suche, „Für dich gerade" | ⬜ offen | – | – |
| 3 | Rechen-Antworten | ⬜ offen | – | – |
| 4 | Mythen-Check | ⬜ offen | – | – |
| 5 | Einstiege umdrehen (Erklär-Schicht) | ⬜ offen | – | – |
| 6 | Entscheidungshilfen | ⬜ offen | – | – |
| 7 | Energiewissen-Deck auf der vorhandenen Lern-Engine | ⬜ offen | – | – |

**Abhängigkeiten:** 2–7 brauchen alle Etappe 1 · 3 und 4 brauchen 2 ·
5 braucht 1 · 6 braucht 1 und 3 · 7 braucht 1 und 4.

Etappe 1 trägt alles Weitere: Stehen Artikel-Modell und `KnowledgeContext`,
ist der Rest Inhalt und Oberfläche. **Etappe 1 und 2 zusammen sind bereits die
sichtbare Wende** – wer nur zwei Sessions hat, macht diese beiden.

---

## Etappe 1 – Fundament: Artikel-Modell und „Bei dir"-Band

> **Ziel:** Die Inhalte liegen in einem Modell, das Themen, Verknüpfungen und
> Personalisierung trägt – und der erste personalisierte Text steht auf dem
> Schirm. Referenz: Konzept Abschnitte 2 (B1) und 3.

### Ausgangslage

`educationContent.ts` hält drei flache, unverbundene Arrays: `FAQ` (12),
`GLOSSARY` (31), `MEASUREMENT_INFOS` (5). `EducationPage.tsx` liest keinen
einzigen Store.

### Zu tun

- `src/features/education/content/types.ts`: `Article`, `Block`, `Source`,
  `Topic`, `ArticleKind` nach Konzept Abschnitt 3.
- Bestand überführen: 12 Fragen → `kind: 'answer'`, 31 Begriffe →
  `kind: 'term'`, 5 Hintergründe → `kind: 'background'`. Jeder Eintrag bekommt
  `id`, `topic` und `teaser`. **Kein Textverlust.**
- Die 4 fehlenden Mess-Hintergründe schreiben: `hot_water_wait`,
  `furniture_spacing`, `lighting`, `base_load`.
- `knowledgeContext.ts` analog zu `tips/useTipContext.ts`: Profil,
  Messergebnisse, Zählerstände, Preise – als reines Datenobjekt, damit die
  Bänder ohne Stores testbar sind.
- `personalBands.ts`: reine Funktionen `(ctx) => Band | null`. Start mit vier
  Bändern: Raumtemperatur, Standby, Arbeitspreis, Luftfeuchte.
- `<PersonalBand>` rendern – mit Herkunftsangabe und, wenn leer, dem Einstieg
  in die passende Messung.
- €-Beträge ausschließlich über `impact.ts` / `resultSavingsEur`. Der
  `yieldsSaving`-Riegel gilt sinngemäß: kein Band zu einer Zahl, die die
  Messung heute nicht mehr behauptet.

### Fertig, wenn

- Alle bisherigen Inhalte sind unverändert lesbar, jetzt aus dem neuen Modell.
- Alle 9 Messungen haben einen Hintergrund.
- Mindestens vier Artikel zeigen bei gefülltem Profil eine echte eigene Zahl.
- Bei leerem Profil erscheint **kein** Band und **keine** Lücke.
- Unit-Tests für alle Bänder, je mit vollem und leerem Kontext.

---

## Etappe 2 – Neue Gliederung: Themen, eine Suche, „Für dich gerade"

> **Ziel:** Der Bereich ist nach Nutzerfragen gegliedert statt nach
> Inhaltstypen, und der Startschirm zeigt, was für dieses Zuhause gerade zählt.
> Referenz: Konzept B2.

### Zu tun

- Startschirm neu: Suche · „Für dich gerade" (max. 3 Karten) · Themen-Kacheln ·
  Zugänge zu Nachschlagen / Lernen / Mythen.
- Sechs Themenseiten mit einheitlichem Aufbau: Deine Lage · Artikel · passende
  Messungen (`MEASUREMENT_CATALOG.category`) · passende Tipps (`buildTips`) ·
  Begriffe.
- **Eine** Suche über Artikel, Begriffe, Messungen und Tipps – ersetzt die zwei
  getrennten Suchfelder.
- „Für dich gerade": Regeln über `KnowledgeContext` + Datum. Startsatz:
  Heizsaison, offene Erstmessung, fällige Ablesung, auffälliger Trend,
  Kessel ≥ 20 Jahre.
- Der Tab „Messungen" entfällt; die Hintergründe hängen ab jetzt an den Themen
  (die Verdrahtung an die Messung selbst folgt in Etappe 5).
- HTW-Zugang bleibt unverändert der Icon-Button oben rechts.

### Fertig, wenn

- Kein Reiter heißt mehr wie ein Bereich der Bottom-Nav.
- Eine Suchanfrage findet Treffer aus mindestens drei Gattungen.
- „Für dich gerade" ist bei leerem Profil leer statt platzhalterig.

---

## Etappe 3 – Rechen-Antworten

> **Ziel:** Beispielrechnungen im Text werden zu Rechnern mit den echten Werten
> dieses Haushalts. Referenz: Konzept B3.

### Zu tun

- `Block`-Typ `calculator` mit Registry; Vorbelegung aus `KnowledgeContext`.
- Erste fünf: ein Grad Raumtemperatur · Standby · Sparduschkopf ·
  Warmwasser-Temperatur · Trockner vs. Leine.
- Jeder Rechner endet mit einer Handlung („Messung starten" / „Als Tipp
  merken").
- Rechenwege ausschließlich aus vorhandenen Modulen (`impact.ts`,
  `specificValues.ts`, `range.ts`, `priceConfig.ts`) – keine neue Arithmetik.

### Fertig, wenn

- Ändert der Nutzer seinen Tarif, ändern sich alle Rechner-Ergebnisse.
- Jeder Rechner hat einen Unit-Test gegen die Funktion, die er aufruft.

---

## Etappe 4 – Mythen-Check

> **Ziel:** Ein eigenständiges, wiedererkennbares Format, das echte Streitfragen
> beantwortet. Referenz: Konzept B4.

### Zu tun

- `kind: 'myth'` mit `verdict` (`true` / `false` / `depends`) und Urteils-Badge.
- 15–20 Mythen, jeder mit ehrlicher Begründung, Quelle und – wo möglich –
  „Bei dir"-Band aus Etappe 1.
- Eigener Einstieg vom Startschirm; Mythen erscheinen zusätzlich in Suche und
  Themenseiten.
- Bei `depends`: die Bedingung muss im Text stehen, nicht nur das Urteil.

### Fertig, wenn

- Jeder Mythos nennt Bedingung **und** Quelle; keiner endet bei „kommt drauf an".

---

## Etappe 5 – Einstiege umdrehen (Erklär-Schicht)

> **Ziel:** Wissen wird zur Erklär-Schicht der App – erreichbar von dort, wo die
> Frage entsteht. Referenz: Konzept B6.

### Zu tun

- Deep-Link-Route `/wissen/:articleId`.
- „Warum ist das so?" am Messergebnis · „Was messe ich hier?" vor dem Start
  (löst `MEASUREMENT_INFOS` endgültig ab) · „Warum das wirkt" am Tipp ·
  Erklärung am auffälligen Monitoring-Trend.
- `<Term>`-Komponente: antippbarer Fachbegriff → Bottom-Sheet mit Definition,
  Quelle und Weiterführung. Zunächst in Wissen und an den Messergebnissen.

### Fertig, wenn

- Von jedem der 9 Messergebnisse führt ein Weg in den Hintergrund und zurück.
- Ein Begriffs-Sheet lässt sich aus mindestens zwei Bereichen außerhalb von
  Wissen öffnen.

---

## Etappe 6 – Entscheidungshilfen

> **Ziel:** Aus dem Nachschlagewerk wird ein Berater: „Lohnt sich das bei mir?"
> wird mit einer Spanne in Euro beantwortet. Referenz: Konzept B5.

### Zu tun

- Streckenmodell: Schritte, Vorbelegung aus dem Profil, Ergebnis als Spanne.
- Einstieg immer mit „Ich rechne mit: … Stimmt das noch?" statt mit Fragebogen.
- Erste drei Strecken: Wärmepumpe · Balkonkraftwerk · Kesseltausch.
- Ergebnis: Investitionsspanne, Einsparung €/Jahr, grobe Amortisation, CO₂,
  nächster Schritt, prüfende Messung, Förder-Größenordnung mit Stand-Datum.
- Abgrenzungshinweis (ersetzt keine Energieberatung nach GEG) sichtbar, nicht
  im Kleingedruckten.

### Fertig, wenn

- Jede Strecke ist mit reinem Profilwissen in höchstens vier Antworten
  durchlaufen.
- Kein Ergebnis nennt eine Punktzahl ohne Spanne.

---

## Etappe 7 – Energiewissen-Deck auf der vorhandenen Lern-Engine

> **Ziel:** Der öffentliche Teil bekommt einen Wiederkehrgrund – über die
> Lern-Engine, die längst existiert. Referenz: Konzept B7.

### Ausgangslage

`flashcards/engine/` (FSRS, SM2, Leitner, Queue, Session, Stats, ~2.100 Zeilen)
ist inhaltsagnostisch und bedient heute nur HTW-Klausurstoff.

### Zu tun

- Zweite Inhaltsquelle „Energiewissen": Karten aus `Article.cards` (Begriffe,
  Mythen-Urteile, Kernaussagen), Themen als `subjectId`.
- `cardIndex.ts` um die zweite Quelle erweitern. **Die Engine bleibt
  unangetastet** – sie kennt weiterhin nur IDs.
- `/lernen` zeigt beide Decks getrennt; Themenfilter („nur Heizen").
- Einstieg vom Wissen-Startschirm: „5 Karten fällig".
- Karten-IDs stabil und aus der Artikel-ID abgeleitet.

### Fertig, wenn

- Ein Nutzer kann Energiewissen lernen, ohne je HTW-Inhalte zu sehen.
- Kein Test der Engine musste geändert werden.

---

## Offen / bewusst nicht in diesem Umbau

- **XP, Level, Badges, Erfolge-Galerie** (`ux-roadmap.md` Phase 2) – bewusst
  gestrichen, Begründung in Konzept Abschnitt 4.
- **Zukunft des HTW-Teils** – noch nicht entschieden. Der Umbau lässt ihn
  unberührt; Etappe 7 macht die Lern-Engine unabhängig von ihm, sodass eine
  spätere Entfernung nichts kostet.
- **Illustrationen und Cover** – Politur, nach dem Umbau.
- **Fachliche Endabnahme der Inhalte** – der Vermerk „Erstentwurf – vom Nutzer
  zu prüfen" fällt erst, wenn Kilian die Texte geprüft hat.
