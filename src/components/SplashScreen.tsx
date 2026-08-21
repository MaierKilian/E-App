import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'

/**
 * Kurzer Start-Bildschirm: Das echte E-App-Markenzeichen (drei versetzte,
 * schräge Balken) fliegt dynamisch ein – zwei von unten-links, einer von
 * oben-rechts –, hält kurz und blendet dann weich aus.
 *
 * Jeder Balken ist eine eigene Maske aus dem Original-Logo (logo-bar0..2.png),
 * jeweils auf voller Logo-Fläche positioniert. Dadurch fügen sich die drei
 * Streifen am Ende der Animation pixelgenau zum echten Logo zusammen.
 * Themen-angepasst (Hintergrund = Theme-Hintergrund, Balken = Vordergrundfarbe);
 * respektiert `prefers-reduced-motion`. Erscheint bei jedem App-Start.
 *
 * **Wann er verschwindet:** frühestens nach der Mindest-Haltezeit UND erst,
 * wenn Firebase den Anmeldestatus geklärt hat. Vorher war das ein reiner
 * Timer – lief die Anmeldung länger (kalter Start, schwaches Mobilfunknetz,
 * abgelaufenes ID-Token mit Netz-Refresh), deckte der Splash eine App auf, die
 * noch nicht bereit war: leerer Konto-Knopf, blasse Wohnungs-Kacheln. Genau
 * dagegen half nur ein Reload, weil der die Anmeldung das Rennen gewinnen ließ.
 *
 * `MAX_WAIT_MS` ist die Notbremse: hängt die Anmeldung, wird trotzdem
 * aufgedeckt – lieber ein sichtbarer Ladezustand als eine App, die gar nicht
 * erst erscheint.
 */
const BASE = import.meta.env.BASE_URL
const BARS = [
  { cls: 'splash-bar-1', src: `${BASE}logo-bar0.png` }, // oben – von oben-rechts
  { cls: 'splash-bar-2', src: `${BASE}logo-bar1.png` }, // mitte-links – von unten-links
  { cls: 'splash-bar-3', src: `${BASE}logo-bar2.png` }, // unten-rechts – von unten-links
]

// Anzeigegröße des Logos (Seitenverhältnis des Originals 512×468).
const BOX_W = 184
const BOX_H = Math.round((BOX_W * 468) / 512)

/** Mindest-Haltezeit, damit die Logo-Animation nicht abgeschnitten wirkt. */
const HOLD_MS = 1100
const HOLD_REDUCED_MS = 600
/** Dauer des Ausblendens (muss zur CSS-Klasse `splash-leaving` passen). */
const LEAVE_MS = 440
/** Notbremse: danach wird auch ohne geklärten Anmeldestatus aufgedeckt. */
const MAX_WAIT_MS = 3500

export function SplashScreen() {
  // Einziges Bereitschaftssignal ist die Anmeldung. Das Laden der Wohnungen
  // bewusst NICHT: das haengt an einem Firestore-Roundtrip, und die Kacheln
  // stehen dank Cache ohnehin sofort.
  const authReady = !useAuthStore((s) => s.initializing)
  const [minHoldDone, setMinHoldDone] = useState(false)
  const [capReached, setCapReached] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = reduce ? HOLD_REDUCED_MS : HOLD_MS
    const t1 = setTimeout(() => setMinHoldDone(true), hold)
    const t2 = setTimeout(() => setCapReached(true), MAX_WAIT_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // Abgeleitet statt als eigener Zustand – so wird im Effekt unten nichts
  // synchron gesetzt, nur der Abschluss des Ausblendens per Timer.
  const leaving = (minHoldDone && authReady) || capReached

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setDone(true), LEAVE_MS)
    return () => clearTimeout(t)
  }, [leaving])

  if (done) return null

  return (
    <div
      aria-hidden="true"
      className={`splash-overlay fixed inset-0 z-[100] grid place-items-center bg-background ${
        leaving ? 'splash-leaving' : ''
      }`}
    >
      <div className="relative" style={{ width: BOX_W, height: BOX_H }}>
        {BARS.map((bar) => (
          <span
            key={bar.cls}
            className={`splash-bar ${bar.cls}`}
            style={{
              WebkitMaskImage: `url(${bar.src})`,
              maskImage: `url(${bar.src})`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
