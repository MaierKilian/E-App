import { useEffect, useState } from 'react'

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

export function SplashScreen() {
  const [phase, setPhase] = useState<'visible' | 'leaving' | 'done'>('visible')

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = reduce ? 600 : 1100
    const t1 = setTimeout(() => setPhase('leaving'), hold)
    const t2 = setTimeout(() => setPhase('done'), hold + 440)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      aria-hidden="true"
      className={`splash-overlay fixed inset-0 z-[100] grid place-items-center bg-background ${
        phase === 'leaving' ? 'splash-leaving' : ''
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
