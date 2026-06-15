# E-App – Claude Anweisungen

## Session-Start (bei jeder neuen Session ausführen)

1. `git fetch origin main` ausführen
2. Vergleich zwischen `origin/main` und dem aktuellen Branch anzeigen:
   - Commits die in `main` sind, aber nicht im aktuellen Branch (neues aus main)
   - Commits die im aktuellen Branch sind, aber nicht in `main` (eigene Arbeit)
3. Kurze Zusammenfassung der Änderungen ausgeben (was wurde geändert, welche Dateien betroffen)
4. Falls `main` neue Commits hat: `git merge origin/main` anbieten oder automatisch ausführen

## Branches

- `main` – Hauptbranch, stabiler Code, wird automatisch auf GitHub Pages deployt
- Nach jeder abgeschlossenen Änderung: Feature-Branch in `main` mergen und pushen
  1. `git status` prüfen – Working Tree muss sauber sein (keine uncommitteten Änderungen)
  2. `git checkout main`
  3. `git merge <feature-branch> --no-edit`
  4. `git push origin main`
  5. `git checkout <feature-branch>` (zurück zum Arbeits-Branch)
  6. `git push -u origin <feature-branch>` – Feature-Branch ebenfalls pushen

## Projekt-Kontext

- Deutsche Energie-Analyse-App (React 19 + TypeScript + Tailwind CSS v4)
- Kein Backend, alles client-seitig mit localStorage
- Deployt auf GitHub Pages (`/E-App/` base path)
- Sprachen: Deutsch (primär) + Englisch
