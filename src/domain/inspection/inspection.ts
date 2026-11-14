export type InspectionReason = 'top_n' | 'steward_selection'
export type InspectionStatus = 'pending' | 'in_progress' | 'ok' | 'observed'

/** `inspection_selection` (SPEC 6.5) sin el id, que lo asigna la capa de datos. */
export interface InspectionSelection {
  sessionId: string
  eventEntryId: string
  reason: InspectionReason
  selectedBy: string
  selectedAt: string
  status: InspectionStatus
  inspectorPersonId: string | null
  notes: string
  closedAt: string | null
}

function newSelection(
  sessionId: string,
  eventEntryId: string,
  reason: InspectionReason,
  selectedBy: string,
  at: string,
): InspectionSelection {
  return {
    sessionId,
    eventEntryId,
    reason,
    selectedBy,
    selectedAt: at,
    status: 'pending',
    inspectorPersonId: null,
    notes: '',
    closedAt: null,
  }
}

/**
 * Al cerrar una sesión, el cronometrista toca el Top N en orden y se generan las selecciones
 * `top_n` (SPEC 7.4).
 */
export function createTopNSelections(args: {
  sessionId: string
  orderedEventEntryIds: readonly string[]
  n: number
  selectedBy: string
  at: string
}): InspectionSelection[] {
  if (!Number.isInteger(args.n) || args.n < 1) {
    throw new Error(`N inválido para Top N: ${args.n}`)
  }
  if (new Set(args.orderedEventEntryIds).size !== args.orderedEventEntryIds.length) {
    throw new Error('Hay un kart repetido en el Top N')
  }
  return args.orderedEventEntryIds
    .slice(0, args.n)
    .map((id) => newSelection(args.sessionId, id, 'top_n', args.selectedBy, args.at))
}

export type AddSelectionResult =
  { ok: true; selection: InspectionSelection } | { ok: false; reason: 'already_selected' }

/** El director técnico o un comisario agrega un kart a criterio (SPEC 7.4). */
export function addStewardSelection(
  existing: readonly InspectionSelection[],
  args: { sessionId: string; eventEntryId: string; selectedBy: string; at: string },
): AddSelectionResult {
  const duplicate = existing.some(
    (s) => s.sessionId === args.sessionId && s.eventEntryId === args.eventEntryId,
  )
  if (duplicate) return { ok: false, reason: 'already_selected' }
  return {
    ok: true,
    selection: newSelection(
      args.sessionId,
      args.eventEntryId,
      'steward_selection',
      args.selectedBy,
      args.at,
    ),
  }
}

const ALLOWED_TRANSITIONS: Record<InspectionStatus, readonly InspectionStatus[]> = {
  pending: ['in_progress', 'ok', 'observed'],
  in_progress: ['ok', 'observed'],
  ok: [],
  observed: [],
}

export function canTransition(from: InspectionStatus, to: InspectionStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** Estados: pending → in_progress → ok | observed (SPEC 7.4). */
export function transitionInspection(
  selection: InspectionSelection,
  to: InspectionStatus,
  args: { by: string; at: string; notes?: string },
): InspectionSelection {
  if (!canTransition(selection.status, to)) {
    throw new Error(`Transición de revisión no permitida: ${selection.status} → ${to}`)
  }
  const closes = to === 'ok' || to === 'observed'
  return {
    ...selection,
    status: to,
    inspectorPersonId: selection.inspectorPersonId ?? args.by,
    notes: args.notes ?? selection.notes,
    closedAt: closes ? args.at : null,
  }
}

export interface PublicInspectionView {
  sessionId: string
  eventEntryId: string
  status: InspectionStatus
}

/**
 * Ante pilotos y público se muestra solo "Seleccionado para revisión", SIN el motivo ni quién
 * lo pidió (SPEC 7.4). Construir la vista con lista blanca de campos, nunca con spread.
 */
export function toPublicInspectionView(selection: InspectionSelection): PublicInspectionView {
  return {
    sessionId: selection.sessionId,
    eventEntryId: selection.eventEntryId,
    status: selection.status,
  }
}
