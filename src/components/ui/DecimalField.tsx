import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDecimalInput, parseDecimalInput } from '@/lib/decimalInput'

interface DecimalFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Aktueller Wert; `undefined` zeigt ein leeres Feld. */
  value: number | undefined
  /** Wird mit der gelesenen Zahl aufgerufen, `undefined` bei leer/unlesbar. */
  onChange: (value: number | undefined) => void
}

/**
 * Zahlenfeld, in das sich Kommazahlen tippen lassen.
 *
 * `<input type="number">` taugt dafür nicht: Es verwirft jede Eingabe, die es
 * nicht selbst parsen kann, ein getipptes Komma kommt also gar nicht erst an.
 * Deshalb ein Textfeld mit `inputMode="decimal"` – die Zifferntastatur
 * erscheint auf dem Handy weiterhin.
 *
 * Das Feld führt dazu einen eigenen Textpuffer. Ohne ihn fiele ein halb
 * getipptes „1," sofort auf „1" zusammen, weil der Elternteil nur die Zahl
 * kennt und sie zurückschreibt. Von außen gesetzte Werte werden übernommen,
 * die laufende Eingabe bleibt unangetastet.
 */
export function DecimalField({ value, onChange, ...rest }: DecimalFieldProps) {
  const { i18n } = useTranslation()
  const [text, setText] = useState(() => formatDecimalInput(value, i18n.language))
  const [lastValue, setLastValue] = useState(value)

  // Zustand beim Wechsel der Prop anpassen (statt im Effekt): Ein von außen
  // gesetzter Wert wird übernommen, die laufende Eingabe bleibt stehen.
  if (value !== lastValue) {
    setLastValue(value)
    if (parseDecimalInput(text, i18n.language) !== value) {
      setText(formatDecimalInput(value, i18n.language))
    }
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parseDecimalInput(e.target.value, i18n.language))
      }}
    />
  )
}
