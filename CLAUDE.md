# E-App – Claude Anweisungen

## Session-Start (bei jeder neuen Session ausführen)

1. `git fetch origin main` ausführen
2. Vergleich zwischen `origin/main` und dem aktuellen Branch anzeigen:
   - Commits die in `main` sind, aber nicht im aktuellen Branch (neues aus main)
   - Commits die im aktuellen Branch sind, aber nicht in `main` (eigene Arbeit)
3. Kurze Zusammenfassung der Änderungen ausgeben (was wurde geändert, welche Dateien betroffen)
4. Falls `main` neue Commits hat: `git merge origin/main` anbieten oder automatisch ausführen

## Branches

- `main` – Hauptbranch, stabiler Code
- Feature-Branches werden via Pull Request gemerged

## Projekt-Kontext

- Deutsche Energie-Analyse-App (React 19 + TypeScript + Tailwind CSS v4)
- Kein Backend, alles client-seitig mit localStorage
- Deployt auf GitHub Pages (`/E-App/` base path)
- Sprachen: Deutsch (primär) + Englisch
