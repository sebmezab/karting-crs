import { es } from '@/i18n/es'
import type { DemoSession } from './session'

export interface NavItem {
  to: string
  label: string
  /** Visibilidad por permiso: la UI solo oculta; la barrera real será la BD (RLS). */
  visible: (s: DemoSession) => boolean
}

const always = () => true

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: es.nav.home, visible: always },
  { to: '/piloto', label: es.nav.myProfile, visible: (s) => s.persona.key === 'driver' },
  { to: '/piloto/inscripcion', label: es.nav.register, visible: (s) => s.persona.key === 'driver' },
  { to: '/tecnica/neumaticos', label: es.nav.tires, visible: (s) => s.can('tech.mark_tires') },
  { to: '/sesiones', label: es.nav.sessions, visible: (s) => s.can('sessions.close') },
  {
    to: '/revision',
    label: es.nav.inspection,
    visible: (s) =>
      s.can('inspection.resolve') || s.can('inspection.select') || s.can('event.view_all'),
  },
  {
    to: '/excepciones',
    label: es.nav.exceptions,
    visible: (s) => s.can('exceptions.decide') || s.can('exceptions.request'),
  },
  { to: '/tecnica/codigos', label: es.nav.testCodes, visible: (s) => s.can('tech.mark_tires') },
  { to: '/admin', label: es.nav.admin, visible: (s) => s.persona.isOrgAdmin },
  { to: '/tabla', label: es.nav.standings, visible: always },
  { to: '/pantalla', label: es.nav.trackScreen, visible: always },
]

export function visibleNav(session: DemoSession): NavItem[] {
  return NAV_ITEMS.filter((item) => item.visible(session))
}

/** ¿Puede la sesión abrir esta ruta? Usado por las páginas para mostrar el aviso de acceso. */
export function canOpen(session: DemoSession, path: string): boolean {
  const item = NAV_ITEMS.find((i) => i.to === path)
  return item ? item.visible(session) : true
}
