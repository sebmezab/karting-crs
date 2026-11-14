import type { TireEventKind } from './types'

export interface CycleEvent {
  id: string
  /** Fecha ISO (aaaa-mm-dd); define el orden cronológico. */
  date: string
  roundNumber: number
  countsForTireCycle: boolean
  /** `event.is_tire_change_event`: override manual del admin. `null` = calcular por regla. */
  tireChangeOverride: boolean | null
}

export interface TireEventClassification {
  kind: TireEventKind
  source: 'override' | 'calculated'
}

/**
 * Determina si cada fecha es "de cambio", "de continuación" o "no cuenta" (SPEC 7.1):
 * 1. Si la fecha tiene override manual, se usa.
 * 2. Si no: entre las fechas que cuentan para el ciclo, en orden cronológico, la 1ª es de
 *    cambio y luego cada `cycleLength` fechas. El cálculo no se ve afectado por los
 *    overrides de otras fechas: el admin ve el tipo calculado y lo sobrescribe fecha a fecha.
 */
export function classifyTireEvents(
  events: readonly CycleEvent[],
  cycleLength: number,
): Map<string, TireEventClassification> {
  if (!Number.isInteger(cycleLength) || cycleLength < 1) {
    throw new Error(`Largo de ciclo de neumáticos inválido: ${cycleLength}`)
  }

  const sorted = chronological(events)

  const result = new Map<string, TireEventClassification>()
  let countedIndex = 0
  for (const event of sorted) {
    let calculated: TireEventKind = 'not_counted'
    if (event.countsForTireCycle) {
      calculated = countedIndex % cycleLength === 0 ? 'change' : 'continuation'
      countedIndex += 1
    }

    if (event.tireChangeOverride !== null) {
      result.set(event.id, {
        kind: event.tireChangeOverride ? 'change' : 'continuation',
        source: 'override',
      })
    } else {
      result.set(event.id, { kind: calculated, source: 'calculated' })
    }
  }
  return result
}

function chronological(events: readonly CycleEvent[]): CycleEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || a.roundNumber - b.roundNumber)
}

/**
 * Fecha de cambio que abrió el ciclo vigente en `eventId`: la última fecha de cambio (con
 * overrides) en o antes de ella. Un juego que empezó antes de esa fecha es de un ciclo anterior
 * y ya no vale (p.ej. el piloto faltó a la fecha de cambio). `null` si no hay ninguna.
 */
export function currentCycleStartEventId(
  events: readonly CycleEvent[],
  cycleLength: number,
  eventId: string,
): string | null {
  const kinds = classifyTireEvents(events, cycleLength)
  let start: string | null = null
  for (const event of chronological(events)) {
    if (kinds.get(event.id)?.kind === 'change') start = event.id
    if (event.id === eventId) return start
  }
  return null
}
