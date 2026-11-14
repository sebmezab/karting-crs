export type RepositoryErrorCode =
  | 'not_found'
  | 'tire_marking_blocked'
  | 'used_tires_confirmation_required'
  | 'equipment_invalid'
  | 'already_selected'
  | 'invalid_transition'
  | 'already_decided'

/** Error de la capa de datos con código estable; la UI lo traduce con `i18n/es.ts`. */
export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode
  readonly details: unknown

  constructor(code: RepositoryErrorCode, details?: unknown) {
    super(code)
    this.name = 'RepositoryError'
    this.code = code
    this.details = details
  }
}
