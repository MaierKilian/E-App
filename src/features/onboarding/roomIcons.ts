import type { LucideIcon } from 'lucide-react'
import {
  Sofa,
  BedDouble,
  Baby,
  Utensils,
  Bath,
  DoorClosed,
  DoorOpen,
  Briefcase,
  Footprints,
  Warehouse,
} from 'lucide-react'
import type { RoomType } from '@/types'

/** Piktogramm je Raumtyp – gemeinsam genutzt von Räume-Auswahl & Wärmeübergabe. */
export const ROOM_ICONS: Record<RoomType, LucideIcon> = {
  living_room: Sofa,
  bedroom: BedDouble,
  children_room: Baby,
  kitchen: Utensils,
  bathroom: Bath,
  toilet: DoorClosed,
  guest_toilet: DoorClosed,
  hallway: DoorOpen,
  office: Briefcase,
  bureau: Briefcase,
  staircase: Footprints,
  basement: Warehouse,
}

export function getRoomIcon(type: RoomType): LucideIcon {
  return ROOM_ICONS[type] ?? DoorOpen
}
