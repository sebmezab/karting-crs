import { describe, expect, it } from 'vitest'
import { PERMISSIONS, PERMISSION_GROUPS } from './catalog'
import { effectivePermissions, expandPermissionPatterns, hasPermission } from './permissions'
import { ROLE_TEMPLATES } from './roleTemplates'

const SPEC_PERMISSIONS = [
  'entries.view',
  'entries.validate',
  'entries.mark_paid',
  'entries.export',
  'tech.mark_tires',
  'tech.verify_equipment',
  'tech.view_passport',
  'exceptions.request',
  'exceptions.decide',
  'sessions.manage',
  'sessions.start',
  'sessions.close',
  'results.enter',
  'inspection.select',
  'inspection.assign_inspector',
  'inspection.resolve',
  'penalties.create',
  'penalties.decide',
  'penalties.publish',
  'results.publish_official',
  'documents.publish',
  'documents.view_internal',
  'notifications.send',
  'event.view_all',
  'event.manage_staff',
]

describe('catálogo de permisos (SPEC 4.2)', () => {
  it('P-1: contiene exactamente los permisos de la tabla de la SPEC', () => {
    expect(PERMISSIONS.map((p) => p.key).sort()).toEqual([...SPEC_PERMISSIONS].sort())
  })

  it('P-1: cada permiso tiene grupo conocido y etiqueta en español, sin claves duplicadas', () => {
    const keys = PERMISSIONS.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const p of PERMISSIONS) {
      expect(PERMISSION_GROUPS[p.group]).toBeTruthy()
      expect(p.label.length).toBeGreaterThan(3)
    }
  })
})

describe('expandPermissionPatterns', () => {
  it('P-2: "sessions.*" se expande a todos los permisos de sesiones', () => {
    expect([...expandPermissionPatterns(['sessions.*'])].sort()).toEqual([
      'sessions.close',
      'sessions.manage',
      'sessions.start',
    ])
  })

  it('P-2: combina permisos sueltos y comodines sin duplicar', () => {
    const set = expandPermissionPatterns(['tech.mark_tires', 'tech.*'])
    expect(set.size).toBe(3)
  })

  it('P-3: un permiso inexistente es un error de configuración', () => {
    expect(() => expandPermissionPatterns(['tech.fly'])).toThrow(/tech\.fly/)
    expect(() => expandPermissionPatterns(['nada.*'])).toThrow(/nada\.\*/)
  })
})

describe('plantillas de rol estándar (SPEC 4.2)', () => {
  const expanded = (name: string) => {
    const template = ROLE_TEMPLATES.find((t) => t.name === name)
    if (!template) throw new Error(`Falta la plantilla ${name}`)
    return [...expandPermissionPatterns(template.permissions)].sort()
  }

  it('P-4: existen las 6 plantillas', () => {
    expect(ROLE_TEMPLATES.map((t) => t.name)).toEqual([
      'Director de carrera',
      'Director técnico',
      'Revisor técnico',
      'Comisario deportivo',
      'Cronometrista',
      'Secretaría',
    ])
  })

  it('P-4: Director de carrera', () => {
    expect(expanded('Director de carrera')).toEqual(
      [
        'event.view_all',
        'sessions.manage',
        'sessions.start',
        'sessions.close',
        'results.publish_official',
        'documents.publish',
        'notifications.send',
      ].sort(),
    )
  })

  it('P-4: Director técnico', () => {
    expect(expanded('Director técnico')).toEqual(
      [
        'tech.mark_tires',
        'tech.verify_equipment',
        'tech.view_passport',
        'inspection.select',
        'inspection.assign_inspector',
        'inspection.resolve',
        'exceptions.decide',
      ].sort(),
    )
  })

  it('P-4: Revisor técnico', () => {
    expect(expanded('Revisor técnico')).toEqual(
      [
        'tech.mark_tires',
        'tech.verify_equipment',
        'tech.view_passport',
        'inspection.resolve',
        'exceptions.request',
      ].sort(),
    )
  })

  it('P-4: Comisario deportivo', () => {
    expect(expanded('Comisario deportivo')).toEqual(
      [
        'exceptions.decide',
        'inspection.select',
        'penalties.create',
        'penalties.decide',
        'penalties.publish',
        'documents.publish',
      ].sort(),
    )
  })

  it('P-4: Cronometrista', () => {
    expect(expanded('Cronometrista')).toEqual(['results.enter', 'sessions.close'])
  })

  it('P-4: Secretaría', () => {
    expect(expanded('Secretaría')).toEqual(
      [
        'documents.publish',
        'entries.export',
        'entries.mark_paid',
        'entries.validate',
        'entries.view',
      ].sort(),
    )
  })
})

describe('permisos efectivos por fecha', () => {
  const roles = [
    { id: 'r-crono', permissions: ['sessions.close', 'results.enter'] as const },
    { id: 'r-rev', permissions: ['tech.mark_tires', 'inspection.resolve'] as const },
  ]
  const assignments = [
    { eventId: 'f5', personId: 'p-1', roleId: 'r-rev' },
    { eventId: 'f6', personId: 'p-1', roleId: 'r-crono' },
    { eventId: 'f6', personId: 'p-1', roleId: 'r-rev' },
    { eventId: 'f6', personId: 'p-2', roleId: 'r-crono' },
  ]

  it('P-5: una persona con varios roles en la fecha tiene la unión de permisos', () => {
    const perms = effectivePermissions({ assignments, roles, personId: 'p-1', eventId: 'f6' })
    expect([...perms].sort()).toEqual(
      ['inspection.resolve', 'results.enter', 'sessions.close', 'tech.mark_tires'].sort(),
    )
  })

  it('P-6: los roles de la fecha 5 no dan permisos en otra fecha', () => {
    const perms = effectivePermissions({ assignments, roles, personId: 'p-1', eventId: 'f4' })
    expect(perms.size).toBe(0)
  })

  it('P-6: ignora asignaciones a roles inexistentes', () => {
    const perms = effectivePermissions({
      assignments: [{ eventId: 'f6', personId: 'p-3', roleId: 'r-borrado' }],
      roles,
      personId: 'p-3',
      eventId: 'f6',
    })
    expect(perms.size).toBe(0)
  })

  it('P-7: hasPermission es falso si el rol no tiene el permiso', () => {
    const perms = effectivePermissions({ assignments, roles, personId: 'p-2', eventId: 'f6' })
    expect(hasPermission(perms, 'sessions.close')).toBe(true)
    expect(hasPermission(perms, 'inspection.select')).toBe(false)
  })
})
