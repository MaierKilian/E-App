---
description: Eine Etappe des Tank-Umbaus abarbeiten (docs/tank-etappen.md)
argument-hint: "[Nummer | status]"
---

Argument: `$ARGUMENTS` (leer = nächste offene Etappe, Zahl = diese Etappe,
`status` = nur berichten, nicht arbeiten)

## Vorgehen

1. **`docs/tank-etappen.md` lesen.** Dort steht die Stand-Tabelle und je Etappe
   Umfang, berührte Dateien und die Abnahmeliste.

2. **Etappe bestimmen:**
   - `$ARGUMENTS` leer → die erste Etappe mit Status „offen“, deren
     Abhängigkeiten erfüllt sind.
   - `$ARGUMENTS` ist eine Zahl → diese Etappe. Sind ihre Abhängigkeiten nicht
     erfüllt, sag das und frag nach, statt einfach loszulegen.
   - `$ARGUMENTS` ist `status` → Stand berichten (fertig / offen / als Nächstes
     dran / was blockiert) und **hier aufhören**.

3. **Die zugehörigen Konzept-Abschnitte in `docs/tank-concept.md` lesen.** Jede
   Etappe nennt sie. Das Konzept trägt das Warum – ohne das entstehen Lösungen,
   die formal passen und den Punkt verfehlen.

4. **Umsetzen.** Vorhandenen Code wiederverwenden, wo es geht. Kommentare auf
   Deutsch, im Stil der umliegenden Dateien: Sie erklären, *warum* etwas so ist,
   nicht *was* der Code tut.

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

7. **Abschließen:**
   - Commit auf dem aktuellen Arbeits-Branch, Nachricht auf Deutsch, mit
     Begründung im Rumpf.
   - `docs/tank-etappen.md` aktualisieren: Status, Datum, Commit-Hash in der
     Stand-Tabelle. Ergaben sich unterwegs neue Erkenntnisse, die spätere
     Etappen betreffen, im Tracker (und ggf. im Konzept) nachziehen.
   - **Nur den Arbeits-Branch pushen** (`git push -u origin <branch>`), nicht
     nach `main` mergen – siehe „Der Merge nach `main` gehört dem Menschen" in
     `CLAUDE.md`.

8. **Berichten:** Was umgesetzt wurde, was die Abnahme ergab, was als Nächstes
   dran ist. Nicht die Dateiliste vorlesen.

## Grundsätze für alle Etappen

- **Eine Etappe pro Session.** Nicht in die nächste vorlaufen, auch wenn sie
  klein wirkt – jede ist einzeln deploybar und soll einzeln beurteilbar bleiben.
- **Ein Rechenweg für beide Modelle.** Tank und Zähler unterscheiden sich darin,
  wie abgelesen wird – nie darin, wie hochgerechnet oder bepreist wird. Eine
  zweite Rechenkette ist immer der falsche Weg.
- **Kein bestehender Zähler kippt still um.** Ein Träger mit vorhandenen
  Ablesungen bleibt `counter`, bis der Nutzer ausdrücklich umschaltet.
- **Gespeicherte Einträge bleiben lesbar.** `refill` und `refillCostEur` sind
  optional; ein Eintrag ohne sie ist und bleibt eine gewöhnliche Ablesung.
- **Nichts sperren.** Eine fehlende Kapazität verhindert keine Funktion, sie
  reduziert nur, was gezeigt werden kann.
