# Nutzer-Feedback – Konzept

> Stand: 2026-08-15 · Konzept für einen Feedback-Kanal für die ersten echten
> Nutzer. **Noch nicht umgesetzt** – dies ist die abgestimmte Spezifikation,
> nicht der Ist-Zustand. Gedacht als Grundlage für die Umsetzung in einer
> späteren Session (auch für eine neue KI). Stand der Entscheidungen: §9.
>
> **Ziel:** Konstruktive Kritik von den ersten Nutzern einsammeln und die App
> daraus verbessern. Nicht: Zufriedenheit messen.

---

## 0. Ausgangslage

**Es gibt noch nichts.** Eine Suche über das gesamte Repo (`feedback`, `bug`,
`kritik`, `nps`, `umfrage`) findet ausschließlich **Lern-Feedback**:

- `src/features/education/Quiz.tsx` – Sofort-Rückmeldung richtig/falsch
- `docs/ux-roadmap.md` – „Quiz mit Sofort-Feedback"
- `docs/renovation-redesign.md` – „Live-Feedback-Karte"

Kein Store, keine Firestore-Collection, kein Button, kein Doc. Der Kanal wird
komplett neu gebaut.

**Relevanter Ist-Zustand für die Umsetzung:**

| Baustein | Zustand |
|---|---|
| `src/components/Header.tsx:37` | `ml-auto flex items-center gap-2` enthält nur `<ProfileMenu />` – Platz ist frei, auch mobil |
| `src/components/ui/Modal.tsx` | Zentriertes Modal mit Overlay/Escape vorhanden |
| `src/store/progressStore.ts` | Muster für persistierten Zustand (`zustand` + `persist`, localStorage) |
| `src/features/analytics/analytics.ts:15` | `track()` vorhanden, respektiert `analyticsEnabled` |
| `src/app/version.ts` | `APP_VERSION` (aktuell `v0.5.0`) |
| `functions/index.js` | Cloud Functions v2, Region `europe-west1`, Secrets-Muster etabliert |
| `src/components/LoginGate.tsx` | **Die App ist ohne Login nutzbar** (Gäste + Demo-Modus) |
| `firestore.rules` | Drei Bereiche (`users`, `profiles`, `invites`) – `feedback` kommt neu dazu |

---

## 1. Leitprinzipien

> **Die Beteiligungsrate hängt an der Reibung, nicht an der Sichtbarkeit des
> Buttons.** Ein perfekt platzierter Button vor einem Formular mit fünf Feldern
> sammelt weniger als ein unauffälliger Button vor einem Formular mit einem Feld.

1. **Ein Klick muss schon reichen.** Die Stimmungsauswahl allein ist ein
   verwertbares Signal – auch wenn danach abgebrochen wird.
2. **Der Kontext kommt vom System, nicht vom Nutzer.** Seite, Version, Gerät
   sammeln wir automatisch. Niemand tippt „ich war auf der Messungsseite".
3. **Nie den Belohnungsmoment kappen.** Proaktive Nachfragen kommen *nach* einem
   Erfolg – und blockieren beim ersten Mal nichts.
4. **Lieber selten fragen als einmal nerven.** Die Frequenzregeln (§5) sind
   wichtiger als der Prompt selbst.
5. **Die Fragestellung bestimmt die Antwortqualität.** „Wie gefällt dir die
   App?" erzeugt Höflichkeit. „Was hat gefehlt oder gestört?" erzeugt Kritik.

---

## 2. Einstiegspunkte

### 2.1 Header-Button (primär)

Links neben dem Account-Avatar in `Header.tsx`, sichtbar auf **Desktop und
Mobile**. Der Platz ist frei; die BottomNav ist mit fünf Tabs dagegen voll und
kommt nicht in Frage.

**Gestaltung – der Button darf nicht mit dem Konto konkurrieren:**

- Ruhiger Ghost-Icon-Button (`MessageSquarePlus` oder `Megaphone` aus
  `lucide-react`), **keine Akzentfarbe, kein gefüllter Hintergrund**. Der Avatar
  ist rund, bildhaft und farbig – der Feedback-Button bleibt daneben still.
- Desktop: Icon + Label „Feedback". Mobile: nur Icon + `aria-label`.
- Höhe passend zum Avatar (`h-9 w-9`), gleiche `focus-ring`-Behandlung.

### 2.2 Zweitwege (kosten fast nichts)

- Eintrag im `ProfileMenu`-Popover, oberhalb des Einstellungs-Links.
- Eintrag auf `/einstellungen`.

Manche Nutzer suchen so etwas reflexhaft in den Einstellungen. Das abzufangen
sind wenige Zeilen und erhöht die Trefferquote spürbar.

### 2.3 Verworfen

- **Floating Action Button unten rechts.** Kollidiert mobil mit der BottomNav
  und verdeckt Inhalt.
- **Nur im Menü versteckt.** Zu geringe Auffindbarkeit für die entscheidende
  Frühphase.

---

## 3. Das Formular

Ein Modal (`ui/Modal.tsx`) mit genau drei Elementen:

```
┌─────────────────────────────────────────┐
│  Was hat gefehlt oder gestört?      [×] │
│                                         │
│      ☹️        😐        🙂             │   ← 1 Klick, Pflicht
│                                         │
│  [ Fehler ] [ Idee ] [ Sonstiges ]      │   ← 1 Klick, optional
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ (Autofokus, optional)             │  │   ← Freitext
│  └───────────────────────────────────┘  │
│                                         │
│  ℹ️ Seite, App-Version und Gerät werden │
│     automatisch mitgesendet.            │
│                                         │
│              [    Absenden    ]         │
└─────────────────────────────────────────┘
```

**Bewusst nicht enthalten:** Pflicht-E-Mail, Sterne-Bewertung, NPS-Skala,
Screenshot-Upload, mehrseitige Formulare.

### Warum kein NPS

Bei unter ~100 Nutzern ist die Kennzahl statistisch wertlos, kostet aber einen
kompletten Schritt im Ablauf. In der Frühphase zählt ausschließlich Text.

### Nach dem Absenden

- Bestätigung: „Danke – wir lesen jedes Feedback." Kurz, dann Modal schließen.
- **Checkbox „Für Rückfragen erreichbar"** (nutzt die vorhandene Konto-Mail,
  kein Tippen nötig). Aus 20 Textfeedbacks werden so ein paar echte Gespräche –
  in der Frühphase mehr wert als jede Kennzahl.

---

## 4. Automatisch mitgesendeter Kontext

Kostet den Nutzer nichts und entscheidet, ob ein Feedback auswertbar ist. Ohne
diese Felder bekommt man „geht nicht" und weiß nichts.

| Feld | Quelle |
|---|---|
| `route` | `useLocation().pathname` |
| `appVersion` | `APP_VERSION` aus `src/app/version.ts` |
| `language` | `i18n.language` |
| `theme` | `useSettingsStore` |
| `viewport` | `window.innerWidth × innerHeight` |
| `userAgent` | `navigator.userAgent` |
| `uid` | `useAuthStore` – nur wenn angemeldet |
| `demoMode` | `useSettingsStore` |
| `source` | `header` \| `menu` \| `settings` \| `prompt` |
| `createdAt` | Server-Zeitstempel |

**Transparenz:** Der Hinweiszeile im Modal (§3) genügt – keine separate
Einwilligung nötig, da der Nutzer die Übermittlung aktiv auslöst.

---

## 5. Der proaktive Prompt

### 5.1 Timing

Der beste Moment im ganzen Produkt ist die **Ergebnis-Phase eines Versuchs**
(`MeasurementRunner.tsx:193`, `phase === 'result'`): Die Stimmung ist am
höchsten, der Kontext frisch.

**Genau deshalb dort kein Modal.** Ein Overlay kappt exakt den Belohnungsmoment,
den die App gerade erzeugt hat.

| Auslöser | Form |
|---|---|
| **1. abgeschlossener Versuch** | Dezente **Inline-Karte** unter dem Ergebnis: „Wie war das für dich?" + drei Smileys. Ein Klick klappt das Freitextfeld auf. Blockiert nichts. |
| **3. Versuch oder ab ~7 Tagen Nutzung** | **Echtes Modal** mit der größeren Frage: „Was würdest du als Erstes ändern?" Hier ist ein Overlay gerechtfertigt, weil echtes Nachdenken gewünscht ist. |

### 5.2 Frequenzregeln

An diesen Regeln scheitern solche Features fast immer – deshalb sind sie Teil
der Spezifikation, nicht Implementierungsdetail:

| Regel | Wert |
|---|---|
| Prompts pro Sitzung | max. 1 |
| Nach „Später" / Wegklicken | 30 Tage Ruhe |
| Nach 2× Wegklicken | nie wieder automatisch |
| Nach dem Absenden | 60–90 Tage Ruhe |
| Gesperrte Kontexte | Onboarding, laufende Messung, laufendes Quiz, Login |

### 5.3 Wo die Regeln leben

**Zentral in einem neuen `src/store/feedbackStore.ts`** (zustand + `persist`,
localStorage-Key `eapp-feedback`, analog `progressStore.ts`).

Eine einzige Funktion `shouldPrompt(trigger)` entscheidet – **nicht** verteilte
`if`-Abfragen in den einzelnen Screens. Sonst gibt es in drei Monaten vier
Stellen, die sich gegenseitig ins Gehege kommen.

Zu speichern: `lastPromptedAt`, `lastSubmittedAt`, `dismissCount`,
`promptedThisSession` (nicht persistiert), `submittedTriggers`.

---

## 6. Datenmodell & Speicher

### 6.1 Firestore-Collection `feedback`

Ein Dokument pro Feedback, flache Struktur, Felder aus §3 + §4.

### 6.2 Regeln (`firestore.rules`)

```
match /feedback/{id} {
  // Anlegen darf jeder angemeldete Nutzer – auch anonym (siehe 6.3).
  allow create: if request.auth != null
    && request.resource.data.text.size() <= 2000;
  // Niemand liest oder ändert Feedback aus der App heraus.
  allow read, update, delete: if false;
}
```

`read: if false` ist Absicht: Feedback wird ausschließlich über Console bzw.
Cloud Function gelesen, nie im Client.

### 6.3 Das Gäste-Problem

Die App ist **ohne Login nutzbar** (`LoginGate.tsx` lässt Gäste und Demo-Modus
durch). Gerade Abspringer sind die interessanteste Gruppe – die dürfen nicht
ausgesperrt werden.

**Entschieden: Gäste dürfen Feedback geben.** Umsetzung über Firebase
**Anonymous Auth**. Dann greift `request.auth != null` für alle, und die
Collection bleibt trotzdem geschlossen.

- **Verworfen:** `allow create: if true` – offene Schreibregel ohne Rate-Limit.
- **Verworfen:** Callable Cloud Function mit App Check – mehr Aufwand ohne
  Mehrwert gegenüber Anonymous Auth.

**Einmaliger Konsolenschritt (nicht im Code machbar):** Firebase-Console →
Authentication → Sign-in method → **Anonym** aktivieren. Ohne diesen Schritt
scheitert jeder Gäste-Write mit `permission-denied`.

**Anmeldung erst beim Absenden.** Der anonyme Login wird nicht beim App-Start
ausgelöst, sondern in `submitFeedback.ts` unmittelbar vor dem Schreiben
(`signInAnonymously`, nur falls kein Nutzer angemeldet ist). So entstehen keine
anonymen Konten für Besucher, die nie Feedback geben.

---

## 7. Analytics

Ereignisse über das vorhandene `track()`:

| Event | Parameter |
|---|---|
| `feedback_opened` | `source` |
| `feedback_submitted` | `sentiment`, `category`, `hasText` |
| `feedback_dismissed` | `source`, `dismissCount` |

**Zwei Regeln:**

1. **Der Feedback-Text darf nicht nach Analytics.** Freitext kann
   personenbezogene Angaben enthalten – er gehört ausschließlich nach Firestore.
2. **Das Feedback selbst wird unabhängig von `analyticsEnabled` gesendet.** Es
   ist eine bewusste Nutzerhandlung, keine Messung. Nur die Events oben
   respektieren das Opt-out (macht `track()` bereits von selbst).

---

## 8. Betrieb – Mail-Benachrichtigung

**Entschieden: Mail-Benachrichtigung von Anfang an**, nicht erst „später bei
Bedarf". Ohne sie schaut erfahrungsgemäß niemand in die Firestore-Console, und
der Kanal verrottet still.

### 8.1 Auslöser

`onDocumentCreated('feedback/{id}')` in `functions/index.js`. Region
`europe-west1` ist über `setGlobalOptions` bereits gesetzt, das Gerüst für
Secrets (`defineSecret`) steht durch `scanMeter` schon.

**Eine Mail pro Feedback**, kein Tages-Digest. Bei den ersten Nutzern ist das
Volumen klein und die schnelle Reaktion wertvoll – gerade wenn jemand die
Rückfrage-Checkbox (§3) gesetzt hat. Ab spürbarem Volumen auf einen
Tages-Digest umstellen.

### 8.2 Inhalt der Mail

Betreff so, dass die Einordnung ohne Öffnen klappt:
`[E-App] 🙂 Idee – /messungen`

Body: Freitext zuerst, darunter kompakt der Kontext aus §4 (Route, Version,
Gerät, angemeldet ja/nein, Rückfrage erlaubt ja/nein) und die Dokument-ID.

### 8.3 Versandweg

**Empfehlung: Resend** über die HTTPS-API, API-Key als Firebase-Secret
`RESEND_API_KEY` – exakt das Muster, das `GEMINI_API_KEY` schon verwendet. In
einer Cloud Function ist ein einfacher HTTPS-Aufruf robuster als eine
SMTP-Verbindung (kein Verbindungsaufbau, keine Timeouts im kalten Start). Der
kostenlose Tarif deckt das Volumen um Größenordnungen. Bis eine eigene Domain
verifiziert ist, funktioniert `onboarding@resend.dev` als Absender.

**Alternative ohne neuen Dienst:** `nodemailer` + GMX-SMTP an die bestehende
Adresse. Kostet nichts extra, braucht aber ein separates App-Passwort und ist
in einer serverlosen Umgebung anfälliger.

### 8.4 Zwei Schutzmaßnahmen

- **`retry: false`** am Trigger. Ein fehlgeschlagener Mailversand darf nicht
  endlos wiederholt werden – Fehler ins Log, Feedback liegt ohnehin sicher in
  Firestore.
- **Obergrenze pro Tag** (z. B. 50 Mails). Schützt das Postfach, falls jemand
  das Formular flutet. Darüber hinaus nur noch ins Log.

---

## 9. Entscheidungen

### Getroffen

- [x] **Gäste ohne Login dürfen Feedback geben** → Anonymous Auth (§6.3).
      Erfordert einen einmaligen Schritt in der Firebase-Console.
- [x] **Mail-Benachrichtigung von Anfang an** → `onDocumentCreated`-Trigger,
      eine Mail pro Feedback (§8). Rutscht damit von Phase 3 in Phase 1.

### Noch offen

- [ ] **Erster Prompt** – Inline-Karte im Ergebnis-Screen *(Empfehlung)* oder
      doch ein echtes Modal (§5.1)? Blockiert nur Phase 2, nicht Phase 1.
- [ ] **Versandweg der Mail** – Resend *(Empfehlung)* oder GMX-SMTP (§8.3).
      Beides braucht ein Zugangsdatum, das nur du anlegen kannst.

---

## 10. Umsetzung in Phasen

### Phase 1 – Der Kanal (Kern)
- [ ] `src/store/feedbackStore.ts` – Zustand + `shouldPrompt()`
- [ ] `src/features/feedback/FeedbackModal.tsx` – Formular nach §3
- [ ] `src/features/feedback/submitFeedback.ts` – Kontext (§4), anonymer Login
      bei Bedarf (§6.3), Firestore-Write
- [ ] Header-Button (§2.1) + `ProfileMenu`- und Einstellungs-Eintrag (§2.2)
- [ ] `firestore.rules` um `feedback` erweitern (§6.2)
- [ ] i18n-Strings in `de.json` **und** `en.json`
- [ ] Analytics-Events (§7)
- [ ] Cloud Function `onFeedbackCreated` + Mailversand (§8)

**Voraussetzungen außerhalb des Codes** (nur vom Projekt-Inhaber machbar):
- [ ] Anonymous Auth in der Firebase-Console aktivieren (§6.3)
- [ ] Mail-Zugang anlegen und als Firebase-Secret hinterlegen (§8.3)

### Phase 2 – Proaktiv fragen
- [ ] Inline-Karte in der Ergebnis-Phase von `MeasurementRunner`
- [ ] Frequenzregeln in `shouldPrompt()` (§5.2)
- [ ] Zweiter Auslöser (3. Versuch / ~7 Tage) als Modal

### Phase 3 – Komfort
- [ ] Checkbox „Für Rückfragen erreichbar" (§3)
- [ ] Tages-Digest statt Einzelmails, sobald das Volumen steigt (§8.1)
- [ ] *Optional, bewusst zurückgestellt:* Screenshot-Anhang – `html2canvas`,
      Dateigröße und Datenschutz für vergleichsweise wenig Ertrag
