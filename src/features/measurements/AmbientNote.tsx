import { useTranslation } from 'react-i18next'
import { Home, ThermometerSun } from 'lucide-react'
import { ambientNote, type Ambient } from './ambientTemperature'

/**
 * „Steht im Keller, 14 °C (gemessen)" – wo das Gerät steht und was das heißt.
 *
 * Bewusst **ohne Euro-Betrag und ohne Prozentzahl.** Dass der Standort zählt,
 * ist belegbar; wie viel Mehrverbrauch daraus folgt, hängt an Dämmung, Alter
 * und Dichtung des Geräts – Größen, die dieser Check nicht kennt. Eine Zahl
 * dort wäre erfunden.
 *
 * Die Herkunft steht dabei: Eine gemessene Umgebungstemperatur ist etwas
 * anderes als der Richtwert eines Raumtyps, und der Nutzer soll sehen, welche
 * von beiden er vor sich hat.
 */
export function AmbientNote({ ambient }: { ambient: Ambient }) {
  const { t, i18n } = useTranslation()
  const note = ambientNote(ambient.celsius)
  const fmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

  // Ohne Raumangabe gäbe es nichts zu sagen: Der Wert wäre der Wohnraum-
  // Richtwert, und „dein Gerät steht in einem durchschnittlich warmen Raum"
  // ist keine Aussage.
  if (!ambient.room) return null

  const roomName = t(`onboarding.step3.roomTypes.${ambient.room}`)

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {note === 'warm' ? (
            <ThermometerSun className="h-5 w-5" />
          ) : (
            <Home className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t('measurements.common.ambient.title', {
              room: roomName,
              temp: fmt.format(ambient.celsius),
            })}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t(
              ambient.measured
                ? 'measurements.common.ambient.measured'
                : 'measurements.common.ambient.assumed',
            )}
          </p>
          <p className="mt-2 text-sm text-muted">
            {t(`measurements.common.ambient.note.${note}`)}
          </p>
        </div>
      </div>
    </div>
  )
}
