import { z } from 'zod'

/**
 * Esquema de `championship.rules` (jsonb, SPEC 6.6). Todo lo que depende del reglamento se
 * configura aquí, no en el código. El puntaje (6.7) vive en su propio `scoring_ruleset` (Fase 3).
 */
const positiveInt = z.number().int().min(1)
const nonNegativeInt = z.number().int().min(0)

export const championshipRulesSchema = z.strictObject({
  tires: z.strictObject({
    cycle_length_events: positiveInt,
    marked_kinds: z.array(z.enum(['slick', 'rain'])).min(1),
    set_size: positiveInt,
    allow_used_on_change_event: z.boolean(),
    late_entry_requires_used: z.boolean(),
    puncture_replacement_requires_approval: z.boolean(),
  }),
  equipment_limits: z.strictObject({ chassis: nonNegativeInt, engine: nonNegativeInt }),
  engine_requires_seal: z.boolean(),
  no_equipment_sharing_between_drivers: z.boolean(),
  post_session_inspection: z.strictObject({ default_top_n: positiveInt }),
  registration: z.strictObject({ late_fee_per_day_clp: nonNegativeInt }),
})

export type ChampionshipRules = z.infer<typeof championshipRulesSchema>

/** Preset del Campeonato Regional Sur 2026 (datos de referencia). */
export const CRS_2026_RULES: ChampionshipRules = {
  tires: {
    cycle_length_events: 2,
    marked_kinds: ['slick'],
    set_size: 4,
    allow_used_on_change_event: true,
    late_entry_requires_used: true,
    puncture_replacement_requires_approval: true,
  },
  equipment_limits: { chassis: 2, engine: 2 },
  engine_requires_seal: true,
  no_equipment_sharing_between_drivers: true,
  post_session_inspection: { default_top_n: 3 },
  registration: { late_fee_per_day_clp: 15000 },
}

export function parseChampionshipRules(value: unknown): ChampionshipRules {
  return championshipRulesSchema.parse(value)
}
