import { describe, expect, it } from 'vitest'
import { formatClp, formatDateTime, formatDay, formatTime } from './format'

describe('formatos de Chile', () => {
  it('fecha dd-mm-aaaa', () => {
    expect(formatDay('2026-11-21')).toBe('21-11-2026')
  })

  it('fecha y hora en America/Santiago (UTC-3 en noviembre)', () => {
    expect(formatDateTime('2026-11-19T02:59:00Z')).toBe('18-11-2026 23:59')
    expect(formatTime('2026-11-21T17:00:00Z')).toBe('14:00')
  })

  it('pesos chilenos con separador de miles', () => {
    expect(formatClp(15000)).toBe('$15.000')
  })
})
