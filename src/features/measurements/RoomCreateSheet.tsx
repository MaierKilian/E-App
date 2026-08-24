import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { RoomTypePicker } from '@/features/onboarding/RoomTypePicker'
import { useOnboardingStore } from '@/store/onboardingStore'
import type { RoomType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  /** Der angelegte Raum, mit dem Schlüssel seiner neuen Instanz. */
  onCreated: (roomKey: string) => void
}

/**
 * Raum mitten in einem Check anlegen.
 *
 * Der Fragebogen ist ein Startpunkt, kein Türsteher: Wer den Schnellstart
 * gewählt hat, hat keine Räume – und stand bisher vor einer Sackgasse, sobald
 * ein Check einen brauchte. Hier entsteht er mit einem Tipp.
 *
 * Bewusst **ohne** Anzahl, Fläche und Wärmeübergabe: Die Fläche schätzt
 * `resolveRoomArea` aus der Wohnfläche, die Wärmeübergabe erfragt der
 * Möbelabstand-Check selbst, wenn er sie braucht. Alles Weitere ist im Profil
 * nachtragbar – ein zweiter Fragebogen mitten in der Messung wäre genau das,
 * was der Schnellstart vermeiden soll.
 *
 * Ein bereits vorhandener Raumtyp bleibt antippbar und ergibt dann eine weitere
 * Instanz („Schlafzimmer 2"). Deshalb steht in der Kachel die bisherige Anzahl.
 */
export function RoomCreateSheet({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation()
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const addRoom = useOnboardingStore((s) => s.addRoom)

  function handlePick(type: RoomType) {
    onCreated(addRoom(type))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('measurements.roomPicker.addTitle')}>
      <p className="mb-4 text-sm text-muted">{t('measurements.roomPicker.addSubtitle')}</p>
      <RoomTypePicker
        isSelected={(type) => rooms.some((r) => r.type === type)}
        onPick={handlePick}
        renderDetails={(type) => {
          const count = rooms.find((r) => r.type === type)?.count ?? 0
          return (
            <p className="mt-1.5 text-[11px] text-muted">
              {t('measurements.roomPicker.addAnother', { n: count })}
            </p>
          )
        }}
      />
    </Modal>
  )
}
