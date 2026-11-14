/**
 * Plantillas de rol estándar de la plataforma (SPEC 4.2), con nombres según reglamento
 * chileno/FIA. La organización puede usarlas tal cual, copiarlas y modificarlas, o crear
 * roles propios. En la BD serán filas de `role` con `organization_id = NULL`.
 */
export interface RoleTemplate {
  id: string
  name: string
  description: string
  /** Permisos y comodines (`grupo.*`), expandidos con `expandPermissionPatterns`. */
  permissions: readonly string[]
}

export const ROLE_TEMPLATES: readonly RoleTemplate[] = [
  {
    id: 'tpl-race-director',
    name: 'Director de carrera',
    description: 'Conduce la fecha: sesiones, resultados oficiales y comunicados.',
    permissions: [
      'event.view_all',
      'sessions.*',
      'results.publish_official',
      'documents.publish',
      'notifications.send',
    ],
  },
  {
    id: 'tpl-technical-director',
    name: 'Director técnico',
    description: 'Responsable del control técnico y la revisión post-sesión.',
    permissions: ['tech.*', 'inspection.*', 'exceptions.decide'],
  },
  {
    id: 'tpl-tech-inspector',
    name: 'Revisor técnico',
    description: 'Marca neumáticos, verifica equipos y resuelve revisiones.',
    permissions: [
      'tech.mark_tires',
      'tech.verify_equipment',
      'tech.view_passport',
      'inspection.resolve',
      'exceptions.request',
    ],
  },
  {
    id: 'tpl-steward',
    name: 'Comisario deportivo',
    description: 'Decide excepciones y sanciones; puede enviar karts a revisión.',
    permissions: ['exceptions.decide', 'inspection.select', 'penalties.*', 'documents.publish'],
  },
  {
    id: 'tpl-timekeeper',
    name: 'Cronometrista',
    description: 'Cierra sesiones e ingresa el Top N.',
    permissions: ['sessions.close', 'results.enter'],
  },
  {
    id: 'tpl-secretary',
    name: 'Secretaría',
    description: 'Gestiona inscripciones y pagos.',
    permissions: ['entries.*', 'documents.publish'],
  },
]
