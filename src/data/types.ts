/**
 * Entidades del modelo de datos (SPEC §6) usadas por la demo.
 * Fase 0: tipos escritos a mano. Fase 1: se reemplazan por los tipos generados desde Supabase
 * (ADR 0006). Los nombres siguen la SPEC en camelCase.
 */
import type { InspectionSelection } from '@/domain/inspection'
import type { PermissionKey } from '@/domain/permissions'
import type { ChampionshipRules } from '@/domain/rules'
import type { TireIssue, TireMarkingStatus, TirePosition } from '@/domain/tires'

export interface Organization {
  id: string
  name: string
  slug: string
}

/** Minimización (SPEC 11.1): nunca RUT, fecha de nacimiento completa, dirección ni salud. */
export interface Person {
  id: string
  fullName: string
  email: string
  phone: string | null
  /** Solo el año: basta para categorías y pesos. */
  birthYear: number | null
  guardianPersonId: string | null
}

export interface DriverProfile {
  personId: string
  licenseNumber: string | null
  team: string | null
}

export interface Championship {
  id: string
  organizationId: string
  name: string
  seasonYear: number
  status: 'draft' | 'active' | 'closed'
  rules: ChampionshipRules
}

export interface Category {
  id: string
  championshipId: string
  name: string
  numberMin: number
  numberMax: number
  tireBrand: string
  tireModel: string
  sortOrder: number
}

export type EventStatus = 'planned' | 'open' | 'in_progress' | 'provisional' | 'official'

/** "Fecha" del campeonato. */
export interface RaceEvent {
  id: string
  championshipId: string
  roundNumber: number
  /** aaaa-mm-dd */
  date: string
  venue: string
  countsForPoints: boolean
  countsForTireCycle: boolean
  /** Override manual del tipo de fecha de neumáticos; null = calculado por regla. */
  isTireChangeEvent: boolean | null
  registrationDeadline: string
  status: EventStatus
  note: string | null
}

export interface ChampionshipEntry {
  id: string
  championshipId: string
  categoryId: string
  personId: string
  kartNumber: number
  status: 'active' | 'withdrawn'
}

export interface EventEntry {
  id: string
  eventId: string
  championshipEntryId: string
  status: 'pending' | 'confirmed' | 'rejected'
  lateFee: boolean
  lateFeeClp: number
  paid: boolean
  registeredAt: string
}

export type EquipmentType = 'chassis' | 'engine' | 'tire'

export interface Equipment {
  id: string
  organizationId: string
  ownerPersonId: string
  type: EquipmentType
  serialNumber: string
  barcode: string | null
  brand: string
  model: string
  tireKind: 'slick' | 'rain' | null
  sealNumber: string | null
}

export type EventEquipmentRole = 'chassis_1' | 'chassis_2' | 'engine_1' | 'engine_2' | 'tire'

export interface EventEquipment {
  id: string
  eventEntryId: string
  equipmentId: string
  role: EventEquipmentRole
  tirePosition: TirePosition | null
  registeredBy: string
  registeredAt: string
  validationStatus: TireMarkingStatus
  validationMessages: TireIssue[]
}

export interface TireSet {
  id: string
  championshipEntryId: string
  cycleStartEventId: string
  tireKind: 'slick' | 'rain'
  status: 'active' | 'closed'
  items: { position: TirePosition; equipmentId: string; replacedInEventId: string | null }[]
}

export type ExceptionType = 'puncture_replacement' | 'late_entry_used_tires' | 'other'

export interface ExceptionRequest {
  id: string
  eventId: string
  eventEntryId: string
  type: ExceptionType
  description: string
  requestedBy: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  decidedBy: string | null
  decidedAt: string | null
  decisionNotes: string | null
}

export type SessionType = 'practice' | 'qualifying' | 'prefinal' | 'final' | 'other'

export interface RaceSession {
  id: string
  eventId: string
  categoryId: string
  type: SessionType
  name: string
  scheduledAt: string
  status: 'scheduled' | 'running' | 'finished' | 'official'
}

export interface SessionResult {
  id: string
  sessionId: string
  eventEntryId: string
  position: number
  status: 'classified' | 'dnf' | 'dns' | 'dsq'
  isProvisional: boolean
  source: 'manual' | 'import'
}

export interface InspectionSelectionRecord extends InspectionSelection {
  id: string
}

export interface Role {
  id: string
  /** null = plantilla global de la plataforma. */
  organizationId: string | null
  name: string
  description: string
  isTemplate: boolean
  permissions: PermissionKey[]
}

export interface EventStaff {
  eventId: string
  personId: string
  roleId: string
}

export interface AuditLogEntry {
  id: string
  organizationId: string
  actorPersonId: string
  action: string
  entity: string
  entityId: string
  payload: Record<string, unknown>
  createdAt: string
}

/** Fila de la tabla del campeonato. Estática en la demo; Fase 3 la calcula `computeStandings`. */
export interface StandingsRow {
  categoryId: string
  championshipEntryId: string
  /** Puntos por fecha en orden de ronda; null = no participó; la descartada se marca aparte. */
  pointsByRound: Record<number, number | null>
  droppedRound: number | null
  total: number
}
