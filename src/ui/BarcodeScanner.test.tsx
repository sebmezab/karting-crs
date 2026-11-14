import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { es } from '@/i18n/es'
import { BarcodeScanner } from './BarcodeScanner'
import type { ScanEngines } from './scanner/engines'

const readyStateDescriptor = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  'readyState',
)

function fakeCamera(getUserMedia?: () => Promise<unknown>) {
  const track = {
    stop: vi.fn(),
    getCapabilities: () => ({}),
    applyConstraints: vi.fn(async () => undefined),
  }
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] }
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn(getUserMedia ?? (async () => stream)) },
    configurable: true,
  })
  return track
}

function engines(barcodeReads: (string | null)[], textReads: string[] | null): ScanEngines {
  let b = 0
  let t = 0
  return {
    barcode: async () => ({
      read: async () => barcodeReads[Math.min(b++, barcodeReads.length - 1)] ?? null,
    }),
    text: async () =>
      textReads && { read: async () => textReads[Math.min(t++, textReads.length - 1)] ?? '' },
  }
}

describe('escáner de neumáticos: código de barras o número impreso (T-L1, T-L5, T-L6)', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      get: () => 4,
      configurable: true,
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    if (readyStateDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'readyState', readyStateDescriptor)
    }
    Reflect.deleteProperty(navigator, 'mediaDevices')
  })

  it('T-L1: al leer un código de barras entrega el texto solo y apaga la cámara', async () => {
    const track = fakeCamera()
    const onDetected = vi.fn()
    render(<BarcodeScanner onDetected={onDetected} engines={engines([null, 'MG-312-A1'], null)} />)
    await waitFor(() => expect(onDetected).toHaveBeenCalledWith('MG-312-A1'))
    expect(onDetected).toHaveBeenCalledTimes(1)
    expect(track.stop).toHaveBeenCalled()
  })

  it('T-L5: el número impreso leído dos veces igual se ofrece para confirmar, sin completarse solo', async () => {
    fakeCamera()
    const onDetected = vi.fn()
    render(
      <BarcodeScanner
        onDetected={onDetected}
        engines={engines([null], ['MOJO D2\nMG-327-C4', 'MOJO D2\nMG-327-C4'])}
      />,
    )
    const use = await screen.findByRole(
      'button',
      { name: es.scanner.useCandidate('MG-327-C4') },
      { timeout: 4000 },
    )
    expect(onDetected).not.toHaveBeenCalled()
    await userEvent.click(use)
    expect(onDetected).toHaveBeenCalledWith('MG-327-C4')
  })

  it('T-L7: un número leído con confusión del OCR (L por 1) se propone como el serial conocido', async () => {
    fakeCamera()
    render(
      <BarcodeScanner
        onDetected={vi.fn()}
        knownSerials={['MG-312-A1', 'MG-312-A2']}
        engines={engines([null], ['MG-312-AL'])}
      />,
    )
    expect(
      await screen.findByRole(
        'button',
        { name: es.scanner.useCandidate('MG-312-A1') },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument()
  })

  it('T-L5: una lectura de OCR que cambia en cada pasada no se ofrece', async () => {
    fakeCamera()
    render(
      <BarcodeScanner
        onDetected={vi.fn()}
        engines={{
          barcode: async () => ({ read: async () => null }),
          // Cada pasada lee algo distinto (nunca se repite).
          text: async () => {
            let n = 100
            return { read: async () => `MG-${n++}-C4` }
          },
        }}
      />,
    )
    await new Promise((r) => setTimeout(r, 2500))
    expect(screen.queryByRole('button', { name: /^Usar / })).not.toBeInTheDocument()
  })

  it('T-L6: sin cámara en el navegador pide ingresar el serial a mano', async () => {
    render(<BarcodeScanner onDetected={vi.fn()} engines={engines([null], null)} />)
    expect(await screen.findByText(es.scanner.unavailable)).toBeInTheDocument()
  })

  it('T-L6: sin permiso de cámara lo explica y pide ingresar el serial a mano', async () => {
    fakeCamera(async () => {
      throw new DOMException('denied', 'NotAllowedError')
    })
    render(<BarcodeScanner onDetected={vi.fn()} engines={engines([null], null)} />)
    expect(await screen.findByText(es.scanner.denied)).toBeInTheDocument()
  })
})
