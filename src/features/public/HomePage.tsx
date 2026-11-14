import { useNavigate } from 'react-router-dom'
import { useSession } from '@/app/session'
import { useQuery } from '@/data/DataProvider'
import type { DemoPersonaKey } from '@/data/demo'
import { classifyTireEvents } from '@/domain/tires'
import { es } from '@/i18n/es'
import { formatDateTime, formatDay } from '@/lib/format'
import { Button } from '@/ui/Button'
import { KartPlate } from '@/ui/KartPlate'
import { Loading, LoadError, Panel } from '@/ui/Page'

const WEEKDAY = new Intl.DateTimeFormat('es-CL', { weekday: 'long', timeZone: 'UTC' })

/** Recorridos de la demo: cambian el rol y abren la pantalla (pensado para mostrar en 2–3 min). */
const TOURS: { persona: DemoPersonaKey; to: string; title: string; body: string }[] = [
  {
    persona: 'tech_inspector',
    to: '/tecnica/neumaticos',
    title: 'Marcar neumáticos',
    body: 'El revisor escanea los 4 slicks y la app verifica al instante la regla del ciclo y el intercambio entre pilotos.',
  },
  {
    persona: 'timekeeper',
    to: '/sesiones',
    title: 'Cerrar una sesión',
    body: 'El cronometrista toca el Top 3 y esos karts aparecen en la lista de revisión de todo el staff.',
  },
  {
    persona: 'technical_director',
    to: '/revision',
    title: 'Revisar karts',
    body: 'El staff técnico ve qué karts revisar, agrega uno a criterio y marca OK u observado.',
  },
  {
    persona: 'driver',
    to: '/piloto/inscripcion',
    title: 'Inscripción del piloto',
    body: 'El piloto se inscribe a la fecha con su chasis y motores, y la app valida límites y sellos.',
  },
]

export function HomePage() {
  const session = useSession()
  const navigate = useNavigate()
  const data = useQuery((r) => r.championships.getCurrent(), [])

  if (data.error) return <LoadError onRetry={data.reload} />
  if (!data.data) return <Loading />

  const { championship, categories, events } = data.data
  const next = events.find((e) => e.id === session.eventId)
  const kinds = classifyTireEvents(
    events.map((e) => ({
      id: e.id,
      date: e.date,
      roundNumber: e.roundNumber,
      countsForTireCycle: e.countsForTireCycle,
      tireChangeOverride: e.isTireChangeEvent,
    })),
    championship.rules.tires.cycle_length_events,
  )

  function go(persona: DemoPersonaKey, to: string) {
    session.setPersona(persona)
    navigate(to)
  }

  return (
    <div className="space-y-8">
      {next && (
        <section
          aria-labelledby="next-event"
          className="overflow-hidden rounded-2xl bg-asphalt text-white"
        >
          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="font-display leading-none font-extrabold">
              <p className="text-2xl text-[#ffd200]">Fecha {next.roundNumber}</p>
              <p className="text-7xl tabular-nums sm:text-8xl">
                {formatDay(next.date).slice(0, 5)}
              </p>
            </div>
            <div>
              <h1
                id="next-event"
                className="font-display text-3xl leading-tight font-extrabold first-letter:uppercase"
              >
                {WEEKDAY.format(new Date(`${next.date}T12:00:00Z`))} en {next.venue}
              </h1>
              <p className="mt-1 text-white/85">
                Próxima fecha, {formatDay(next.date)}. Inscripciones hasta el{' '}
                {formatDateTime(next.registrationDeadline)}.
              </p>
              {next.note && <p className="mt-1 text-white/85">{next.note}</p>}
              <Button
                size="lg"
                className="mt-4 bg-[#ffd200] text-black hover:bg-[#ffe152]"
                onClick={() => go('driver', '/piloto/inscripcion')}
              >
                Inscribirse
              </Button>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="tours">
        <h2 id="tours" className="font-display text-3xl font-extrabold">
          Prueba la demo
        </h2>
        <p className="text-asphalt-soft">
          Cada recorrido cambia el rol arriba y abre la pantalla correspondiente.
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {TOURS.map((t) => (
            <li key={t.to}>
              <button
                type="button"
                onClick={() => go(t.persona, t.to)}
                className="h-full w-full rounded-xl border-2 border-line bg-white p-4 text-left hover:border-pit"
              >
                <span className="block font-display text-2xl font-extrabold">{t.title}</span>
                <span className="mt-1 block text-asphalt-soft">{t.body}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="calendar">
        <h2 id="calendar" className="font-display text-3xl font-extrabold">
          Calendario {championship.seasonYear}
        </h2>
        <ol className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
          {events.map((e) => {
            const kind = kinds.get(e.id)
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="w-14 font-display text-2xl font-extrabold">F{e.roundNumber}</span>
                <span className="w-28 tabular-nums">{formatDay(e.date)}</span>
                <span className="text-asphalt-soft">
                  {e.countsForPoints ? 'Suma puntos' : 'No suma puntos'}
                </span>
                <span className="text-asphalt-soft">{kind ? es.tireKind[kind.kind] : ''}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="categories">
        <h2 id="categories" className="font-display text-3xl font-extrabold">
          Categorías
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <li key={c.id}>
              <Panel className="flex items-center gap-3">
                <KartPlate number={c.numberMin === 1 ? 1 : c.numberMin} categoryId={c.id} />
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-sm text-asphalt-soft">
                    Números {c.numberMin} a {c.numberMax}. Neumático {c.tireBrand} {c.tireModel}
                  </p>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
