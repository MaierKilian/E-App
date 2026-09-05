import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getRoomIcon } from './roomIcons'
import type { RoomType } from '@/types'

/** Raumtypen, nach Bereichen gruppiert – erleichtert die Auswahl. */
const ROOM_GROUPS: { id: string; types: RoomType[] }[] = [
  { id: 'living', types: ['living_room', 'dining_room', 'bedroom', 'children_room', 'office'] },
  { id: 'functional', types: ['kitchen', 'bathroom', 'toilet', 'hallway', 'utility_room'] },
  { id: 'secondary', types: ['basement', 'staircase', 'attic'] },
]

interface Props {
  /** Ist dieser Raumtyp bereits gewählt? Steuert nur die Optik. */
  isSelected: (type: RoomType) => boolean
  /** Antippen eines Raumtyps. */
  onPick: (type: RoomType) => void
  /**
   * Zusatz unterhalb einer gewählten Kachel – im Fragebogen die einzelnen
   * Räume. Im Check bleibt es weg: Dort soll ein Raum mit einem Tipp entstehen,
   * alles Weitere kann später im Profil nachgetragen werden.
   */
  renderDetails?: (type: RoomType) => ReactNode
  /**
   * Lässt eine **gewählte** Kachel über beide Spalten laufen.
   *
   * Nur dort sinnvoll, wo unter der Kachel etwas steht, das Breite braucht: Im
   * Fragebogen sind das Name, Fläche und Wärmeübergabe je Raum. In einer halben
   * Spalte (innen rund 127 px) muss davon alles untereinander – bei zwei Räumen
   * wuchs die Kachel auf knapp 800 px, während die Nachbarspalte leer blieb.
   * Im Check bleibt es aus: Dort steht unter der Kachel nur eine Hinweiszeile.
   */
  expandSelected?: boolean
}

/**
 * Raumtyp-Auswahl: 13 Typen in drei Gruppen, als Kachelraster.
 *
 * Bewusst ein geteiltes Bauteil und nicht in `Step3Rooms` eingebaut: Räume
 * entstehen an zwei Orten – im Fragebogen und mitten in einem Check, dem die
 * Raumangabe fehlt (siehe `RoomCreateSheet`). Zwei Kopien derselben Liste
 * würden über kurz oder lang auseinanderlaufen, und der Nutzer bekäme je nach
 * Einstieg andere Räume angeboten.
 */
export function RoomTypePicker({ isSelected, onPick, renderDetails, expandSelected }: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      {ROOM_GROUPS.map((group) => (
        <div key={group.id} className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t(`onboarding.step3.groups.${group.id}`)}
          </h3>
          <div className="grid grid-cols-2 items-start gap-2.5">
            {group.types.map((type) => {
              const selected = isSelected(type)
              const RoomIcon = getRoomIcon(type)
              return (
                <div
                  key={type}
                  className={`rounded-2xl px-3 py-2.5 transition-[transform,background-color,box-shadow] active:scale-[0.98] ${
                    selected
                      ? 'border border-primary bg-primary/10 shadow-[0_3px_14px_color-mix(in_srgb,var(--primary)_18%,transparent)]'
                      : 'glass'
                  } ${selected && expandSelected ? 'col-span-2' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => onPick(type)}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-2 text-left text-sm font-medium leading-tight ${
                      selected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    <RoomIcon
                      className={`h-4 w-4 shrink-0 ${selected ? 'text-primary' : 'text-muted'}`}
                    />
                    <span className="truncate">{t(`onboarding.step3.roomTypes.${type}`)}</span>
                  </button>
                  {selected && renderDetails?.(type)}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
