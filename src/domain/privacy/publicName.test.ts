import { describe, expect, it } from 'vitest'
import { isMinorBySeason, publicDisplayName } from './publicName'

describe('isMinorBySeason (SPEC 11.1)', () => {
  it('PR-5: usa solo el año de nacimiento: 2026 − 2009 = 17 → menor', () => {
    expect(isMinorBySeason(2009, 2026)).toBe(true)
  })

  it('PR-5: 2026 − 2008 = 18 → adulto', () => {
    expect(isMinorBySeason(2008, 2026)).toBe(false)
  })

  it('PR-4: sin año registrado → se trata como menor', () => {
    expect(isMinorBySeason(null, 2026)).toBe(true)
  })
})

describe('publicDisplayName', () => {
  it('PR-1: adulto → nombre completo', () => {
    expect(
      publicDisplayName(
        { fullName: 'Ana Torres', birthYear: 1996 },
        { seasonYear: 2026, abbreviateMinors: true },
      ),
    ).toBe('Ana Torres')
  })

  it('PR-2: menor → nombre + inicial del apellido', () => {
    expect(
      publicDisplayName(
        { fullName: 'Tomás Rivas', birthYear: 2012 },
        { seasonYear: 2026, abbreviateMinors: true },
      ),
    ).toBe('Tomás R.')
  })

  it('PR-2: menor con dos apellidos → solo la inicial del primer apellido', () => {
    expect(
      publicDisplayName(
        { fullName: 'Isidora Muñoz Fernández', birthYear: 2012 },
        { seasonYear: 2026, abbreviateMinors: true },
      ),
    ).toBe('Isidora M.')
  })

  it('PR-2: menor con un solo nombre → se muestra tal cual', () => {
    expect(
      publicDisplayName(
        { fullName: 'Tomás', birthYear: 2012 },
        { seasonYear: 2026, abbreviateMinors: true },
      ),
    ).toBe('Tomás')
  })

  it('PR-3: organización configurada para nombre completo', () => {
    expect(
      publicDisplayName(
        { fullName: 'Tomás Rivas', birthYear: 2012 },
        { seasonYear: 2026, abbreviateMinors: false },
      ),
    ).toBe('Tomás Rivas')
  })

  it('normaliza espacios extra', () => {
    expect(
      publicDisplayName(
        { fullName: '  Tomás   Rivas ', birthYear: 2012 },
        { seasonYear: 2026, abbreviateMinors: true },
      ),
    ).toBe('Tomás R.')
  })
})
