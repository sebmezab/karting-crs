import { describe, expect, it } from 'vitest'
import {
  addStewardSelection,
  canTransition,
  createTopNSelections,
  toPublicInspectionView,
  transitionInspection,
  type InspectionSelection,
} from './inspection'

const AT = '2026-11-21T15:00:00Z'

function selection(overrides: Partial<InspectionSelection> = {}): InspectionSelection {
  return {
    sessionId: 's-final-dd2',
    eventEntryId: 'ee-1',
    reason: 'top_n',
    selectedBy: 'p-crono',
    selectedAt: AT,
    status: 'pending',
    inspectorPersonId: null,
    notes: '',
    closedAt: null,
    ...overrides,
  }
}

describe('createTopNSelections (SPEC 7.4)', () => {
  it('I-1: crea una selección top_n pendiente por cada uno de los N primeros, en orden', () => {
    const result = createTopNSelections({
      sessionId: 's-1',
      orderedEventEntryIds: ['ee-3', 'ee-1', 'ee-7', 'ee-2'],
      n: 3,
      selectedBy: 'p-crono',
      at: AT,
    })
    expect(result.map((s) => s.eventEntryId)).toEqual(['ee-3', 'ee-1', 'ee-7'])
    expect(result.every((s) => s.reason === 'top_n' && s.status === 'pending')).toBe(true)
    expect(result[0]).toMatchObject({ sessionId: 's-1', selectedBy: 'p-crono', selectedAt: AT })
  })

  it('I-1: si hay menos karts que N, selecciona los que hay', () => {
    const result = createTopNSelections({
      sessionId: 's-1',
      orderedEventEntryIds: ['ee-1', 'ee-2'],
      n: 3,
      selectedBy: 'p',
      at: AT,
    })
    expect(result).toHaveLength(2)
  })

  it('I-2: un kart repetido en el Top N es un error', () => {
    expect(() =>
      createTopNSelections({
        sessionId: 's-1',
        orderedEventEntryIds: ['ee-1', 'ee-1', 'ee-2'],
        n: 3,
        selectedBy: 'p',
        at: AT,
      }),
    ).toThrow(/repetido/i)
  })

  it('I-2: N debe ser un entero positivo', () => {
    expect(() =>
      createTopNSelections({
        sessionId: 's',
        orderedEventEntryIds: ['ee-1'],
        n: 0,
        selectedBy: 'p',
        at: AT,
      }),
    ).toThrow()
  })
})

describe('addStewardSelection', () => {
  it('I-3: agrega un kart a criterio con quién y cuándo', () => {
    const r = addStewardSelection([selection()], {
      sessionId: 's-final-dd2',
      eventEntryId: 'ee-9',
      selectedBy: 'p-dt',
      at: AT,
    })
    expect(r).toEqual({
      ok: true,
      selection: selection({
        eventEntryId: 'ee-9',
        reason: 'steward_selection',
        selectedBy: 'p-dt',
      }),
    })
  })

  it('I-4: un kart ya seleccionado en la sesión no se duplica', () => {
    const r = addStewardSelection([selection()], {
      sessionId: 's-final-dd2',
      eventEntryId: 'ee-1',
      selectedBy: 'p-dt',
      at: AT,
    })
    expect(r).toEqual({ ok: false, reason: 'already_selected' })
  })

  it('I-4: el mismo kart sí puede seleccionarse en otra sesión', () => {
    const r = addStewardSelection([selection()], {
      sessionId: 's-otra',
      eventEntryId: 'ee-1',
      selectedBy: 'p-dt',
      at: AT,
    })
    expect(r.ok).toBe(true)
  })
})

describe('transitionInspection — estados de revisión', () => {
  it('I-5: transiciones permitidas', () => {
    expect(canTransition('pending', 'in_progress')).toBe(true)
    expect(canTransition('in_progress', 'ok')).toBe(true)
    expect(canTransition('in_progress', 'observed')).toBe(true)
    expect(canTransition('pending', 'ok')).toBe(true)
    expect(canTransition('pending', 'observed')).toBe(true)
  })

  it('I-5: transiciones no permitidas', () => {
    expect(canTransition('ok', 'pending')).toBe(false)
    expect(canTransition('observed', 'ok')).toBe(false)
    expect(canTransition('in_progress', 'pending')).toBe(false)
    expect(canTransition('pending', 'pending')).toBe(false)
  })

  it('I-5: pasar a "en revisión" asigna al inspector', () => {
    const r = transitionInspection(selection(), 'in_progress', { by: 'p-rev', at: AT })
    expect(r).toMatchObject({ status: 'in_progress', inspectorPersonId: 'p-rev', closedAt: null })
  })

  it('I-5: cerrar como observado registra la hora de cierre y la nota', () => {
    const r = transitionInspection(
      selection({ status: 'in_progress', inspectorPersonId: 'p-rev' }),
      'observed',
      {
        by: 'p-rev',
        at: '2026-11-21T15:20:00Z',
        notes: 'Peso bajo el mínimo',
      },
    )
    expect(r).toMatchObject({
      status: 'observed',
      closedAt: '2026-11-21T15:20:00Z',
      notes: 'Peso bajo el mínimo',
      inspectorPersonId: 'p-rev',
    })
  })

  it('I-5: una transición inválida es un error', () => {
    expect(() =>
      transitionInspection(selection({ status: 'ok' }), 'pending', { by: 'p', at: AT }),
    ).toThrow()
  })
})

describe('toPublicInspectionView — privacidad del motivo', () => {
  it('I-6: ante el piloto/público no se expone el motivo ni quién lo pidió', () => {
    const view = toPublicInspectionView(
      selection({
        reason: 'steward_selection',
        selectedBy: 'p-comisario',
        notes: 'Sospecha de peso',
      }),
    )
    expect(view).toEqual({ sessionId: 's-final-dd2', eventEntryId: 'ee-1', status: 'pending' })
    expect(Object.keys(view)).not.toContain('reason')
  })
})
