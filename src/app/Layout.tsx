import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useRepositories } from '@/data/DataProvider'
import { DEMO_PERSONAS, type DemoPersonaKey } from '@/data/demo'
import { es } from '@/i18n/es'
import { FeedbackButton } from './FeedbackButton'
import { visibleNav } from './navigation'
import { useSession } from './session'

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-12 items-center rounded-lg px-3 font-bold whitespace-nowrap ${
    isActive ? 'bg-asphalt text-white' : 'text-asphalt hover:bg-white'
  }`

export function Layout() {
  const session = useSession()
  const repos = useRepositories()
  const online = useOnline()
  const nav = visibleNav(session)

  function resetDemo() {
    if (window.confirm(es.app.resetDemoConfirm)) repos.resetDemo?.()
  }

  return (
    <div className="min-h-dvh pb-20 lg:pb-0">
      <header className="bg-asphalt text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <div className="mr-auto flex w-full items-center gap-3 sm:w-auto">
            <span
              aria-hidden
              className="grid size-11 place-items-center rounded-md bg-[#ffd200] font-display text-2xl font-extrabold text-black"
            >
              CRS
            </span>
            <div className="leading-tight">
              <p className="font-display text-2xl font-extrabold">{es.app.name}</p>
              <p className="text-sm text-white/75">Temporada 2026</p>
            </div>
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <span className="shrink-0 text-sm text-white/80">{es.app.viewAs}</span>
            <select
              aria-label={es.app.viewAs}
              value={session.persona.key}
              onChange={(e) => session.setPersona(e.target.value as DemoPersonaKey)}
              className="min-h-12 w-full min-w-0 rounded-lg border-2 border-white bg-white px-3 font-bold text-asphalt sm:w-auto"
            >
              {DEMO_PERSONAS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.roleLabel}
                </option>
              ))}
            </select>
          </label>
          <FeedbackButton />
        </div>
      </header>

      <p className="bg-caution-bg px-4 py-1.5 text-center text-sm">{es.app.demoBanner}</p>
      {!online && (
        <p role="alert" className="bg-stop px-4 py-2 text-center font-bold text-white">
          {es.app.offline}
        </p>
      )}

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5">
        <nav aria-label="Secciones" className="hidden w-52 shrink-0 lg:block">
          <ul className="sticky top-4 space-y-1">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end className={linkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="pt-4">
              <button
                type="button"
                onClick={resetDemo}
                className="min-h-12 px-3 text-sm text-asphalt-soft underline"
              >
                {es.app.resetDemo}
              </button>
            </li>
          </ul>
        </nav>
        <main className="min-w-0 flex-1">
          <Outlet />
          <button
            type="button"
            onClick={resetDemo}
            className="mt-10 min-h-12 text-sm text-asphalt-soft underline lg:hidden"
          >
            {es.app.resetDemo}
          </button>
        </main>
      </div>

      {/* Navegación inferior en el teléfono: al alcance del pulgar. */}
      <nav
        aria-label="Secciones (móvil)"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-concrete/95 backdrop-blur lg:hidden"
      >
        <ul className="flex gap-1 overflow-x-auto px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end className={linkClass}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export function RequireAccess({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  if (allowed) return <>{children}</>
  return (
    <div className="rounded-xl border-2 border-line bg-white p-6">
      <h1 className="font-display text-3xl font-extrabold">{es.app.notAllowedTitle}</h1>
      <p className="mt-2 text-asphalt-soft">{es.app.notAllowedBody}</p>
    </div>
  )
}
