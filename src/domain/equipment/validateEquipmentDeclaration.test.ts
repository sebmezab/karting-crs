import { describe, expect, it } from 'vitest'
import {
  validateEquipmentDeclaration,
  type DeclaredEquipment,
  type EquipmentDeclarationInput,
} from './validateEquipmentDeclaration'

const chassisA: DeclaredEquipment = { equipmentId: 'c-a', type: 'chassis', serialNumber: 'CH-A' }
const chassisB: DeclaredEquipment = { equipmentId: 'c-b', type: 'chassis', serialNumber: 'CH-B' }
const chassisC: DeclaredEquipment = { equipmentId: 'c-c', type: 'chassis', serialNumber: 'CH-C' }
const engineA: DeclaredEquipment = {
  equipmentId: 'e-a',
  type: 'engine',
  serialNumber: 'EN-A',
  sealNumber: 'S-1',
}
const engineB: DeclaredEquipment = {
  equipmentId: 'e-b',
  type: 'engine',
  serialNumber: 'EN-B',
  sealNumber: 'S-2',
}
const engineC: DeclaredEquipment = {
  equipmentId: 'e-c',
  type: 'engine',
  serialNumber: 'EN-C',
  sealNumber: 'S-3',
}

function input(declared: DeclaredEquipment[], overrides: Partial<EquipmentDeclarationInput> = {}) {
  return validateEquipmentDeclaration({
    declared,
    limits: { chassis: 2, engine: 2 },
    engineRequiresSeal: true,
    equipmentUsedByOtherDrivers: new Map(),
    ...overrides,
  })
}

describe('validateEquipmentDeclaration (SPEC 7.2)', () => {
  it('E-1: 2 chasis y 2 motores con sello es válido', () => {
    expect(input([chassisA, chassisB, engineA, engineB])).toEqual({ valid: true, issues: [] })
  })

  it('E-1: 1 chasis y 1 motor es válido', () => {
    expect(input([chassisA, engineA]).valid).toBe(true)
  })

  it('E-2: 3 chasis con límite 2 es inválido', () => {
    const r = input([chassisA, chassisB, chassisC, engineA])
    expect(r.valid).toBe(false)
    expect(r.issues).toContainEqual({
      code: 'chassis_limit_exceeded',
      params: { limit: 2, declared: 3 },
    })
  })

  it('E-3: 3 motores con límite 2 es inválido', () => {
    const r = input([chassisA, engineA, engineB, engineC])
    expect(r.issues).toContainEqual({
      code: 'engine_limit_exceeded',
      params: { limit: 2, declared: 3 },
    })
  })

  it('E-4: motor sin sello cuando el reglamento lo exige es inválido', () => {
    const r = input([chassisA, { ...engineA, sealNumber: '  ' }])
    expect(r.valid).toBe(false)
    expect(r.issues).toEqual([
      { code: 'engine_seal_missing', equipmentId: 'e-a', params: { serial: 'EN-A' } },
    ])
  })

  it('E-5: motor sin sello es válido si el reglamento no lo exige', () => {
    const r = input([chassisA, { ...engineA, sealNumber: undefined }], {
      engineRequiresSeal: false,
    })
    expect(r.valid).toBe(true)
  })

  it('E-6: equipo inscrito por otro piloto en la misma fecha es inválido', () => {
    const r = input([chassisA, engineA], {
      equipmentUsedByOtherDrivers: new Map([['c-a', 'kart #327']]),
    })
    expect(r.issues).toEqual([
      {
        code: 'equipment_used_by_other_driver',
        equipmentId: 'c-a',
        params: { serial: 'CH-A', owner: 'kart #327' },
      },
    ])
  })

  it('E-7: sin chasis o sin motor es inválido', () => {
    expect(input([engineA]).issues).toContainEqual({ code: 'chassis_required' })
    expect(input([chassisA]).issues).toContainEqual({ code: 'engine_required' })
  })

  it('E-8: el mismo equipo declarado dos veces es inválido', () => {
    const r = input([chassisA, chassisA, engineA])
    expect(r.issues).toContainEqual({
      code: 'duplicate_equipment',
      equipmentId: 'c-a',
      params: { serial: 'CH-A' },
    })
  })
})
