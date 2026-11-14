import { useSession } from '@/app/session'
import { useQuery } from '@/data/DataProvider'
import { toPublicInspectionView } from '@/domain/inspection'
import { publicDisplayName } from '@/domain/privacy'
import { es } from '@/i18n/es'
import { formatTime } from '@/lib/format'
import { KartPlate } from '@/ui/KartPlate'
import { Loading, LoadError } from '@/ui/Page'
import { StatusPill } from '@/ui/StatusPill'

/**
 * Pantalla 4 (modo TV/notebook): última sesión cerrada y karts a revisión. Se actualiza sola.
 * Vista pública: sin motivo de la selección (SPEC 7.4) y nombres de menores abreviados (11.1).
 */
export function TrackScreenPage() {
  const { eventId } = useSession()
  const data = useQuery(
    async (r) => {
      const [overview, sessions, entries, selections] = await Promise.all([
        r.championships.getCurrent(),
        r.sessions.listForEvent(eventId),
        r.entries.listForEvent(eventId),
        r.inspections.listForEvent(eventId),
      ])
      const closed = sessions.filter((s) => s.status === 'finished' || s.status === 'official')
      const withResults = await Promise.all(
        closed.map(async (s) => ({ session: s, results: await r.sessions.listResults(s.id) })),
      )
      const last = withResults.filter((x) => x.results.length > 0).at(-1) ?? null
      return { overview, entries, last, selections: selections.map(toPublicInspectionView) }
    },
    [eventId],
  )

  if (data.error) return <LoadError onRetry={data.reload} />
  if (!data.data) return <Loading />

  const { overview, entries, last, selections } = data.data
  const entryOf = (eventEntryId: string) => entries.find((e) => e.eventEntry?.id === eventEntryId)
  const name = (eventEntryId: string) => {
    const e = entryOf(eventEntryId)
    return e
      ? publicDisplayName(e.person, {
          seasonYear: overview.championship.seasonYear,
          abbreviateMinors: true,
        })
      : ''
  }
  const lastCategory = overview.categories.find((c) => c.id === last?.session.categoryId)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="last-session" className="rounded-2xl bg-asphalt p-5 text-white">
        <h1 id="last-session" className="font-display text-3xl font-extrabold">
          {last ? `${lastCategory?.name}, ${last.session.name}` : 'Sin sesiones cerradas'}
        </h1>
        {last && (
          <>
            <p className="text-white/75">
              Resultado provisional, {formatTime(last.session.scheduledAt)}
            </p>
            <ol className="mt-4 space-y-3">
              {last.results.map((r) => {
                const e = entryOf(r.eventEntryId)
                return (
                  <li key={r.id} className="flex items-center gap-4">
                    <span className="w-10 font-display text-4xl font-extrabold">{r.position}</span>
                    {e && (
                      <KartPlate
                        number={e.championshipEntry.kartNumber}
                        categoryId={e.category.id}
                      />
                    )}
                    <span className="truncate text-xl font-bold">{name(r.eventEntryId)}</span>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </section>

      <section
        aria-labelledby="inspection-board"
        className="rounded-2xl border border-line bg-white p-5"
      >
        <h2 id="inspection-board" className="font-display text-3xl font-extrabold">
          Karts a revisión técnica
        </h2>
        {selections.length === 0 ? (
          <p className="mt-3 text-asphalt-soft">Ningún kart seleccionado por ahora.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {selections.map((s) => {
              const e = entryOf(s.eventEntryId)
              return (
                <li key={`${s.sessionId}-${s.eventEntryId}`} className="flex items-center gap-3">
                  {e && (
                    <KartPlate number={e.championshipEntry.kartNumber} categoryId={e.category.id} />
                  )}
                  <StatusPill
                    tone={s.status === 'ok' ? 'go' : s.status === 'pending' ? 'caution' : 'info'}
                  >
                    {s.status === 'pending' ? es.publicInspection : es.inspectionStatus[s.status]}
                  </StatusPill>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
