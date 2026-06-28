/**
 * Liest eine ausgewählte Bilddatei ein, schneidet sie mittig quadratisch zu und
 * rechnet sie auf eine kleine Kantenlänge herunter. Das Ergebnis ist ein
 * komprimiertes JPEG-Data-URL, das gefahrlos im localStorage abgelegt und über
 * Firestore mitsynchronisiert werden kann (Avatare brauchen keine hohe Auflösung).
 */
export async function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl // Fallback: unbearbeitetes Bild verwenden

  // Mittiger, quadratischer Ausschnitt (cover), damit nichts verzerrt wird.
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)

  return canvas.toDataURL('image/jpeg', 0.82)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
