export type KartNumberValidation =
  | { valid: true }
  | { valid: false; code: 'not_a_positive_integer' }
  | { valid: false; code: 'out_of_range'; params: { min: number; max: number } }
  | { valid: false; code: 'number_taken'; params: { number: number } }

/**
 * El número de kart debe estar dentro del rango de la categoría y ser único en el campeonato
 * (SPEC 7.3). El número se mantiene toda la temporada, por eso el propio número es válido.
 */
export function validateKartNumber(args: {
  number: number
  category: { numberMin: number; numberMax: number }
  /** número → id de la inscripción de campeonato que lo usa. */
  takenNumbers: ReadonlyMap<number, string>
  ownChampionshipEntryId?: string
}): KartNumberValidation {
  const { number, category } = args
  if (!Number.isInteger(number) || number <= 0) {
    return { valid: false, code: 'not_a_positive_integer' }
  }
  if (number < category.numberMin || number > category.numberMax) {
    return {
      valid: false,
      code: 'out_of_range',
      params: { min: category.numberMin, max: category.numberMax },
    }
  }
  const holder = args.takenNumbers.get(number)
  if (holder !== undefined && holder !== args.ownChampionshipEntryId) {
    return { valid: false, code: 'number_taken', params: { number } }
  }
  return { valid: true }
}

const DAY_MS = 24 * 60 * 60 * 1000

export interface LateFee {
  isLate: boolean
  daysLate: number
  feeClp: number
}

/**
 * La inscripción fuera de plazo se permite, pero se multa por cada día iniciado después del
 * cierre (`rules.registration.late_fee_per_day_clp`, SPEC 7.3).
 */
export function computeLateFee(
  deadlineIso: string,
  registeredAtIso: string,
  perDayClp: number,
): LateFee {
  const deadline = Date.parse(deadlineIso)
  const registeredAt = Date.parse(registeredAtIso)
  if (Number.isNaN(deadline) || Number.isNaN(registeredAt)) {
    throw new Error('Fecha inválida para calcular la multa de inscripción')
  }
  if (registeredAt <= deadline) {
    return { isLate: false, daysLate: 0, feeClp: 0 }
  }
  const daysLate = Math.ceil((registeredAt - deadline) / DAY_MS)
  return { isLate: true, daysLate, feeClp: daysLate * perDayClp }
}
