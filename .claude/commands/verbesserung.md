---
description: Eine Etappe aus der Verbesserungsliste abarbeiten (docs/verbesserungen-etappen.md)
argument-hint: "[Nummer | status]"
---

Argument: `$ARGUMENTS` (leer = nächste offene Etappe, Zahl = diese Etappe,
`status` = nur berichten, nicht arbeiten)

## Vorgehen

1. **`docs/verbesserungen-etappen.md` lesen.** Dort steht die Stand-Tabelle und
   je Etappe Ausgangslage, Umfang und die Abnahmeliste. Die Ausgangslage nennt
   Dateien und Zeilen – **erst dort nachsehen, dann urteilen.** Die Befunde
   sind vom 03.09.2026; Zeilennummern können sich verschoben haben.

2. **Etappe bestimmen:**
   - `$ARGUMENTS` leer → die erste Etappe mit Status „offen", deren
     Abhängigkeiten erfüllt sind.
   - `$ARGUMENTS` ist eine Zahl → diese Etappe. Sind ihre Abhängigkeiten nicht
     erfüllt oder ist sie als blockiert geführt, sag das und frag nach, statt
     einfach loszulegen.
   - `$ARGUMENTS` ist `status` → Stand berichten (fertig / offen / als Nächstes
     dran / was blockiert) und **hier aufhören**.

3. **Größe nennen, bevor es losgeht.** Jede Etappe trägt S, M, L oder XL. Sag
   die Größe und was sie ungefähr bedeutet, damit sich nach verbleibendem
   Usage-Fenster entscheiden lässt, ob sie noch reinpasst.

4. **Umsetzen.** Vorhandenen Code wiederverwenden, wo es geht. Kommentare auf
   Deutsch, im Stil der umliegenden Dateien: Sie erklären, *warum* etwas so
   ist, nicht *was* der Code tut.

   Vier Regeln, die in diesem Vorhaben besonders oft greifen:

   - **Zahlen stehen an einer Stelle.** Ein Richtwert wird aus dem Modul
     importiert, das mit ihm rechnet – nie abgeschrieben. Siehe
     `src/features/education/measurementThresholds.ts`.
   - **Feld-Migrationen gehören in `migrateOnboardingData`**, nicht in den
     `merge`-Block des `persist`-Aufrufs – sonst geht der Cloud-Sync daran
     vorbei (Begründung in `CLAUDE.md`).
   - **Gespeicherte Messergebnisse werden nicht migriert.** Ändert sich ein
     Kodier-Format, muss die Ergebnis-Ansicht beide Formate lesen.
   - **Kein Kommentar darf etwas anderes beschreiben als der Code daneben.**
     Genau dieser Fehler steckt in `showerhead.ts` und ist Teil von Etappe 10.

5. **Prüfen** – alle drei müssen grün sein:
   ```
   npx tsc -b --noEmit
   npm run lint
   npx vitest run
   ```
   Der Firestore-Rules-Test schlägt ohne laufenden Emulator fehl; das ist
   bekannt und kein Grund zur Sorge. Jeder andere Fehlschlag schon.

6. **Abnahmeliste durchgehen.** Jeden Punkt der Etappe einzeln prüfen und
   ehrlich abhaken. Was nicht erfüllt ist, wird benannt – nicht abgehakt.
   Wo die Abnahme etwas im Browser verlangt, auch im Browser prüfen: Der
   Standard-Build nutzt den Basispfad `/E-App/`, für `vite preview` deshalb
   `npm run build:firebase` (Basispfad `/`) verwenden.

7. **Abschließen:**
   - Commit auf dem aktuellen Arbeits-Branch, Nachricht auf Deutsch, mit
     Begründung im Rumpf (siehe bisherige Commits).
   - `docs/verbesserungen-etappen.md` aktualisieren: Status, Datum,
     Commit-Hash in der Stand-Tabelle. Ergaben sich unterwegs Erkenntnisse,
     die spätere Etappen betreffen, dort nachziehen.
   - **Nur den Arbeits-Branch pushen** (`git push -u origin <branch>`), nicht
     nach `main` mergen – siehe „Der Merge nach `main` gehört dem Menschen" in
     `CLAUDE.md`. Der Auto-Deploy läuft erst, wenn Kilian gemergt hat.

8. **Berichten:** Was umgesetzt wurde, was die Abnahme ergab, was als Nächstes
   dran ist. Nicht die Dateiliste vorlesen.

## Grundsätze für alle Etappen

- **Eine Etappe pro Session.** Nicht in die nächste vorlaufen, auch wenn sie
  klein wirkt – jede ist einzeln deploybar und soll einzeln beurteilbar
  bleiben. Ausnahme: Kilian sagt ausdrücklich, dass noch etwas reinpasst.
- **Jede Angabe im Fragebogen braucht einen Abnehmer.** Eine Frage, deren
  Antwort weder eine Messung noch das Monitoring noch der Bericht liest, ist
  eine Frage zu viel. Ab Etappe 3 wacht ein Test darüber.
- **Nichts sperren.** Eine fehlende Antwort verhindert nie eine Funktion; sie
  wird nachgefragt, wo sie gebraucht wird.
- **Kein Betrag ohne Deckung.** Ein Euro-Wert erscheint nur dort, wo die
  Messung ihn noch behauptet (`yieldsSaving` im Katalog). Wo die Menge die
  belastbarere Größe ist, steht die Menge vorn.
- **Bezeichnungen statt Zahlen im Bericht sind wertlos.** Jede Bewertung
  braucht ihren Vergleichsmaßstab – das ist der Kern von Etappe 6 und gilt
  danach für jede neue Bewertung.
