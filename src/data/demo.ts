/**
 * Personas de demo para el selector de rol (Fase 0, sin login).
 * En Fase 1 esto se reemplaza por el usuario autenticado (magic link) y sus roles reales.
 * TODOS los nombres son ficticios (SPEC §9: nunca datos reales en la demo).
 */
export type DemoPersonaKey =
  'public' | 'driver' | 'tech_inspector' | 'steward' | 'timekeeper' | 'technical_director' | 'admin'

export interface DemoPersona {
  key: DemoPersonaKey
  /** Nombre del rol en la UI. */
  roleLabel: string
  personId: string | null
  isOrgAdmin: boolean
}

export const DEMO_IDS = {
  organization: 'org-crs',
  championship: 'ch-crs-2026',
  currentEvent: 'ev-2026-f6',
  driverPerson: 'p-sofia-paredes',
  techInspector: 'p-diego-fuentes',
  steward: 'p-carla-rojas',
  timekeeper: 'p-marcelo-vidal',
  technicalDirector: 'p-pablo-navarro',
  admin: 'p-javiera-campos',
} as const

export const DEMO_PERSONAS: readonly DemoPersona[] = [
  { key: 'public', roleLabel: 'Público', personId: null, isOrgAdmin: false },
  { key: 'driver', roleLabel: 'Piloto', personId: DEMO_IDS.driverPerson, isOrgAdmin: false },
  {
    key: 'tech_inspector',
    roleLabel: 'Revisor técnico',
    personId: DEMO_IDS.techInspector,
    isOrgAdmin: false,
  },
  { key: 'steward', roleLabel: 'Comisario', personId: DEMO_IDS.steward, isOrgAdmin: false },
  {
    key: 'timekeeper',
    roleLabel: 'Cronometrista',
    personId: DEMO_IDS.timekeeper,
    isOrgAdmin: false,
  },
  {
    key: 'technical_director',
    roleLabel: 'Director técnico',
    personId: DEMO_IDS.technicalDirector,
    isOrgAdmin: false,
  },
  { key: 'admin', roleLabel: 'Admin', personId: DEMO_IDS.admin, isOrgAdmin: true },
]

/** Casos de ejemplo de la marcación de neumáticos en F6 (SPEC §9). */
export interface TireDemoCase {
  key: 'ok' | 'mismatch' | 'exchange' | 'late_entry'
  title: string
  kartNumber: number
  serials: { FL: string; FR: string; RL: string; RR: string }
}

export const TIRE_DEMO_CASES: readonly TireDemoCase[] = [
  {
    key: 'ok',
    title: 'Mismo juego del ciclo',
    kartNumber: 312,
    serials: { FL: 'MG-312-A1', FR: 'MG-312-A2', RL: 'MG-312-A3', RR: 'MG-312-A4' },
  },
  {
    key: 'mismatch',
    title: 'Neumático cambiado en continuación',
    kartNumber: 327,
    serials: { FL: 'MG-327-A1', FR: 'MG-327-A2', RL: 'MG-327-A3', RR: 'MG-327-C4' },
  },
  {
    key: 'exchange',
    title: 'Neumático de otro piloto',
    kartNumber: 341,
    serials: { FL: 'MG-341-A1', FR: 'MG-355-A2', RL: 'MG-341-A3', RR: 'MG-341-A4' },
  },
  {
    key: 'late_entry',
    title: 'Ingreso tardío (sin juego)',
    kartNumber: 366,
    serials: { FL: 'MG-366-U1', FR: 'MG-366-U2', RL: 'MG-366-U3', RR: 'MG-366-U4' },
  },
]
