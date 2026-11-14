/**
 * Catálogo de permisos atómicos (SPEC 4.2). Es lo ÚNICO del RBAC que se programa:
 * los roles son configurables por organización y se arman con estos permisos.
 * Para agregar uno, ver `.claude/commands/new-permission.md`.
 */

export const PERMISSION_GROUPS = {
  entries: 'Inscripciones',
  tech: 'Técnica',
  exceptions: 'Excepciones',
  sessions: 'Sesiones',
  inspection: 'Revisión post-sesión',
  penalties: 'Sanciones',
  results: 'Resultados',
  documents: 'Documentos',
  notifications: 'Comunicaciones',
  event: 'Fecha',
} as const

export type PermissionGroup = keyof typeof PERMISSION_GROUPS

export const PERMISSIONS = [
  { key: 'entries.view', group: 'entries', label: 'Ver inscripciones' },
  { key: 'entries.validate', group: 'entries', label: 'Validar inscripciones' },
  { key: 'entries.mark_paid', group: 'entries', label: 'Marcar pagos' },
  { key: 'entries.export', group: 'entries', label: 'Exportar inscripciones' },
  { key: 'tech.mark_tires', group: 'tech', label: 'Marcar neumáticos' },
  { key: 'tech.verify_equipment', group: 'tech', label: 'Verificar chasis y motores' },
  { key: 'tech.view_passport', group: 'tech', label: 'Ver pasaporte técnico' },
  { key: 'exceptions.request', group: 'exceptions', label: 'Solicitar excepciones' },
  { key: 'exceptions.decide', group: 'exceptions', label: 'Aprobar o rechazar excepciones' },
  { key: 'sessions.manage', group: 'sessions', label: 'Crear y editar sesiones' },
  { key: 'sessions.start', group: 'sessions', label: 'Dar inicio a sesiones' },
  { key: 'sessions.close', group: 'sessions', label: 'Cerrar sesiones' },
  { key: 'results.enter', group: 'sessions', label: 'Ingresar Top N / resultado provisional' },
  { key: 'inspection.select', group: 'inspection', label: 'Asignar karts a revisión' },
  { key: 'inspection.assign_inspector', group: 'inspection', label: 'Asignar revisor' },
  { key: 'inspection.resolve', group: 'inspection', label: 'Declarar resultado de revisión' },
  { key: 'penalties.create', group: 'penalties', label: 'Crear sanciones' },
  { key: 'penalties.decide', group: 'penalties', label: 'Decidir sanciones' },
  { key: 'penalties.publish', group: 'penalties', label: 'Publicar sanciones' },
  { key: 'results.publish_official', group: 'results', label: 'Publicar resultados oficiales' },
  { key: 'documents.publish', group: 'documents', label: 'Publicar documentos' },
  { key: 'documents.view_internal', group: 'documents', label: 'Ver documentos internos' },
  { key: 'notifications.send', group: 'notifications', label: 'Enviar notificaciones' },
  { key: 'event.view_all', group: 'event', label: 'Ver todo en la fecha' },
  { key: 'event.manage_staff', group: 'event', label: 'Gestionar staff de la fecha' },
] as const satisfies readonly { key: string; group: PermissionGroup; label: string }[]

export type PermissionKey = (typeof PERMISSIONS)[number]['key']
