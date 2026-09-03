# Kühl- und Gefriergeräte: ein Ergebnis je Gerät

> **Konzept.** Was und warum. Der Arbeitsstand steht in
> `verbesserungen-etappen.md` unter den Etappen 12a bis 12d.
> Punkt 18.2 aus `weitere_Verbesserungen_der_Eapp.txt`.

## 1. Das Problem

Ein Haushalt hat selten genau einen Kühlschrank und genau ein Gefriergerät.
Üblich sind: Kühlschrank in der Küche, Gefrierfach obendrin, Gefriertruhe im
Keller. Manchmal ein zweiter Kühlschrank für Getränke.

Die App kann das nicht abbilden – und zwar nicht, weil die Datenstruktur zu
klein wäre, sondern weil sie **absichtlich als Menge angelegt ist**:

```ts
// appliances.ts – toggleAppliance
const index = list.findIndex((a) => a.kind === kind)
if (index >= 0) return list.filter((a) => a.kind !== kind)
return [...list, { kind }]
```

Ein zweiter Eintrag derselben Art *entfernt* den ersten. `appliances` ist damit
faktisch ein Satz von drei Ja/Nein-Schaltern, kein Geräteverzeichnis.
`ApplianceEntry` hat entsprechend kein Feld, das ein Gerät von einem anderen
unterscheiden könnte.

Die Folge nach unten durchgereicht:

- **Der Check** fragt nur `hasAppliance(appliances, 'freezer')` – einen
  Booleschen Wert (`ApplianceGate.tsx:46`).
- **Das Ergebnis** landet unter dem Schlüssel `freezer`. Wer die Truhe im
  Keller misst und danach das Gefrierfach in der Küche, hat die erste Messung
  verloren. Ohne Warnung.
- **Der Fortschritt** zählt trotzdem „erledigt": `measurementProgress()`
  (`progress.ts:44`) gibt für alles ohne `perRoom` stumpf
  `{ done: 1, total: 1 }` zurück, sobald irgendein Ergebnis existiert.
- **Der `room`** wird erfasst (`AppliancePicker.tsx:44` lässt ihn setzen) und
  dann nur zur Vorauswahl benutzt (`applianceRoom()`). Er sagt nichts aus,
  bewertet nichts, benennt nichts.

## 2. Das Ziel

Drei Sätze:

1. **Jedes Gerät hat eine Identität**, die einen Neustart, eine
   Cloud-Synchronisation und das Löschen eines anderen Geräts übersteht.
2. **Jedes Gerät hat sein eigenes Ergebnis.** Vier Geräte, vier Messungen,
   vier Zeilen im Bericht.
3. **Der Raum wird benutzt** – zum Benennen, zum Bewerten und als Verbindung
   zur gemessenen Raumtemperatur.

## 3. Wie der Nenner entsteht

Zur Wahl standen zwei Wege: die Anzahl im Fragebogen erfragen, oder die
Höchstzahl mit den im Check aufgenommenen Geräten wachsen lassen.

**Die Antwort ist beides – es ist dieselbe Mechanik.** Der Nenner ist die
Geräteliste im Profil. Gefüllt werden kann sie an zwei Stellen, und das ist
kein Kompromiss, sondern eine Regel, die dieses Projekt schon anwendet:

> **Kein Feld lebt nur im Check.** Jede Angabe, die ein Check braucht, steht im
> vollständigen Fragebogen, ist im Profil änderbar und im Check nachtragbar.

Das ist bereits gebaut: `ApplianceGate` fragt im Check nach, was das Profil
nicht weiß, und **schreibt die Antwort ins Profil zurück** – dieselbe
Komponente `AppliancePicker`, einmal im Fragebogen mit allen Arten, einmal im
Check mit den einschlägigen. Für Geräte gilt das genauso wie heute für die
Ja/Nein-Frage.

Der Fragebogen wird dadurch **nicht voller.** Wer einen Kühlschrank hat, tippt
wie bisher einmal. Nur wer zwei hat, tippt zusätzlich auf „weiteres Gerät".
Die Frage nach der Anzahl als eigener Schritt wäre der schlechtere Weg: Sie
verlangt eine Zahl von jedem, auch von den vielen mit genau einem Gerät.

Der Nenner folgt damit immer der Liste – und `skippedMeasurements()` bleibt
unverändert richtig: Eine leere, beantwortete Liste nimmt den Check weiter aus
Zähler **und** Nenner.

## 4. Wie die Zahl wieder sinken darf

Ein Gerätezähler, der nur steigt, wäre eine Fortschrittsanzeige. Interessanter
ist der Zustand: *Welche Geräte sind gerade in Ordnung?*

Die Mechanik dafür existiert – `followUps.ts` kennt zwei Anlässe, eine
abgeschlossene Messung wieder als offen zu führen:

- **Kühlschrank:** letztes Ergebnis nicht `good` → die Stufe wurde noch nicht
  (oder nicht erfolgreich) angepasst.
- **Gefriergerät:** ein halbes Jahr nach dem abgehakten Abtauen
  (`DEFROST_RECHECK_DAYS = 182`) – vorher bestätigt eine Messung nur die
  eigene Arbeit von gestern.

Beide lesen heute `results['fridge']` bzw. `results['freezer']` – also den
Haushalt, nicht das Gerät. Je Gerät gelesen, wird daraus genau das, was den
Zähler wieder senkt: Die Truhe im Keller ist ein halbes Jahr nach dem Abtauen
wieder dran, das Gefrierfach in der Küche noch nicht. „3 von 4 Geräten in
Ordnung" ist eine Aussage über den Haushalt; „4 von 4 gemessen" ist eine
Aussage über den Nutzer.

## 5. Identität – und warum sie nicht der Index sein darf

Die Pro-Raum-Checks identifizieren über `type#index` (`rooms.ts:16`):
`bedroom#0`, `bedroom#1`. Für Räume geht das gerade noch durch, für Geräte
nicht: Löscht man den ersten von zwei Kühlschränken, rutscht `fridge#1` auf
`fridge#0` – und **erbt das Ergebnis des gelöschten Geräts.** Der Nutzer sieht
eine Messung, die er an einem anderen Gerät gemacht hat.

`ApplianceEntry` bekommt deshalb ein `id: string`, vergeben beim Anlegen und
danach unveränderlich.

**Für Bestandsdaten ist die Vergabe trivial und deterministisch:** Weil
`toggleAppliance` bis heute je Art höchstens einen Eintrag zulässt, ist die Art
selbst schon eindeutig. Ein Altprofil bekommt also `id = kind` – `fridge`,
`freezer`, `fridge_freezer`. Kein Ratespiel, keine Kollision, und der Schlüssel
eines Altgeräts ist damit derselbe wie der Schlüssel seines Altergebnisses.

Die Migration gehört nach **`migrateOnboardingData`**, nicht in den
`merge`-Block des `persist`-Aufrufs – sonst käme ein Altprofil aus der Cloud
unmigriert an (Begründung in `CLAUDE.md`).

## 6. Altergebnisse: gefunden, nicht umgeschrieben

Gespeicherte Messergebnisse werden in diesem Projekt **nicht migriert** – sie
liegen auch in Firestore und in Exporten. Stattdessen liest die Auswertung
beide Formate.

Für Geräte heißt das eine Rückfallkette beim Nachschlagen:

```
results['fridge@<geräte-id>']   ← neu, gerätebezogen
results['fridge']               ← alt, haushaltsbezogen
```

Ein Altergebnis wird dem **ersten** Gerät seiner Art zugeordnet. Das ist die
bestmögliche Zuordnung: Bis heute konnte es nur eines geben, also *war* es
dieses Gerät. Sobald dieses Gerät neu gemessen wird, gewinnt der neue
Schlüssel und der alte wird nicht mehr gebraucht.

Was das für den Nutzer bedeutet, der zwei Kühlschränke einträgt: Gerät 1 hat
seine Messung von damals, Gerät 2 ist offen. Genau richtig – gemessen hat er
ja nur eines.

**Zwei Fallstricke, die beim Bauen zu prüfen sind:**

- `pendingFollowUps` liest `results['freezer']?.completedAt` direkt. Ohne die
  Rückfallkette verschwindet die Abtau-Erinnerung für Bestandsnutzer.
- `yieldsSaving` und die Wirkungs-Summe lesen über alle Ergebnisse. Ein
  Altergebnis darf nicht doppelt gezählt werden, wenn das Gerät zusätzlich ein
  neues hat.

## 7. Wozu der Raum gut ist

Heute: Vorauswahl. Künftig drei Dinge:

**Benennen.** „Kühlschrank Küche" und „Kühlschrank Keller" – ohne den Raum
stünden im Bericht zwei Zeilen „Kühlschrank" untereinander. Der Raum ist die
natürliche Unterscheidung; ein frei getippter Name bleibt als Ausweg für zwei
Geräte im selben Raum.

**Bewerten.** Ein Kühlschrank im 22 °C warmen Wohnzimmer arbeitet gegen ein
anderes Temperaturgefälle als einer im 16 °C kühlen Keller – bei gleicher
Innentemperatur. Und die Gefriertruhe im unbeheizten Keller ist der klassische
Sparfall, über den sich etwas sagen lässt, das für die Küche nicht gilt.

**Verbinden.** Der Raumklima-Check misst die Raumtemperatur bereits, je Raum,
mit eigenem Ergebnis (`room_temperature@basement#0`). Steht das Gerät in einem
gemessenen Raum, kennt die App die Umgebungstemperatur wirklich – statt sie
anzunehmen. Das ist die erste Verbindung zwischen zwei Checks in dieser App
und der Grund, warum 12d eine eigene Etappe ist und nicht ein Nebensatz in 12b.

## 8. Was nicht dazugehört

- **Kein Energielabel, kein Modell, kein Baujahr.** Die gelbe „Jahresverbrauch
  lt. Label"-Kachel wurde in Runde 3 bewusst entfernt (14.1). Sie kommt hier
  nicht durch die Hintertür zurück.
- **Keine Geräte außerhalb von Kühlen und Gefrieren.** Waschmaschine und
  Trockner haben keinen Check; eine allgemeine Geräteverwaltung wäre ein
  eigenes Vorhaben.
- **Keine Umstellung der Pro-Raum-Checks auf `id`.** Deren `type#index` hat
  dasselbe Problem, aber das ist ein eigener Umbau mit eigenem Risiko.
- **Die Gesamtzahl der Checks bleibt 9.** Aus einem Check werden nicht zwei –
  aus einem Check wird ein Check mit mehreren Geräten, genau wie der
  Raumklima-Check ein Check mit mehreren Räumen ist.

## 9. Reihenfolge und warum

| Etappe | Was | Für sich allein sinnvoll? |
|---|---|---|
| **12a** | Geräte bekommen Identität und Anzahl | Ja – die Liste ist danach richtig, auch wenn noch nichts sie nutzt |
| **12b** | Ein Ergebnis je Gerät | Ja – das ist der Kern |
| **12c** | Tipps, Bericht, Folgemessungen ziehen nach | Ja – schließt die Stellen, die sonst „0 von 2" zeigen |
| **12d** | Der Raum wird benutzt | Ja – reine Aufwertung |

12a ist deployfähig, ohne dass sich für den Nutzer sichtbar etwas ändert: Er
kann ein zweites Gerät eintragen, es wird gespeichert, und der Check misst
weiterhin nur das erste. Das ist die risikoärmste Reihenfolge – die
Datenstruktur steht und ist erprobt, bevor die Fortschrittsrechnung darauf
umgestellt wird.

Nach 12b, aber vor 12c, gibt es einen Zwischenzustand, in dem der Bericht
weniger zeigt als die App. Deshalb: **12c nicht liegen lassen.**
