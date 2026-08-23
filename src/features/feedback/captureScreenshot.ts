import { toJpeg } from 'html-to-image'

/**
 * Zielbreite des Screenshots (CSS-Pixel). Ein Entwickler muss erkennen können,
 * welcher Bildschirm gemeint ist – keine Pixel zählen. Kleiner hält die
 * Firestore-Dokumentgröße (Limit 1 MiB) unabhängig vom Gerät sicher im Rahmen.
 */
const TARGET_WIDTH = 480

/**
 * Nimmt einen Screenshot des aktuell sichtbaren Bildschirms auf (ohne ein
 * gerade offenes Modal – siehe `data-modal-overlay` in `components/ui/Modal`)
 * und liefert ihn als komprimiertes JPEG-Data-URL, das sich gefahrlos in ein
 * Feedback-Dokument einbetten lässt.
 *
 * `html-to-image` statt `html2canvas`: Es rendert über ein SVG-`foreignObject`
 * und überlässt die eigentliche Darstellung dem Browser selbst, statt CSS neu
 * zu interpretieren. `html2canvas` bricht dagegen an jedem `color-mix()` ab
 * (fest in `.glass`/`.app-backdrop` verbaut) mit „unsupported color function".
 *
 * Liefert `null` bei jedem Fehler (z. B. eingebettete Bilder fremder Herkunft
 * ohne CORS-Freigabe) – ein Screenshot ist ein Zusatz, kein Grund, das
 * Absenden von Feedback zu blockieren.
 */
export async function captureAppScreenshot(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const width = document.documentElement.clientWidth
    const dataUrl = await toJpeg(document.body, {
      quality: 0.7,
      backgroundColor: undefined,
      pixelRatio: Math.min(1, TARGET_WIDTH / width),
      filter: (el) => !(el instanceof Element && el.hasAttribute('data-modal-overlay')),
    })
    return dataUrl
  } catch (e) {
    console.warn('[feedback] Screenshot fehlgeschlagen:', e)
    return null
  }
}
