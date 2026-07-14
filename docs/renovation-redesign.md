# Renovierungshistorie – Redesign-Konzept

> Stand: 2026-07-14 · Konzept für den Umbau des Onboarding-Schritts
> „Renovierungshistorie" (`Step7Renovation`) – gedacht als Grundlage für die
> Umsetzung in einer späteren Session (auch für eine neue KI). **Noch nicht
> umgesetzt** – dies ist die abgestimmte Spezifikation, nicht der Ist-Zustand.

---

## 0. Warum überhaupt

**Ausgangsproblem (vom Nutzer benannt):** Der Schritt fühlt sich wertlos an, und
das UI ist unbefriedigend.

**Ursache im Code (verifiziert):** `lastRenovationYear` und `renovationItems`
fließen in **keine einzige Berechnung** ein. Der einzige Effekt ist ein Punkt in
der Profil-Vollständigkeit (`estimateEnergy.ts` → `profileChecks`,
„ist nicht `unknown`"). Man gibt also sorgfältig Sanierungsdaten ein und bekommt
dafür nichts zurück.

**Zweites Problem – Doppelerfassung:** Die App fragt an anderer Stelle bereits
`windowAge`, `insulationState`, `heatGenerators`, `buildingYear` ab. „Fenster
saniert" überschneidet sich mit `windowAge`, „Heizungsanlage" mit
`heatGenerators`, „Dach/Fassade/Kellerdecke" mit `insulationState`. Teilweise
dieselbe Angabe wird zweimal erhoben – und nirgends zusammengeführt.

---

## 1. Leitprinzip

> Jede Eingabe verschiebt sichtbar ein **Effizienz-Band** und schaltet eine
> **konkrete Empfehlung** frei. Präziser eingeben = schärferes Ergebnis. Nichts
> wird doppelt gefragt.

Passt zur bestehenden App-Philosophie (Disclaimer in `estimateEnergy.ts`):
Schätzungen sind die *Vorher-Welt*, echte Messdaten lösen sie später ab. Es gibt
bereits `features/measurements/room_temperature/heatingCost.ts`
(`annualHeatingCostEur`), das Heizkosten aus **echten Ablesungen** hochrechnet.
Unser Feature ist bewusst die grobe Schätzung *davor*.

---

## 2. Abgestimmte Entscheidungen (Design-Log)

| Thema | Entscheidung | Begründung |
|---|---|---|
| **Hülle vs. Heizung** | Band = **nur Gebäudehülle** (kWh/m²·a). Heizungserzeuger als separater Hinweis daneben, **nicht** im Band. | Hüllen-Sanierung senkt den *Wärmebedarf*, Heizungstausch die *Erzeuger-Effizienz* – fachlich verschiedene Dinge, dürfen nicht vermischt werden. |
| **Altfragen** | `windowAge` / `insulationState` / `heatGenerators` **bleiben** in ihren Schritten. Hier nur **daraus ableiten / vorbefüllen**. | Kleiner, sicherer Eingriff. Redundanz-Bereinigung ist ein sauberer Folgeschritt, kein Muss für v1. |
| **€-Kopplung** | Vorerst **keine**. Band steht eigenständig (kWh/m²·a + Klasse + %-Sparpotenzial). | Voller Mehrwert ohne den Aufwand, konsistent mit Warmwasseranteil (15 %) und Heizträger-Mapping zu bleiben. €-Kopplung = späterer Baustein. |
| **Förder-Hinweis** | **Weich/evergreen, ohne Zahlen**, nur bei Dämm-/Fenster-Bauteilen: „Für solche Maßnahmen gibt es i. d. R. staatliche Förderung (BEG) – prüfenswert." | Nur die *Existenz* der Förderung ist belastbar; konkrete Sätze/Programme veralten (teils unterjährig). |
| **Label** | „**Effizienz-Einordnung (grobe Orientierung)**", **nicht** „Energieausweis-Klasse". | „Energieausweis" ist rechtlich definiert (Endenergie/Primärenergie inkl. Anlagentechnik). Wir schätzen nur den Hüllenbedarf. |
| **Kompatibilität** | `renovationItems` / `lastRenovationYear` bleiben im Typ und werden aus den neuen Bauteil-Feldern **abgeleitet befüllt**. | Demo-Profil, Firestore-Sync, `sectionStatus` und `Step8Review` brechen nicht. |

---

## 3. Datenmodell neu: Bauteil-Zustand statt globales Jahr

Statt „ein Jahr + Häkchenliste" wird jedes **Bauteil der Gebäudehülle** ein
kleiner Datensatz mit Zustand *und* (optionaler) Ära. Ein globales Jahr ist zu
grob – real werden Fenster (z. B. 2005) und Heizung (z. B. 2021) getrennt
saniert.

| Bauteil | Zustand (Auswahl) | Ära (optional) | Speist / ersetzt |
|---|---|---|---|
| Dach / oberste Geschossdecke | unsaniert · gedämmt · unbekannt | vor 2000 / 2000–2010 / 2010–2020 / nach 2020 | `insulationState` (Teil) |
| Fassade / Außenwand | unsaniert · gedämmt · unbekannt | dito | `insulationState` (Teil) |
| Fenster | Einfachglas · 2-fach · 3-fach · unbekannt | dito | `windowAge` |
| Kellerdecke | unsaniert · gedämmt · unbekannt | dito | `insulationState` (Teil) |
| *Heizung (Erzeuger)* | *aus `heatGenerators`* | Baujahr Heizung | separater Hinweis, **nicht** im Band |

Die alte `renovationItems`-Liste wird durch diese Bauteile **ersetzt**, nicht
danebengestellt. `renovationItems` / `lastRenovationYear` werden weiterhin
abgeleitet befüllt (Kompatibilität, s. o.).

---

## 4. Rechenkern (im Client, `estimateEnergy.ts` – neue Funktion)

Grob, transparent, klar als Schätzung deklariert. Reine Funktion.

**Schritt A – Ausgangswert aus Baujahr** (spez. Heizwärmebedarf, kWh/m²·a,
unsaniert):

| Baujahr | Startwert |
|---|---|
| vor 1978 | ≈ 220 |
| 1978–1994 | ≈ 150 |
| 1995–2001 | ≈ 100 |
| 2002–2015 | ≈ 70 |
| ab 2016 | ≈ 50 |

**Schritt B – Sanierungen ziehen ab** (multiplikativ, grobe Richtwerte):

| Bauteil gedämmt/erneuert | Faktor |
|---|---|
| Fassade / Außenwand | × 0,80 (−20 %) |
| Dach / oberste Geschossdecke | × 0,88 (−12 %) |
| Fenster (2-/3-fach) | × 0,88 (−12 %) |
| Kellerdecke | × 0,94 (−6 %) |

**Schritt C – Einordnung ins Band** (Optik analog Energieausweis, aber neutral
gelabelt):

| Klasse | kWh/m²·a |
|---|---|
| A | < 50 |
| B | < 75 |
| C | < 100 |
| D | < 130 |
| E | < 160 |
| F | < 200 |
| G | < 250 |
| H | ≥ 250 |

**Rechenbeispiel** (Screenshot-Fall: Bau ~1985, saniert Dach + Fenster +
Heizung): 150 × 0,88 × 0,88 ≈ **116 kWh/m²·a → Klasse D**. Fassade noch unsaniert
→ größter verbleibender Hebel (× 0,80).

**Wichtige Faktoren, die im Rechenkern konsistent bleiben müssen** (mit
bestehendem Code abgleichen): Warmwasseranteil `WARM_WATER_SHARE = 0.15`
(`heatingCost.ts`), Heizträger-Mapping `HEAT_GENERATOR_MAP`
(`monitoring/energyConfig.ts`).

---

## 5. Mehrwert-Output (das, was heute fehlt)

Direkt an der Erfassung, live aktualisiert:

1. **Effizienz-Band** mit Marker: „Dein Gebäude: Klasse D".
2. **Wirkung der Sanierungen:** „Gegenüber unsaniertem Bau von 1985 sparst du
   geschätzt ~24 % Heizenergie."
3. **Nächster Hebel:** das *nicht* sanierte Bauteil mit dem größten Faktor →
   „Fassade dämmen: ~20 % Einsparpotenzial" + weicher BEG-Hinweis.
4. **Heizung separat:** kurzer Hinweis zum Erzeuger („Gas-Kessel, Bj. 2003 → alt,
   Tausch prüfen") – ohne ins Band einzufließen.

**Fallback:** Fehlt `buildingYear` oder `livingArea`, wird **kein** Zahlen-Band
gezeigt, sondern die Aufforderung, genau diese zu ergänzen – schließt den
„präziser = mehr Wert"-Kreis.

---

## 6. UI-Redesign

Probleme des Ist-Zustands (Screenshot): zwei getrennte Blöcke, harter
Weiß-Kontrast der Selektion („brennt" im Dark Mode), großer Leerraum, weit
entfernter „Fertig"-Button, semantische Dopplung „Nie / Unbekannt / Nichts
bekannt".

Neu:

- **Eine Bauteil-Liste** (nicht zwei Blöcke). Jede Zeile: Icon + Bauteil +
  Segmented-Control für den Zustand.
- **Selektion entschärft:** getönter Hintergrund + Akzent-Rand statt Vollweiß.
- **Live-Feedback-Karte** (oben oder sticky): Band + %-Sparzahl bewegen sich beim
  Tippen → sofortiges Belohnungsgefühl.
- **„Fertig"** am natürlichen Listenende, nicht hinter Leerraum.
- „Nie / Unbekannt / Nichts bekannt" entfällt → pro Bauteil sauberes „unbekannt".

```
┌───────────────────────────────┐
│  Effizienz-Einordnung          │  ← Live-Karte
│  ▓▓▓▓▓░░░  Klasse D · ~116     │
│  kWh/m²·a  · −24 % ggü. unsan. │
├───────────────────────────────┤
│  🏠 Dach      [uns.][gedämmt]  │  ← Segmented-Control je Bauteil
│  🧱 Fassade   [uns.][gedämmt]  │
│  🪟 Fenster   [1][2][3]-fach   │
│  📦 Keller    [uns.][gedämmt]  │
├───────────────────────────────┤
│  🔥 Heizung: Gas-Kessel (alt)  │  ← separater Hinweis, nicht im Band
│  → Tausch prüfen               │
├───────────────────────────────┤
│  Nächster Hebel: Fassade       │
│  ~20 % · Förderung (BEG) mögl. │
├───────────────────────────────┤
│           [ Fertig ]           │
└───────────────────────────────┘
```

---

## 7. Umsetzung – abgegrenzte Schritte

Modular; Baustein 1 liefert allein schon den Mehrwert.

- [ ] **Baustein 1 – Rechenkern + Output**
  - [ ] `estimateEnergy.ts`: `estimateHeatDemand(...)` + `efficiencyClass(...)`
        (reine Funktionen, klar als Schätzung deklariert)
  - [ ] Effizienz-Band + „−X %" + „nächster Hebel" als Ausgabe an der Erfassung
  - [ ] Fallback bei fehlendem Baujahr/Fläche
- [ ] **Baustein 2 – Erfassung/UI neu**
  - [ ] Bauteil-Datenmodell + Ableitung ↔ `windowAge`/`insulationState`
  - [ ] `Step7Renovation` als Bauteil-Liste mit Live-Feedback, entschärfte
        Selektion, Button am Listenende
  - [ ] `renovationItems`/`lastRenovationYear` abgeleitet befüllen (Kompat.)
- [ ] **Später (optional)**
  - [ ] €-Heizkostenschätzung aus Band (Verzahnung mit `annualHeatingCostEur`)
  - [ ] Redundante Onboarding-Fragen zusammenführen/entfernen

---

## 8. Betroffene Dateien (Orientierung)

- `src/features/onboarding/steps/Step7Renovation.tsx` – der Schritt selbst
- `src/features/home/estimateEnergy.ts` – Rechenkern + Profil-Vollständigkeit
- `src/types/index.ts` – `RenovationYear`, `RenovationItem` (+ ggf. neue
  Bauteil-Typen)
- `src/store/onboardingStore.ts` – State/Defaults
- `src/features/onboarding/steps/Step8Review.tsx`,
  `src/features/onboarding/sectionStatus.ts`,
  `src/features/demo/demoProfile.ts` – müssen bei Modelländerung mitgezogen
  werden
- `src/i18n/locales/de.json` · `en.json` – Texte (`onboarding.step7renovation.*`)
- Referenz Heizlogik: `src/features/measurements/room_temperature/heatingCost.ts`,
  `src/features/monitoring/energyConfig.ts`
