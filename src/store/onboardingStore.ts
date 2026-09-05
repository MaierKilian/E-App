import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ApplianceEntry,
  HeatTransferType,
  OnboardingData,
  RenovationEvent,
  RoomEntry,
  RoomInstanceEntry,
  RoomType,
  UserGoal,
} from '@/types'
import {
  derivedLegacyFields,
  migrateLegacyRenovations,
} from '@/features/onboarding/renovationProjection'
import { newApplianceId } from '@/features/onboarding/appliances'
import { newRoomId } from '@/features/measurements/rooms'

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

/** Rohform eines Raums, wie sie aus localStorage oder der Cloud kommt. */
type StoredRoom = Partial<RoomEntry> & {
  type?: string
  /** Altfelder vor dem Instanz-Umbau – galten für den ganzen Raumtyp. */
  count?: number
  areaSqm?: number
  heatTransfer?: HeatTransferType
}

/**
 * Räume aus einem gespeicherten Profil einlesen.
 *
 * Zwei Aufgaben in einem Durchgang:
 *
 * 1. **Zusammengeführte Raumtypen** ('guest_toilet' → 'toilet', 'bureau' →
 *    'office'). Wie bisher werden mehrfach vorkommende Typen vereinigt.
 * 2. **Instanz-Umbau.** Altprofile tragen `count` plus je eine Fläche und
 *    Wärmeübergabe für den ganzen Typ; daraus werden einzelne Räume.
 *
 * Entscheidend ist dabei die Kennung: Ein Altprofil mit `count: 2` bekommt
 * exakt `bedroom#0` und `bedroom#1` – **genau die Schlüssel, unter denen seine
 * Messergebnisse schon liegen** (`room_temperature@bedroom#1`). Würden hier
 * frische Kennungen vergeben, verlöre jedes bestehende Profil sämtliche
 * Pro-Raum-Messungen, ohne dass es jemandem auffiele: Die Ergebnisse blieben
 * gespeichert, nur fände sie kein Raum mehr.
 *
 * Fläche und Wärmeübergabe erben alle Instanzen des Typs. Das ist genau das,
 * was das Altprofil ausgesagt hat – dass beide Kinderzimmer dieselbe Fläche
 * haben, war dort keine Angabe, sondern die einzig mögliche Darstellung.
 */
function migrateRooms(rooms: unknown): RoomEntry[] | undefined {
  if (!Array.isArray(rooms)) return undefined
  const merged = new Map<RoomType, RoomEntry>()
  const usedIds = new Set<string>()

  for (const entry of rooms as StoredRoom[]) {
    if (!entry || typeof entry.type !== 'string') continue
    const type = ROOM_TYPE_RENAMES[entry.type] ?? (entry.type as RoomType)
    const target = merged.get(type) ?? { type, instances: [] }

    const incoming: RoomInstanceEntry[] = Array.isArray(entry.instances)
      ? entry.instances.filter((i): i is RoomInstanceEntry => Boolean(i))
      : Array.from({ length: Math.max(1, Math.floor(entry.count ?? 1)) }, (_, i) => ({
          // Der Schlüssel des Altprofils, Zeichen für Zeichen.
          id: `${type}#${target.instances.length + i}`,
          areaSqm: entry.areaSqm,
          heatTransfer: entry.heatTransfer,
        }))

    for (const inst of incoming) {
      // Eine fehlende oder doppelte Kennung kann nur aus einem beschädigten
      // Profil oder einer Typ-Zusammenführung stammen. Eine frische Kennung
      // kostet dann die Messergebnisse dieses einen Raums – eine doppelte
      // ließe zwei Räume auf dieselben Ergebnisse zeigen.
      const id = inst.id && !usedIds.has(inst.id) ? inst.id : newRoomId(type)
      usedIds.add(id)
      target.instances.push({ ...inst, id })
    }
    merged.set(type, target)
  }

  // Ein Raumtyp ohne Instanzen ist kein Raum – er entstünde nur aus einem
  // Profil mit `count: 0`, das es über die Oberfläche nie gab.
  return [...merged.values()].filter((r) => r.instances.length > 0)
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
 * Bestandsgeräte bekommen ihre Kennung.
 *
 * `id = kind` ist für Altdaten eindeutig, deterministisch und kollisionsfrei:
 * Bis zur Einführung der Kennung ließ `toggleAppliance` je Art höchstens einen
 * Eintrag zu. Der Schlüssel eines Altgeräts ist damit derselbe wie der
 * Schlüssel seines Altergebnisses – was die spätere Zuordnung der schon
 * gespeicherten Messungen trägt.
 *
 * Doppelte Arten kann es in Altdaten nicht geben; käme trotzdem eine vor
 * (von Hand bearbeiteter Speicher), bekäme die zweite eine eigene Kennung,
 * statt die erste zu verdrängen.
 */
function withApplianceIds(appliances: ApplianceEntry[]): ApplianceEntry[] {
  const seen = new Set<string>()
  return appliances.map((entry) => {
    if (entry.id && !seen.has(entry.id)) {
      seen.add(entry.id)
      return entry
    }
    const id = seen.has(entry.kind) ? newApplianceId(entry.kind) : entry.kind
    seen.add(id)
    return { ...entry, id }
  })
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
  data.appliances = withApplianceIds(data.appliances)
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
  setRoomHeatTransfer: (roomKey: string, transfer: HeatTransferType) => void
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
    (set) => ({
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
        const id = newRoomId(type)
        set((state) => {
          const exists = state.data.rooms.some((r) => r.type === type)
          return {
            data: {
              ...state.data,
              rooms: exists
                ? state.data.rooms.map((r) =>
                    r.type === type ? { ...r, instances: [...r.instances, { id }] } : r,
                  )
                : [...state.data.rooms, { type, instances: [{ id }] }],
            },
          }
        })
        return id
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
      // Wärmeübergabe **eines Raums** setzen. Kommt aus dem Möbelabstand-Check,
      // wenn das Profil sie noch nicht kennt (Schnellstart-Raum): Der Check
      // erhebt die Angabe selbst, statt stillschweigend Heizkörper anzunehmen.
      //
      // Adressiert über den Raumschlüssel, nicht über die Raumart: Vorher
      // schrieb eine Antwort im Kinderzimmer 1 stillschweigend auch das
      // Kinderzimmer 2 um, und der Check dort stellte fortan die falschen
      // Fragen – ohne je gefragt zu haben.
      setRoomHeatTransfer: (roomKey, transfer) =>
        set((state) => ({
          data: {
            ...state.data,
            rooms: state.data.rooms.map((r) => ({
              ...r,
              instances: r.instances.map((inst) =>
                inst.id === roomKey ? { ...inst, heatTransfer: transfer } : inst,
              ),
            })),
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
