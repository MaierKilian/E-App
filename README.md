# E-App

Web-App für selbst durchführbare Energieanalyse im Haushalt.

Die App richtet sich an alle Haushalte: Nach einem kurzen Onboarding führt sie
durch einfache, verständliche Messungen, sammelt deren Ergebnisse, ermöglicht
ein Energie-Monitoring (Zählerstände) und erstellt daraus Berichte. Ein
Wissensbereich liefert Hintergründe – inklusive Lerninhalten für die HTW Berlin
(Gebäudeenergie- und Informationstechnik).

## Technik

- **React + TypeScript** mit **Vite** als Build-Tool
- **Tailwind CSS v4** fürs Styling, mit drei Themes: Hell, Dunkel und HTW-Grün
- **React Router** für die Navigation
- **i18next** für Mehrsprachigkeit (Deutsch & Englisch)
- **Zustand** für den App-Zustand, Speicherung lokal im Gerät
- Vorbereitet für eine spätere Verpackung als native App (iOS / Android) via Capacitor

## Projektstruktur

```
src/
├── app/          # App-Gerüst: Routing, Layout, Theme-Anwendung, Navigation
├── features/     # Hauptbereiche als eigenständige Module
│   ├── onboarding/
│   ├── measurements/
│   ├── monitoring/
│   ├── reports/
│   └── education/
├── components/   # Wiederverwendbare UI-Bausteine
├── store/        # Zentraler App-Zustand (Einstellungen …)
├── i18n/         # Übersetzungen (de, en)
└── types/        # Domänen-Datentypen
```

## Entwicklung

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Entwicklungsserver starten (http://localhost:5173)
npm run build    # Produktions-Build erstellen
npm run lint     # Code prüfen
```

## Backlog / Ideen

- **Gebäudeautomation-Fragebogen** (geplant): raumweise Erfassung von Tastern,
  Steckdosen, Schaltern, Leuchten usw. Daraus per KI/API passende Smart-Home-
  Produktvorschläge generieren (z. B. Homematic IP, Zigbee, IKEA, Alexa,
  Philips Hue) – vorbereitet für Affiliate-Empfehlungen als Einnahmequelle.

