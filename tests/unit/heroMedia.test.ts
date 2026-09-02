// Prüfungen an den Hero-Medien der Mess-Intros.
//
// `IntroHeroVideo` bekommt eine Quelle ohne Endung und leitet daraus drei
// Dateien ab: `<src>.mp4`, `<src>.webm` und `<src>-poster.webp`. Fehlt eine
// davon, merkt das niemand beim Bauen – die Animation bleibt einfach weg,
// und je nach Browser steht an ihrer Stelle ein leeres Loch. Genau das ist
// schon einmal passiert. Deshalb prüft das hier ein Test, statt es zu hoffen.
//
// Die Liste der Quellen wird aus dem Quelltext gelesen, damit eine weitere
// Messung mit Hero-Video automatisch mitgeprüft wird.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

/** Alle `src`-Werte, mit denen `IntroHeroVideo` im Quelltext benutzt wird. */
function heroVideoSources(): string[] {
  const found = new Set<string>()
  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    const code = readFileSync(file, 'utf8')
    for (const usage of code.matchAll(/<IntroHeroVideo\b[^>]*?>/gs)) {
      const src = usage[0].match(/\bsrc="([^"]+)"/)
      if (src) found.add(src[1])
    }
  }
  return [...found]
}

describe('Hero-Medien der Mess-Intros', () => {
  const sources = heroVideoSources()

  it('findet mindestens ein Hero-Video im Quelltext', () => {
    expect(sources.length).toBeGreaterThan(0)
  })

  it.each(sources)('liefert für "%s" alle drei Dateien in public/', (src) => {
    // MP4 spielt überall hardwarebeschleunigt, WebM rettet Browser ohne das
    // lizenzpflichtige H.264, das Standbild trägt, wenn beides ausfällt.
    for (const file of [`${src}.mp4`, `${src}.webm`, `${src}-poster.webp`]) {
      const full = path.join(ROOT, 'public', file)
      expect(statSync(full).size, `${file} fehlt oder ist leer`).toBeGreaterThan(0)
    }
  })

  it.each(sources)('legt bei "%s" die Metadaten des MP4 nach vorn', (src) => {
    // Steht `moov` hinter `mdat`, kennt der Browser die Eckdaten des Videos
    // erst, wenn die ganze Datei da ist – auf langsamer Leitung bleibt die
    // Fläche bis dahin leer. `-movflags +faststart` dreht die Reihenfolge um.
    const mp4 = readFileSync(path.join(ROOT, 'public', `${src}.mp4`))
    const boxes: string[] = []
    for (let p = 0; p + 8 <= mp4.length; ) {
      const size = mp4.readUInt32BE(p)
      if (size < 8) break
      boxes.push(mp4.subarray(p + 4, p + 8).toString('latin1'))
      p += size
    }
    expect(boxes.indexOf('moov')).toBeGreaterThan(-1)
    expect(boxes.indexOf('moov')).toBeLessThan(boxes.indexOf('mdat'))
  })
})
