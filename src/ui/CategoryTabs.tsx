/** Pestañas de categoría (tabla del campeonato, sesiones). Desplazables en el teléfono. */
export function CategoryTabs({
  categories,
  active,
  onChange,
}: {
  categories: { id: string; name: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div role="tablist" aria-label="Categoría" className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {categories.map((c) => (
        <button
          key={c.id}
          role="tab"
          type="button"
          aria-selected={c.id === active}
          onClick={() => onChange(c.id)}
          className={`min-h-12 shrink-0 rounded-lg border-2 px-4 font-bold whitespace-nowrap ${
            c.id === active ? 'border-asphalt bg-asphalt text-white' : 'border-line bg-white'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}
