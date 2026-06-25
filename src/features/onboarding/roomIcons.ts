import type { LucideIcon } from 'lucide-react'
import {
  Sofa,
  UtensilsCrossed,
  BedDouble,
  Baby,
  Briefcase,
  Utensils,
  Bath,
  Toilet,
  DoorOpen,
  WashingMachine,
  Warehouse,
  Footprints,
  Triangle,
} from 'lucide-react'
import type { RoomType } from '@/types'

/** Piktogramm je Raumtyp – gemeinsam genutzt von Räume-Auswahl & Wärmeübergabe. */
export const ROOM_ICONS: Record<RoomType, LucideIcon> = {
  living_room: Sofa,
  dining_room: UtensilsCrossed,
  bedroom: BedDouble,
  children_room: Baby,
  office: Briefcase,
  kitchen: Utensils,
  bathroom: Bath,
  toilet: Toilet,
  hallway: DoorOpen,
  utility_room: WashingMachine,
  basement: Warehouse,
  staircase: Footprints,
  attic: Triangle,
}

export function getRoomIcon(type: RoomType): LucideIcon {
  return ROOM_ICONS[type] ?? DoorOpen
}
