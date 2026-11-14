/**
 * Textos de la interfaz en español (Chile). Centralizados para permitir i18n futuro (SPEC 12.2).
 * El código y los datos usan códigos estables en inglés; aquí se traducen.
 */
import type { RepositoryErrorCode } from '@/data/errors'
import type { ExceptionType, SessionType } from '@/data/types'
import type { EquipmentIssue } from '@/domain/equipment'
import type { InspectionStatus } from '@/domain/inspection'
import type { TireEventKind, TireIssue, TireMarkingStatus, TirePosition } from '@/domain/tires'

export const es = {
  app: {
    name: 'Campeonato Regional Sur',
    viewAs: 'Ver como',
    feedback: 'Enviar comentario',
    resetDemo: 'Reiniciar demo',
    resetDemoConfirm: '¿Volver a los datos de ejemplo? Se pierden los cambios hechos en esta demo.',
    demoBanner: 'Demo con datos ficticios. Nada de lo que hagas aquí es oficial.',
    offline: 'Sin conexión. Los cambios se guardarán cuando vuelva la señal.',
    loading: 'Cargando…',
    loadError: 'No se pudieron cargar los datos. Revisa la conexión y vuelve a intentar.',
    retry: 'Reintentar',
    notAllowedTitle: 'Esta sección no está disponible para tu rol',
    notAllowedBody: 'Elige otro rol en "Ver como" para recorrer este flujo.',
    menu: 'Menú',
  },
  nav: {
    home: 'Inicio',
    standings: 'Tabla',
    trackScreen: 'Pantalla en pista',
    myProfile: 'Mi equipo',
    register: 'Inscribirme',
    tires: 'Neumáticos',
    testCodes: 'Códigos de prueba',
    sessions: 'Sesiones',
    inspection: 'Revisión',
    exceptions: 'Excepciones',
    admin: 'Administración',
  },
  feedback: {
    title: 'Enviar comentario',
    short: 'Comentar',
    intro: 'Cuéntanos qué funcionó, qué no y qué falta. Lo leemos todo.',
    label: 'Comentario',
    send: 'Abrir correo para enviar',
    copy: 'Copiar comentario',
    copied: 'Copiado. Pégalo en el grupo de WhatsApp de la organización.',
    close: 'Cerrar',
    noEmail: 'Esta demo no tiene correo configurado: copia el texto y compártelo.',
  },
  tireKind: {
    change: 'Fecha de cambio',
    continuation: 'Fecha de continuación',
    not_counted: 'No cuenta para el ciclo',
  } satisfies Record<TireEventKind, string>,
  tireKindHelp: {
    change: 'Se puede marcar un juego nuevo o usado; vale hasta el próximo cambio.',
    continuation: 'Cada piloto debe usar el mismo juego marcado en la fecha de cambio.',
    not_counted: 'Solo se registran los seriales.',
  } satisfies Record<TireEventKind, string>,
  tirePosition: {
    FL: 'Delantero izq.',
    FR: 'Delantero der.',
    RL: 'Trasero izq.',
    RR: 'Trasero der.',
  } satisfies Record<TirePosition, string>,
  scanner: {
    starting: 'Abriendo la cámara…',
    aim: 'Pon la etiqueta dentro del recuadro: se lee el código de barras o el número impreso.',
    denied:
      'No hay permiso para usar la cámara. Actívalo en el navegador o ingresa el serial a mano.',
    unavailable:
      'Este navegador no puede usar la cámara aquí (requiere HTTPS). Ingresa el serial a mano.',
    textLoading: 'Preparando la lectura del número impreso…',
    textFailed:
      'No se pudo preparar la lectura del número impreso; solo se lee el código de barras.',
    textFound: 'Número leído en la etiqueta. Revisa que esté bien antes de usarlo:',
    useCandidate: (serial: string) => `Usar ${serial}`,
    torchOn: 'Encender linterna',
    torchOff: 'Apagar linterna',
  },
  tireVerdict: {
    ok: 'Marcación válida',
    warning: 'Revisar antes de guardar',
    blocked: 'Marcación bloqueada',
    overridden: 'Válida con excepción aprobada',
  } satisfies Record<TireMarkingStatus, string>,
  inspectionStatus: {
    pending: 'Pendiente',
    in_progress: 'En revisión',
    ok: 'OK',
    observed: 'Observado',
  } satisfies Record<InspectionStatus, string>,
  inspectionReason: {
    top_n: 'Top N',
    steward_selection: 'A criterio',
  },
  publicInspection: 'Seleccionado para revisión',
  exceptionType: {
    puncture_replacement: 'Reemplazo por pinchazo',
    late_entry_used_tires: 'Ingreso tardío con neumáticos usados',
    other: 'Otra',
  } satisfies Record<ExceptionType, string>,
  exceptionStatus: { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' },
  sessionType: {
    practice: 'Práctica',
    qualifying: 'Clasificación',
    prefinal: 'Prefinal',
    final: 'Final',
    other: 'Otra',
  } satisfies Record<SessionType, string>,
  sessionStatus: {
    scheduled: 'Programada',
    running: 'En pista',
    finished: 'Terminada',
    official: 'Oficial',
  },
  entryStatus: {
    pending: 'Pendiente de validación',
    confirmed: 'Confirmada',
    rejected: 'Rechazada',
  },
  repositoryError: {
    not_found: 'No se encontró el registro. Recarga la página.',
    tire_marking_blocked: 'La marcación está bloqueada y no se puede guardar.',
    used_tires_confirmation_required: 'Confirma que los neumáticos son usados antes de guardar.',
    equipment_invalid: 'Revisa el equipo declarado.',
    already_selected: 'Ese kart ya está seleccionado para revisión en esta sesión.',
    invalid_transition: 'Ese cambio de estado no está permitido.',
    already_decided: 'Esta solicitud ya fue decidida. Para corregirla, crea una solicitud nueva.',
  } satisfies Record<RepositoryErrorCode, string>,
} as const

/** Mensaje de cada resultado de la validación de neumáticos (tabla SPEC 7.1). */
export function tireIssueMessage(issue: TireIssue): string {
  const pos = issue.position ?? ''
  const p = issue.params ?? {}
  switch (issue.code) {
    case 'missing_serial':
      return `Falta el serial del neumático ${pos}.`
    case 'duplicate_serial_in_set':
      return `Neumático ${pos}: el serial ${p.serial} está repetido en este juego.`
    case 'serial_owned_by_other_driver':
      return `Neumático ${pos}: el serial ${p.serial} está registrado a nombre de otro piloto (${p.owner}). El intercambio entre pilotos está prohibido.`
    case 'serial_mismatch_continuation':
      return `Fecha de continuación: este juego debe ser el mismo de la Fecha ${p.round}. Neumático ${pos} no coincide.`
    case 'replacement_approved':
      return `Neumático ${pos} reemplazado (${p.serial}) con excepción de pinchazo aprobada.`
    case 'late_entry_used_required':
      return 'Fecha de continuación sin juego activo (ingreso tardío): los neumáticos deben ser usados. Al guardar queda una excepción pendiente para el comisario.'
    case 'brand_model_mismatch':
      return 'Indicaste que los neumáticos no corresponden a la marca o modelo de la categoría.'
    case 'new_cycle_set':
      return 'Fecha de cambio: este juego queda registrado y debe mantenerse hasta el próximo cambio (Reglamento 10.3).'
    case 'same_set_ok':
      return `Fecha de continuación: es el mismo juego de la Fecha ${p.round}.`
    case 'not_counted_event':
      return 'Esta fecha no cuenta para el ciclo de neumáticos: solo se registran los seriales.'
  }
}

export function equipmentIssueMessage(issue: EquipmentIssue): string {
  switch (issue.code) {
    case 'chassis_required':
      return 'Declara al menos un chasis.'
    case 'engine_required':
      return 'Declara al menos un motor.'
    case 'chassis_limit_exceeded':
      return `Máximo ${issue.params.limit} chasis por fecha (declaraste ${issue.params.declared}).`
    case 'engine_limit_exceeded':
      return `Máximo ${issue.params.limit} motores por fecha (declaraste ${issue.params.declared}).`
    case 'engine_seal_missing':
      return `El motor ${issue.params.serial} no tiene sello vigente.`
    case 'duplicate_equipment':
      return `El equipo ${issue.params.serial} está declarado dos veces.`
    case 'equipment_used_by_other_driver':
      return `El equipo ${issue.params.serial} ya está inscrito por otro piloto en esta fecha (${issue.params.owner}).`
  }
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'string' && code in es.repositoryError) {
      return es.repositoryError[code as RepositoryErrorCode]
    }
  }
  return 'Algo falló al guardar. Revisa la conexión y vuelve a intentar.'
}
