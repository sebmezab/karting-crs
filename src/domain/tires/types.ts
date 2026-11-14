export type TirePosition = 'FL' | 'FR' | 'RL' | 'RR'

/** Orden fijo de las 4 posiciones: delantero izq./der., trasero izq./der. */
export const TIRE_POSITIONS: readonly TirePosition[] = ['FL', 'FR', 'RL', 'RR']

/**
 * Tipo de fecha para el ciclo de neumáticos (SPEC 7.1):
 * - change: se puede marcar un juego nuevo (o usado) que vale para el ciclo.
 * - continuation: se debe usar el mismo juego del ciclo.
 * - not_counted: la fecha no participa del ciclo (p.ej. fecha de verano).
 */
export type TireEventKind = 'change' | 'continuation' | 'not_counted'

export type TireSerials = Record<TirePosition, string>
