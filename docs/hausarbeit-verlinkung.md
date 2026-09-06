# eApp-Verlinkung in der Hausarbeit – Referenz für die LaTeX-Umsetzung

**Zweck dieses Dokuments.** Es legt fest, mit welchen Buttons die
PDF-Hausarbeit an geeigneten Kapitelenden auf die laufende E-App verweist,
und liefert für jeden Button die vier verbindlichen Angaben (Position,
Beschriftung, Ziel, URL) sowie die Vorgaben zur LaTeX-Gestaltung. Es ist als
**Arbeitsgrundlage** für die nächste Bearbeitung der Hausarbeit gedacht –
Kapitelinhalte werden dadurch nicht verändert, nur um einen Verweis am
Kapitelende ergänzt.

**Stand:** 06.09.2026. Jede URL ist aus der tatsächlichen
Routing-Konfiguration hergeleitet (`src/app/App.tsx`,
`src/features/measurements/catalog.ts`, `src/features/demo/demoProfile.ts`) –
**keine Adresse in diesem Dokument ist erfunden.** Alle 15 Links wurden
zusätzlich **im Browser durchgeklickt** (21 automatisierte Prüfungen, alle
bestanden – siehe Abschnitt 5).

> **Änderung gegenüber der ersten Fassung dieses Dokuments (06.09.2026).**
> Die erste Analyse hatte ergeben, dass 12 der 15 Links technisch nicht
> funktionieren können. Die Ursachen (zwei Weichen im Routing, Abschnitt 1.3)
> sind seitdem **im Code behoben**; alle Links funktionieren jetzt. Die
> Übergangslösung der ersten Fassung ist damit hinfällig und entfernt.

---

## 1. Technische Grundlagen

### 1.1 Basis-URL

Die App wird automatisch an zwei Orten veröffentlicht (`CLAUDE.md`,
`docs/deployment.md`):

| Ziel | Basis-URL | Pfad-Präfix | Quelle |
|---|---|---|---|
| **Firebase Hosting** (für die Hausarbeit verwenden) | `https://e-app-info.web.app` | keins (`/`) | `CLAUDE.md`; `VITE_BUILD_BASE=/` im Skript `build:firebase` (`package.json`) |
| GitHub Pages | `https://maierkilian.github.io/E-App` | `/E-App/` | hergeleitet aus dem Repository `MaierKilian/E-App` und `vite.config.ts` (`base: '/E-App/'`); **nicht wörtlich im Code hinterlegt** – vor einer Verwendung einmal im Browser gegenprüfen |

**Alle URLs in diesem Dokument nutzen die Firebase-Adresse.** Sie ist in
`CLAUDE.md` als kanonische Adresse dokumentiert und hat kein Pfad-Präfix.
Beide Hosting-Ziele leiten jede Pfad-Anfrage serverseitig auf `index.html`
um (`firebase.json`; für GitHub Pages die `404.html`-Kopie im
Deploy-Workflow) – der direkte Aufruf einer Unterseite funktioniert also
technisch auf beiden Zielen.

### 1.2 Wie das Demo-Profil angesprochen wird

Es gibt **einen** Mechanismus, um die vorbefüllte Beispiel-Wohnung ohne
Konto zu laden: den Link-Parameter **`?demo`**
(`src/features/demo/DemoLoader.tsx`). Er funktioniert – angehängt an **jede**
Route der App:

1. Der Parameter wird beim ersten Rendern einmalig aus der Adresse gelesen.
2. Ein Bestätigungsdialog erscheint („Beispiel-Wohnung ansehen" →
   „Beispiel laden").
3. Nach der Bestätigung lädt `enterDemo()` den vollständigen Demo-Datensatz
   in die lokalen Stores – und **der Besucher bleibt auf der Adresse, die er
   angefragt hat.**

Der Demo-Modus hebt zugleich die Anmeldepflicht auf
(`src/components/LoginGate.tsx`: `if (user || demoMode) return children`).
Die Routen `/measurements`, `/measurements/:id`, `/monitoring`,
`/monitoring/:type` und `/reports` sind damit ohne Konto einsehbar.

**`?demo` gehört an jeden Link dieser Liste** – auch an `/education` und
`/tipps`, die zwar keine Anmeldung verlangen, für einen Erst-Besucher aber
sonst gar nicht erst erreichbar wären (Abschnitt 1.3) bzw. ohne Profildaten
leer blieben.

### 1.3 Die zwei Weichen, die dafür angepasst wurden

Damit ein Link aus der PDF direkt in einem Bereich landet, mussten zwei
Stellen im Routing zusammenspielen. Beide sind seit dem 06.09.2026 angepasst
(Befund 44 in `docs/gefundene-probleme.md`):

| Weiche | Verhalten vorher | Verhalten jetzt |
|---|---|---|
| `FirstVisitGate` (`src/app/App.tsx`) | schickte **jeden** Erst-Besucher von jeder Adresse außer den öffentlichen (`/`, `/willkommen`, `/login`, `/impressum`, `/datenschutz`, `/join/…`) auf die Landing Page – ein Deep-Link verlor seinen Pfad, bevor der Besucher irgendetwas entscheiden konnte | lässt einen `?demo`-Aufruf durch; wird der Dialog abgelehnt, greift sie wie zuvor |
| `DemoLoader` (`src/features/demo/DemoLoader.tsx`) | navigierte nach dem Laden **fest** auf `/onboarding`, unabhängig vom angefragten Pfad | navigiert gar nicht mehr – der Besucher bleibt, wo er hinwollte |

Zusätzlich fragt der Dialog **nicht erneut**, wenn die Beispiel-Wohnung im
selben Browser bereits läuft. Wer in der PDF nacheinander mehrere Buttons
anklickt, bekommt die Rückfrage also nur beim ersten Mal; danach öffnet jeder
Link seine Ansicht direkt. (In diesem Fall bleibt `?demo` sichtbar in der
Adresszeile stehen – ohne Wirkung, da die Demo bereits geladen ist.)

### 1.4 Was der Leser erlebt

1. Klick auf den Button in der PDF → die App lädt (kurzer Startbildschirm).
2. Beim **ersten** Link: der Dialog „Beispiel-Wohnung ansehen" →
   „Beispiel laden" (ein Klick). Zusätzlich erscheint einmalig der
   Cookie-Hinweis – er ist rechtlich vorgeschrieben und beeinflusst die
   Ansicht nicht.
3. Der angefragte Bereich erscheint, gefüllt mit den Daten der
   Beispiel-Wohnung „Familie Berger" (3 Personen, 85 m², Baujahr 1962,
   18 Monate Zählerstände, zehn abgeschlossene Messungen).
4. Ein schmaler Streifen „Demo-Wohnung" bleibt oben sichtbar, mit den
   Schaltflächen „Selbst loslegen" und „Verlassen".

**Bei den neun Check-Links** öffnet sich der jeweilige Check auf seinem
Reiter **„Info"** (Reiterfolge: Info · Messen · Ergebnis) – also die
Erklärseite des Checks, von der aus der Leser ihn auch selbst durchspielen
kann. Ein bereits gespeichertes Demo-Ergebnis wird dabei **nicht**
automatisch angezeigt: Der Ergebnis-Reiter füllt sich erst, wenn eine Messung
im laufenden Durchgang ausgewertet wurde. Das ist so gewollt und für den
Zweck der Arbeit passend – der Leser sieht, *was* der Check tut und *wie* er
abläuft.

### 1.5 Namens-Zuordnung der Checks

Die in der Aufgabenstellung genannten Bezeichnungen weichen an drei Stellen
von den tatsächlichen Titeln in der App ab. Maßgeblich ist die mittlere
Spalte:

| Name in der Aufgabenstellung | Tatsächlicher Titel in der App | Katalog-ID (für die URL) |
|---|---|---|
| Duschkopf-Test | Duschkopf-Test | `showerhead` |
| Warmwasserwartezeit-Check | **Warmwasser-Wartezeit** (ohne „-Check") | `hot_water_wait` |
| Raumklima-Check | Raumklima-Check | `room_temperature` |
| Möbelabstands-Check | **Möbel-Abstands-Check** | `furniture_spacing` |
| LED-Check | LED-Check | `lighting` |
| Kühlschrank-Check | Kühlschrank-Check | `fridge` |
| Wieviel-Schrank-Check | **Gefrierschrank-Check** – einen „Wieviel-Schrank-Check" gibt es in der App nicht; gemeint ist erkennbar dieser | `freezer` |
| Grundlast-Check | Grundlast-Check | `base_load` |
| Standby-Check | Standby-Check | `standby` |

---

## 2. LaTeX-Gestaltung: verbindliche Vorgaben

- **Keine ausgeschriebenen URLs.** Jeder Verweis erscheint als gestalteter,
  klickbarer Button.
- **Der Button muss in der fertigen PDF anklickbar sein** – technisch über
  `\href{URL}{…}` aus `hyperref`, nicht als Bild oder reiner Text.
- **Akzentfarbe der eApp.** Die App definiert ihre Primärfarbe je Theme als
  CSS-Variable (`src/index.css`); für eine HTW-Arbeit passt die
  **„HTW-Grün"-Theme-Farbe `#5A8A1B`** (`[data-theme='htw']`) – sie ist
  zugleich die Institutionsfarbe. Neutrale Alternative: `#18181B` (helles
  Standard-Theme).
- **Form:** dezent abgerundet, kompakt (kein ganzseitiges Banner),
  serifenlose Schrift, klar als ergänzender Verweis erkennbar.
- **Position:** eigener Absatz **nach** dem Abschluss des Kapitels bzw.
  Unterkapitels, nie mitten im Fließtext.

### 2.1 Beispielhafte Umsetzung

```latex
\usepackage{hyperref}
\usepackage{xcolor}
\usepackage[skins]{tcolorbox}

\definecolor{eappAccent}{HTML}{5A8A1B} % HTW-Grün-Theme der eApp

% Wiederverwendbarer Button: \eapplink{Beschriftung}{URL}
\newtcbox{\eappbuttonbox}{on line, arc=5pt, colback=eappAccent,
  colframe=eappAccent, colupper=white, boxrule=0pt,
  left=9pt, right=9pt, top=4.5pt, bottom=4.5pt,
  fontupper=\sffamily\bfseries\footnotesize}
\newcommand{\eapplink}[2]{%
  \begin{center}
    \href{#2}{\eappbuttonbox{#1 \,\textrightarrow}}
  \end{center}
}

% Verwendung am Ende eines Unterkapitels:
\eapplink{LED-Check in der eApp öffnen}{https://e-app-info.web.app/measurements/lighting?demo}
```

Wichtig für die Umsetzung: Das kaufmännische Und (`&`) in den URLs der
raum- und gerätebezogenen Checks muss in LaTeX **nicht** maskiert werden,
solange die URL im `\href`-Argument steht – `hyperref` behandelt sie
verbatim. Sicherheitshalber kann `\href` in einer eigenen Zeile stehen und
die URL per `\detokenize` geschützt werden, falls das Dokument `&` global
umdefiniert (z. B. in Tabellenumgebungen).

---

## 3. Die einzelnen eApp-Verknüpfungen

Format je Verweis: **Position**, **Button**, **Ziel**, **URL**, **LaTeX**.

### 3.1 Landing Page

- **Position:** Ende des Kapitels, das die eApp einführt bzw. die Landing
  Page beschreibt.
- **Button:** „eApp öffnen – Landing Page →"
- **Ziel:** die Landing Page der eApp
- **URL:** `https://e-app-info.web.app/willkommen`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.
- **Hinweis:** Bewusst `/willkommen` und nicht `/`. Beide zeigen dieselbe
  Seite (`LandingPage`), aber `/` leitet einen Besucher, der die App schon
  einmal geöffnet hat, sofort weiter ins Zuhause (Wiederkehrer-Weiche). Wer
  vorher einen anderen Button der Arbeit angeklickt hat, bekäme die Landing
  Page über `/` also nicht mehr zu sehen. `/willkommen` zeigt sie immer –
  und zählt den Aufruf nicht als organischen Erstbesuch in der Statistik
  mit, was für Verweise aus einer PDF sachlich richtig ist.

### 3.2 Demo-Profil / Zu-Hause-Bereich

Der „Zu-Hause-Bereich" ist keine eigene Route, sondern der Zustand von
`/onboarding`, sobald ein Profil vollständig ist (`OnboardingPage.tsx`:
`if (data.completed) return <HomeDashboard …>`). Da das Demo-Profil mit
`completed: true` ausgeliefert wird, führt derselbe Link, der die Demo lädt,
direkt dorthin.

- **Position:** Ende des Kapitels zum Demo-Profil bzw. zum Zu-Hause-Bereich
  (gilt für beide Erwähnungen in der Gliederung).
- **Button:** „In der eApp ansehen – Zu Hause →" (bzw. im Demo-Kapitel:
  „Demo-Profil in der eApp öffnen →")
- **Ziel:** Zu-Hause-Dashboard der Beispiel-Wohnung „Familie Berger"
- **URL:** `https://e-app-info.web.app/onboarding?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.3 Duschkopf-Test

- **Position:** Ende des Unterkapitels zum Duschkopf-Test.
- **Button:** „Duschkopf-Test in der eApp öffnen →"
- **Ziel:** Check `showerhead` im Demo-Profil
- **URL:** `https://e-app-info.web.app/measurements/showerhead?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.4 Warmwasser-Wartezeit-Check

- **Position:** Ende des Unterkapitels zur Warmwasser-Wartezeit.
- **Button:** „Warmwasser-Wartezeit-Check in der eApp öffnen →"
- **Ziel:** Check `hot_water_wait` im Demo-Profil
- **URL:** `https://e-app-info.web.app/measurements/hot_water_wait?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.5 Raumklima-Check

Raumbezogener Check (`perRoom`): Ohne Raumangabe zeigt die App zuerst eine
Raumauswahl. Der Parameter `room` führt direkt in den Raum; `living_room#0`
ist eine feste, im Demo-Datensatz hinterlegte Kennung und daher stabil
(`%230` ist die codierte Form von `#0`).

- **Position:** Ende des Unterkapitels zum Raumklima-Check.
- **Button:** „Raumklima-Check in der eApp öffnen →"
- **Ziel:** Check `room_temperature`, Raum „Wohnzimmer" im Demo-Profil
- **URL:** `https://e-app-info.web.app/measurements/room_temperature?room=living_room%230&demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.6 Möbelabstands-Check

- **Position:** Ende des Unterkapitels zum Möbelabstands-Check.
- **Button:** „Möbelabstands-Check in der eApp öffnen →"
- **Ziel:** Check `furniture_spacing`, Raum „Wohnzimmer" im Demo-Profil
- **URL:** `https://e-app-info.web.app/measurements/furniture_spacing?room=living_room%230&demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.7 LED-Check

- **Position:** Ende des Unterkapitels zum LED-Check.
- **Button:** „LED-Check in der eApp öffnen →"
- **Ziel:** Check `lighting` im Demo-Profil (gilt für die ganze Wohnung,
  kein Raumparameter nötig)
- **URL:** `https://e-app-info.web.app/measurements/lighting?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.8 Kühlschrank-Check

Gerätebezogener Check (`perAppliance`). Die Beispiel-Wohnung hat ein Gerät
mit der festen Kennung `fridge_freezer` (Kühl-Gefrier-Kombination in der
Küche), das beide Kälte-Checks bedient.

- **Position:** Ende des Unterkapitels zum Kühlschrank-Check.
- **Button:** „Kühlschrank-Check in der eApp öffnen →"
- **Ziel:** Check `fridge` im Demo-Profil
- **URL:** `https://e-app-info.web.app/measurements/fridge?room=fridge_freezer&demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.9 Gefrierschrank-Check („Wieviel-Schrank-Check")

- **Position:** Ende des Unterkapitels zum Gefrierschrank-Check.
- **Button:** „Gefrierschrank-Check in der eApp öffnen →"
- **Ziel:** Check `freezer` im Demo-Profil
- **URL:** `https://e-app-info.web.app/measurements/freezer?room=fridge_freezer&demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.10 Grundlast-Check

- **Position:** Ende des Unterkapitels zum Grundlast-Check.
- **Button:** „Grundlast-Check in der eApp öffnen →"
- **Ziel:** Check `base_load` im Demo-Profil
- **URL:** `https://e-app-info.web.app/measurements/base_load?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.11 Standby-Check

- **Position:** Ende des Unterkapitels zum Standby-Check.
- **Button:** „Standby-Check in der eApp öffnen →"
- **Ziel:** Check `standby` im Demo-Profil
- **URL:** `https://e-app-info.web.app/measurements/standby?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.12 Energiespartipps

- **Position:** Ende des Kapitels bzw. der Unterkapitel zu den
  Energiespartipps.
- **Button:** „Energiespartipps in der eApp ansehen →"
- **Ziel:** Empfehlungsliste der Beispiel-Wohnung (Route `/tipps`)
- **URL:** `https://e-app-info.web.app/tipps?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.
- **Hinweis:** Für **einzelne** Tipps existiert keine eigene adressierbare
  Ansicht (keine Tipp-Kennung in der URL, geprüft in `TipsPage.tsx`) – auch
  wenn die Arbeit einzelne Tipps gesondert behandelt, ist nur der Verweis auf
  die Gesamtliste möglich. Die Liste ist nach dem Ziel der Beispiel-Wohnung
  („CO₂ reduzieren") sortiert und nennt vier sofort machbare Maßnahmen.

### 3.13 Report-Bereich

- **Position:** Ende des Kapitels über den Report/PDF-Bericht.
- **Button:** „Report in der eApp ansehen →"
- **Ziel:** Bericht-Bereich (Route `/reports`) im Demo-Profil
- **URL:** `https://e-app-info.web.app/reports?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.

### 3.14 Monitoring

- **Position:** Ende des Monitoring-Kapitels.
- **Button:** „Monitoring in der eApp ansehen →"
- **Ziel:** Zähler-Übersicht (Route `/monitoring`) im Demo-Profil
- **URL:** `https://e-app-info.web.app/monitoring?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.
- **Hinweis:** Falls die Arbeit einen einzelnen Energieträger gesondert
  behandelt, existiert zusätzlich die geprüfte Detail-Route
  `/monitoring/:type`, z. B. für Strom:
  `https://e-app-info.web.app/monitoring/electricity?demo` (im Browser
  geprüft). Die Beispiel-Wohnung führt Strom, Gas und Wasser.

### 3.15 Wissensbereich

- **Position:** Ende des Kapitels zum Wissensbereich.
- **Button:** „Wissensbereich in der eApp öffnen →"
- **Ziel:** Wissensbereich (Route `/education`) – FAQ, Glossar,
  Mess-Hintergründe, Geräte-Übersicht
- **URL:** `https://e-app-info.web.app/education?demo`
- **LaTeX:** Als klickbaren Button im eApp-Stil umsetzen.
- **Hinweis:** Der Wissensbereich verlangt zwar keine Anmeldung, `?demo`
  gehört hier trotzdem an den Link: Ohne ihn schickt die Erst-Besuch-Weiche
  einen Leser, der die App zum ersten Mal öffnet, auf die Landing Page
  (Abschnitt 1.3). Einzelne Reiter sind nicht separat adressierbar (kein
  Tab-Parameter in `EducationPage.tsx`); der Link öffnet den Standard-Reiter.

---

## 4. Gesamtübersicht

| Kapitel / Funktion | Button-Beschriftung | Ziel | URL | Deep Link geprüft |
|---|---|---|---|---|
| Landing Page | „eApp öffnen – Landing Page →" | Landing Page | `https://e-app-info.web.app/willkommen` | Ja |
| Zu Hause / Demo-Profil | „In der eApp ansehen – Zu Hause →" | Zu-Hause-Dashboard | `https://e-app-info.web.app/onboarding?demo` | Ja |
| Duschkopf-Test | „Duschkopf-Test in der eApp öffnen →" | Check `showerhead` | `https://e-app-info.web.app/measurements/showerhead?demo` | Ja |
| Warmwasserwartezeit-Check | „Warmwasser-Wartezeit-Check in der eApp öffnen →" | Check `hot_water_wait` | `https://e-app-info.web.app/measurements/hot_water_wait?demo` | Ja |
| Raumklima-Check | „Raumklima-Check in der eApp öffnen →" | Check `room_temperature` (Wohnzimmer) | `https://e-app-info.web.app/measurements/room_temperature?room=living_room%230&demo` | Ja |
| Möbelabstands-Check | „Möbelabstands-Check in der eApp öffnen →" | Check `furniture_spacing` (Wohnzimmer) | `https://e-app-info.web.app/measurements/furniture_spacing?room=living_room%230&demo` | Ja |
| LED-Check | „LED-Check in der eApp öffnen →" | Check `lighting` | `https://e-app-info.web.app/measurements/lighting?demo` | Ja |
| Kühlschrank-Check | „Kühlschrank-Check in der eApp öffnen →" | Check `fridge` | `https://e-app-info.web.app/measurements/fridge?room=fridge_freezer&demo` | Ja |
| Wieviel-Schrank-Check (= Gefrierschrank-Check) | „Gefrierschrank-Check in der eApp öffnen →" | Check `freezer` | `https://e-app-info.web.app/measurements/freezer?room=fridge_freezer&demo` | Ja |
| Grundlast-Check | „Grundlast-Check in der eApp öffnen →" | Check `base_load` | `https://e-app-info.web.app/measurements/base_load?demo` | Ja |
| Standby-Check | „Standby-Check in der eApp öffnen →" | Check `standby` | `https://e-app-info.web.app/measurements/standby?demo` | Ja |
| Energiespartipps | „Energiespartipps in der eApp ansehen →" | `/tipps` | `https://e-app-info.web.app/tipps?demo` | Ja |
| Report | „Report in der eApp ansehen →" | `/reports` | `https://e-app-info.web.app/reports?demo` | Ja |
| Monitoring | „Monitoring in der eApp ansehen →" | `/monitoring` | `https://e-app-info.web.app/monitoring?demo` | Ja |
| Wissensbereich | „Wissensbereich in der eApp öffnen →" | `/education` | `https://e-app-info.web.app/education?demo` | Ja |

**„Deep Link geprüft" bedeutet hier:** Die Adresse wurde in einem frischen
Browser (leerer Speicher, wie bei einem Leser, der die App zum ersten Mal
öffnet) aufgerufen, der Demo-Dialog bestätigt – und die App stand danach
unter genau dieser Adresse mit der erwarteten Ansicht. Kein Eintrag beruht
auf einer Vermutung.

---

## 5. Nachweis der Prüfung (06.09.2026)

Geprüft gegen den lokalen Entwicklungsserver mit einem automatisierten
Browser (Playwright, Chromium, deutschsprachiger Browser), jeweils aus einem
frischen Browser-Profil. **21 von 21 Prüfungen bestanden:**

- **Alle neun Checks** landen unter ihrer eigenen Adresse und zeigen die
  richtige Überschrift: Duschkopf-Test, Warmwasser-Wartezeit,
  Raumklima-Check, Möbel-Abstands-Check, LED-Check, Kühlschrank-Check,
  Gefrierschrank-Check, Grundlast-Check, Standby-Check.
- **Alle Bereiche** landen richtig: `/onboarding` (zeigt „Familie Berger"),
  `/monitoring`, `/monitoring/electricity` (zeigt „Strom"), `/reports`,
  `/tipps` (zeigt „Empfehlungen", Sparpotenzial „ca. 80–120 €"),
  `/education`.
- **Landing Page:** `/` zeigt sie einem Erst-Besucher, leitet einen
  Wiederkehrer auf `/onboarding` weiter; `/willkommen` zeigt sie in beiden
  Fällen.
- **Zweiter Link in derselben Sitzung:** kein zweiter Dialog, die Ansicht
  erscheint direkt.
- **Ablehnen des Dialogs:** führt den Erst-Besucher wie vorgesehen auf die
  Landing Page.
- **Ohne `?demo`:** die Erst-Besuch-Weiche greift unverändert und führt auf
  die Landing Page – das bisherige Verhalten der App ist also erhalten
  geblieben.

Zusätzlich wurden Bildschirmfotos der Ansichten „Grundlast-Check",
„Empfehlungen" und „Monitoring" geprüft: Sie zeigen die Inhalte der
Beispiel-Wohnung, nicht eine leere App.

---

## 6. Grenzen und offene Punkte

1. **Die Prüfung lief gegen den Entwicklungsserver.** Sie prüft das
   Verhalten der App, nicht die Erreichbarkeit der Firebase-Adresse. Nach dem
   nächsten Deployment (Push auf `main`) sollte **ein** Link aus der Tabelle
   im echten Browser gegengeprüft werden, bevor die PDF abgegeben wird.
2. **Die Check-Links öffnen den Info-Reiter**, nicht ein gespeichertes
   Ergebnis (Abschnitt 1.4). Für eine Abbildung eines *Ergebnisses* in der
   Arbeit eignet sich weiterhin ein Bildschirmfoto.
3. **Einzelne Tipps und einzelne Wissens-Reiter sind nicht adressierbar**
   (Abschnitte 3.12 und 3.15).
4. **Die GitHub-Pages-Adresse ist hergeleitet**, nicht im Code hinterlegt
   (Abschnitt 1.1).
5. **Verlässt der Leser die Demo** über „Verlassen", ist der Demo-Modus aus;
   der nächste Button aus der PDF fragt dann wieder nach. Das ist gewolltes
   Verhalten und kein Fehler.
