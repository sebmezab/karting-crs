export type DeclaredEquipmentType = 'chassis' | 'engine'

export interface DeclaredEquipment {
  equipmentId: string
  type: DeclaredEquipmentType
  serialNumber: string
  /** Sello vigente del motor (solo motores). */
  sealNumber?: string | null
}

export interface EquipmentDeclarationInput {
  declared: readonly DeclaredEquipment[]
  /** `rules.equipment_limits` (SPEC 6.6). */
  limits: { chassis: number; engine: number }
  /** `rules.engine_requires_seal`. */
  engineRequiresSeal: boolean
  /** equipmentId → etiqueta del otro piloto que ya lo inscribió en ESTA fecha. */
  equipmentUsedByOtherDrivers: ReadonlyMap<string, string>
}

export type EquipmentIssue =
  | { code: 'chassis_required' }
  | { code: 'engine_required' }
  | { code: 'chassis_limit_exceeded'; params: { limit: number; declared: number } }
  | { code: 'engine_limit_exceeded'; params: { limit: number; declared: number } }
  | { code: 'engine_seal_missing'; equipmentId: string; params: { serial: string } }
  | { code: 'duplicate_equipment'; equipmentId: string; params: { serial: string } }
  | {
      code: 'equipment_used_by_other_driver'
      equipmentId: string
      params: { serial: string; owner: string }
    }

export interface EquipmentDeclarationResult {
  valid: boolean
  issues: EquipmentIssue[]
}

/** Valida los chasis y motores que un piloto declara para una fecha (SPEC 7.2). */
export function validateEquipmentDeclaration(
  input: EquipmentDeclarationInput,
): EquipmentDeclarationResult {
  const issues: EquipmentIssue[] = []
  const chassisCount = input.declared.filter((e) => e.type === 'chassis').length
  const engineCount = input.declared.filter((e) => e.type === 'engine').length

  if (chassisCount === 0) issues.push({ code: 'chassis_required' })
  if (engineCount === 0) issues.push({ code: 'engine_required' })
  if (chassisCount > input.limits.chassis) {
    issues.push({
      code: 'chassis_limit_exceeded',
      params: { limit: input.limits.chassis, declared: chassisCount },
    })
  }
  if (engineCount > input.limits.engine) {
    issues.push({
      code: 'engine_limit_exceeded',
      params: { limit: input.limits.engine, declared: engineCount },
    })
  }

  const seen = new Set<string>()
  for (const item of input.declared) {
    const serial = item.serialNumber
    if (seen.has(item.equipmentId)) {
      issues.push({
        code: 'duplicate_equipment',
        equipmentId: item.equipmentId,
        params: { serial },
      })
      continue
    }
    seen.add(item.equipmentId)

    if (item.type === 'engine' && input.engineRequiresSeal && !item.sealNumber?.trim()) {
      issues.push({
        code: 'engine_seal_missing',
        equipmentId: item.equipmentId,
        params: { serial },
      })
    }

    // Un equipo no puede estar inscrito por dos pilotos en la misma fecha (SPEC 7.2).
    const owner = input.equipmentUsedByOtherDrivers.get(item.equipmentId)
    if (owner !== undefined) {
      issues.push({
        code: 'equipment_used_by_other_driver',
        equipmentId: item.equipmentId,
        params: { serial, owner },
      })
    }
  }

  return { valid: issues.length === 0, issues }
}
