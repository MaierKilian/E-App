# Feedback-Kanal – Einrichtung

Der Feedback-Knopf und das Fenster funktionieren nach dem Deploy sofort. Zwei
Dinge lassen sich aber **nicht im Code** erledigen und müssen einmalig in den
Konsolen gesetzt werden:

| Schritt | Ohne diesen Schritt |
|---|---|
| **A** – Anonyme Anmeldung aktivieren | Gäste ohne Login bekommen beim Absenden eine Fehlermeldung |
| **B/C** – Mail-Zugang als Secret hinterlegen | **Der Functions-Deploy schlägt fehl** (siehe Warnung unten) |
| **D** – Firestore-Regeln deployen | Jeder Schreibversuch endet mit `permission-denied` – der CI-Workflow deployt die Regeln **nicht** |

> ⚠️ **Vor dem Merge nach `main` erledigen.** Der Workflow
> `.github/workflows/firebase-deploy.yml` deployt bei jedem Push auf `main` auch
> die Functions. Die neue Funktion `onFeedbackCreated` verlangt das Secret
> `RESEND_API_KEY`. Existiert es nicht, bricht der Deploy ab – und zwar für
> **alle** Funktionen, also auch für den bestehenden Zähler-Scan `scanMeter`.

Hintergrund und Begründung der Entscheidungen: **`docs/feedback-concept.md`**.

---

## A) Anonyme Anmeldung aktivieren (~1 Minute)

Die App ist ohne Login nutzbar. Damit auch Gäste Feedback geben können – gerade
die Abspringer sind interessant –, meldet die App sie unmittelbar vor dem
Absenden anonym an. Dadurch bleibt die Firestore-Regel bei
`request.auth != null` und die Collection muss nicht offen geschrieben werden.

1. **Firebase Console** → Projekt **`e-app-info`** → **Authentication**.
2. Reiter **Sign-in method** (Anmeldemethode).
3. **„Anonym"** hinzufügen und **aktivieren** → Speichern.

**Prüfen:** In einem privaten Fenster (nicht angemeldet) die App öffnen,
Feedback abschicken. Kommt „Das hat leider nicht geklappt", steht in der
Browser-Konsole `auth/operation-not-allowed` → dieser Schritt fehlt noch.

> Das anonyme Konto ist ausschließlich eine Schreibberechtigung für ein
> einzelnes Dokument. Die App behandelt es bewusst **nicht** als angemeldeten
> Nutzer (`src/store/authStore.ts` filtert es heraus) – gesperrte Bereiche
> bleiben gesperrt, es wird kein Wohnprofil in der Cloud angelegt.

---

## B) Resend-Zugang holen (kostenlos, ~3 Minuten)

Gewählt wurde Resend, weil der Versand über einen einfachen HTTPS-Aufruf läuft.
In einer Cloud Function ist das robuster als eine SMTP-Verbindung, die bei
Kaltstarts gern in Timeouts läuft. Der kostenlose Tarif (100 Mails/Tag) deckt
das Volumen um Größenordnungen.

1. **https://resend.com** → Konto anlegen (Google-Login genügt).
2. **API Keys** → **Create API Key** → Rechte **„Sending access"** reichen.
3. Schlüssel kopieren (beginnt mit `re_…`). **Geheim halten** – nicht ins Repo,
   nicht in Chats.

**Absender und Empfänger hängen zusammen.** Ohne eigene Domain funktioniert
`onboarding@resend.dev` als Absender sofort – dann lässt Resend aber
ausschließlich Mails **an die Adresse des Resend-Kontos** zu und lehnt jede
andere mit 403 ab.

Die Funktion schickt deshalb an **`eapp.admin@gmail.com`** (die Adresse des
Resend-Kontos), nicht an die private GMX-Adresse. Wer die Mails woanders haben
will, hat zwei Wege:

- Weiterleitung im Gmail-Konto einrichten – kostet nichts und geht sofort.
- Eigene Domain bei Resend verifizieren, dann `FEEDBACK_MAIL_FROM` und
  `FEEDBACK_MAIL_TO` frei setzen.

---

## C) Schlüssel als Firebase-Secret hinterlegen

Genau wie beim Gemini-Key: Das Secret liegt im Google Secret Manager, nie im
Repo und nie im Client.

```bash
firebase functions:secrets:set RESEND_API_KEY --project e-app-info
# Schlüssel einfügen, Enter. Danach zur Kontrolle:
firebase functions:secrets:access RESEND_API_KEY --project e-app-info
```

Empfänger und Absender lassen sich über Umgebungsvariablen anpassen (Vorgabe:
`kili.maier@gmx.de` bzw. `E-App Feedback <onboarding@resend.dev>`):

```
FEEDBACK_MAIL_TO=…
FEEDBACK_MAIL_FROM=…
```

---

## D) Deployen

**Hosting und Functions** übernimmt der Workflow beim Push auf `main` von
selbst.

**Die Firestore-Regeln nicht.** Der Workflow deployt ausdrücklich nur
`--only hosting,functions` – Regeländerungen aus dem Repo landen also **nie**
automatisch bei Firebase. Ohne diesen Schritt wird jeder Schreibversuch mit
`permission-denied` abgelehnt, obwohl im Repo alles richtig steht:

```bash
npx firebase-tools deploy --only firestore:rules --project e-app-info
```

Manuell auch die Funktion, falls nötig:

```bash
npx firebase-tools deploy --only functions:onFeedbackCreated --project e-app-info
```

---

## E) Einmalig: IAM-Rollen für ereignisgesteuerte Funktionen

**Beim ersten Deploy schlägt der Workflow ohne diesen Schritt fehl:**

```
Error: We failed to modify the IAM policy for the project.
```

`onFeedbackCreated` ist die erste **ereignisgesteuerte** Funktion im Projekt.
`scanMeter` ist ein direkter HTTPS-Aufruf; ein Firestore-Trigger läuft dagegen
über **Eventarc** und **Pub/Sub**, und deren Dienstkonten brauchen dafür eigene
Rollen.

Der CI-Service-Account hat die Rolle **Editor**. Editor darf keine
IAM-Richtlinien ändern – das kann nur ein **Owner**. Deshalb muss ein Mensch die
drei Bindungen einmalig setzen; danach laufen alle weiteren Deploys wieder
allein durch.

**Am einfachsten über die Cloud Shell** (Browser, nichts zu installieren):
https://console.cloud.google.com → Terminal-Symbol oben rechts → Projekt
`e-app-info` wählen → die drei Befehle nacheinander ausführen:

```bash
gcloud projects add-iam-policy-binding e-app-info \
  --member=serviceAccount:service-379772614513@gcp-sa-pubsub.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator

gcloud projects add-iam-policy-binding e-app-info \
  --member=serviceAccount:379772614513-compute@developer.gserviceaccount.com \
  --role=roles/run.invoker

gcloud projects add-iam-policy-binding e-app-info \
  --member=serviceAccount:379772614513-compute@developer.gserviceaccount.com \
  --role=roles/eventarc.eventReceiver
```

Danach den Workflow neu anstoßen: **GitHub → Actions → „Deploy to Firebase" →
Run workflow**. Ein neuer Commit ist dafür nicht nötig.

> Gilt für jede künftige ereignisgesteuerte Funktion mit: Ist das einmal
> gesetzt, greift es projektweit.

---

## Was ankommt

Pro Feedback eine Mail. Betreff zeigt Stimmung, Einordnung und Seite:

```
[E-App] 🙂 positiv · Idee · /measurements
```

Im Text steht zuerst das, was der Nutzer geschrieben hat, darunter der
automatisch erfasste Kontext (Seite, App-Version, Sprache, Design, Gerät,
angemeldet ja/nein, Auslöser, User-Agent, Dokument-ID).

**Schutzmaßnahmen:**

- Höchstens **50 Mails pro Tag** (`MAX_MAILS_PER_DAY` in `functions/index.js`).
  Darüber wird nur noch protokolliert – das Feedback selbst geht nie verloren,
  es liegt vollständig in Firestore.
- Der Trigger läuft mit **`retry: false`**. Ein fehlgeschlagener Versand wird
  nicht endlos wiederholt.
- Fehlt das Secret, schreibt die Funktion eine Warnung ins Log und beendet sich
  still – das Feedback ist trotzdem gespeichert.

**Nachlesen ohne Mail:** Firebase Console → Firestore → Collection `feedback`.
Kein Client kann diese Dokumente lesen, das ist in den Regeln so festgelegt.
