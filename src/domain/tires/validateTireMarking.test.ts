import { describe, expect, it } from 'vitest'
import {
  normalizeSerial,
  serialKey,
  validateTireMarking,
  type TireMarkingInput,
} from './validateTireMarking'

const DRIVER = 'p-ana'
const OTHER = 'p-bruno'

const activeSetF4 = {
  cycleStartRound: 4,
  serials: { FL: 'MG1001', FR: 'MG1002', RL: 'MG1003', RR: 'MG1004' },
}

function input(overrides: Partial<TireMarkingInput> = {}): TireMarkingInput {
  return {
    eventKind: 'continuation',
    driverPersonId: DRIVER,
    scanned: { FL: 'MG1001', FR: 'MG1002', RL: 'MG1003', RR: 'MG1004' },
    activeSet: activeSetF4,
    serialOwners: new Map([
      ['MG1001', { personId: DRIVER, label: 'kart #312' }],
      ['MG1002', { personId: DRIVER, label: 'kart #312' }],
      ['MG1003', { personId: DRIVER, label: 'kart #312' }],
      ['MG1004', { personId: DRIVER, label: 'kart #312' }],
      ['MG2001', { personId: OTHER, label: 'kart #327' }],
    ]),
    approvedReplacements: 0,
    brandModelMismatch: false,
    ...overrides,
  }
}

const codes = (r: ReturnType<typeof validateTireMarking>) => r.issues.map((i) => i.code)

describe('validateTireMarking — tabla SPEC 7.1', () => {
  it('T-V1: fecha de cambio con juego nuevo → OK y se abre un juego nuevo para el ciclo', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'change',
        scanned: { FL: 'MG3001', FR: 'MG3002', RL: 'MG3003', RR: 'MG3004' },
      }),
    )
    expect(r.status).toBe('ok')
    expect(r.action).toBe('open_new_set')
    expect(codes(r)).toEqual(['new_cycle_set'])
  })

  it('T-V12: fecha de cambio con neumáticos usados re-marcados → se trata igual que un juego nuevo (Reglamento 10.3)', () => {
    const r = validateTireMarking(input({ eventKind: 'change' }))
    expect(r.status).toBe('ok')
    expect(r.action).toBe('open_new_set')
  })

  it('T-V2: fecha de continuación con los mismos 4 seriales → OK y se mantiene el juego', () => {
    const r = validateTireMarking(input())
    expect(r.status).toBe('ok')
    expect(r.action).toBe('keep_active_set')
    expect(r.issues).toEqual([{ code: 'same_set_ok', severity: 'info', params: { round: 4 } }])
  })

  it('T-V2: los mismos 4 seriales en otras posiciones también son el mismo juego', () => {
    const r = validateTireMarking(
      input({ scanned: { FL: 'MG1002', FR: 'MG1001', RL: 'MG1004', RR: 'MG1003' } }),
    )
    expect(r.status).toBe('ok')
  })

  it('T-V3: fecha de continuación con un serial distinto en RR → BLOQUEADO indicando la fecha del juego y la posición', () => {
    const r = validateTireMarking(
      input({ scanned: { FL: 'MG1001', FR: 'MG1002', RL: 'MG1003', RR: 'MG9999' } }),
    )
    expect(r.status).toBe('blocked')
    expect(r.action).toBe('none')
    expect(r.issues).toEqual([
      {
        code: 'serial_mismatch_continuation',
        severity: 'blocked',
        position: 'RR',
        params: { round: 4, serial: 'MG9999' },
      },
    ])
  })

  it('T-V3: dos seriales distintos → un bloqueo por cada posición', () => {
    const r = validateTireMarking(
      input({ scanned: { FL: 'MG8888', FR: 'MG1002', RL: 'MG1003', RR: 'MG9999' } }),
    )
    expect(r.status).toBe('blocked')
    expect(r.issues.map((i) => i.position)).toEqual(['FL', 'RR'])
  })

  it('T-V4: serial distinto con excepción de pinchazo aprobada → excepción aplicada, no bloqueado', () => {
    const r = validateTireMarking(
      input({
        scanned: { FL: 'MG1001', FR: 'MG1002', RL: 'MG1003', RR: 'MG9999' },
        approvedReplacements: 1,
      }),
    )
    expect(r.status).toBe('overridden')
    expect(r.action).toBe('keep_active_set')
    expect(r.issues).toEqual([
      {
        code: 'replacement_approved',
        severity: 'info',
        position: 'RR',
        params: { serial: 'MG9999' },
      },
    ])
  })

  it('T-V5: fecha de continuación sin juego activo (ingreso tardío) → ADVERTENCIA: deben ser usados y queda excepción pendiente', () => {
    const r = validateTireMarking(
      input({
        activeSet: null,
        scanned: { FL: 'MG5001', FR: 'MG5002', RL: 'MG5003', RR: 'MG5004' },
      }),
    )
    expect(r.status).toBe('warning')
    expect(r.action).toBe('open_late_entry_set')
    expect(r.needsUsedTiresConfirmation).toBe(true)
    expect(codes(r)).toEqual(['late_entry_used_required'])
  })

  it('T-V6: serial registrado a nombre de otro piloto → BLOQUEADO por intercambio, aunque sea fecha de cambio', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'change',
        scanned: { FL: 'MG3001', FR: 'MG2001', RL: 'MG3003', RR: 'MG3004' },
      }),
    )
    expect(r.status).toBe('blocked')
    expect(r.issues).toContainEqual({
      code: 'serial_owned_by_other_driver',
      severity: 'blocked',
      position: 'FR',
      params: { serial: 'MG2001', owner: 'kart #327' },
    })
  })

  it('T-V6: en continuación, el serial de otro piloto se informa como intercambio (no además como "no coincide")', () => {
    const r = validateTireMarking(
      input({ scanned: { FL: 'MG1001', FR: 'MG2001', RL: 'MG1003', RR: 'MG1004' } }),
    )
    expect(codes(r)).toEqual(['serial_owned_by_other_driver'])
  })

  it('T-V7: serial repetido dentro del mismo juego → BLOQUEADO', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'change',
        scanned: { FL: 'MG3001', FR: 'MG3001', RL: 'MG3003', RR: 'MG3004' },
      }),
    )
    expect(r.status).toBe('blocked')
    expect(r.issues).toContainEqual({
      code: 'duplicate_serial_in_set',
      severity: 'blocked',
      position: 'FR',
      params: { serial: 'MG3001' },
    })
  })

  it('T-V8: el revisor indica marca/modelo que no corresponde → ADVERTENCIA', () => {
    const r = validateTireMarking(input({ brandModelMismatch: true }))
    expect(r.status).toBe('warning')
    expect(codes(r)).toContain('brand_model_mismatch')
    expect(r.action).toBe('keep_active_set')
  })

  it('T-V9: un serial vacío → BLOQUEADO por falta de serial', () => {
    const r = validateTireMarking(
      input({ scanned: { FL: 'MG1001', FR: '  ', RL: 'MG1003', RR: 'MG1004' } }),
    )
    expect(r.status).toBe('blocked')
    expect(r.issues).toEqual([{ code: 'missing_serial', severity: 'blocked', position: 'FR' }])
  })

  it('T-V10: compara seriales normalizados (mayúsculas, sin espacios)', () => {
    const r = validateTireMarking(
      input({ scanned: { FL: ' mg1001 ', FR: 'mg 1002', RL: 'MG1003', RR: 'Mg1004\n' } }),
    )
    expect(r.status).toBe('ok')
  })

  it('T-V11: fecha que no cuenta para el ciclo → OK sin reglas de ciclo', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'not_counted',
        activeSet: null,
        scanned: { FL: 'MG7001', FR: 'MG7002', RL: 'MG7003', RR: 'MG7004' },
      }),
    )
    expect(r.status).toBe('ok')
    expect(r.action).toBe('none')
    expect(codes(r)).toEqual(['not_counted_event'])
  })

  it('T-V11: fecha que no cuenta, pero con serial de otro piloto → sigue BLOQUEADO', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'not_counted',
        scanned: { FL: 'MG7001', FR: 'MG2001', RL: 'MG7003', RR: 'MG7004' },
      }),
    )
    expect(r.status).toBe('blocked')
  })
})

describe('validateTireMarking — bordes y combinaciones (QA)', () => {
  it('T-V4 + T-V6: una excepción de pinchazo aprobada NO habilita usar un neumático de otro piloto', () => {
    const r = validateTireMarking(
      input({
        scanned: { FL: 'MG1001', FR: 'MG1002', RL: 'MG1003', RR: 'MG2001' },
        approvedReplacements: 1,
      }),
    )
    expect(r.status).toBe('blocked')
    expect(r.action).toBe('none')
    expect(codes(r)).toEqual(['serial_owned_by_other_driver'])
  })

  it('T-V4: con excepción aprobada pero los 4 seriales del juego activo → OK normal, sin "excepción aplicada"', () => {
    const r = validateTireMarking(input({ approvedReplacements: 1 }))
    expect(r.status).toBe('ok')
    expect(codes(r)).toEqual(['same_set_ok'])
  })

  it('T-V4 + T-V8: excepción aplicada y marca/modelo distinto → sigue como excepción aplicada con la advertencia', () => {
    const r = validateTireMarking(
      input({
        scanned: { FL: 'MG1001', FR: 'MG1002', RL: 'MG1003', RR: 'MG9999' },
        approvedReplacements: 1,
        brandModelMismatch: true,
      }),
    )
    expect(r.status).toBe('overridden')
    expect(codes(r)).toEqual(['replacement_approved', 'brand_model_mismatch'])
  })

  it('T-V5 + T-V6: ingreso tardío con un neumático de otro piloto → BLOQUEADO (no basta la confirmación de usados)', () => {
    const r = validateTireMarking(
      input({
        activeSet: null,
        scanned: { FL: 'MG5001', FR: 'MG5002', RL: 'MG2001', RR: 'MG5004' },
      }),
    )
    expect(r.status).toBe('blocked')
    expect(r.needsUsedTiresConfirmation).toBe(false)
    expect(r.action).toBe('none')
  })

  it('T-V5 + T-V8: ingreso tardío con marca/modelo distinto → ADVERTENCIA con ambos avisos y exige confirmar usados', () => {
    const r = validateTireMarking(
      input({
        activeSet: null,
        brandModelMismatch: true,
        scanned: { FL: 'MG5001', FR: 'MG5002', RL: 'MG5003', RR: 'MG5004' },
      }),
    )
    expect(r.status).toBe('warning')
    expect(r.needsUsedTiresConfirmation).toBe(true)
    expect(codes(r)).toEqual(['late_entry_used_required', 'brand_model_mismatch'])
  })

  it('T-V7: en continuación, repetir un serial del juego activo no pasa como "mismo juego"', () => {
    const r = validateTireMarking(
      input({ scanned: { FL: 'MG1001', FR: 'MG1001', RL: 'MG1003', RR: 'MG1004' } }),
    )
    expect(r.status).toBe('blocked')
    expect(codes(r)).toEqual(['duplicate_serial_in_set'])
  })

  it('T-V7 + T-V10: dos textos que se normalizan al mismo serial cuentan como repetidos', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'change',
        scanned: { FL: 'mg3001', FR: ' MG 3001 ', RL: 'MG3003', RR: 'MG3004' },
      }),
    )
    expect(r.status).toBe('blocked')
    expect(r.issues).toEqual([
      {
        code: 'duplicate_serial_in_set',
        severity: 'blocked',
        position: 'FR',
        params: { serial: 'MG3001' },
      },
    ])
  })

  it('T-V7 + T-V11: serial repetido en una fecha que no cuenta → sigue BLOQUEADO', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'not_counted',
        activeSet: null,
        scanned: { FL: 'MG7001', FR: 'MG7002', RL: 'MG7002', RR: 'MG7004' },
      }),
    )
    expect(r.status).toBe('blocked')
    expect(codes(r)).toEqual(['duplicate_serial_in_set'])
  })

  it('T-V9: los 4 seriales vacíos → un bloqueo por cada posición', () => {
    const r = validateTireMarking(input({ scanned: { FL: '', FR: '', RL: '', RR: '' } }))
    expect(r.status).toBe('blocked')
    expect(r.issues.map((i) => [i.code, i.position])).toEqual([
      ['missing_serial', 'FL'],
      ['missing_serial', 'FR'],
      ['missing_serial', 'RL'],
      ['missing_serial', 'RR'],
    ])
  })

  it('T-V9 + T-V10: un escaneo que solo trae caracteres no permitidos cuenta como serial faltante', () => {
    const r = validateTireMarking(
      input({ scanned: { FL: 'MG1001', FR: 'MG1002', RL: '¿¡*ñ!?', RR: 'MG1004' } }),
    )
    expect(r.status).toBe('blocked')
    expect(r.issues).toEqual([{ code: 'missing_serial', severity: 'blocked', position: 'RL' }])
  })

  it('T-V6 + T-V10: un serial ajeno escaneado en minúsculas y con espacios igual se detecta como intercambio', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'change',
        scanned: { FL: 'MG3001', FR: ' mg2001\n', RL: 'MG3003', RR: 'MG3004' },
      }),
    )
    expect(r.status).toBe('blocked')
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'serial_owned_by_other_driver', position: 'FR' }),
    )
  })

  it('T-V2 + T-V10: el juego activo guardado con otro formato se compara normalizado', () => {
    const r = validateTireMarking(
      input({
        activeSet: {
          cycleStartRound: 4,
          serials: { FL: 'mg1001', FR: 'MG 1002', RL: 'MG1003', RR: 'MG1004' },
        },
      }),
    )
    expect(r.status).toBe('ok')
    expect(r.action).toBe('keep_active_set')
  })

  it('T-V8: en fecha de cambio, marca/modelo distinto → ADVERTENCIA pero igual abre el juego del ciclo', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'change',
        brandModelMismatch: true,
        scanned: { FL: 'MG3001', FR: 'MG3002', RL: 'MG3003', RR: 'MG3004' },
      }),
    )
    expect(r.status).toBe('warning')
    expect(r.action).toBe('open_new_set')
    expect(r.needsUsedTiresConfirmation).toBe(false)
  })

  it('T-V3: con los 4 seriales distintos en continuación → 4 bloqueos, uno por posición', () => {
    const r = validateTireMarking(
      input({ scanned: { FL: 'MG8001', FR: 'MG8002', RL: 'MG8003', RR: 'MG8004' } }),
    )
    expect(r.status).toBe('blocked')
    expect(r.issues.map((i) => i.position)).toEqual(['FL', 'FR', 'RL', 'RR'])
  })
})

describe('normalizeSerial — el texto escaneado es no confiable (SPEC 11.2)', () => {
  it('T-V10: pasa a mayúsculas y quita espacios', () => {
    expect(normalizeSerial('  ab 12\t3 ')).toBe('AB123')
  })

  it('T-V10: elimina caracteres no permitidos y conserva guiones', () => {
    expect(normalizeSerial('<script>MG-1001</script>')).toBe('SCRIPTMG-1001SCRIPT')
  })

  it('T-V10: limita el largo a 32 caracteres', () => {
    expect(normalizeSerial('A'.repeat(50))).toHaveLength(32)
  })

  it('T-V10: quita saltos de línea, tabulaciones y caracteres de control que agrega el lector', () => {
    expect(normalizeSerial('\u0002MG-312-A1\r\n\u0003')).toBe('MG-312-A1')
  })

  it('T-V10: quita caracteres invisibles o de ancho cero copiados desde otra app', () => {
    expect(normalizeSerial('MG​-312﻿-A1')).toBe('MG-312-A1')
  })

  it('T-V10: letras con tilde o ñ no pasan como letras válidas', () => {
    expect(normalizeSerial('MGÑ-áé1')).toBe('MG-1')
  })

  it('T-V10: un texto de solo espacios queda vacío', () => {
    expect(normalizeSerial(' \t\n ')).toBe('')
  })

  it('T-V10: el límite de 32 se aplica después de limpiar (los caracteres basura no cuentan)', () => {
    expect(normalizeSerial(`${' '.repeat(40)}MG-312-A1`)).toBe('MG-312-A1')
  })
})

describe('correcciones de QA: excepciones contadas y seriales sin guiones', () => {
  it('T-V4: una excepción aprobada no cubre dos neumáticos distintos → BLOQUEADO', () => {
    const r = validateTireMarking(
      input({
        scanned: { FL: 'MG8888', FR: 'MG1002', RL: 'MG1003', RR: 'MG9999' },
        approvedReplacements: 1,
      }),
    )
    expect(r.status).toBe('blocked')
    expect(codes(r)).toEqual(['serial_mismatch_continuation', 'serial_mismatch_continuation'])
  })

  it('T-V4: dos excepciones aprobadas cubren dos neumáticos distintos', () => {
    const r = validateTireMarking(
      input({
        scanned: { FL: 'MG8888', FR: 'MG1002', RL: 'MG1003', RR: 'MG9999' },
        approvedReplacements: 2,
      }),
    )
    expect(r.status).toBe('overridden')
  })

  it('T-V10: un serial de solo guiones cuenta como vacío', () => {
    expect(normalizeSerial('---')).toBe('')
    const r = validateTireMarking(
      input({ scanned: { FL: 'MG1001', FR: '- -', RL: 'MG1003', RR: 'MG1004' } }),
    )
    expect(r.issues).toEqual([{ code: 'missing_serial', severity: 'blocked', position: 'FR' }])
  })

  it('T-V10b: la clave de comparación ignora los guiones', () => {
    expect(serialKey('MG-355-A2')).toBe('MG355A2')
    expect(serialKey(' mg 355a2 ')).toBe('MG355A2')
  })

  it('T-V10b: el mismo serial con y sin guiones en un juego cuenta como repetido', () => {
    const r = validateTireMarking(
      input({
        eventKind: 'change',
        scanned: { FL: 'MG-3001', FR: 'MG3001', RL: 'MG3003', RR: 'MG3004' },
      }),
    )
    expect(r.issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate_serial_in_set', position: 'FR' }),
    )
  })

  it('T-V10b: el juego activo registrado con guiones coincide con seriales tipeados sin guiones', () => {
    const r = validateTireMarking(
      input({
        activeSet: {
          cycleStartRound: 4,
          serials: { FL: 'MG-1001', FR: 'MG-1002', RL: 'MG-1003', RR: 'MG-1004' },
        },
      }),
    )
    expect(r.status).toBe('ok')
  })
})
