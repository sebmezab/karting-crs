import { Link } from 'react-router-dom'
import { RequireAccess } from '@/app/Layout'
import { useSession } from '@/app/session'
import { useQuery } from '@/data/DataProvider'
import { toPublicInspectionView } from '@/domain/inspection'
import { TIRE_POSITIONS } from '@/domain/tires'
import { es } from '@/i18n/es'
import { formatDay } from '@/lib/format'
import { KartPlate } from '@/ui/KartPlate'
import { Loading, LoadError, PageHeader, Panel } from '@/ui/Page'
import { StatusPill } from '@/ui/StatusPill'
import { useDriver } from './useDriver'

/** Pantallas 5 y 7 (piloto): mi perfil, mi equipo, mis fechas y mis revisiones. */
export function DriverProfilePage() {
  const session = useSession()
  const driver = useDriver()
  const ceId = driver.data?.championshipEntry?.id ?? ''
  const eventEntryIds = (driver.data?.eventEntries ?? []).map((e) => e.id).join(',')

  const extra = useQuery(
    async (r) => {
      const sets = ceId ? await r.tires.listSetsForEntry(ceId) : []
      const serials = await r.tires.serialsById(
        sets.flatMap((s) => s.items.map((i) => i.equipmentId)),
      )
      const ids = new Set(eventEntryIds.split(','))
      const inspections = (await r.inspections.listForEvent(session.eventId))
        .filter((i) => ids.has(i.eventEntryId))
        // El piloto ve solo "Seleccionado para revisión", sin el motivo (SPEC 7.4).
        .map(toPublicInspectionView)
      return { sets, serials, inspections }
    },
    [ceId, eventEntryIds, session.eventId],
  )

  if (session.persona.key !== 'driver') return <RequireAccess allowed={false}>{null}</RequireAccess>
  if (driver.error) return <LoadError onRetry={driver.reload} />
  if (!driver.data) return <Loading />

  const { overview, person, profile, championshipEntry, category, eventEntries, equipment } =
    driver.data
  const current = overview.events.find((e) => e.id === session.eventId)
  const currentEntry = eventEntries.find((e) => e.eventId === session.eventId)
  const chassis = equipment.filter((e) => e.type === 'chassis')
  const engines = equipment.filter((e) => e.type === 'engine')

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title={person?.fullName ?? ''}
        lead={`${category?.name ?? ''}. Licencia ${profile?.licenseNumber ?? 'sin registrar'}.`}
        aside={
          championshipEntry &&
          category && (
            <KartPlate number={championshipEntry.kartNumber} categoryId={category.id} size="lg" />
          )
        }
      />

      {extra.data && extra.data.inspections.length > 0 && (
        <section
          aria-labelledby="my-inspections"
          className="rounded-xl border-2 border-caution bg-caution-bg p-4"
        >
          <h2 id="my-inspections" className="font-display text-2xl font-extrabold">
            {es.publicInspection}
          </h2>
          <ul className="mt-1">
            {extra.data.inspections.map((i) => (
              <li key={i.sessionId} className="flex items-center justify-between gap-2">
                <span>Fecha {current?.roundNumber}</span>
                <StatusPill tone={i.status === 'ok' ? 'go' : 'caution'}>
                  {es.inspectionStatus[i.status]}
                </StatusPill>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">Preséntate con tu kart en el parque cerrado.</p>
        </section>
      )}

      <Panel>
        <h2 className="font-display text-2xl font-extrabold">Fecha {current?.roundNumber}</h2>
        {currentEntry ? (
          <p className="mt-1">
            Inscripción: <strong>{es.entryStatus[currentEntry.status]}</strong>.{' '}
            <Link to="/piloto/inscripcion" className="font-bold text-pit underline">
              Ver o modificar
            </Link>
          </p>
        ) : (
          <p className="mt-1">
            Aún no estás inscrito para el {current ? formatDay(current.date) : ''}.{' '}
            <Link to="/piloto/inscripcion" className="font-bold text-pit underline">
              Inscribirme
            </Link>
          </p>
        )}
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-extrabold">Mi equipo</h2>
        <h3 className="mt-3 font-bold">Chasis</h3>
        <ul className="mt-1 space-y-1">
          {chassis.map((c) => (
            <li key={c.id}>
              {c.brand} {c.model}, serie {c.serialNumber}
            </li>
          ))}
        </ul>
        <h3 className="mt-3 font-bold">Motores</h3>
        <ul className="mt-1 space-y-1">
          {engines.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2">
              {m.brand} {m.model}, serie {m.serialNumber}
              {m.sealNumber ? (
                <span className="text-asphalt-soft">sello {m.sealNumber}</span>
              ) : (
                <StatusPill tone="caution">Sin sello vigente</StatusPill>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-extrabold">Mis juegos de neumáticos</h2>
        {extra.data?.sets.length === 0 && (
          <p className="mt-1 text-asphalt-soft">Sin juegos registrados.</p>
        )}
        <ul className="mt-2 space-y-3">
          {[...(extra.data?.sets ?? [])].reverse().map((set) => {
            const start = overview.events.find((e) => e.id === set.cycleStartEventId)
            return (
              <li key={set.id}>
                <p className="flex items-center gap-2 font-bold">
                  Ciclo desde la Fecha {start?.roundNumber}
                  <StatusPill tone={set.status === 'active' ? 'go' : 'neutral'}>
                    {set.status === 'active' ? 'Activo' : 'Cerrado'}
                  </StatusPill>
                </p>
                <p className="font-display text-lg text-asphalt-soft">
                  {TIRE_POSITIONS.map((p) => {
                    const item = set.items.find((i) => i.position === p)
                    return `${p} ${item ? (extra.data?.serials.get(item.equipmentId) ?? '') : ''}`
                  }).join('   ')}
                </p>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-extrabold">Mis fechas</h2>
        <ul className="mt-2 divide-y divide-line">
          {overview.events.map((ev) => {
            const entry = eventEntries.find((e) => e.eventId === ev.id)
            return (
              <li key={ev.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <strong>Fecha {ev.roundNumber}</strong> {formatDay(ev.date)}
                </span>
                {entry ? (
                  <StatusPill tone={entry.status === 'confirmed' ? 'go' : 'caution'}>
                    {es.entryStatus[entry.status]}
                  </StatusPill>
                ) : (
                  <span className="text-sm text-asphalt-soft">No inscrito</span>
                )}
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}
