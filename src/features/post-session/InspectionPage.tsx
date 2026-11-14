import { useState } from 'react'
import { RequireAccess } from '@/app/Layout'
import { useSession } from '@/app/session'
import { useQuery, useRepositories } from '@/data/DataProvider'
import type { EntrySummary } from '@/data/repositories'
import type { InspectionSelectionRecord } from '@/data/types'
import type { InspectionStatus } from '@/domain/inspection'
import { errorMessage, es } from '@/i18n/es'
import { formatTime } from '@/lib/format'
import { Button } from '@/ui/Button'
import { KartPlate } from '@/ui/KartPlate'
import { InlineError, Loading, LoadError, PageHeader, Panel } from '@/ui/Page'
import { StatusPill } from '@/ui/StatusPill'

const STATUS_TONE: Record<InspectionStatus, 'neutral' | 'info' | 'go' | 'caution'> = {
  pending: 'caution',
  in_progress: 'info',
  ok: 'go',
  observed: 'neutral',
}

/**
 * Pantalla 13: lista de revisión post-sesión en tiempo real (en la demo, entre pestañas).
 * El motivo (Top N / a criterio) es interno: solo lo ve el staff.
 */
export function InspectionPage() {
  const session = useSession()
  const repos = useRepositories()
  const { eventId } = session
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [observing, setObserving] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  const data = useQuery(
    async (r) => {
      const [overview, sessions, entries, selections] = await Promise.all([
        r.championships.getCurrent(),
        r.sessions.listForEvent(eventId),
        r.entries.listForEvent(eventId),
        r.inspections.listForEvent(eventId),
      ])
      return { overview, sessions, entries, selections }
    },
    [eventId],
  )

  const canResolve = session.can('inspection.resolve')
  const canSelect = session.can('inspection.select')
  if (!canResolve && !canSelect && !session.can('event.view_all')) {
    return <RequireAccess allowed={false}>{null}</RequireAccess>
  }
  if (data.error) return <LoadError onRetry={data.reload} />
  if (!data.data) return <Loading />

  const { sessions, entries, selections } = data.data
  const actor = session.persona.personId ?? ''
  const entryOf = (eventEntryId: string) => entries.find((e) => e.eventEntry?.id === eventEntryId)
  const closedSessions = sessions.filter((s) => s.status === 'finished' || s.status === 'official')
  const open = selections.filter((s) => s.status === 'pending' || s.status === 'in_progress')

  async function run(action: () => Promise<void>) {
    setError('')
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  function transition(sel: InspectionSelectionRecord, to: InspectionStatus, note?: string) {
    return run(async () => {
      await repos.inspections.transition(sel.id, to, actor, note)
      setObserving(null)
      setNotes('')
    })
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Revisión post-sesión"
        lead={`${open.length} ${open.length === 1 ? 'kart pendiente' : 'karts pendientes'}. La lista se actualiza sola en todos los dispositivos del staff.`}
        aside={
          canSelect && (
            <Button variant={adding ? 'secondary' : 'primary'} onClick={() => setAdding((a) => !a)}>
              {adding ? 'Cerrar' : 'Agregar kart a revisión'}
            </Button>
          )
        }
      />
      {error && <InlineError>{error}</InlineError>}

      {adding && canSelect && (
        <AddStewardSelection
          sessions={closedSessions.map((s) => ({
            id: s.id,
            label: `${data.data?.overview.categories.find((c) => c.id === s.categoryId)?.name ?? ''}, ${s.name}`,
            categoryId: s.categoryId,
          }))}
          candidates={entries}
          selections={selections}
          onAdd={(sessionId, eventEntryId) =>
            run(async () => {
              await repos.inspections.addStewardSelection(sessionId, eventEntryId, actor)
              setAdding(false)
            })
          }
        />
      )}

      {selections.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-line bg-white p-6 text-asphalt-soft">
          Aún no hay karts para revisar. Aparecen aquí cuando el cronometrista cierra una sesión e
          ingresa el Top N.
        </p>
      ) : (
        <ul className="space-y-3">
          {[...selections]
            .sort(
              (a, b) =>
                order(a.status) - order(b.status) || a.selectedAt.localeCompare(b.selectedAt),
            )
            .map((sel) => {
              const e = entryOf(sel.eventEntryId)
              const s = sessions.find((x) => x.id === sel.sessionId)
              return (
                <li key={sel.id} data-testid={`inspection-${e?.championshipEntry.kartNumber}`}>
                  <Panel>
                    <div className="flex items-center gap-3">
                      {e && (
                        <KartPlate
                          number={e.championshipEntry.kartNumber}
                          categoryId={e.category.id}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{e?.person.fullName}</p>
                        <p className="text-sm text-asphalt-soft">
                          {e?.category.name}, {s?.name}. {es.inspectionReason[sel.reason]} a las{' '}
                          {formatTime(sel.selectedAt)}
                        </p>
                      </div>
                      <StatusPill tone={STATUS_TONE[sel.status]}>
                        {es.inspectionStatus[sel.status]}
                      </StatusPill>
                    </div>
                    {sel.notes && (
                      <p className="mt-2 rounded-lg bg-concrete p-2">Nota: {sel.notes}</p>
                    )}
                    {canResolve && (sel.status === 'pending' || sel.status === 'in_progress') && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {sel.status === 'pending' && (
                          <Button
                            variant="secondary"
                            onClick={() => transition(sel, 'in_progress')}
                          >
                            Iniciar revisión
                          </Button>
                        )}
                        <Button variant="success" onClick={() => transition(sel, 'ok')}>
                          OK
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setObserving(observing === sel.id ? null : sel.id)}
                        >
                          Observado
                        </Button>
                      </div>
                    )}
                    {observing === sel.id && (
                      <div className="mt-3 space-y-2">
                        <label htmlFor={`notes-${sel.id}`} className="block font-bold">
                          ¿Qué se observó?
                        </label>
                        <textarea
                          id={`notes-${sel.id}`}
                          value={notes}
                          onChange={(ev) => setNotes(ev.target.value)}
                          rows={3}
                          maxLength={500}
                          className="w-full rounded-lg border-2 border-line p-2 focus:border-pit"
                        />
                        <Button
                          variant="danger"
                          disabled={!notes.trim()}
                          onClick={() => transition(sel, 'observed', notes.trim())}
                        >
                          Guardar como observado
                        </Button>
                        <p className="text-sm text-asphalt-soft">
                          Los comisarios verán la observación. La creación de sanciones llega en la
                          Fase 3.
                        </p>
                      </div>
                    )}
                  </Panel>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}

function order(status: InspectionStatus): number {
  return { in_progress: 0, pending: 1, observed: 2, ok: 3 }[status]
}

function AddStewardSelection({
  sessions,
  candidates,
  selections,
  onAdd,
}: {
  sessions: { id: string; label: string; categoryId: string }[]
  candidates: EntrySummary[]
  selections: InspectionSelectionRecord[]
  onAdd: (sessionId: string, eventEntryId: string) => void
}) {
  const [sessionId, setSessionId] = useState(sessions.at(-1)?.id ?? '')
  const current = sessions.find((s) => s.id === sessionId)
  const available = candidates.filter(
    (c) =>
      c.eventEntry &&
      c.category.id === current?.categoryId &&
      !selections.some((s) => s.sessionId === sessionId && s.eventEntryId === c.eventEntry?.id),
  )

  if (sessions.length === 0) {
    return (
      <Panel className="mb-4">
        <p>
          No hay sesiones cerradas todavía. Se puede agregar un kart a criterio una vez cerrada la
          sesión.
        </p>
      </Panel>
    )
  }

  return (
    <Panel className="mb-4">
      <label htmlFor="steward-session" className="block font-bold">
        Sesión
      </label>
      <select
        id="steward-session"
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
        className="mt-1 min-h-12 w-full rounded-lg border-2 border-line bg-white px-3"
      >
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <p className="mt-3 font-bold">Toca el kart que quieres enviar a revisión</p>
      <p className="text-sm text-asphalt-soft">
        El piloto verá "{es.publicInspection}", sin el motivo.
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {available.map((c) => (
          <button
            key={c.championshipEntry.id}
            type="button"
            onClick={() => c.eventEntry && onAdd(sessionId, c.eventEntry.id)}
            aria-label={`Enviar kart ${c.championshipEntry.kartNumber} a revisión`}
            className="flex min-h-16 items-center justify-center rounded-lg border-2 border-line bg-white hover:border-pit"
          >
            <KartPlate
              number={c.championshipEntry.kartNumber}
              categoryId={c.category.id}
              size="sm"
            />
          </button>
        ))}
      </div>
    </Panel>
  )
}
