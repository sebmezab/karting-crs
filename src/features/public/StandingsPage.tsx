import { useState } from 'react'
import { useQuery } from '@/data/DataProvider'
import { publicDisplayName } from '@/domain/privacy'
import { CategoryTabs } from '@/ui/CategoryTabs'
import { KartPlate } from '@/ui/KartPlate'
import { Loading, LoadError, PageHeader } from '@/ui/Page'

/** Pantalla 3: tabla del campeonato por categoría. Estática en la demo (Fase 3: computeStandings). */
export function StandingsPage() {
  const data = useQuery(async (r) => {
    const overview = await r.championships.getCurrent()
    const [rows, entries] = await Promise.all([
      r.standings.list(overview.championship.id),
      r.entries.listForEvent(overview.events.at(-1)?.id ?? ''),
    ])
    return { overview, rows, entries }
  }, [])
  const [categoryId, setCategoryId] = useState<string | null>(null)

  if (data.error) return <LoadError onRetry={data.reload} />
  if (!data.data) return <Loading />

  const { overview, rows, entries } = data.data
  const categories = overview.categories.filter((c) => rows.some((r) => r.categoryId === c.id))
  const active = categoryId ?? categories[0]?.id ?? ''
  const rounds = overview.events.filter((e) => e.countsForPoints).map((e) => e.roundNumber)
  const sorted = rows.filter((r) => r.categoryId === active).sort((a, b) => b.total - a.total)

  return (
    <div>
      <PageHeader
        title="Tabla del campeonato"
        lead="Tabla de ejemplo con el reglamento CRS 2026: prefinal + final + 1 punto por participar, descontando la peor fecha (tachada)."
      />
      <CategoryTabs categories={categories} active={active} onChange={setCategoryId} />
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        {/* El total va junto al nombre para que se vea sin desplazar en el teléfono. */}
        <table className="w-full text-left">
          <thead className="border-b-2 border-asphalt">
            <tr>
              <th scope="col" className="px-3 py-2">
                Pos.
              </th>
              <th scope="col" className="px-3 py-2">
                Piloto
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Total
              </th>
              {rounds.map((r) => (
                <th key={r} scope="col" className="px-2 py-2 text-right text-asphalt-soft">
                  F{r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => {
              const e = entries.find((x) => x.championshipEntry.id === row.championshipEntryId)
              return (
                <tr key={row.championshipEntryId} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-display text-2xl font-extrabold">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-3">
                      {e && (
                        <KartPlate
                          number={e.championshipEntry.kartNumber}
                          categoryId={row.categoryId}
                          size="sm"
                        />
                      )}
                      <span className="font-bold">
                        {e
                          ? publicDisplayName(e.person, {
                              seasonYear: overview.championship.seasonYear,
                              abbreviateMinors: true,
                            })
                          : ''}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-display text-2xl font-extrabold tabular-nums">
                    {row.total}
                  </td>
                  {rounds.map((r) => {
                    const points = row.pointsByRound[r]
                    const dropped = row.droppedRound === r
                    return (
                      <td
                        key={r}
                        className={`px-2 py-2 text-right tabular-nums text-asphalt-soft ${dropped ? 'line-through' : ''}`}
                        title={dropped ? 'Fecha descartada' : undefined}
                      >
                        {points ?? '–'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-asphalt-soft">
        Los pilotos menores de edad se muestran con nombre e inicial del apellido.
      </p>
    </div>
  )
}
