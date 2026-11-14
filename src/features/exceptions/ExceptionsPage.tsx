import { useState } from 'react'
import { RequireAccess } from '@/app/Layout'
import { useSession } from '@/app/session'
import { useQuery, useRepositories } from '@/data/DataProvider'
import type { ExceptionRequest } from '@/data/types'
import { errorMessage, es } from '@/i18n/es'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/ui/Button'
import { KartPlate } from '@/ui/KartPlate'
import { InlineError, Loading, LoadError, PageHeader, Panel } from '@/ui/Page'
import { StatusPill } from '@/ui/StatusPill'

/** Pantalla 11: excepciones de la fecha; el comisario aprueba o rechaza con nota. */
export function ExceptionsPage() {
  const session = useSession()
  const { eventId } = session
  const canDecide = session.can('exceptions.decide')

  const data = useQuery(
    async (r) => {
      const [exceptions, entries] = await Promise.all([
        r.exceptions.listForEvent(eventId),
        r.entries.listForEvent(eventId),
      ])
      return { exceptions, entries }
    },
    [eventId],
  )

  if (!canDecide && !session.can('exceptions.request'))
    return <RequireAccess allowed={false}>{null}</RequireAccess>
  if (data.error) return <LoadError onRetry={data.reload} />
  if (!data.data) return <Loading />

  const { exceptions, entries } = data.data
  const pending = exceptions.filter((x) => x.status === 'pending')
  const decided = exceptions.filter((x) => x.status !== 'pending')

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Excepciones"
        lead={
          canDecide
            ? 'Solicitudes del staff técnico que requieren tu decisión. Cada decisión queda registrada con tu nombre y la hora.'
            : 'Solicitudes enviadas a los comisarios y su estado.'
        }
      />
      {exceptions.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-line bg-white p-6 text-asphalt-soft">
          No hay solicitudes. Se crean desde la marcación de neumáticos (pinchazo o ingreso tardío).
        </p>
      )}
      <ul className="space-y-3">
        {[...pending, ...decided].map((x) => {
          const entry = entries.find((e) => e.eventEntry?.id === x.eventEntryId)
          return (
            <li key={x.id}>
              <ExceptionCard
                exception={x}
                kart={entry?.championshipEntry.kartNumber}
                categoryId={entry?.category.id ?? ''}
                driverName={entry?.person.fullName ?? ''}
                canDecide={canDecide}
                actorPersonId={session.persona.personId ?? ''}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ExceptionCard({
  exception: x,
  kart,
  categoryId,
  driverName,
  canDecide,
  actorPersonId,
}: {
  exception: ExceptionRequest
  kart: number | undefined
  categoryId: string
  driverName: string
  canDecide: boolean
  actorPersonId: string
}) {
  const repos = useRepositories()
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const tone = x.status === 'approved' ? 'go' : x.status === 'rejected' ? 'stop' : 'caution'

  async function decide(approved: boolean) {
    setError('')
    try {
      await repos.exceptions.decide(x.id, approved, notes.trim(), actorPersonId)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Panel>
      <div className="flex items-center gap-3">
        {kart !== undefined && <KartPlate number={kart} categoryId={categoryId} />}
        <div className="min-w-0 flex-1">
          <p className="font-bold">{es.exceptionType[x.type]}</p>
          <p className="truncate text-sm text-asphalt-soft">
            {driverName}. Solicitada el {formatDateTime(x.requestedAt)}
          </p>
        </div>
        <StatusPill tone={tone}>{es.exceptionStatus[x.status]}</StatusPill>
      </div>
      <p className="mt-2">{x.description}</p>
      {x.decisionNotes && (
        <p className="mt-2 rounded-lg bg-concrete p-2">Nota del comisario: {x.decisionNotes}</p>
      )}
      {canDecide && x.status === 'pending' && (
        <div className="mt-3 space-y-2">
          <label htmlFor={`decision-${x.id}`} className="block font-bold">
            Nota de la decisión
          </label>
          <textarea
            id={`decision-${x.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ej.: neumático de reemplazo con desgaste similar, verificado."
            className="w-full rounded-lg border-2 border-line p-2 focus:border-pit"
          />
          {error && <InlineError>{error}</InlineError>}
          <div className="flex flex-wrap gap-2">
            <Button variant="success" onClick={() => decide(true)}>
              Aprobar
            </Button>
            <Button variant="danger" disabled={!notes.trim()} onClick={() => decide(false)}>
              Rechazar
            </Button>
          </div>
          <p className="text-sm text-asphalt-soft">Para rechazar, escribe el motivo.</p>
        </div>
      )}
    </Panel>
  )
}
