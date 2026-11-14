import { useEffect, useRef, useState } from 'react'

/**
 * Escáner con la cámara del teléfono (SPEC §3):
 * 1. `BarcodeDetector` nativo (Chrome/Android).
 * 2. Respaldo `@zxing/browser` (iOS Safari), cargado solo cuando hace falta.
 * El texto leído es NO confiable: quien lo recibe debe normalizarlo (`normalizeSerial`).
 */

interface DetectedBarcode {
  rawValue: string
}
interface NativeBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>
}
interface NativeBarcodeDetectorCtor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector
  getSupportedFormats?: () => Promise<string[]>
}

const WANTED_FORMATS = ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'data_matrix', 'itf']

type ScannerState = 'starting' | 'scanning' | 'denied' | 'unavailable'

export function BarcodeScanner({ onDetected }: { onDetected: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<ScannerState>('starting')
  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  })

  useEffect(() => {
    let stopped = false
    let stream: MediaStream | null = null
    let timer: number | undefined
    let stopZxing: (() => void) | undefined

    const finish = (text: string) => {
      if (stopped) return
      stopped = true
      cleanup()
      onDetectedRef.current(text)
    }

    function cleanup() {
      if (timer !== undefined) window.clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
      stopZxing?.()
    }

    async function start() {
      const video = videoRef.current
      if (!video || !navigator.mediaDevices?.getUserMedia) {
        setState('unavailable')
        return
      }
      const Native = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor })
        .BarcodeDetector
      try {
        if (Native) {
          const supported = (await Native.getSupportedFormats?.()) ?? WANTED_FORMATS
          const detector = new Native({
            formats: WANTED_FORMATS.filter((f) => supported.includes(f)),
          })
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          })
          if (stopped) return cleanup()
          video.srcObject = stream
          await video.play()
          setState('scanning')
          timer = window.setInterval(() => {
            if (video.readyState < 2) return
            detector
              .detect(video)
              .then((codes) => {
                const first = codes[0]
                if (first?.rawValue) finish(first.rawValue)
              })
              .catch(() => undefined)
          }, 200)
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          if (stopped) return
          const reader = new BrowserMultiFormatReader()
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: 'environment' } }, audio: false },
            video,
            (result) => {
              if (result) finish(result.getText())
            },
          )
          stopZxing = () => controls.stop()
          if (stopped) return cleanup()
          setState('scanning')
        }
      } catch (error) {
        const name = error instanceof DOMException ? error.name : ''
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
      }
    }

    void start()
    return () => {
      stopped = true
      cleanup()
    }
  }, [])

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-asphalt">
        <video ref={videoRef} className="size-full object-cover" muted playsInline />
        {state === 'scanning' && (
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-md border-4 border-caution" />
        )}
      </div>
      <p className="mt-3 text-asphalt-soft" role="status">
        {state === 'starting' && 'Abriendo la cámara…'}
        {state === 'scanning' && 'Apunta al código de barras del neumático.'}
        {state === 'denied' &&
          'No hay permiso para usar la cámara. Actívalo en el navegador o ingresa el serial a mano.'}
        {state === 'unavailable' &&
          'Este navegador no puede usar la cámara aquí (requiere HTTPS). Ingresa el serial a mano.'}
      </p>
    </div>
  )
}
