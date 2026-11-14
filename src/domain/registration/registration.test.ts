import { describe, expect, it } from 'vitest'
import { computeLateFee, validateKartNumber } from './registration'

const dd2Senior = { numberMin: 301, numberMax: 399 }

describe('validateKartNumber (SPEC 7.3)', () => {
  const taken = new Map([
    [312, 'ce-ana'],
    [327, 'ce-bruno'],
  ])

  it('R-1: número en rango y libre → válido', () => {
    expect(validateKartNumber({ number: 345, category: dd2Senior, takenNumbers: taken })).toEqual({
      valid: true,
    })
  })

  it('R-1: los bordes del rango son válidos', () => {
    expect(
      validateKartNumber({ number: 301, category: dd2Senior, takenNumbers: taken }).valid,
    ).toBe(true)
    expect(
      validateKartNumber({ number: 399, category: dd2Senior, takenNumbers: taken }).valid,
    ).toBe(true)
  })

  it('R-2: número fuera del rango de la categoría → inválido indicando el rango', () => {
    expect(validateKartNumber({ number: 250, category: dd2Senior, takenNumbers: taken })).toEqual({
      valid: false,
      code: 'out_of_range',
      params: { min: 301, max: 399 },
    })
    expect(
      validateKartNumber({ number: 400, category: dd2Senior, takenNumbers: taken }).valid,
    ).toBe(false)
  })

  it('R-3: número usado por otra inscripción del campeonato → inválido', () => {
    expect(validateKartNumber({ number: 327, category: dd2Senior, takenNumbers: taken })).toEqual({
      valid: false,
      code: 'number_taken',
      params: { number: 327 },
    })
  })

  it('R-3: el número propio del piloto es válido', () => {
    expect(
      validateKartNumber({
        number: 312,
        category: dd2Senior,
        takenNumbers: taken,
        ownChampionshipEntryId: 'ce-ana',
      }).valid,
    ).toBe(true)
  })

  it('R-4: número no entero o negativo → inválido', () => {
    expect(validateKartNumber({ number: 301.5, category: dd2Senior, takenNumbers: taken })).toEqual(
      {
        valid: false,
        code: 'not_a_positive_integer',
      },
    )
    expect(validateKartNumber({ number: -1, category: dd2Senior, takenNumbers: taken }).valid).toBe(
      false,
    )
  })
})

describe('computeLateFee — multa por inscripción tardía (SPEC 7.3)', () => {
  const deadline = '2026-11-19T02:59:00Z' // miércoles 18-11-2026 23:59 en Chile (UTC-3)
  const perDay = 15000

  it('R-5: antes del cierre no hay multa', () => {
    expect(computeLateFee(deadline, '2026-11-15T12:00:00Z', perDay)).toEqual({
      isLate: false,
      daysLate: 0,
      feeClp: 0,
    })
  })

  it('R-5: justo en el cierre no hay multa', () => {
    expect(computeLateFee(deadline, deadline, perDay).isLate).toBe(false)
  })

  it('R-6: 1 minuto después del cierre → 1 día de multa', () => {
    expect(computeLateFee(deadline, '2026-11-19T03:00:00Z', perDay)).toEqual({
      isLate: true,
      daysLate: 1,
      feeClp: 15000,
    })
  })

  it('R-7: 2 días y 1 hora después → 3 días (se cobra por día iniciado)', () => {
    expect(computeLateFee(deadline, '2026-11-21T03:59:00Z', perDay)).toEqual({
      isLate: true,
      daysLate: 3,
      feeClp: 45000,
    })
  })

  it('una fecha inválida es un error', () => {
    expect(() => computeLateFee('no-es-fecha', deadline, perDay)).toThrow()
  })
})
