import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { RequireAccess } from '@/app/Layout'
import { useSession } from '@/app/session'
import { useQuery } from '@/data/DataProvider'
import { TIRE_DEMO_CASES, type TireDemoCase } from '@/data/demo'
import type { EntrySummary } from '@/data/repositories'
import { classifyTireEvents, type TireSerials } from '@/domain/tires'
import { es } from '@/i18n/es'
import { Button } from '@/ui/Button'
import { IconSearch } from '@/ui/icons'
import { KartPlate } from '@/ui/KartPlate'
import { Loading, LoadError, PageHeader, Panel } from '@/ui/Page'
import { StatusPill } from '@/ui/StatusPill'
import { TireMarkingForm } from './TireMarkingForm'

type RegisteredEntry = EntrySummary & { eventEntry: NonNullable<EntrySummary['eventEntry']> }

export function TireMarkingPage() {
  const session = useSession()
  const { eventId } = session
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<{
    kart: number
    serials?: TireSerials
    round: number
  } | null>(null)
  const [notFound, setNotFound] = useState<number | null>(null)

  const data = useQuery(
    async (r) => {
      const overview = await r.championships.getCurrent()
      const entries = await r.entries.listForEvent(eventId)
      return { overview, entries }
    },
    [eventId],
  )

  if (!session.can('tech.mark_tires')) {
    return <RequireAccess allowed={false}>{null}</RequireAccess>
  }
  if (data.error) return <LoadError onRetry={data.reload} />
  if (!data.data) return <Loading />

  const { overview, entries } = data.data
  const event = overview.events.find((e) => e.id === eventId)
  const classification = classifyTireEvents(
    overview.events.map((e) => ({
      id: e.id,
      date: e.date,
      roundNumber: e.roundNumber,
      countsForTireCycle: e.countsForTireCycle,
      tireChangeOverride: e.isTireChangeEvent,
    })),
    overview.championship.rules.tires.cycle_length_events,
  ).get(eventId)

  function open(kart: number, serials?: TireSerials) {
    const entry = entries.find((e) => e.championshipEntry.kartNumber === kart && e.eventEntry)
    if (!entry) {
      setNotFound(kart)
      setSelected(null)
      return
    }
    setNotFound(null)
    setSelected((s) => ({ kart, serials, round: (s?.round ?? 0) + 1 }))
  }

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const kart = Number.parseInt(query, 10)
    if (Number.isInteger(kart)) open(kart)
  }

  function loadCase(c: TireDemoCase) {
    setQuery(String(c.kartNumber))
    open(c.kartNumber, c.serials)
  }

  const entry = selected
    ? (entries.find((e) => e.championshipEntry.kartNumber === selected.kart && e.eventEntry) as
        RegisteredEntry | undefined)
    : undefined

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Marcación de neumáticos"
        lead={
          <>
            Fecha {event?.roundNumber}.{' '}
            {classification && (
              <>
                <strong>{es.tireKind[classification.kind]}</strong>
                {classification.source === 'override' && ' (definida por la organización)'}.{' '}
                {es.tireKindHelp[classification.kind]}
              </>
            )}
          </>
        }
      />

      <form onSubmit={onSearch} className="flex gap-2" role="search">
        <label htmlFor="kart-search" className="sr-only">
          Número de kart
        </label>
        <input
          id="kart-search"
          inputMode="numeric"
          pattern="[0-9]*"
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/\D/g, '').slice(0, 3))}
          placeholder="N° de kart"
          className="h-14 w-full min-w-0 rounded-lg border-2 border-asphalt bg-white px-4 font-display text-3xl font-extrabold"
        />
        <Button type="submit" size="lg" aria-label="Buscar kart">
          <IconSearch /> Buscar
        </Button>
      </form>

      {notFound !== null && (
        <p
          role="alert"
          className="mt-3 rounded-lg border-2 border-caution bg-caution-bg p-3 font-bold"
        >
          El kart {notFound} no está inscrito en esta fecha.
        </p>
      )}

      {entry ? (
        <div className="mt-5">
          <Panel className="mb-4 flex items-center gap-4">
            <KartPlate
              number={entry.championshipEntry.kartNumber}
              categoryId={entry.category.id}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{entry.person.fullName}</p>
              <p className="text-asphalt-soft">
                {entry.category.name}, neumático {entry.category.tireBrand}{' '}
                {entry.category.tireModel}
              </p>
            </div>
          </Panel>
          <TireMarkingForm
            key={`${entry.eventEntry.id}-${selected?.round}`}
            entry={entry}
            eventId={eventId}
            actorPersonId={session.persona.personId ?? ''}
            canRequestException={session.can('exceptions.request')}
            initialSerials={selected?.serials}
            onDone={() => {
              setSelected(null)
              setQuery('')
            }}
          />
        </div>
      ) : (
        <section className="mt-8" aria-labelledby="demo-cases">
          <h2 id="demo-cases" className="font-display text-2xl font-extrabold">
            Casos de ejemplo
          </h2>
          <p className="text-asphalt-soft">
            Carga los seriales de un caso para ver cómo responde la validación. También puedes
            imprimir los{' '}
            <Link to="/tecnica/codigos" className="font-bold text-pit underline">
              códigos de prueba
            </Link>{' '}
            y escanearlos con la cámara.
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {TIRE_DEMO_CASES.map((c) => {
              const ce = entries.find((e) => e.championshipEntry.kartNumber === c.kartNumber)
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => loadCase(c)}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-line bg-white p-3 text-left hover:border-pit"
                  >
                    <KartPlate number={c.kartNumber} categoryId={ce?.category.id ?? ''} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{c.title}</span>
                      <span className="block truncate text-sm text-asphalt-soft">
                        {ce?.person.fullName}
                      </span>
                    </span>
                    <StatusPill
                      tone={c.key === 'ok' ? 'go' : c.key === 'late_entry' ? 'caution' : 'stop'}
                    >
                      {c.key === 'ok' ? 'Verde' : c.key === 'late_entry' ? 'Ámbar' : 'Rojo'}
                    </StatusPill>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
