import { useState } from 'react'
import { Button } from '@/ui/Button'
import { KartPlate } from '@/ui/KartPlate'

export interface TopNCandidate {
  eventEntryId: string
  kartNumber: number
  categoryId: string
  name: string
}

/**
 * El cronometrista toca los números en orden de llegada, sin tipear (SPEC 7.4).
 * Tocar un número ya elegido lo quita y los siguientes suben un puesto.
 */
export function TopNPicker({
  candidates,
  n,
  busy = false,
  onConfirm,
  onCancel,
}: {
  candidates: TopNCandidate[]
  n: number
  busy?: boolean
  onConfirm: (orderedEventEntryIds: string[]) => void
  onCancel: () => void
}) {
  const [order, setOrder] = useState<string[]>([])
  const needed = Math.min(n, candidates.length)

  function toggle(id: string) {
    setOrder((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length < needed
          ? [...current, id]
          : current,
    )
  }

  const byId = new Map(candidates.map((c) => [c.eventEntryId, c]))

  return (
    <div>
      <p className="font-bold" aria-live="polite">
        {order.length < needed
          ? `Toca el ${order.length + 1}° lugar (${order.length} de ${needed})`
          : `Top ${needed} listo. Revisa y confirma.`}
      </p>
      <ol className="mt-2 flex min-h-14 flex-wrap items-center gap-2" aria-label="Orden elegido">
        {order.map((id, idx) => {
          const c = byId.get(id)
          return (
            <li key={id} className="flex items-center gap-1">
              <span className="font-display text-xl font-extrabold">{idx + 1}°</span>
              {c && <KartPlate number={c.kartNumber} categoryId={c.categoryId} size="sm" />}
            </li>
          )
        })}
      </ol>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {candidates.map((c) => {
          const position = order.indexOf(c.eventEntryId)
          const chosen = position >= 0
          return (
            <button
              key={c.eventEntryId}
              type="button"
              onClick={() => toggle(c.eventEntryId)}
              aria-pressed={chosen}
              aria-label={`Kart ${c.kartNumber}, ${c.name}${chosen ? `, ${position + 1}° lugar` : ''}`}
              className={`relative flex min-h-16 flex-col items-center justify-center rounded-lg border-2 p-1 ${
                chosen ? 'border-asphalt bg-asphalt' : 'border-line bg-white hover:border-pit'
              }`}
            >
              <KartPlate number={c.kartNumber} categoryId={c.categoryId} size="sm" />
              {chosen && (
                <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-caution font-display font-extrabold text-asphalt">
                  {position + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="success"
          size="lg"
          disabled={order.length !== needed || needed === 0 || busy}
          onClick={() => onConfirm(order)}
        >
          Cerrar sesión y enviar a revisión
        </Button>
        <Button
          variant="secondary"
          size="lg"
          disabled={order.length === 0}
          onClick={() => setOrder((o) => o.slice(0, -1))}
        >
          Deshacer último
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
