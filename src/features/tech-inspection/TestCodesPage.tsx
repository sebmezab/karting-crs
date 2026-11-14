import { useEffect, useRef } from 'react'
import { RequireAccess } from '@/app/Layout'
import { useSession } from '@/app/session'
import { TIRE_DEMO_CASES } from '@/data/demo'
import { TIRE_POSITIONS } from '@/domain/tires'
import { Button } from '@/ui/Button'
import { PageHeader } from '@/ui/Page'

/** Código QR generado localmente (sin servicios externos) con @zxing/browser. */
function QrCode({ value }: { value: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    void import('@zxing/browser').then(({ BrowserQRCodeSvgWriter }) => {
      if (cancelled || !ref.current) return
      const svg = new BrowserQRCodeSvgWriter().write(value, 132, 132)
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', `Código ${value}`)
      ref.current.replaceChildren(svg)
    })
    return () => {
      cancelled = true
    }
  }, [value])
  return <div ref={ref} className="size-[132px]" />
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
          lead="Abre esta página en otra pantalla o imprímela, y escanea los códigos desde Neumáticos en el teléfono."
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
              <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {TIRE_POSITIONS.map((p) => (
                  <li key={p} className="flex flex-col items-center gap-1">
                    <QrCode value={c.serials[p]} />
                    <span className="font-display text-lg font-semibold">
                      {p}: {c.serials[p]}
                    </span>
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
