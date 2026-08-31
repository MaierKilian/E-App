import { splitHighlight } from './search'

/**
 * Text mit hervorgehobener Fundstelle.
 *
 * Ohne Suchanfrage (oder ohne Treffer) rendert die Komponente den Text
 * unverändert – sie kann deshalb überall stehen, wo gesucht werden *kann*,
 * ohne die Anzeige zu verändern, wenn gerade nicht gesucht wird.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const parts = splitHighlight(text, query)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        part.hit ? (
          // `mark` statt eines gefärbten span: Die Fundstelle ist auch für
          // Screenreader und bei reiner Schwarz-Weiß-Ausgabe eine Fundstelle.
          <mark
            key={i}
            // Kein `dark:`-Variant: Das Projekt schaltet Themes ueber
            // `data-theme`, Tailwinds `dark:` haengt dagegen an der
            // Systemeinstellung. `--primary` ist je Theme definiert und traegt
            // damit alle fuenf.
            className="rounded-[3px] bg-primary/20 px-0.5 text-inherit"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
