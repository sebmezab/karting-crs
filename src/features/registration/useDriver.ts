import { useSession } from '@/app/session'
import { useQuery } from '@/data/DataProvider'

/** Datos del piloto de la sesión (Fase 0: la persona de demo con rol Piloto). */
export function useDriver() {
  const session = useSession()
  const personId = session.persona.personId ?? ''
  return useQuery(
    async (r) => {
      const [overview, person, profile, championshipEntries, eventEntries, equipment] =
        await Promise.all([
          r.championships.getCurrent(),
          r.people.getPerson(personId),
          r.people.getDriverProfile(personId),
          r.entries.listChampionshipEntriesForPerson(personId),
          r.entries.listEventEntriesForPerson(personId),
          r.equipment.listByOwner(personId),
        ])
      const championshipEntry = championshipEntries.find(
        (c) => c.championshipId === overview.championship.id && c.status === 'active',
      )
      const category = overview.categories.find((c) => c.id === championshipEntry?.categoryId)
      return { overview, person, profile, championshipEntry, category, eventEntries, equipment }
    },
    [personId],
  )
}
