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

---

## 9. Beschlossene Ausrichtung (2026-07-19)

Abgestimmt im Anschluss an die Analyse. Diese Entscheidungen präzisieren die
Umsetzung; Abschnitte 0–8 bleiben als Konzept gültig.

| Frage | Beschluss | Konsequenz |
|---|---|---|
| **Umfang / Reihenfolge** | **Baustein 1 zuerst** (Rechenkern + Effizienz-Band als Ausgabe), auf den **bestehenden** Erfassungsfeldern; danach Baustein 2 (neues Bauteil-Datenmodell + UI-Redesign) als eigener Schritt. | Schnellster Mehrwert („nicht mehr wertlos") bei kleinstem Risiko; großer Umbau erst, wenn der Nutzen sichtbar ist. |
| **Bestandsdaten / Migration** | **Migrieren** – aber erst relevant bei Baustein 2 (Modelländerung). Alte `renovationItems` / `lastRenovationYear` werden dann verlustfrei auf die neuen Bauteil-Felder abgebildet. Baustein 1 nutzt die vorhandenen Felder direkt, daher dort **keine** Migration nötig. | Kein Datenverlust für Bestandsnutzer/Demo; kein unnötiger Aufwand in v1. |
| **Rechenwerte** | **Vor Umsetzung fachlich prüfen** (Nutzer, Gebäudeenergietechnik/HTW): Baujahr-Startwerte, Abschlagsfaktoren, Klassengrenzen (Abschnitt 4). Erst nach Freigabe in Code gießen. | Die Werte bestimmen die Glaubwürdigkeit der Aussage → Sign-off vor Implementierung. |
| **„Ära" pro Bauteil** | **Vorerst weglassen** – nur Zustand (saniert/unsaniert bzw. Verglasungsstufe) erfassen. Ära später nachrüstbar, da sie die v1-Zahl nicht verändert. | Weniger Klicks, einfacheres UI; keine Scheingenauigkeit. |

### Prozess-Notizen

- **Branch:** Dieses Dokument wurde von `claude/sync-4lpbqh` auf den aktiven
  Arbeitsbranch `claude/sync-ymedy7` übernommen, damit Konzept und Umsetzung an
  einem Ort liegen.
- **Offener Fachpunkt (für später, Baustein „€-Kopplung"):** Der Rechenkern
  arbeitet rein mit multiplikativen Bauteil-Faktoren. **Wohnfläche** und ein
  **Klima-/Gradtagbezug** fließen nicht ein, obwohl das Band in kWh/m²·a
  angegeben wird. Für die grobe Orientierung in v1 ausreichend; vor einer
  Kopplung an echte €-Heizkosten muss dieser Punkt nachgeschärft werden.

### Nächster Schritt (kein Code)

Siehe **Abschnitt 10** – die Ausgabe wurde bewusst umgestellt, um keine
Schein-Genauigkeit zu versprechen. Damit verschiebt sich auch, was an den
Rechenwerten überhaupt freigegeben werden muss.

---

## 10. Genauigkeits-Beschluss – revidierte Ausgabe (2026-07-19)

**Anlass:** Ein Klassen-Buchstabe (A–H) plus konkrete kWh/m²·a-Zahl *sieht aus*
wie ein Energieausweis und verspricht eine Präzision, die vier Dropdowns nicht
liefern können. Das eigentliche Risiko ist die **Darstellung**, nicht die
Schätzung selbst.

**Grundeinsicht:** Hüllen-Schätzung und echte Zählerstände beantworten
*verschiedene* Fragen. Die Schätzung sagt (am Tag 1, ohne Daten), **wo** der
bauliche Verlust sitzt; der Verbrauch sagt (später, mit Ablesungen), **wie viel**
tatsächlich verbraucht wird – aber nicht warum. Sie ergänzen sich.

### Beschluss

| Aspekt | Beschluss |
|---|---|
| **Darstellung** | **Qualitativ + relativ.** Grobe Skala mit Marker („eher effizient ↔ eher sanierungsbedürftig") + „**≈ X % gegenüber unsaniert**" + **größter nächster Hebel**. **Keine** A–H-Energieausweis-Klasse, **keine** absolute Punktzahl in v1. |
| **Echtdaten-Bezug** | **Aktiv verzahnen.** Schätzung klar als vorläufig rahmen; sobald Zählerstände vorliegen, auf den echten Verbrauch / die Heizkosten verweisen bzw. diese daneben zeigen. Anschluss an `heatingCost.ts` / `EnergySummaryCard`. |
| **Absolute Zahl** | Entfällt in der UI. (Intern darf der kWh-Wert berechnet werden, um % und Hebel-Rangfolge abzuleiten – er wird nur **nicht als präziser Wert angezeigt**.) |
| **Förderhinweis** | Weich/evergreen wie bisher (BEG, ohne Zahlen), nur bei Dämm-/Fenster-Hebeln. |

### Warum das robust ist

Die **Rangfolge der Hebel** (Fassade −20 % > Dach/Fenster −12 % > Keller −6 %)
und die **relative** Wirkung der Sanierungen sind stabil, auch wenn die absoluten
kWh danebenliegen – Fehler im Ausgangswert kürzen sich beim Vergleich weitgehend
heraus. Genau diese belastbaren Aussagen zeigen wir; die scheinpräzise absolute
Zahl zeigen wir nicht.

### Folge für die Rechenwerte-Freigabe (Abschnitt 4)

Weil keine absolute Zahl/Klasse mehr angezeigt wird, ist die **exakte
Kalibrierung zweitrangig**. Fachlich relevant ist nur noch, dass die
**Reihenfolge/Relation der Abschlagsfaktoren** plausibel ist (welches Bauteil
bringt am meisten). Die Baujahr-Startwerte dienen dann nur noch intern der
%-Berechnung. → Leichtere Freigabe: nur die **Faktor-Rangfolge** gegenchecken,
nicht jede Dezimalstelle.

### Revidierte Output-Skizze

```
┌───────────────────────────────┐
│  Bausubstanz (grobe Orient.)   │
│  ●━━━━━━━○━━━━  eher effizient  │  ← Marker auf neutraler Skala, kein A–H
│  Deine Sanierungen: ≈ −24 %    │  ← relativ, belastbar
│  ggü. unsaniertem Bau          │
├───────────────────────────────┤
│  Größter Hebel: Fassade ≈ −20 %│  ← Rangfolge, robust
│  Förderung (BEG) i. d. R. mögl.│
├───────────────────────────────┤
│  ⓘ Grobe Schätzung aus Baujahr │
│  & Sanierungen. Echte Zähler-  │  ← ehrlich + Verzahnung
│  stände zeigen den tatsächl.   │
│  Verbrauch. [Zählerstand ▸]    │
└───────────────────────────────┘
```
