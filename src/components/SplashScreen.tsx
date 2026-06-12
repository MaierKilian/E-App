import { useEffect, useState } from 'react'

/**
 * Kurzer Start-Bildschirm: Das E-App-Markenzeichen (drei versetzte Balken)
 * fliegt dynamisch ein – zwei von unten-links, einer von oben-rechts –,
 * hält kurz und blendet dann weich aus. Erscheint bei jedem App-Start.
 * Themen-angepasst (Hintergrund = Theme-Hintergrund, Balken = Vordergrundfarbe);
 * respektiert `prefers-reduced-motion`.
 */
const BARS = [
  { cls: 'splash-bar-1', left: 39, top: 22 }, // oben – von oben-rechts
  { cls: 'splash-bar-2', left: 14, top: 59 }, // mitte-links – von unten-links
  { cls: 'splash-bar-3', left: 58, top: 95 }, // unten-rechts – von unten-links
]

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
      <div className="relative" style={{ width: 152, height: 140 }}>
        {BARS.map((bar) => (
          <span
            key={bar.cls}
            className={`splash-bar ${bar.cls}`}
            style={{ left: bar.left, top: bar.top, width: 78, height: 30 }}
          />
        ))}
      </div>
    </div>
  )
}
