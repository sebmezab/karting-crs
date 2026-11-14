import { RequireAccess } from '@/app/Layout'
import { useSession } from '@/app/session'
import { useQuery, useRepositories } from '@/data/DataProvider'
import { PERMISSION_GROUPS, PERMISSIONS } from '@/domain/permissions'
import { classifyTireEvents } from '@/domain/tires'
import { es } from '@/i18n/es'
import { formatDateTime, formatDay } from '@/lib/format'
import { Loading, LoadError, PageHeader, Panel } from '@/ui/Page'
import { StatusPill } from '@/ui/StatusPill'

const LABEL = new Map<string, string>(PERMISSIONS.map((p) => [p.key, p.label]))
const GROUP = new Map<string, string>(PERMISSIONS.map((p) => [p.key, PERMISSION_GROUPS[p.group]]))

/** Pantallas 15–17b (resumen de solo lectura, salvo el override del calendario). */
export function AdminPage() {
  const session = useSession()
  const repos = useRepositories()
  const data = useQuery(
    async (r) => {
      const [overview, roles, staff, audit] = await Promise.all([
        r.championships.getCurrent(),
        r.staff.listRoles(),
        r.staff.listForEvent(session.eventId),
        r.audit.listRecent(15),
      ])
      const people = await Promise.all(
        [...new Set([...staff.map((s) => s.personId), ...audit.map((a) => a.actorPersonId)])].map(
          (id) => r.people.getPerson(id),
        ),
      )
      return { overview, roles, staff, audit, people }
    },
    [session.eventId],
  )

  if (!session.persona.isOrgAdmin) return <RequireAccess allowed={false}>{null}</RequireAccess>
  if (data.error) return <LoadError onRetry={data.reload} />
  if (!data.data) return <Loading />

  const { overview, roles, staff, audit, people } = data.data
  const personName = (id: string) => people.find((p) => p?.id === id)?.fullName ?? id
  const kinds = classifyTireEvents(
    overview.events.map((e) => ({
      id: e.id,
      date: e.date,
      roundNumber: e.roundNumber,
      countsForTireCycle: e.countsForTireCycle,
      tireChangeOverride: null,
    })),
    overview.championship.rules.tires.cycle_length_events,
  )
  const actor = session.persona.personId ?? ''

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Administración" lead={overview.championship.name} />

      <Panel>
        <h2 className="font-display text-2xl font-extrabold">Calendario y ciclo de neumáticos</h2>
        <p className="text-asphalt-soft">
          El tipo de fecha se calcula con la regla del campeonato (ciclo de{' '}
          {overview.championship.rules.tires.cycle_length_events} fechas). Puedes definirlo a mano
          fecha a fecha.
        </p>
        <ul className="mt-3 divide-y divide-line">
          {overview.events.map((e) => {
            const calculated = kinds.get(e.id)?.kind ?? 'not_counted'
            const value =
              e.isTireChangeEvent === null
                ? 'auto'
                : e.isTireChangeEvent
                  ? 'change'
                  : 'continuation'
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-12 font-display text-2xl font-extrabold">F{e.roundNumber}</span>
                <span className="w-28 tabular-nums">{formatDay(e.date)}</span>
                <label className="flex flex-1 items-center gap-2">
                  <span className="sr-only">Tipo de fecha F{e.roundNumber}</span>
                  <select
                    value={value}
                    onChange={(ev) => {
                      const v = ev.target.value
                      void repos.championships.setTireChangeOverride(
                        e.id,
                        v === 'auto' ? null : v === 'change',
                        actor,
                      )
                    }}
                    className="min-h-12 rounded-lg border-2 border-line bg-white px-3"
                  >
                    <option value="auto">Calculado: {es.tireKind[calculated]}</option>
                    <option value="change">Manual: {es.tireKind.change}</option>
                    <option value="continuation">Manual: {es.tireKind.continuation}</option>
                  </select>
                </label>
                {e.isTireChangeEvent !== null && <StatusPill tone="info">Manual</StatusPill>}
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-extrabold">Staff de la fecha en curso</h2>
        <ul className="mt-2 space-y-1">
          {[...new Set(staff.map((s) => s.personId))].map((personId) => (
            <li key={personId}>
              <strong>{personName(personId)}</strong>:{' '}
              {staff
                .filter((s) => s.personId === personId)
                .map((s) => roles.find((r) => r.id === s.roleId)?.name)
                .join(', ')}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-extrabold">Roles y permisos</h2>
        <p className="text-asphalt-soft">
          Plantillas estándar. En la Fase 1 cada organización podrá copiarlas, editarlas o crear
          roles propios activando permisos uno a uno.
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <li key={role.id} className="rounded-lg border border-line p-3">
              <p className="font-bold">{role.name}</p>
              <p className="text-sm text-asphalt-soft">{role.description}</p>
              <ul className="mt-2 text-sm">
                {role.permissions.map((p) => (
                  <li key={p}>
                    {GROUP.get(p)}: {LABEL.get(p)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-extrabold">Reglas del campeonato</h2>
        <p className="text-asphalt-soft">
          Configuración vigente (en la Fase 1 se edita con formularios).
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-concrete p-3 text-sm">
          {JSON.stringify(overview.championship.rules, null, 2)}
        </pre>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl font-extrabold">Registro de actividad</h2>
        <p className="text-asphalt-soft">
          Cada acción queda registrada con quién y cuándo. No se puede editar ni borrar.
        </p>
        {audit.length === 0 ? (
          <p className="mt-2 text-asphalt-soft">Sin actividad en esta demo todavía.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line text-sm">
            {audit.map((a) => (
              <li key={a.id} className="py-2">
                <span className="tabular-nums">{formatDateTime(a.createdAt)}</span>{' '}
                <strong>{personName(a.actorPersonId)}</strong> <code>{a.action}</code>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
