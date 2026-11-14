import { RequireAccess } from '@/app/Layout'
import { useSession } from '@/app/session'
import { TIRE_DEMO_CASES } from '@/data/demo'
import { TIRE_POSITIONS } from '@/domain/tires'
import { code128Modules } from '@/lib/code128'
import { Button } from '@/ui/Button'
import { PageHeader } from '@/ui/Page'
import { es } from '@/i18n/es'

/**
 * Etiqueta como la de un neumático: código de barras Code 128 con el número impreso debajo, para
 * probar las dos lecturas del escáner (barras y texto). Generada localmente, sin servicios externos.
 */
function TireLabel({ value }: { value: string }) {
  const modules = code128Modules(value)
  // Agrupa módulos seguidos en una sola barra para dibujar menos rectángulos.
  const bars: { x: number; width: number }[] = []
  modules.forEach((isBar, x) => {
    const last = bars[bars.length - 1]
    if (!isBar) return
    if (last && last.x + last.width === x) last.width += 1
    else bars.push({ x, width: 1 })
  })
  // Ancho fijo de 2 px por módulo: con anchos fraccionarios las barras quedan desparejas y el
  // código impreso o en pantalla deja de ser legible para un lector.
  return (
    <figure className="flex w-full flex-col items-center rounded-md bg-white px-2 py-3">
      <svg
        viewBox={`0 0 ${modules.length} 40`}
        width={modules.length * 2}
        height={64}
        preserveAspectRatio="none"
        className="max-w-none"
        role="img"
        aria-label={`Código de barras ${value}`}
        shapeRendering="crispEdges"
      >
        <rect width={modules.length} height={40} fill="#fff" />
        {bars.map((b) => (
          <rect key={b.x} x={b.x} width={b.width} height={40} fill="#000" />
        ))}
      </svg>
      <figcaption className="mt-1 font-mono text-lg font-bold tracking-wider text-black">
        {value}
      </figcaption>
    </figure>
  )
}

/**
 * Hoja de códigos para probar el escaneo real con la cámara: se abre en un notebook (o se
 * imprime) y se escanea desde el teléfono en "Neumáticos".
 */
export function TestCodesPage() {
  const session = useSession()
  return (
    <RequireAccess allowed={session.can('tech.mark_tires')}>
      <div>
        <PageHeader
          title="Códigos de prueba"
          lead="Abre esta página en otra pantalla o imprímela, y escanea desde Neumáticos en el teléfono. Prueba el código de barras o tapa las barras para probar la lectura del número impreso."
          aside={
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimir
            </Button>
          }
        />
        <div className="space-y-6">
          {TIRE_DEMO_CASES.map((c) => (
            <section
              key={c.key}
              className="rounded-xl border border-line bg-white p-4 break-inside-avoid"
            >
              <h2 className="font-display text-2xl font-extrabold">
                Kart {c.kartNumber}: {c.title}
              </h2>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                {TIRE_POSITIONS.map((p) => (
                  <li key={p} className="flex flex-col items-center gap-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-lg font-extrabold">{p}</span>
                      <span className="text-sm text-asphalt-soft">{es.tirePosition[p]}</span>
                    </span>
                    <TireLabel value={c.serials[p]} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </RequireAccess>
  )
}
