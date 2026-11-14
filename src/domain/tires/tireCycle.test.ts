import { describe, expect, it } from 'vitest'
import { classifyTireEvents, currentCycleStartEventId, type CycleEvent } from './tireCycle'

const crs2026: CycleEvent[] = [
  {
    id: 'f1',
    date: '2026-02-21',
    roundNumber: 1,
    countsForTireCycle: false,
    tireChangeOverride: null,
  },
  {
    id: 'f2',
    date: '2026-03-21',
    roundNumber: 2,
    countsForTireCycle: true,
    tireChangeOverride: null,
  },
  {
    id: 'f3',
    date: '2026-05-23',
    roundNumber: 3,
    countsForTireCycle: true,
    tireChangeOverride: null,
  },
  {
    id: 'f4',
    date: '2026-08-22',
    roundNumber: 4,
    countsForTireCycle: true,
    tireChangeOverride: null,
  },
  {
    id: 'f5',
    date: '2026-10-10',
    roundNumber: 5,
    countsForTireCycle: true,
    tireChangeOverride: null,
  },
  {
    id: 'f6',
    date: '2026-11-21',
    roundNumber: 6,
    countsForTireCycle: true,
    tireChangeOverride: null,
  },
]

describe('classifyTireEvents — tipo de fecha para neumáticos (SPEC 7.1)', () => {
  it('T-C1: calendario CRS 2026 con F1 excluida y ciclo de 2 → F2 cambio, F3 cont., F4 cambio, F5 cont., F6 cambio', () => {
    const result = classifyTireEvents(crs2026, 2)
    expect(result.get('f1')).toEqual({ kind: 'not_counted', source: 'calculated' })
    expect(result.get('f2')).toEqual({ kind: 'change', source: 'calculated' })
    expect(result.get('f3')).toEqual({ kind: 'continuation', source: 'calculated' })
    expect(result.get('f4')).toEqual({ kind: 'change', source: 'calculated' })
    expect(result.get('f5')).toEqual({ kind: 'continuation', source: 'calculated' })
    expect(result.get('f6')).toEqual({ kind: 'change', source: 'calculated' })
  })

  it('T-C2: el override manual del admin manda sobre el cálculo', () => {
    const events = crs2026.map((e) =>
      e.id === 'f6'
        ? { ...e, tireChangeOverride: false }
        : e.id === 'f3'
          ? { ...e, tireChangeOverride: true }
          : e,
    )
    const result = classifyTireEvents(events, 2)
    expect(result.get('f6')).toEqual({ kind: 'continuation', source: 'override' })
    expect(result.get('f3')).toEqual({ kind: 'change', source: 'override' })
    // El resto sigue calculado igual.
    expect(result.get('f4')).toEqual({ kind: 'change', source: 'calculated' })
  })

  it('T-C2: el override aplica incluso a una fecha que no cuenta para el ciclo', () => {
    const events = crs2026.map((e) => (e.id === 'f1' ? { ...e, tireChangeOverride: true } : e))
    expect(classifyTireEvents(events, 2).get('f1')).toEqual({ kind: 'change', source: 'override' })
  })

  it('T-C3: usa el orden cronológico aunque las fechas lleguen desordenadas', () => {
    const shuffled = [
      crs2026[4],
      crs2026[1],
      crs2026[5],
      crs2026[0],
      crs2026[3],
      crs2026[2],
    ].filter((e): e is CycleEvent => e !== undefined)
    const result = classifyTireEvents(shuffled, 2)
    expect(result.get('f2')?.kind).toBe('change')
    expect(result.get('f3')?.kind).toBe('continuation')
    expect(result.get('f6')?.kind).toBe('change')
  })

  it('con ciclo de 3 fechas, cambia cada 3 fechas que cuentan', () => {
    const result = classifyTireEvents(crs2026, 3)
    expect(['f2', 'f3', 'f4', 'f5', 'f6'].map((id) => result.get(id)?.kind)).toEqual([
      'change',
      'continuation',
      'continuation',
      'change',
      'continuation',
    ])
  })

  it('T-C4: un largo de ciclo menor a 1 es un error de configuración', () => {
    expect(() => classifyTireEvents(crs2026, 0)).toThrow(/ciclo/i)
    expect(() => classifyTireEvents(crs2026, 1.5)).toThrow(/ciclo/i)
  })
})

describe('currentCycleStartEventId — fecha de cambio que abre el ciclo vigente', () => {
  it('T-J1: para F5 (continuación) el ciclo vigente empezó en F4', () => {
    expect(currentCycleStartEventId(crs2026, 2, 'f5')).toBe('f4')
  })

  it('para una fecha de cambio, el ciclo empieza en ella misma', () => {
    expect(currentCycleStartEventId(crs2026, 2, 'f4')).toBe('f4')
  })

  it('respeta los overrides: F6 forzada a continuación sigue en el ciclo de F4', () => {
    const events = crs2026.map((e) => (e.id === 'f6' ? { ...e, tireChangeOverride: false } : e))
    expect(currentCycleStartEventId(events, 2, 'f6')).toBe('f4')
  })

  it('sin fecha de cambio previa (o fecha inexistente) → null', () => {
    expect(currentCycleStartEventId(crs2026, 2, 'f1')).toBeNull()
    expect(currentCycleStartEventId(crs2026, 2, 'nope')).toBeNull()
  })
})
