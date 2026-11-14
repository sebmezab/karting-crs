import { describe, expect, it } from 'vitest'
import { CRS_2026_RULES, parseChampionshipRules } from './championshipRules'

describe('reglas configurables del campeonato (SPEC 6.6)', () => {
  it('el preset CRS 2026 es válido según el esquema', () => {
    expect(parseChampionshipRules(CRS_2026_RULES)).toEqual(CRS_2026_RULES)
  })

  it('el preset CRS 2026 tiene ciclo de 2 fechas, juegos de 4 y límites 2/2', () => {
    expect(CRS_2026_RULES.tires.cycle_length_events).toBe(2)
    expect(CRS_2026_RULES.tires.set_size).toBe(4)
    expect(CRS_2026_RULES.equipment_limits).toEqual({ chassis: 2, engine: 2 })
    expect(CRS_2026_RULES.post_session_inspection.default_top_n).toBe(3)
    expect(CRS_2026_RULES.registration.late_fee_per_day_clp).toBe(15000)
  })

  it('rechaza un ciclo de neumáticos menor a 1', () => {
    const bad = { ...CRS_2026_RULES, tires: { ...CRS_2026_RULES.tires, cycle_length_events: 0 } }
    expect(() => parseChampionshipRules(bad)).toThrow()
  })

  it('rechaza límites de equipo negativos o no enteros', () => {
    expect(() =>
      parseChampionshipRules({ ...CRS_2026_RULES, equipment_limits: { chassis: -1, engine: 2 } }),
    ).toThrow()
    expect(() =>
      parseChampionshipRules({ ...CRS_2026_RULES, equipment_limits: { chassis: 1.5, engine: 2 } }),
    ).toThrow()
  })

  it('rechaza claves desconocidas (evita errores de tipeo en la configuración)', () => {
    expect(() => parseChampionshipRules({ ...CRS_2026_RULES, tirse: {} })).toThrow()
  })
})
