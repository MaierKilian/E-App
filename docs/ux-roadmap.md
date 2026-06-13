# E-App – UX/UI-Analyse & Roadmap

> Stand: 2026-06-12 · Bewertung des Wissens-/Lern- und Messbereichs aus UX/UI-Sicht
> (Maßstab: Apple, Duolingo, Notion, Airbnb, Apple Fitness, Headspace).
>
> **Zielgruppe:** Privathaushalte, Studierende, energieinteressierte Nutzer.
> **Ziele:** Wissen vermitteln · Messungen durchführen · Verbrauch verstehen ·
> langfristig binden · wiederkehrende Nutzung fördern.
>
> **Festgelegte Tonalität für Gamification:** Apple-Fitness-Stil – dezent,
> seriös, Ringe/Erfolge/Fortschritt statt verspieltem Comic-Look.

---

## 0. Gesamturteil

Handwerklich sauber und ästhetisch modern (Liquid Glass, konsistente Tokens,
gute Themes). Als **Lern- und Bindungsprodukt** aber aktuell ein **statisches
Nachschlagewerk**. Drei Kernprobleme:

1. **Alles ist gleich laut.** Viel `text-muted`, gleiche Gewichte/Kacheln →
   keine visuelle Hierarchie.
2. **Kein Fortschritt, keine Belohnung.** Kein Streak, kein „gelesen", kein
   Level, kein gespeicherter Quiz-Erfolg → kein Grund wiederzukommen.
3. **Inhalt versteckt.** Accordions zu, Lerntext grau, FAQ ohne Suche/Kategorien.

---

## 1. Seiten-Bewertung

Format je Schwäche: **Problem → Auswirkung → Verbesserung → Priorität**.

### FAQ
- **Flache Liste aus 13 zugeklappten Accordions, keine Suche/Kategorien.**
  Nutzer scrollt blind, findet nichts gezielt → niedrige Lesewahrscheinlichkeit.
  → Suchfeld + Themen-Chips + „Beliebte Fragen" oben. **Prio: hoch**
- **Antworttext in `text-muted`.** Der Lerninhalt ist das am schlechtesten
  lesbare Element (Kontrast grenzwertig, WCAG). → Body `text-foreground`,
  Mutfarbe nur für Meta. **Prio: hoch**
- **Keine Verknüpfung zu Glossar/Messungen.** Begriffe sind Sackgassen.
  → Inline-Links ins Glossar, „Passende Messung starten". **Prio: mittel**

### Glossar
- **Suche vorhanden (gut), aber kein A–Z-Index/Gruppierung bei 32 Begriffen.**
  Ohne Suchbegriff endloser Scroll. → Sticky A–Z oder Kategorie-Chips, „Begriff
  des Tages". **Prio: mittel**
- **Reine Text-Definitionen, keine Beispiele/Visualisierung.** Abstrakt, schwer
  zu behalten. → Mini-Beispiel, Icon, „Verwandte Begriffe". **Prio: niedrig**

### Messungen
- **Doppeldeutigkeit: „Messungen" als Info-Tab im Wissen UND echter Messbereich.**
  Verwechslungsgefahr lesen vs. durchführen. → Wissens-Tab umbenennen
  („So misst du richtig") + Deep-Link zur echten Messung. **Prio: hoch**
- **Messergebnis ohne Wirkung (€/CO₂).** Kein Aha-Moment, kein Pull zur nächsten
  Messung. → Ergebnis-Karte mit Sparpotenzial, Fortschrittsring statt dünnem
  Balken. **Prio: hoch**

### Hochschule (Versuchsübersicht)
- **Uniforme Karten (Titel + Kurs + Chevron), keine Bilder/Status/Dauer.**
  Keine Orientierung, kein Anreiz, wirkt wie Verwaltungsliste.
  → Thumbnail/Illustration, Badges „Test bestanden ✓", Dauer, Schwierigkeit,
  Fortschritt. **Prio: hoch**
- **Quiz-Erfolg wird nicht gespeichert.** Bestandener Test ist nach Schließen
  weg. → Ergebnis + Datum persistieren, Badge an Karte. **Prio: hoch**

### Detailseiten der Laborversuche
- **Foto-Platzhalter „Foto folgt".** Senkt Vertrauen/Politur, wirkt unfertig.
  → Bis echte Fotos da sind: Illustrationen/Schemata oder ausblenden. **Prio: hoch**
- **Vorbereitung als passive Bullet-Liste.** Kein Gefühl von „ich bin bereit".
  → Abhakbare Checkliste mit Fortschritt, schaltet „Test starten" frei.
  **Prio: mittel**
- **Quiz: nur Endscore, kein Feedback/Erklärung pro Frage.** Man lernt nicht aus
  Fehlern; binäres Bestanden/Durchgefallen demotiviert. → Sofort-Feedback +
  Erklärung; Name-Eingabe VOR dem Start. **Prio: hoch**

---

## 2. Top 10 UX-Probleme

| # | Problem | Bereich | Prio |
|---|---------|---------|------|
| 1 | Kein Fortschritts-/Belohnungssystem | global | hoch |
| 2 | Lerninhalt in grauer Mutfarbe → Lesbarkeit/Kontrast | FAQ/Glossar | hoch |
| 3 | Quiz ohne Lernfeedback pro Frage | Labor | hoch |
| 4 | Lern-/Quiz-Erfolge nicht gespeichert | Hochschule | hoch |
| 5 | Foto-Platzhalter „Foto folgt" | Labor | hoch |
| 6 | FAQ ohne Suche & Kategorien | FAQ | hoch |
| 7 | „Messungen" doppeldeutig (Wissen vs. Aktion) | IA | hoch |
| 8 | Messergebnis ohne Wirkung (€/CO₂) | Messungen | hoch |
| 9 | Keine visuelle Hierarchie (alles gleich laut) | global | hoch |
| 10 | 4er-Segmented-Control auf Mobile gequetscht | Wissen | mittel |

---

## 3. Top 10 Quick Wins

1. Accordion-/FAQ-Body von `text-muted` → `text-foreground`.
2. Foto-Platzhalter ausblenden, wenn keine Fotos.
3. FAQ-Suchfeld (Glossar-Komponente wiederverwenden).
4. Name-Eingabe im Quiz nach vorne verschieben.
5. „Beliebte Fragen" (3 Stück) oben in FAQ anpinnen.
6. Quiz-Ergebnis lokal persistieren + „✓ bestanden"-Badge an der Karte.
7. Fortschrittsring statt dünnem Balken im Messprofil.
8. Versuchskarten: Dauer + Schwierigkeit + Status-Badge.
9. Segmented Control → horizontal scrollbare Chips.
10. „Du sparst ~X €/Jahr" prominent pro Messergebnis.

---

## 4. Redesign-Vorschlag (2026-Standard)

Vom Nachschlagewerk zur **geführten Lernreise mit dezenter Belohnung**
(Apple-Fitness-Ästhetik):

- **„Wissen" wird Lern-Hub mit Pfad** statt 4 Tabs: oben Streak + Wochenring,
  „Heute lernen" (1 Karte), dann Kategorien.
- **Inhaltsblöcke statt Accordions**: echte Schwarz-Schrift, verlinkte Begriffe,
  „verstanden"-Haken.
- **Labor als Kurs-Kacheln** mit Cover, Fortschritt, Badge.
- **Quiz als Lernschleife**: Sofort-Feedback, Erklärung, +XP, dezentes Erfolgs-
  Feedback.
- **Micro-Interactions, Skeletons, Bottom-Sheets** statt harter Vollbildwechsel.
- **Personalisierung**: „Für dein Profil empfohlen" (z. B. Wärmepumpe zuerst).

### Wireframe Mobile – „Wissen"-Hub

```
┌─────────────────────────────┐
│ Header: „Wissen"   ◐ 7 Tage  │  ← Streak + Wochenring (Apple-Fitness-Stil)
├─────────────────────────────┤
│ [Suche durchs ganze Wissen] │  ← global, nicht nur Glossar
├─────────────────────────────┤
│  HEUTE LERNEN               │
│  ┌───────────────────────┐  │
│  │ Begriff des Tages      │  │  ← 1 fokussierte Karte
│  │ „Hydraulischer Abgl."  │  │
│  │ +10 XP · 2 Min  [Los→] │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│ Chips: FAQ · Glossar · Mess │  ← horizontal scrollbar
│        · Labor              │
├─────────────────────────────┤
│  Kategorie „Labor"          │
│  ┌─────────┐ ┌─────────┐    │  ← Cover-Kacheln + Fortschritt
│  │ illus.  │ │ illus.  │    │
│  │ Pumpen… │ │ Heizk…  │    │
│  │ ✓ 4/6   │ │ 0/5     │    │
│  └─────────┘ └─────────┘    │
└─────────────────────────────┘
        [Bottom-Nav]
```

**Laborversuch-Detail (neu):** Cover → Titel/Kurs/Dauer/Schwierigkeit →
abhakbare Vorbereitung mit Ring → „Test starten" (frei nach Vorbereitung) →
Quiz mit Sofort-Feedback → Erfolgs-Screen mit XP + Zertifikat.

---

## 5. Gamification-Konzept (Apple-Fitness-Stil)

- **XP & Level:** Lesen +5 · Glossarbegriff verstanden +5 · Messung +20 ·
  Quiz bestanden +30. Level „Energie-Neuling → -Profi → -Experte".
- **Streak:** „Tage in Folge aktiv", sanfte Erinnerung (kein Druck).
- **Ringe/Fortschritt:** Wochenziel (z. B. 3 Lerneinheiten), Apple-Fitness-Optik.
- **Badges:** „Erste Messung", „Glossar-Sammler (10/32)", „Labor-Meister",
  „Sparfuchs (100 € identifiziert)".
- **Erfolge-Galerie:** jedes bestandene Quiz = Stempel/Zertifikat.
- **Sanftes Nudging:** fällige Ablesung + 5 XP-Bonus → verbindet Monitoring &
  Gamification.
- **Tonalität:** ernsthaft & dezent (Apple Fitness), kein Kindergarten.

---

## 6. Nutzerreise (Erstbesuch → Langzeit)

1. **Erstkontakt:** Splash → Onboarding (Quick) → „Profil 60 % fertig" (Hook).
2. **Erster Wert (Tag 1):** geführte erste Messung (Standby) → „Du sparst
   ~45 €/Jahr" → +20 XP, erstes Badge.
3. **Aktivierung (Woche 1):** Strompreis hinterlegen → erste Ablesung →
   Streak startet.
4. **Gewohnheit (Wochen 2–4):** Ablese-Erinnerung + Wochenziel; „Begriff des
   Tages".
5. **Bindung (Monat 2+):** Trend „−12 % ggü. Vormonat", Labor-Vorbereitung,
   Erfolge-Galerie füllt sich.
6. **Loyalität:** Monats-Report teilen, Level „Experte", Profil-Empfehlungen.

---

## 7. Roadmap (abhakbar)

### Phase 0 – Quick Wins (½–1 Tag) — ✅ erledigt
- [x] Lesbarkeit: Body-Text entgrauen (Accordion/FAQ/Glossar)
- [x] Foto-Platzhalter bedingt ausblenden (nur echte Fotos, sonst nichts)
- [x] FAQ-Suche + „Beliebte Fragen"
- [x] Segmented Control → scrollbare Chips
- [x] Quiz: Name-Eingabe nach vorne (auf der Vorbereitungs-Seite)

### Phase 1 – Substanz im Lernen (2–3 Tage)
- [x] Quiz mit Sofort-Feedback (richtig/falsch je Frage) + Erklärungen
- [x] Lern-/Quiz-Status persistieren (neuer `progressStore`)
- [x] Versuchskarten mit Dauer/Schwierigkeit/Status-Badge
- [ ] Messergebnis-Karte mit €/CO₂-Wirkung (Aggregat in der Messübersicht)

### Phase 2 – Gamification-Fundament (3–4 Tage)
- [ ] `progressStore`: XP, Level, Streak, Badges
- [ ] „Wissen"-Hub mit Streak + „Heute lernen" + Wochenring
- [ ] Erfolge-Galerie

### Phase 3 – Bindung & Personalisierung (4–5 Tage)
- [ ] Profilbasierte Empfehlungen (Wissen + Messungen)
- [ ] Ablese-Erinnerung ↔ XP/Streak verknüpfen
- [ ] Begriffs-Verlinkung FAQ↔Glossar↔Messung (Lernpfad)

### Phase 4 – Politur & Modernität (laufend)
- [ ] Illustrationen/Cover statt Platzhalter
- [ ] Micro-Interactions, Skeletons, Bottom-Sheets
- [ ] A11y-Härtung (Radiogroup-Semantik im Quiz, Labels, WCAG-AA-Kontrast-Audit)
- [ ] Später: Haptik & echte Push-Erinnerungen via Capacitor
