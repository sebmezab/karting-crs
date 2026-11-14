import type { ReactNode } from 'react'
import { es } from '@/i18n/es'
import { Button } from './Button'

export function PageHeader({
  title,
  lead,
  aside,
}: {
  title: string
  lead?: ReactNode
  aside?: ReactNode
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl leading-none font-extrabold">{title}</h1>
        {lead && <p className="mt-2 text-asphalt-soft">{lead}</p>}
      </div>
      {aside}
    </header>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-white p-4 ${className}`}>
      {children}
    </section>
  )
}

export function Loading() {
  return <p className="py-8 text-asphalt-soft">{es.app.loading}</p>
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border-2 border-stop bg-stop-bg p-4">
      <p className="font-bold text-stop">{es.app.loadError}</p>
      <Button variant="secondary" className="mt-3" onClick={onRetry}>
        {es.app.retry}
      </Button>
    </div>
  )
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border-2 border-stop bg-stop-bg px-3 py-2 font-bold text-stop"
    >
      {children}
    </p>
  )
}
