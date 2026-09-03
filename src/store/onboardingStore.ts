import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ApplianceEntry,
  HeatTransferType,
  OnboardingData,
  RenovationEvent,
  RoomEntry,
  RoomType,
  UserGoal,
} from '@/types'
import {
  derivedLegacyFields,
  migrateLegacyRenovations,
} from '@/features/onboarding/renovationProjection'

/**
 * Migriert zusammengeführte Raumtypen aus älteren Profilen:
 * - 'guest_toilet' → 'toilet' (funktional identisch)
 * - 'bureau'       → 'office' (Synonym)
 * Mehrfach vorkommende Typen werden über die Anzahl zusammengeführt.
 */
const ROOM_TYPE_RENAMES: Partial<Record<string, RoomType>> = {
  guest_toilet: 'toilet',
  bureau: 'office',
}

function migrateRooms(rooms: unknown): RoomEntry[] | undefined {
  if (!Array.isArray(rooms)) return undefined
  const merged = new Map<RoomType, RoomEntry>()
  for (const entry of rooms as RoomEntry[]) {
    if (!entry || typeof entry.type !== 'string') continue
    const type = ROOM_TYPE_RENAMES[entry.type] ?? (entry.type as RoomType)
    const existing = merged.get(type)
    if (existing) {
      existing.count += entry.count ?? 1
    } else {
      merged.set(type, { ...entry, type })
    }
  }
  return [...merged.values()]
}

const defaultData: OnboardingData = {
  profileName: '',
  profileImage: '',
  personsCount: 2,
  roomsCount: 3,
  buildingYear: 1990,
  buildingType: 'apartment',
  livingArea: 70,
  rooms: [],
  heatGenerators: [],
  hotWaterType: 'unknown',
  instruments: [],
  locationMode: 'skip',
  postalCode: '',
  completed: false,
  mode: 'detailed',
  goals: [],
  occupancyStatus: null,
  floors: 1,
  windowAge: 'unknown',
  hasPV: 'no',
  hasExtraFireplace: false,
  ventilationType: 'unknown',
  insulationState: 'unknown',
  smartHomeDevices: [],
  renovations: null,
  heatGeneratorYears: {},
  appliances: [],
  appliancesAnswered: false,
  lastRenovationYear: 'unknown',
  renovationItems: [],
}

/**
 * Zurückgezogene Ziele aus einem Bestandsprofil entfernen.
 *
 * `htw_study` stand als Ziel im Fragebogen, solange die HTW dort erwähnt wurde.
 * Der Wert ist aus `UserGoal` verschwunden, in gespeicherten Profilen steht er
 * aber weiter – deshalb wird hier gefiltert und nicht auf den Typ vertraut.
 *
 * Eine leere Liste ist das zulässige Ergebnis: `goals` ist nirgends Pflicht,
 * und ohne Ziel sortiert `buildTips` wie eh und je nach Ersparnis.
 */
const RETIRED_GOALS = ['htw_study']

function withoutRetiredGoals(goals: UserGoal[] | undefined): UserGoal[] {
  if (!Array.isArray(goals)) return []
  return goals.filter((goal) => !RETIRED_GOALS.includes(goal))
}

/**
 * Bringt ein gespeichertes Profil auf den aktuellen Stand.
 *
 * Zwei Wege führen hier vorbei: der `persist`-Merge beim Start und der
 * Cloud-Sync, der einen Profilzustand direkt in den Store schreibt. Der zweite
 * geht am `merge` vorbei – stünde die Migration nur dort, käme ein Profil aus
 * der Cloud ohne sie an, und ein Altprofil hätte plötzlich weder Ereignis-Log
 * noch beantwortete Sanierungsfrage.
 */
export function migrateOnboardingData(stored: Partial<OnboardingData> | undefined): OnboardingData {
  const data = { ...defaultData, ...(stored ?? {}) }
  const migratedRooms = migrateRooms(data.rooms)
  if (migratedRooms) data.rooms = migratedRooms
  // Altprofile kannten nur ein globales Sanierungsjahr plus Häkchenliste.
  // Daraus entsteht ein Ereignis mit dem mittleren Jahr der Spanne, als
  // geschätzt gekennzeichnet – verlustfrei und zur Präzisierung einladend.
  if (data.renovations === undefined || data.renovations === null) {
    const migrated = migrateLegacyRenovations(data.lastRenovationYear, data.renovationItems)
    data.renovations = migrated
    if (migrated !== null) Object.assign(data, derivedLegacyFields(migrated))
  }
  if (!data.heatGeneratorYears) data.heatGeneratorYears = {}
  if (!Array.isArray(data.appliances)) data.appliances = []
  // Ein Altprofil hat die Frage nie gesehen – sie gilt als offen, nicht als
  // mit „keines" beantwortet. Sonst verschwänden beide Checks stillschweigend.
  if (typeof data.appliancesAnswered !== 'boolean') data.appliancesAnswered = false
  data.goals = withoutRetiredGoals(data.goals)
  return data
}

/**
 * Steuert, wie der Onboarding-Bildschirm gerendert wird:
 * - 'linear': klassischer Erst-Flow (Modusauswahl + Schritte nacheinander).
 * - 'edit':   Bearbeitungsmodus mit Profil-Hub (currentStep -2) und gezieltem
 *             Anspringen einzelner Abschnitte.
 */
type FlowMode = 'linear' | 'edit'

interface OnboardingState {
  data: OnboardingData
  currentStep: number
  flowMode: FlowMode
  editReturnTo: string | null
  /**
   * Abschnitte, die der Nutzer schon geöffnet hatte (Registry-ids).
   *
   * Trägt den Zustand „angefangen": Ein durchgeklickter, aber unvollständiger
   * Schritt sah bisher aus wie ein fertiger. Ohne diese Liste ist „noch nicht
   * dran" von „begonnen und liegengelassen" nicht zu unterscheiden.
   */
  visitedSections: string[]
  setStep: (step: number) => void
  markVisited: (id: string) => void
  updateData: (partial: Partial<OnboardingData>) => void
  addRoom: (type: RoomType) => string
  setRoomHeatTransfer: (type: RoomType, transfer: HeatTransferType) => void
  setRenovations: (events: RenovationEvent[] | null) => void
  setAppliances: (appliances: ApplianceEntry[], answered?: boolean) => void
  complete: () => void
  editProfile: () => void
  editSection: (step: number, returnTo?: string) => void
  clearReturnTo: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      data: defaultData,
      currentStep: -1,
      flowMode: 'linear',
      editReturnTo: null,
      visitedSections: [],
      setStep: (step) => set({ currentStep: step }),
      // Beim Rendern eines Abschnitts gesetzt, nicht beim Verlassen: Sonst
      // zählte ein Zurück-Wischen nicht als Besuch.
      markVisited: (id) =>
        set((state) =>
          state.visitedSections.includes(id)
            ? state
            : { visitedSections: [...state.visitedSections, id] },
        ),
      updateData: (partial) =>
        set((state) => ({ data: { ...state.data, ...partial } })),
      // Einen Raum anlegen und den Schlüssel der NEUEN Instanz zurückgeben.
      //
      // Gebraucht mitten in einem Check, dem die Raumangabe fehlt: Dort soll
      // der Nutzer nach dem Antippen sofort in genau diesem Raum messen. Gibt
      // es den Typ schon, entsteht eine weitere Instanz („Schlafzimmer 2") –
      // deshalb der Rückgabewert, sonst müsste der Aufrufer den Index selbst
      // ausrechnen und läge bei gleichzeitigen Änderungen daneben.
      addRoom: (type) => {
        const existing = get().data.rooms.find((r) => r.type === type)
        const index = existing ? Math.max(1, Math.floor(existing.count ?? 1)) : 0
        set((state) => ({
          data: {
            ...state.data,
            rooms: existing
              ? state.data.rooms.map((r) =>
                  r.type === type ? { ...r, count: index + 1 } : r,
                )
              : [...state.data.rooms, { type, count: 1 }],
          },
        }))
        return `${type}#${index}`
      },
      // Sanierungen setzen und die Altfelder mitziehen. `lastRenovationYear`
      // und `renovationItems` bleiben im Typ (Demo-Profil, Firestore-Sync,
      // Übersichtsseite) – sie werden nur nicht mehr direkt bearbeitet.
      setRenovations: (events) =>
        set((state) => ({
          data: {
            ...state.data,
            renovations: events,
            ...derivedLegacyFields(events),
          },
        })),
      // Gerätebestand setzen. Die Frage gilt danach als beantwortet – auch mit
      // leerer Liste, denn „wir haben keines" ist eine Antwort und muss von
      // „noch nicht gefragt" unterscheidbar bleiben.
      setAppliances: (appliances, answered = true) =>
        set((state) => ({
          data: { ...state.data, appliances, appliancesAnswered: answered },
        })),
      // Wärmeübergabe eines Raumtyps setzen. Kommt aus dem Möbelabstand-Check,
      // wenn das Profil sie noch nicht kennt (Schnellstart-Raum): Der Check
      // erhebt die Angabe selbst, statt stillschweigend Heizkörper anzunehmen.
      setRoomHeatTransfer: (type, transfer) =>
        set((state) => ({
          data: {
            ...state.data,
            rooms: state.data.rooms.map((r) =>
              r.type === type ? { ...r, heatTransfer: transfer } : r,
            ),
          },
        })),
      complete: () =>
        set((state) => ({ data: { ...state.data, completed: true }, flowMode: 'linear', editReturnTo: null })),
      // Öffnet den Profil-Hub (Übersicht) im Bearbeitungsmodus, ohne vorhandene
      // Antworten zu verlieren. currentStep -2 = Hub.
      editProfile: () =>
        set((state) => ({ data: { ...state.data, completed: false }, flowMode: 'edit', currentStep: -2 })),
      // Öffnet direkt einen bestimmten Abschnitt im Bearbeitungsmodus. Optionaler
      // returnTo-Pfad: nach "Fertig" wird dorthin navigiert statt zum Hub.
      editSection: (step, returnTo) =>
        set((state) => ({
          data: { ...state.data, completed: false },
          flowMode: 'edit',
          currentStep: step,
          editReturnTo: returnTo ?? null,
        })),
      clearReturnTo: () => set({ editReturnTo: null }),
      reset: () =>
        set({
          data: defaultData,
          currentStep: -1,
          flowMode: 'linear',
          editReturnTo: null,
          visitedSections: [],
        }),
    }),
    {
      name: 'eapp-onboarding',
      // Gespeicherte Daten mit den aktuellen Defaults zusammenführen, damit nach
      // einem Update neu hinzugekommene Felder nie fehlen (sonst Laufzeitfehler).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OnboardingState>
        return {
          ...current,
          ...p,
          data: migrateOnboardingData(p.data),
          visitedSections: p.visitedSections ?? current.visitedSections,
          editReturnTo: null, // Navigationszustand nicht sitzungsübergreifend speichern
        }
      },
    },
  ),
)
