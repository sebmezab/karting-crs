/**
 * Sesión de la demo (Fase 0): el "usuario" es la persona elegida en el selector de rol.
 * Los permisos se calculan igual que en producción: unión de los roles asignados a esa
 * persona en la fecha (domain/permissions). En Fase 1 se reemplaza por Supabase Auth.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@/data/DataProvider'
import { DEMO_IDS, DEMO_PERSONAS, type DemoPersona, type DemoPersonaKey } from '@/data/demo'
import { effectivePermissions, type PermissionKey } from '@/domain/permissions'

export interface DemoSession {
  persona: DemoPersona
  setPersona: (key: DemoPersonaKey) => void
  /** Fecha en curso de la demo (F6). */
  eventId: string
  permissions: ReadonlySet<PermissionKey>
  can: (key: PermissionKey) => boolean
}

const PERSONA_KEY = 'karting-crs-persona'
const SessionContext = createContext<DemoSession | null>(null)

function loadPersona(): DemoPersonaKey {
  try {
    const saved = window.localStorage.getItem(PERSONA_KEY)
    if (DEMO_PERSONAS.some((p) => p.key === saved)) return saved as DemoPersonaKey
  } catch {
    // sin almacenamiento: se parte como público
  }
  return 'public'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [personaKey, setPersonaKey] = useState<DemoPersonaKey>(loadPersona)
  const eventId = DEMO_IDS.currentEvent
  const persona =
    DEMO_PERSONAS.find((p) => p.key === personaKey) ?? (DEMO_PERSONAS[0] as DemoPersona)

  const staff = useQuery(
    async (repos) => ({
      roles: await repos.staff.listRoles(),
      assignments: await repos.staff.listForEvent(eventId),
    }),
    [eventId],
  )

  const permissions = useMemo(() => {
    if (!persona.personId || !staff.data) return new Set<PermissionKey>()
    return effectivePermissions({
      assignments: staff.data.assignments,
      roles: staff.data.roles,
      personId: persona.personId,
      eventId,
    })
  }, [persona.personId, staff.data, eventId])

  const setPersona = useCallback((key: DemoPersonaKey) => {
    setPersonaKey(key)
    try {
      window.localStorage.setItem(PERSONA_KEY, key)
    } catch {
      // ignorar
    }
  }, [])

  const value = useMemo<DemoSession>(
    () => ({ persona, setPersona, eventId, permissions, can: (k) => permissions.has(k) }),
    [persona, setPersona, eventId, permissions],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): DemoSession {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession() fuera de <SessionProvider>')
  return session
}
