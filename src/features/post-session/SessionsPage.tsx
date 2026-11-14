import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RequireAccess } from '@/app/Layout'
import { useSession } from '@/app/session'
import { useQuery, useRepositories } from '@/data/DataProvider'
import { errorMessage, es } from '@/i18n/es'
import { formatTime } from '@/lib/format'
import { Button } from '@/ui/Button'
import { CategoryTabs } from '@/ui/CategoryTabs'
import { KartPlate } from '@/ui/KartPlate'
import { InlineError, Loading, LoadError, PageHeader, Panel } from '@/ui/Page'
import { StatusPill } from '@/ui/StatusPill'
import { TopNPicker } from './TopNPicker'

/** Pantalla 12 (cronometrista): sesiones de la fecha → cerrar → tocar Top N. */
export function SessionsPage() {
  const session = useSession()
  const repos = useRepositories()
  const { eventId } = session
  const [closing, setClosing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastClosed, setLastClosed] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)

  const data = useQuery(
    async (r) => {
      const [overview, sessions, entries] = await Promise.all([
        r.championships.getCurrent(),
        r.sessions.listForEvent(eventId),
        r.entries.listForEvent(eventId),
      ])
      const results = new Map(
        await Promise.all(
          sessions.map(async (s) => [s.id, await r.sessions.listResults(s.id)] as const),
        ),
      )
      return { overview, sessions, entries, results }
    },
    [eventId],
  )

  if (!session.can('sessions.close')) return <RequireAccess allowed={false}>{null}</RequireAccess>
  if (data.error) return <LoadError onRetry={data.reload} />
  if (!data.data) return <Loading />

  const { overview, sessions, entries, results } = data.data
  const n = overview.championship.rules.post_session_inspection.default_top_n
  // Ingresar el Top N es `results.enter` (cronometrista); cerrar sesión solo no basta.
  const canEnterResults = session.can('results.enter')
  const categories = overview.categories.filter((c) => sessions.some((s) => s.categoryId === c.id))
  const activeCategory = categoryId ?? categories[0]?.id ?? ''

  async function confirm(sessionId: string, ordered: string[]) {
    setBusy(true)
    setError('')
    try {
      await repos.sessions.closeWithTopN(sessionId, ordered, session.persona.personId ?? '')
      setClosing(null)
      setLastClosed(sessionId)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Sesiones de la fecha"
        lead={`Al cerrar una sesión, toca el Top ${n} en orden de llegada. Esos karts pasan a revisión técnica.`}
      />
      {lastClosed && (
        <p
          role="status"
          className="mb-4 rounded-lg border-2 border-go bg-go-bg p-3 font-bold text-go"
        >
          Sesión cerrada. El Top {n} quedó en la{' '}
          <Link to="/revision" className="underline">
            lista de revisión
          </Link>
          .
        </p>
      )}
      {error && <InlineError>{error}</InlineError>}
      {!canEnterResults && (
        <p className="mb-4 rounded-lg border-2 border-pit bg-info-bg p-3">
          Tu rol en esta fecha no ingresa resultados: el Top {n} lo ingresa el cronometrista.
        </p>
      )}

      <CategoryTabs
        categories={categories}
        active={activeCategory}
        onChange={(id) => {
          setCategoryId(id)
          setClosing(null)
        }}
      />
      <div className="space-y-6">
        {categories
          .filter((c) => c.id === activeCategory)
          .map((category) => (
            <section key={category.id} aria-labelledby={`cat-${category.id}`}>
              <h2 id={`cat-${category.id}`} className="mb-2 font-display text-2xl font-extrabold">
                {category.name}
              </h2>
              <ul className="space-y-2">
                {sessions
                  .filter((s) => s.categoryId === category.id)
                  .map((s) => {
                    const sessionResults = results.get(s.id) ?? []
                    const finished = s.status === 'finished' || s.status === 'official'
                    return (
                      <li key={s.id}>
                        <Panel>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-display text-xl font-extrabold tabular-nums">
                              {formatTime(s.scheduledAt)}
                            </span>
                            <span className="font-bold">{s.name}</span>
                            <StatusPill
                              tone={s.status === 'running' ? 'info' : finished ? 'go' : 'neutral'}
                            >
                              {es.sessionStatus[s.status]}
                            </StatusPill>
                            {!finished && closing !== s.id && canEnterResults && (
                              <Button className="ml-auto" onClick={() => setClosing(s.id)}>
                                Cerrar e ingresar Top {n}
                              </Button>
                            )}
                          </div>
                          {sessionResults.length > 0 && (
                            <p className="mt-2 flex flex-wrap items-center gap-2 text-asphalt-soft">
                              Top {sessionResults.length} provisional:
                              {sessionResults.map((r) => {
                                const e = entries.find((x) => x.eventEntry?.id === r.eventEntryId)
                                return e ? (
                                  <KartPlate
                                    key={r.id}
                                    number={e.championshipEntry.kartNumber}
                                    categoryId={category.id}
                                    size="sm"
                                  />
                                ) : null
                              })}
                            </p>
                          )}
                          {closing === s.id && (
                            <div className="mt-4 border-t border-line pt-4">
                              <TopNPicker
                                n={n}
                                busy={busy}
                                candidates={entries
                                  .filter((e) => e.category.id === category.id && e.eventEntry)
                                  .map((e) => ({
                                    eventEntryId: e.eventEntry?.id ?? '',
                                    kartNumber: e.championshipEntry.kartNumber,
                                    categoryId: category.id,
                                    name: e.person.fullName,
                                  }))}
                                onConfirm={(ordered) => confirm(s.id, ordered)}
                                onCancel={() => setClosing(null)}
                              />
                            </div>
                          )}
                        </Panel>
                      </li>
                    )
                  })}
              </ul>
            </section>
          ))}
      </div>
    </div>
  )
}
