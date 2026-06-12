import { useEffect, useState } from 'react'

/**
 * Kurzer Start-Bildschirm: Das E-App-Markenzeichen (drei versetzte, schräge
 * Balken) fliegt dynamisch ein – zwei von unten-links, einer von oben-rechts –,
 * hält kurz und blendet dann weich aus. Erscheint bei jedem App-Start.
 * Themen-angepasst (Hintergrund = Theme-Hintergrund, Balken = Vordergrundfarbe);
 * respektiert `prefers-reduced-motion`.
 *
 * Die Balken sind als Parallelogramme (clip-path) geformt und in denselben
 * Anteilen positioniert wie das echte Logo – dadurch fügen sie sich am Ende
 * der Animation exakt zum Markenzeichen zusammen.
 */
const BARS = [
  // Anteilige Position/Größe je Balken (wie im Original), + Flugrichtung.
  { cls: 'splash-bar-1', left: 19, top: 8, width: 55, height: 40 }, // oben – von oben-rechts
  { cls: 'splash-bar-2', left: 3, top: 41, width: 53, height: 38 }, // mitte-links – von unten-links
  { cls: 'splash-bar-3', left: 41, top: 47, width: 55, height: 41 }, // unten-rechts – von unten-links
]

const BOX = 188

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
      <div className="relative" style={{ width: BOX, height: BOX }}>
        {BARS.map((bar) => (
          <span
            key={bar.cls}
            className={`splash-bar ${bar.cls}`}
            style={{
              left: `${bar.left}%`,
              top: `${bar.top}%`,
              width: `${bar.width}%`,
              height: `${bar.height}%`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
