# Feinkonzept: Landing Page E-App

> Status: Konzept (Stand 2026-07-17). Grundlage für die schrittweise Umsetzung.
> Ziel: Erst-Besucher in Sekunden überzeugen – klar machen **was** die App kann,
> **wofür** sie gut ist und **wie es aussieht, wenn schon Daten drin sind**.
> Auslöser: Tester-Rückmeldung, dass der aktuelle Einstieg nicht abholt.

## Diagnose: Was ein Erst-Besucher heute erlebt

Aktueller Flow:

```
/ (Root)  →  redirect  →  /onboarding
                              │
   SplashScreen  →  OnboardingIntro (3 Slides)  →  Step0Mode (Schnell/Voll)  →  Fragebogen …
```

Kernproblem: Es gibt **gar keine Landing Page**. Route `/` leitet sofort in den
Fragebogen um. Der Besucher wird nach ~3 Info-Slides direkt zur Dateneingabe
aufgefordert – **bevor** er verstanden hat, was die App leistet oder was hinten
rauskommt („Ask before you give value").

Konkrete Schwächen:

- **Kein „Show, don't tell".** Die Intro-Slides behaupten Nutzen mit
  Beispiel-Zahlen, zeigen aber nicht die echte App mit echten Verläufen.
- **Der stärkste Asset ist versteckt.** Es existiert bereits ein vollständiger
  **Demo-Modus** (`src/features/demo/demoProfile.ts`): realistische
  Muster-Wohnung mit ~18 Monaten Zählerständen (Strom/Gas/Wasser), vielen
  abgeschlossenen Checks, Tarifen und Trends – aber **nur über den Link `?demo`
  erreichbar**. Genau das gesuchte „wie sieht es mit Daten aus" liegt ungenutzt
  herum.
- **Feature-Breite unsichtbar.** 9 Messungen (Duschkopf, Standby, Beleuchtung,
  Grundlast, Kühl-/Gefrierschrank, Warmwasser-Wartezeit, Raumtemperatur,
  Möbelabstand), Zähler-Monitoring **mit Foto-Scan (Gemini)**, PDF-Berichte,
  Wissensbereich mit Quiz/Zertifikat, mehrere Wohnungen, Teilen.
- **Sofort-Datenabfrage schreckt ab.** Step0Mode erzwingt „3–5 Min vs. 8–10 Min",
  bevor klar ist, wofür.

## Leitidee

**Zeigen statt behaupten.** Der Besucher soll in < 10 Sekunden verstehen *was*,
*wofür* und *wie es mit Daten aussieht* – und mit **einem Klick die befüllte App
erleben** können, nicht nur Screenshots.

## A. „Mit-Daten"-Erlebnis (der Make-or-Break-Moment) — Entscheidung

**Gewählt: Beides kombiniert, mit klarer Hierarchie.**

1. **Vorschau-Kacheln bauen das Versprechen auf** – beim Scrollen sofort
   sichtbar, ohne Klick. Werden **aus dem echten Demo-Datensatz** gerendert
   (nicht als Fake-Grafik), damit sie authentisch wirken: dieselbe Kurve,
   dasselbe Rating, das der Nutzer später selbst bekommt.
2. **Die interaktive Demo löst das Versprechen ein** – ein Tap auf
   „Beispiel-Wohnung öffnen" setzt den Besucher **in eine komplett befüllte App**
   (18 Monate Verläufe, echte Checks, Tarife), **ohne Konto, ohne ein Feld
   auszufüllen**. Nutzt die vorhandene `buildDemoSnapshot()`-Technik.

Warum die Kombination:

- Nur Bilder → wirkt wie jede Marketing-Seite, Skepsis bleibt.
- Nur Demo-Button → viele klicken nicht, ohne vorher zu *sehen*, dass es sich lohnt.
- Kombination → Kacheln erzeugen den Sog, der Button liefert den Beweis.

Zwei Regeln, damit die Demo konvertiert statt zu verlieren:

- **Immer ein sichtbarer Rückweg** aus der Demo (vorhandener `DemoBanner`).
- **Persistenter „Selbst loslegen"-Button innerhalb der Demo** → `/onboarding`,
  damit der begeisterte Besucher nahtlos ins eigene Onboarding springt.

## B. Text-Wireframe (mobile-first, eine Scroll-Seite)

```
┌─────────────────────────────────────┐
│  [Logo E-App]              [Anmelden]│  ← schlanke Topbar
├─────────────────────────────────────┤
│  ①  HERO                             │
│  H1  (Value Prop, 1 Zeile)          │
│  Sub (1 Satz: was + für wen)        │
│  [ Jetzt starten ]  (primär)        │
│  [ Beispiel-Wohnung ansehen ] (2nd) │
│  ▸ animiertes echtes Dashboard-Mock │
│    (Kostenwert + Verbrauchskurve)   │
├─────────────────────────────────────┤
│  ②  "SO SIEHT'S MIT DATEN AUS"      │
│  Überschrift + 1 Satz               │
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │Dash- │ │Ver-  │ │Mess- │  ← aus  │
│  │board │ │lauf  │ │ergebn│  Demo-  │
│  └──────┘ └──────┘ └──────┘  daten  │
│  [ ▶ Live-Beispiel öffnen ]         │
├─────────────────────────────────────┤
│  ③  WAS DU MACHEN KANNST (4 Punkte) │
│  ◉ Messen  ◉ Verbrauch verfolgen    │
│  ◉ €-Sparpotenzial  ◉ PDF-Bericht   │
├─────────────────────────────────────┤
│  ④  VERTRAUEN / FÜR WEN (Streifen)  │
│  🔒 Lokal & privat · Kostenlos ·    │
│  Für jeden Haushalt · HTW-Lernteil  │
├─────────────────────────────────────┤
│  ⑤  ABSCHLUSS-CTA                   │
│  H2 + [ Jetzt starten ]             │
│       [ Beispiel ansehen ]          │
│  „Schon dabei? Anmelden"            │
└─────────────────────────────────────┘
```

**Desktop:** Hero zweispaltig (Text links, großes Dashboard-Mock rechts);
Abschnitt ② als 3-Spalten-Raster; sonst identisch, zentriert bei `max-width`.

## C. Fertige Copy (Deutsch + Englisch)

### ① Hero

| Element | Deutsch | English |
|---|---|---|
| H1 | Finde heraus, wo dein Zuhause Energie und Geld verliert. | See where your home is wasting energy and money. |
| Sub | Einfache Messungen, dein echter Verbrauch, klare Spartipps – selbst gemacht, in wenigen Minuten. | Simple measurements, your real usage, clear savings tips – done yourself, in just minutes. |
| CTA-primär | Jetzt starten | Get started |
| CTA-sekundär | Beispiel-Wohnung ansehen | See an example home |
| Mock-Label | Beispiel · Geschätzte Energiekosten / Jahr | Example · Estimated energy cost / year |

Alternative, schärfere H1 zum A/B-Testen: „In 5 Minuten sehen, was dein
Haushalt an Energie verschwendet." / „See what your household wastes on energy —
in 5 minutes."

### ② „So sieht's mit Daten aus"

| Element | Deutsch | English |
|---|---|---|
| Überschrift | So sieht es aus, wenn deine App lebt | This is what your app looks like once it's live |
| Sub | Wohnung anlegen, Zählerstände eintragen, Messungen machen – die App macht deinen Verbrauch und dein Sparpotenzial sichtbar. | Add your home, log meter readings, run measurements – the app turns your usage and savings potential into something you can see. |
| Kachel 1 | Dein Dashboard · Kosten, Fortschritt und Empfehlungen auf einen Blick | Your dashboard · Costs, progress and tips at a glance |
| Kachel 2 | Verbrauchs-Verlauf · Strom, Gas und Wasser über Monate | Usage over time · Electricity, gas and water across months |
| Kachel 3 | Messung mit Ergebnis · z. B. Duschkopf – ≈ 120 €/Jahr sparbar | Measurement with result · e.g. showerhead – save ≈ €120/year |
| CTA | ▶ Live-Beispiel öffnen | ▶ Open live example |
| Hinweis | Voll befüllte Beispiel-Wohnung – ohne Anmeldung, jederzeit verlassbar. | A fully filled example home – no sign-up, leave anytime. |

### ③ Was du machen kannst

| Icon | Deutsch (Titel · Zeile) | English |
|---|---|---|
| Messen | **Selbst messen** · 9 einfache Checks – Duschkopf, Standby, Beleuchtung u. v. m. | **Measure yourself** · 9 simple checks – showerhead, standby, lighting and more |
| Verlauf | **Verbrauch verfolgen** · Zählerstände eintragen oder per Foto scannen | **Track usage** · Enter meter readings or scan them from a photo |
| Sparen | **Sparpotenzial in Euro** · Aus Profil und Messungen wird dein Sparziel | **Savings in euros** · Your profile and measurements become a savings goal |
| Bericht | **Bericht als PDF** · Alle Ergebnisse gebündelt zum Teilen und Ablegen | **PDF report** · All results bundled to share and keep |

### ④ Vertrauen / Für wen (Chips)

| Deutsch | English |
|---|---|
| 🔒 Läuft lokal auf deinem Gerät | 🔒 Runs locally on your device |
| ✓ Kostenlos & ohne Verpflichtung | ✓ Free & no commitment |
| 🏠 Für jeden Haushalt | 🏠 For every household |
| 🎓 Mit Lerninhalten (HTW Berlin) | 🎓 Includes learning content (HTW Berlin) |

### ⑤ Abschluss-CTA

| Element | Deutsch | English |
|---|---|---|
| H2 | Bereit, deinem Verbrauch auf die Spur zu kommen? | Ready to get on top of your energy use? |
| CTA-primär | Jetzt starten | Get started |
| CTA-sekundär | Erst Beispiel ansehen | See the example first |
| Login-Zeile | Schon dabei? Anmelden | Already have an account? Sign in |

## D. Interaktions- & Conversion-Details

- **Zwei-Klick-Prinzip:** Von der Landing zu „Aha" in max. 2 Taps
  (Landing → Demo öffnen). Kein Formular dazwischen.
- **Demo-Rückkehr & Konversion aus der Demo:** innerhalb der Demo bleiben
  `DemoBanner` (Verlassen) sichtbar **und** ein Button „Selbst loslegen"
  → `/onboarding`.
- **Wiederkehrer-Weiche:** `/` prüft `data.completed` / `introSeen`. Bekannte
  Nutzer landen direkt auf Dashboard/Onboarding, sehen die Landing nicht erneut.
  Landing bleibt explizit über Logo/„Startseite" erreichbar.
- **Erfolg messbar machen:** vorhandene `track()`-Analytics nutzen. Neue Events:
  `landing_view`, `landing_cta_start`, `landing_cta_demo`, `demo_to_onboarding`.
  Grundlage fürs spätere A/B-Testen der H1.

## E. Visuelle Sprache (an bestehendes Design andocken)

- **Glass-Cards, `rounded-3xl`, Primary-Buttons** exakt wie im Rest der App
  (`glass`, `bg-primary`) – die Landing fühlt sich an wie die App, nicht wie eine
  fremde Marketing-Seite.
- **Alle drei Themes** (Hell/Dunkel/HTW-Grün) sauber – dieselben CSS-Variablen
  (`text-foreground`, `bg-surface` …).
- **Bewegung sparsam:** vorhandene Intro-Animationen (`intro-draw`, `intro-rise`)
  für die Verbrauchskurve im Hero wiederverwenden.
- **Echte Zahlen aus der Demo** in den Kacheln (≈ 1.240 € Sparpotenzial,
  Duschkopf ≈ 120 €/Jahr), immer als „Beispiel" gekennzeichnet.

## F. Technische Einordnung

- Neue Route `/` = Landing (statt `Navigate → /onboarding`). Onboarding bleibt
  unter `/onboarding`.
- Wiederkehrer-Weiche wie unter D beschrieben.
- Demo-Button ruft die bestehende `?demo`- / `buildDemoSnapshot()`-Mechanik auf.
- i18n: neue Sektion `landing.*` in `de.json` / `en.json`.
- `OnboardingIntro`-Overlay: Entscheidung vertagt (Landing könnte es überflüssig
  machen).

## G. Offene Punkte für die Umsetzungsphase

1. **H1-Variante** final wählen (Standard vs. „5-Minuten"-Schärfe), ggf. testen.
2. **Hero-Mock:** echtes Dashboard-Rendering mit Demo-Daten (authentischer)
   vs. leichtes handgebautes Mock (schneller). Empfehlung: leichtes Mock im Hero,
   echte Demo-Daten in den ②-Kacheln.
3. **Intro-Overlay:** später entscheiden.

## H. Grober Umsetzungs-Fahrplan (schrittweise)

1. **Gerüst & Routing:** `LandingPage`-Komponente + Route `/`, Wiederkehrer-Weiche.
2. **i18n:** `landing.*` in `de.json` / `en.json` mit obiger Copy.
3. **Hero (①):** Layout, CTAs, leichtes Dashboard-Mock mit Kurven-Animation.
4. **„Mit Daten" (②):** Vorschau-Kacheln aus Demo-Daten + „Live-Beispiel öffnen".
5. **Capabilities (③) + Vertrauen (④) + Abschluss-CTA (⑤).**
6. **Demo-Feinschliff:** „Selbst loslegen"-Button in der Demo, Rückweg prüfen.
7. **Analytics-Events** ergänzen.
8. **Politur:** alle drei Themes, Responsivität, Reduced-Motion, A11y.
