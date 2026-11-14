import type {
  AuditLogEntry,
  Category,
  Championship,
  ChampionshipEntry,
  DriverProfile,
  Equipment,
  EventEntry,
  EventEquipment,
  EventStaff,
  ExceptionRequest,
  InspectionSelectionRecord,
  Organization,
  Person,
  RaceEvent,
  RaceSession,
  Role,
  SessionResult,
  StandingsRow,
  TireSet,
} from '../types'

export interface MockState {
  /** Subir al cambiar la forma del seed: descarta lo guardado en localStorage. */
  version: number
  organization: Organization
  championship: Championship
  categories: Category[]
  events: RaceEvent[]
  people: Person[]
  driverProfiles: DriverProfile[]
  championshipEntries: ChampionshipEntry[]
  eventEntries: EventEntry[]
  equipment: Equipment[]
  eventEquipment: EventEquipment[]
  tireSets: TireSet[]
  exceptions: ExceptionRequest[]
  sessions: RaceSession[]
  sessionResults: SessionResult[]
  inspections: InspectionSelectionRecord[]
  roles: Role[]
  eventStaff: EventStaff[]
  standings: StandingsRow[]
  auditLog: AuditLogEntry[]
}

export interface StateStorage {
  load(): MockState | null
  save(state: MockState): void
  clear(): void
  /** Avisa cuando otra pestaña cambió el estado (simulación de Realtime). */
  onExternalChange(listener: () => void): () => void
}

export const STORAGE_KEY = 'karting-crs-demo'

/**
 * Persistencia en localStorage para la demo. Toda lectura/escritura va en try/catch: en modo
 * privado o con almacenamiento bloqueado la demo sigue funcionando en memoria.
 */
export function createLocalStorage(expectedVersion: number): StateStorage {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as MockState
        return parsed.version === expectedVersion ? parsed : null
      } catch {
        return null
      }
    },
    save(state) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Sin almacenamiento: se mantiene solo en memoria.
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignorar
      }
    },
    onExternalChange(listener) {
      const handler = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) listener()
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    },
  }
}

export function createMemoryStorage(): StateStorage {
  let saved: MockState | null = null
  return {
    load: () => saved,
    save: (state) => {
      saved = state
    },
    clear: () => {
      saved = null
    },
    onExternalChange: () => () => undefined,
  }
}
