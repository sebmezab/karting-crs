import { TIRE_POSITIONS, type TireEventKind, type TirePosition, type TireSerials } from './types'

export interface SerialOwner {
  personId: string
  /** Texto para el staff, p.ej. "kart #327". */
  label: string
}

export interface TireMarkingInput {
  eventKind: TireEventKind
  driverPersonId: string
  /** Seriales tal como se escanearon o tipearon (se normalizan aquí). */
  scanned: TireSerials
  /** Juego activo del ciclo, si el piloto tiene uno. */
  activeSet: { cycleStartRound: number; serials: TireSerials } | null
  /** `serialKey(serial)` → dueño, para todos los neumáticos registrados en la organización. */
  serialOwners: ReadonlyMap<string, SerialOwner>
  /** Cantidad de `exception_request` de reemplazo por pinchazo aprobadas para esta inscripción. */
  approvedReplacements: number
  /** El revisor indicó que los neumáticos no corresponden a la marca/modelo de la categoría. */
  brandModelMismatch: boolean
}

export type TireIssueCode =
  | 'missing_serial'
  | 'duplicate_serial_in_set'
  | 'serial_owned_by_other_driver'
  | 'serial_mismatch_continuation'
  | 'replacement_approved'
  | 'late_entry_used_required'
  | 'brand_model_mismatch'
  | 'new_cycle_set'
  | 'same_set_ok'
  | 'not_counted_event'

export type IssueSeverity = 'info' | 'warning' | 'blocked'

export interface TireIssue {
  code: TireIssueCode
  severity: IssueSeverity
  position?: TirePosition
  params?: Record<string, string | number>
}

export type TireMarkingStatus = 'ok' | 'warning' | 'blocked' | 'overridden'

/**
 * Qué hacer al guardar la marcación:
 * - open_new_set: crear un `tire_set` nuevo para el ciclo y cerrar el anterior.
 * - keep_active_set: mantener el juego activo (registrando reemplazos aprobados).
 * - open_late_entry_set: crear el juego del ingreso tardío + excepción `late_entry_used_tires` pendiente.
 * - none: no se modifica ningún juego (bloqueado o fecha que no cuenta).
 */
export type TireMarkingAction = 'open_new_set' | 'keep_active_set' | 'open_late_entry_set' | 'none'

export interface TireMarkingResult {
  status: TireMarkingStatus
  issues: TireIssue[]
  action: TireMarkingAction
  /** El revisor debe confirmar con un check que los neumáticos son usados. */
  needsUsedTiresConfirmation: boolean
}

const MAX_SERIAL_LENGTH = 32

/**
 * El contenido escaneado es texto no confiable (SPEC 11.2): se deja solo A-Z, 0-9 y guion,
 * en mayúsculas y con largo acotado.
 */
export function normalizeSerial(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, MAX_SERIAL_LENGTH)
  // Sin letras ni números no hay serial (p.ej. "---").
  return /[A-Z0-9]/.test(cleaned) ? cleaned : ''
}

/**
 * Clave para COMPARAR seriales: los guiones no distinguen neumáticos. Así "MG355A2" tipeado a
 * mano es el mismo neumático que "MG-355-A2" escaneado, y no se puede evadir el bloqueo por
 * intercambio ni duplicar un neumático. Para mostrar y guardar se usa `normalizeSerial`.
 */
export function serialKey(raw: string): string {
  return normalizeSerial(raw).replace(/-/g, '')
}

/** Valida la marcación de los 4 slicks de un piloto en una fecha (tabla SPEC 7.1). */
export function validateTireMarking(input: TireMarkingInput): TireMarkingResult {
  const serials = normalizeAll(input.scanned)

  const structural = structuralIssues(serials, input)
  if (structural.length > 0) {
    return {
      status: 'blocked',
      issues: structural,
      action: 'none',
      needsUsedTiresConfirmation: false,
    }
  }

  const brandWarning: TireIssue[] = input.brandModelMismatch
    ? [{ code: 'brand_model_mismatch', severity: 'warning' }]
    : []

  switch (input.eventKind) {
    case 'not_counted':
      return finish([{ code: 'not_counted_event', severity: 'info' }, ...brandWarning], 'none')

    case 'change':
      // Reglamento 10.3: un juego usado re-marcado en fecha de cambio vale igual que uno nuevo.
      return finish([{ code: 'new_cycle_set', severity: 'info' }, ...brandWarning], 'open_new_set')

    case 'continuation':
      return validateContinuation(serials, input, brandWarning)
  }
}

function validateContinuation(
  serials: TireSerials,
  input: TireMarkingInput,
  brandWarning: TireIssue[],
): TireMarkingResult {
  if (input.activeSet === null) {
    // Ingreso tardío: deben ser usados; el comisario aprueba después.
    return {
      ...finish(
        [{ code: 'late_entry_used_required', severity: 'warning' }, ...brandWarning],
        'open_late_entry_set',
      ),
      needsUsedTiresConfirmation: true,
    }
  }

  const round = input.activeSet.cycleStartRound
  const activeKeys = new Set(Object.values(input.activeSet.serials).map(serialKey))
  const mismatched = TIRE_POSITIONS.filter((pos) => !activeKeys.has(serialKey(serials[pos])))

  if (mismatched.length === 0) {
    return finish(
      [{ code: 'same_set_ok', severity: 'info', params: { round } }, ...brandWarning],
      'keep_active_set',
    )
  }

  // Cada excepción de pinchazo aprobada cubre un solo neumático (reemplazo por usado de
  // desgaste similar). Si hay más seriales distintos que excepciones, sigue bloqueado.
  if (mismatched.length <= input.approvedReplacements) {
    const replaced: TireIssue[] = mismatched.map((position) => ({
      code: 'replacement_approved',
      severity: 'info',
      position,
      params: { serial: serials[position] },
    }))
    return { ...finish([...replaced, ...brandWarning], 'keep_active_set'), status: 'overridden' }
  }

  const blocked: TireIssue[] = mismatched.map((position) => ({
    code: 'serial_mismatch_continuation',
    severity: 'blocked',
    position,
    params: { round, serial: serials[position] },
  }))
  return { status: 'blocked', issues: blocked, action: 'none', needsUsedTiresConfirmation: false }
}

/** Bloqueos que aplican en cualquier tipo de fecha: faltantes, repetidos e intercambio. */
function structuralIssues(serials: TireSerials, input: TireMarkingInput): TireIssue[] {
  const issues: TireIssue[] = []
  const seen = new Set<string>()
  for (const position of TIRE_POSITIONS) {
    const serial = serials[position]
    if (serial === '') {
      issues.push({ code: 'missing_serial', severity: 'blocked', position })
      continue
    }
    const key = serialKey(serial)
    if (seen.has(key)) {
      issues.push({
        code: 'duplicate_serial_in_set',
        severity: 'blocked',
        position,
        params: { serial },
      })
      continue
    }
    seen.add(key)

    // Intercambio de neumáticos entre pilotos prohibido (SPEC 7.1).
    const owner = input.serialOwners.get(key)
    if (owner && owner.personId !== input.driverPersonId) {
      issues.push({
        code: 'serial_owned_by_other_driver',
        severity: 'blocked',
        position,
        params: { serial, owner: owner.label },
      })
    }
  }
  return issues
}

function finish(issues: TireIssue[], action: TireMarkingAction): TireMarkingResult {
  const status: TireMarkingStatus = issues.some((i) => i.severity === 'warning') ? 'warning' : 'ok'
  return { status, issues, action, needsUsedTiresConfirmation: false }
}

function normalizeAll(serials: TireSerials): TireSerials {
  return {
    FL: normalizeSerial(serials.FL),
    FR: normalizeSerial(serials.FR),
    RL: normalizeSerial(serials.RL),
    RR: normalizeSerial(serials.RR),
  }
}
