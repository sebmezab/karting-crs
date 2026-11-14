/**
 * Contratos de la capa de datos (ADR 0004). Los componentes SOLO conocen estas interfaces
 * (vía `useRepositories()`); la implementación es `mock/` en Fase 0 y `supabase/` en Fase 1.
 * Todo es async para que el reemplazo por Supabase no toque componentes.
 */
import type { InspectionStatus } from '@/domain/inspection'
import type { TireMarkingResult, TireSerials } from '@/domain/tires'
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
  ExceptionType,
  InspectionSelectionRecord,
  Organization,
  Person,
  RaceEvent,
  RaceSession,
  Role,
  SessionResult,
  StandingsRow,
  TireSet,
} from './types'

export interface ChampionshipOverview {
  organization: Organization
  championship: Championship
  categories: Category[]
  events: RaceEvent[]
}

/** Inscripción enriquecida para listas del staff. */
export interface EntrySummary {
  championshipEntry: ChampionshipEntry
  person: Pick<Person, 'id' | 'fullName' | 'birthYear'>
  category: Category
  eventEntry: EventEntry | null
}

export interface ChampionshipRepository {
  getCurrent(): Promise<ChampionshipOverview>
  /** Override manual del tipo de fecha de neumáticos (admin). */
  setTireChangeOverride(
    eventId: string,
    value: boolean | null,
    actorPersonId: string,
  ): Promise<void>
}

export interface PeopleRepository {
  getPerson(personId: string): Promise<Person | null>
  getDriverProfile(personId: string): Promise<DriverProfile | null>
}

export interface RegisterForEventInput {
  eventId: string
  championshipEntryId: string
  equipmentIds: string[]
  actorPersonId: string
}

export interface EntryRepository {
  /** Inscripciones de temporada con su inscripción a la fecha indicada (si existe). */
  listForEvent(eventId: string): Promise<EntrySummary[]>
  listChampionshipEntriesForPerson(personId: string): Promise<ChampionshipEntry[]>
  listEventEntriesForPerson(personId: string): Promise<EventEntry[]>
  registerForEvent(input: RegisterForEventInput): Promise<EventEntry>
}

export interface EquipmentRepository {
  listByOwner(personId: string): Promise<Equipment[]>
  /** equipmentId → etiqueta ("kart #327") de otros pilotos que lo inscribieron en la fecha. */
  usedByOtherDrivers(eventId: string, championshipEntryId: string): Promise<Map<string, string>>
  listEventEquipment(eventEntryId: string): Promise<EventEquipment[]>
}

export interface SaveTireMarkingInput {
  eventId: string
  eventEntryId: string
  scanned: TireSerials
  brandModelMismatch: boolean
  usedTiresConfirmed: boolean
  actorPersonId: string
}

export interface TireRepository {
  /** Valida sin guardar (en Fase 1: función Postgres `validate_tire_marking`). */
  validate(
    input: Omit<SaveTireMarkingInput, 'usedTiresConfirmed' | 'actorPersonId'>,
  ): Promise<TireMarkingResult>
  /** Re-valida y guarda. Rechaza si queda bloqueado o falta la confirmación de usados. */
  save(input: SaveTireMarkingInput): Promise<TireMarkingResult>
  listSetsForEntry(championshipEntryId: string): Promise<TireSet[]>
  /** Serial de cada neumático (equipmentId → serial) para mostrar juegos. */
  serialsById(ids: string[]): Promise<Map<string, string>>
}

export interface SessionRepository {
  listForEvent(eventId: string): Promise<RaceSession[]>
  listResults(sessionId: string): Promise<SessionResult[]>
  /** Cierra la sesión, guarda el Top N provisional y genera las selecciones `top_n`. */
  closeWithTopN(
    sessionId: string,
    orderedEventEntryIds: string[],
    actorPersonId: string,
  ): Promise<void>
}

export interface InspectionRepository {
  listForEvent(eventId: string): Promise<InspectionSelectionRecord[]>
  addStewardSelection(sessionId: string, eventEntryId: string, actorPersonId: string): Promise<void>
  transition(
    selectionId: string,
    to: InspectionStatus,
    actorPersonId: string,
    notes?: string,
  ): Promise<void>
}

export interface ExceptionRepository {
  listForEvent(eventId: string): Promise<ExceptionRequest[]>
  request(input: {
    eventId: string
    eventEntryId: string
    type: ExceptionType
    description: string
    actorPersonId: string
  }): Promise<ExceptionRequest>
  decide(id: string, approved: boolean, notes: string, actorPersonId: string): Promise<void>
}

export interface StaffRepository {
  listRoles(): Promise<Role[]>
  listForEvent(eventId: string): Promise<EventStaff[]>
}

export interface StandingsRepository {
  list(championshipId: string): Promise<StandingsRow[]>
}

export interface AuditRepository {
  listRecent(limit: number): Promise<AuditLogEntry[]>
}

export interface DataRepositories {
  championships: ChampionshipRepository
  people: PeopleRepository
  entries: EntryRepository
  equipment: EquipmentRepository
  tires: TireRepository
  sessions: SessionRepository
  inspections: InspectionRepository
  exceptions: ExceptionRepository
  staff: StaffRepository
  standings: StandingsRepository
  audit: AuditRepository
  /** Notificación de cambios (Fase 1: Supabase Realtime). Devuelve la función para desuscribir. */
  subscribe(listener: () => void): () => void
  /** Solo demo: vuelve a los datos de ejemplo. */
  resetDemo?(): void
}
