# Prompt für Claude Design — reduzierte Fassung von Abbildung 2

**Verwendung:** Diesen Prompt unverändert in Claude Design einfügen. Er ist
bewusst so geschrieben, dass er ohne weitere Rückfragen ausreicht – Claude
Design kennt weder das Projekt noch die bisherige Fassung der Abbildung.

---

## Der Prompt (zum Kopieren)

```
Ich brauche eine neue, deutlich reduzierte Fassung einer Abbildung für ein
akademisches Projektdokumentation. Die alte Fassung ist beigefügt (Foto/Scan).
Sie zeigt die Ordnerstruktur einer Software ("E-App") als vollständigen
Verzeichnisbaum – jeder einzelne Unterordner mit seiner Datei-Anzahl, dazu
eine Tabelle mit acht Dateiendungen und Prozentbalken. Das wirkt unruhig und
zeigt zu viele Details für den Zweck der Abbildung.

KONTEXT UND ZIELGRUPPE
Die Abbildung steht in einem Kapitel "Codestruktur und technische Umsetzung"
einer wissenschaftlichen Projektdokumentation. Sie wird von einem Betreuer
gelesen, der die Arbeit fachlich bewertet, aber selbst nicht programmiert.
Er soll allein durch die Abbildung – auch ohne den Fließtext zu lesen –
verstehen, dass der Code nach fachlichen Themen geordnet ist und nicht nach
technischer Art. Alles, was zu diesem einen Verständnis nichts beiträgt,
soll fehlen.

WAS DIE NEUE ABBILDUNG ZEIGEN SOLL (genau diese vier Bausteine, nicht mehr)

1. Zwei-Teilung des Projekts, als zwei klar getrennte Bereiche:
   - "src/" – der Anwendungscode, der zur eigentlichen App gebündelt wird
   - "Unterstützende Bereiche" – als reine Stichwortliste OHNE Zahlen:
     Tests · Dokumentation · Medien · Konfiguration · Server-Code (Cloud-
     Funktion) · Archiv (entfernte, aber dokumentierte alte Programmteile)

2. Innerhalb von src/: zwei klar unterscheidbare Gruppen von Bausteinen,
   visuell deutlich voneinander abgesetzt (z. B. unterschiedliche Farbe oder
   Rahmenart):

   Gruppe A – "Fachbereiche" (17 insgesamt, je ein eigenes Thema der App).
   Als einzelne Kacheln zeigen, mit genau diesen deutschen Bezeichnungen:
   Fragebogen · Messungen · Monitoring · Berichte · Wissensbereich ·
   Empfehlungen · Profile · Rechtliches
   Dazu eine neunte, bewusst kleinere/zurückhaltendere Kachel:
   "+ 9 weitere Bereiche"
   (diese neun sind: Anmeldung, Bezahlung, Demo-Modus, Feedback, Startseite,
   Landing Page, Einstellungen, Cloud-Synchronisierung, Nutzungsstatistik –
   sie müssen NICHT einzeln benannt werden, die Sammelkachel genügt)

   Gruppe B – "Gemeinsam genutzte Bausteine" (nutzt jeder Fachbereich mit):
   Oberflächenbausteine · Datenverwaltung · Sprachtexte (Deutsch/Englisch) ·
   Hilfsfunktionen · Datenstrukturen
   (das sind inhaltlich components, store, i18n, lib, types – bitte die
   deutschen Beschreibungen verwenden, keine technischen Ordnernamen als
   Haupttext; der Ordnername darf klein als Zusatz danebenstehen)

3. Eine Callout-Box "Wiederkehrendes Muster in den Fach-Modulen", am
   Beispiel eines einzelnen Moduls (Kühlschrank-Check) gezeigt, als vier
   aufeinanderfolgende Schritte:
   FridgeIntro.tsx  →  erklärt die Messung, bevor sie beginnt
   FridgeRun.tsx    →  führt Schritt für Schritt durch die Eingabe
   FridgeResult.tsx →  zeigt die Auswertung
   fridge.ts        →  enthält nur die Rechenlogik, keine Bildschirmanzeige
   Darunter, deutlich kleiner, ein ehrlicher Zusatzsatz:
   "Dieses Muster gilt für neun gleichartige Module – mit zwei benannten
   Ausnahmen: Ein Modul hat keine eigene Einführungsseite, ein anderes
   verteilt seine Rechenlogik auf vier statt einer Datei."

4. Optional, nur falls noch Platz ist, eine einzige kleine Zeile am unteren
   Rand (kein Tabellenblock, keine Balken):
   "221 reine Rechendateien stehen 153 Oberflächendateien gegenüber –
   zusammen 98 % des gesamten Programmcodes."

WAS GEGENÜBER DER ALTEN FASSUNG AUSDRÜCKLICH WEGFÄLLT
- Der vollständige Verzeichnisbaum mit jedem einzelnen Unterordner und seiner
  Datei-Anzahl (also nicht mehr einzeln: analytics, billing, demo, sync,
  settings, landing, home, feedback, auth, profiles, tips, onboarding,
  reports, monitoring, education/flashcards/engine usw. mit Zahlen)
- Die achtzeilige Tabelle "Dateitypen im Projekt" mit Balkendiagramm
- Jede Gesamt-Dateizahl im Titel oder Untertitel der Abbildung
- Alle Randordner wie .github, .claude, .devcontainer, public, functions als
  eigene Zeilen – falls überhaupt erwähnt, nur als Wort in der Stichwortliste
  "Unterstützende Bereiche", nicht einzeln aufgeschlüsselt

GESTALTUNG
- Ruhige, akademische Formsprache: viel Weißraum, gedeckte Farben, keine
  grellen Kontraste
- Höchstens drei Farbkategorien in der Legende: Fachbereich · gemeinsam
  genutzter Baustein · Beispiel-Datei-Ebene (statt bisher fünf)
- Format: Hochformat, für den Einzelabdruck als eine Abbildung auf einer
  Seite eines Word-Dokuments (ähnliche Seitengröße wie die beigefügte alte
  Fassung)
- Titel der Abbildung: "Abbildung 2: Verzeichnisstruktur des Quellcodes –
  Fachbereiche, gemeinsame Bausteine und wiederkehrendes Modulmuster"
- Sprache durchgehend Deutsch
- In der Abbildung selbst keine unerklärten Fachbegriffe stehen lassen (die
  Begriffserklärung steht im begleitenden Fließtext, nicht im Bild – die
  Abbildung soll für sich lesbar bleiben, ohne zusätzlichen Text zu
  benötigen, der nicht direkt daneben steht)

ZIEL-CHECK (bitte am Ende selbst prüfen)
Jemand ohne Programmierkenntnisse, der nur diese eine Abbildung ansieht,
sollte danach drei Dinge verstehen:
(a) Der Code ist nach fachlichen Themen geordnet, nicht nach technischer Art.
(b) Es gibt wenige gemeinsame Bausteine, die alle Themen mitbenutzen.
(c) Jedes Themen-Modul folgt intern demselben Ablauf: verstehen → messen →
    auswerten.
Alles, was zu diesem Verständnis nichts beiträgt, darf in der neuen Fassung
fehlen – lieber leerer Raum als eine weitere Zahl.
```

---

## Warum genau diese vier Bausteine (Begründung, nicht Teil des Prompts)

- **Zwei-Teilung** bleibt, weil sie den Rahmen absteckt: Wie viel vom
  Repository ist überhaupt „die App" und wie viel ist Werkzeug drumherum.
- **Fachbereiche vs. gemeinsame Bausteine** ist der eigentliche Kerngedanke
  des Kapitels – die feature-basierte Struktur. Alles andere in der alten
  Abbildung (jede Unterordner-Zahl) trägt zu genau diesem Gedanken nichts bei.
- **Das Modulmuster** bleibt nahezu unverändert, weil es der einzige Teil der
  alten Abbildung ist, der eine Regel *zeigt* statt nur *aufzählt* – und weil
  es laut Faktencheck (siehe Analyse-Datei, Teil A.2.4) ohnehin präzisiert
  werden musste. Die neue Fassung nutzt das gleich als Chance: Die genannten
  Ausnahmen stehen jetzt ehrlich mit im Bild.
- **Die Dateitypen-Tabelle entfällt vollständig aus der Abbildung.** Sie
  beschreibt die Zusammensetzung des Codes, nicht die Ordnerstruktur – das ist
  ein anderes Thema als das der Abbildung. Die einzige Kernaussage („Logik und
  Oberfläche sind technisch getrennte Dateien") wandert als ein Satz in den
  Fließtext (siehe Analyse-Datei, Abschnitt C.5) statt als Tabelle in die
  Abbildung.
