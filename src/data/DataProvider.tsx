import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { DataRepositories } from './repositories'

const DataContext = createContext<DataRepositories | null>(null)

export function DataProvider({
  repositories,
  children,
}: {
  repositories: DataRepositories
  children: ReactNode
}) {
  return <DataContext.Provider value={repositories}>{children}</DataContext.Provider>
}

/** Única puerta de entrada de los componentes a los datos (ADR 0004). */
export function useRepositories(): DataRepositories {
  const repos = useContext(DataContext)
  if (!repos) throw new Error('useRepositories() fuera de <DataProvider>')
  return repos
}

export interface QueryState<T> {
  data: T | undefined
  error: unknown
  loading: boolean
  reload: () => void
}

/**
 * Carga datos con un repositorio y los recarga ante cualquier cambio notificado por
 * `subscribe` (en Fase 1: Supabase Realtime). `deps` funciona como en `useEffect`.
 */
export function useQuery<T>(
  loader: (repos: DataRepositories) => Promise<T>,
  deps: readonly unknown[],
): QueryState<T> {
  const repos = useRepositories()
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>({
    data: undefined,
    error: undefined,
    loading: true,
  })
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  })
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => repos.subscribe(reload), [repos, reload])

  useEffect(() => {
    let cancelled = false
    loaderRef
      .current(repos)
      .then((data) => {
        if (!cancelled) setState({ data, error: undefined, loading: false })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState((s) => ({ data: s.data, error, loading: false }))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, tick, ...deps])

  return { ...state, reload }
}
