# Zähler-Scan mit Google Gemini – Einrichtung

Ziel: Der Kamera-Scan im Ablese-Screen liest den Zählerstand über **Google
Gemini** (statt der schwächeren On-Device-OCR). Der API-Key bleibt dabei
**geheim** in einer Firebase-Funktion – er steht nie in der öffentlichen Web-App.

**Kosten:** Bei ein paar Ablesungen im Monat bleibst du dauerhaft **gratis**
(Gemini-Freikontingent + Firebase-Freimengen). Für Cloud Functions ist aber der
**Blaze-Tarif** (Pay-as-you-go, Karte hinterlegen) nötig – bei deiner Menge
fallen trotzdem **0 €** an. Setz dir zur Sicherheit ein Budget-Limit (Schritt B).

> Datenschutz-Hinweis: Beim Scannen wird das **Foto an Google (Gemini)**
> geschickt und dort ausgewertet (nicht dauerhaft gespeichert). Ohne
> eingerichtete Funktion oder bei Fehlern nutzt die App automatisch weiter die
> lokale On-Device-Erkennung.

---

## A) Gemini-API-Key holen (kostenlos, ~1 Minute)

1. Öffne **https://aistudio.google.com** und melde dich mit deinem Google-Konto an.
2. Oben rechts auf **„Get API key"** (bzw. „API-Schlüssel abrufen").
3. **„Create API key"** → als Projekt am besten das bestehende **`e-app-info`**
   auswählen (oder ein neues anlegen).
4. Der Schlüssel wird erzeugt (beginnt mit `AIza…`). **Kopieren** und geheim
   halten – nicht ins Repo, nicht in Chats.

---

## B) Firebase auf „Blaze" umstellen (nötig für Functions)

1. **Firebase Console** → Projekt **`e-app-info`** → links unten **Zahnrad/Upgrade**
   bzw. **„Tarif ändern"**.
2. **Blaze (Pay-as-you-go)** wählen und ein Zahlungsmittel hinterlegen.
3. **Budget-Alarm setzen** (empfohlen): in der Google Cloud Console unter
   *Abrechnung → Budgets & Benachrichtigungen* z. B. **1 €** als Warnschwelle.
   → So wirst du gewarnt, lange bevor echte Kosten entstehen.

Freimengen zur Orientierung: **2 Mio. Funktionsaufrufe/Monat** gratis, das
Gemini-Freikontingent ist separat. Realistisch: 0 €.

---

## C) Funktion deployen (mit Key als Secret)

Einmalig die Firebase CLI vorbereiten (falls noch nicht vorhanden):

```bash
npm install -g firebase-tools
firebase login
```

Dann im Projektordner:

```bash
# 1) Abhängigkeiten der Funktion installieren
cd functions && npm install && cd ..

# 2) Den Gemini-Key als Secret hinterlegen (wird verschlüsselt gespeichert)
firebase functions:secrets:set GEMINI_API_KEY
#    → Beim Prompt den kopierten AIza…-Key einfügen und Enter drücken.

# 3) Nur die Funktion deployen
firebase deploy --only functions
```

Nach erfolgreichem Deploy erscheint die Funktion **`scanMeter`** (Region
`europe-west1`). Die App nutzt sie ab sofort automatisch.

> **Modell ändern (optional):** Standard ist `gemini-2.5-flash`. Falls nötig,
> kann man beim Deploy ein anderes Modell setzen, z. B.:
> `GEMINI_MODEL=gemini-2.0-flash firebase deploy --only functions`

---

## D) Testen

1. App öffnen (angemeldet) → **Monitoring → Zählerstand eintragen → „Scannen"**.
2. Zähler fotografieren (nur die Ziffernzeile in den Rahmen, nah ran, gutes Licht).
3. Es sollte jetzt der korrekte Wert im Prüf-Feld stehen. Kurz prüfen → **Übernehmen**.

Falls etwas nicht klappt:

- **Kommt weiter Unsinn / „Keine Ziffern"?** Meist ist die Funktion noch nicht
  deployt oder der Key nicht gesetzt → die App fällt dann auf On-Device-OCR
  zurück. Schritte C erneut prüfen.
- **Fehler „Kontingent erschöpft"** → Gemini-Freikontingent für heute/Minute
  ausgereizt; kurz warten.
- Logs ansehen: `firebase functions:log --only scanMeter`

---

## Wie es technisch zusammenhängt

- **App** (`src/features/monitoring/MeterScanner.tsx`): macht das Foto, schickt es
  über `scanRemote.ts` an die Funktion; bei Fehler → On-Device-OCR (`ocr.ts`).
- **Funktion** (`functions/index.js`): verlangt einen angemeldeten Nutzer, ruft
  Gemini mit dem geheimen Key auf, gibt nur die erkannten Ziffern zurück.
- **Key**: liegt ausschließlich als Firebase-Secret `GEMINI_API_KEY` – nie im
  Client, nie im Repo.
