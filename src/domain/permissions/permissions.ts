import { PERMISSIONS, type PermissionKey } from './catalog'

const ALL_KEYS: readonly PermissionKey[] = PERMISSIONS.map((p) => p.key)

/**
 * Expande una lista de permisos y comodines por prefijo (`sessions.*`) a permisos concretos.
 * Un comodín toma todas las claves que empiezan con el prefijo; nótese que `results.enter`
 * pertenece al grupo Sesiones en la UI pero su clave empieza con `results.`.
 * Un permiso o comodín inexistente es un error de configuración.
 */
export function expandPermissionPatterns(patterns: readonly string[]): Set<PermissionKey> {
  const result = new Set<PermissionKey>()
  for (const pattern of patterns) {
    const matches = pattern.endsWith('.*')
      ? ALL_KEYS.filter((key) => key.startsWith(pattern.slice(0, -1)))
      : ALL_KEYS.filter((key) => key === pattern)
    if (matches.length === 0) {
      throw new Error(`Permiso desconocido en la configuración de roles: "${pattern}"`)
    }
    for (const key of matches) result.add(key)
  }
  return result
}

export interface RoleDefinition {
  id: string
  permissions: readonly PermissionKey[]
}

export interface StaffAssignment {
  eventId: string
  personId: string
  roleId: string
}

/**
 * Permisos efectivos de una persona en una fecha = unión de los permisos de todos sus roles
 * asignados en ESA fecha (SPEC 4.2). El staff cambia en cada fecha.
 */
export function effectivePermissions(args: {
  assignments: readonly StaffAssignment[]
  roles: readonly RoleDefinition[]
  personId: string
  eventId: string
}): Set<PermissionKey> {
  const rolesById = new Map(args.roles.map((r) => [r.id, r]))
  const result = new Set<PermissionKey>()
  for (const a of args.assignments) {
    if (a.personId !== args.personId || a.eventId !== args.eventId) continue
    const role = rolesById.get(a.roleId)
    if (!role) continue
    for (const key of role.permissions) result.add(key)
  }
  return result
}

/**
 * Consulta de permiso para mostrar/ocultar acciones en la UI.
 * La barrera real de seguridad es la BD (`has_permission` en RLS, desde Fase 1).
 */
export function hasPermission(
  permissions: ReadonlySet<PermissionKey>,
  key: PermissionKey,
): boolean {
  return permissions.has(key)
}
