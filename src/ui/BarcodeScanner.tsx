import { useEffect, useRef, useState } from 'react'
import { matchKnownSerial, serialCandidatesFromText, serialKey } from '@/domain/tires'
import { es } from '@/i18n/es'
import { guideRectInVideo, type Rect } from '@/lib/scanRegion'
import { Button } from './Button'
import { defaultEngines, type Frame, type ScanEngines, type TextEngine } from './scanner/engines'

/**
 * Escáner de etiquetas de neumático con la cámara del teléfono (SPEC §3). Lee lo que encuentre
 * primero dentro del recuadro:
 * - el **código de barras** → se entrega solo (T-L1);
 * - el **número impreso** (OCR) → se ofrece para que el revisor lo confirme (T-L5).
 * El texto leído es NO confiable: quien lo recibe debe normalizarlo (`normalizeSerial`).
 */

type ScannerState = 'starting' | 'scanning' | 'denied' | 'unavailable'
type TextStatus = 'off' | 'loading' | 'ready' | 'failed'

/** Recuadro guía como fracción de la vista (el mismo se dibuja y se lee). */
const GUIDE: Rect = { x: 0.06, y: 0.2, width: 0.88, height: 0.6 }
const BARCODE_INTERVAL_MS = 150
const OCR_INTERVAL_MS = 600
const NO_SERIALS: readonly string[] = []

/**
 * Alta resolución: las barras de una etiqueta de neumático son finas y a 640×480 (lo que da la
 * cámara por defecto) no se distinguen.
 */
const CAMERA: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
}

type ExtendedCapabilities = MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] }

function capabilities(track: MediaStreamTrack | undefined): ExtendedCapabilities {
  try {
    return (track?.getCapabilities?.() ?? {}) as ExtendedCapabilities
  } catch {
    return {}
  }
}

async function applyAdvanced(track: MediaStreamTrack, constraint: Record<string, unknown>) {
  try {
    await track.applyConstraints({ advanced: [constraint as MediaTrackConstraintSet] })
  } catch {
    // La cámara no lo soporta: se sigue sin eso.
  }
}

export function BarcodeScanner({
  onDetected,
  knownSerials = NO_SERIALS,
  engines = defaultEngines,
}: {
  onDetected: (text: string) => void
  /** Seriales ya registrados del piloto: corrigen confusiones del OCR (T-L7). */
  knownSerials?: readonly string[]
  engines?: ScanEngines
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<MediaStreamTrack | undefined>(undefined)
  const finishRef = useRef<(text: string) => void>(() => undefined)
  const [state, setState] = useState<ScannerState>('starting')
  const [textStatus, setTextStatus] = useState<TextStatus>('off')
  const [candidates, setCandidates] = useState<string[]>([])
  const [torch, setTorch] = useState<{ available: boolean; on: boolean }>({
    available: false,
    on: false,
  })
  const onDetectedRef = useRef(onDetected)
  const enginesRef = useRef(engines)
  const knownRef = useRef(knownSerials)
  useEffect(() => {
    onDetectedRef.current = onDetected
    knownRef.current = knownSerials
  })

  useEffect(() => {
    let stopped = false
    let stream: MediaStream | null = null
    let timer: number | undefined
    let textEngine: TextEngine | null = null
    let ocrBusy = false
    let lastOcrAt = 0
    let previousRead: string[] = []

    function cleanup() {
      if (timer !== undefined) window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }

    const finish = (text: string) => {
      if (stopped) return
      stopped = true
      cleanup()
      onDetectedRef.current(text)
    }
    finishRef.current = finish

    function currentFrame(video: HTMLVideoElement): Frame | null {
      if (video.readyState < 2) return null
      const region = guideRectInVideo(
        { width: video.videoWidth, height: video.videoHeight },
        { width: video.clientWidth, height: video.clientHeight },
        GUIDE,
      )
      return { video, region }
    }

    function readText(engine: TextEngine, frame: Frame) {
      ocrBusy = true
      lastOcrAt = Date.now()
      engine
        .read(frame)
        .then((text) => {
          if (stopped) return
          // Solo se ofrece lo que se leyó igual en dos pasadas seguidas (T-L5): filtra ruido.
          const read = serialCandidatesFromText(text).map(
            (c) => matchKnownSerial(c, knownRef.current) ?? c,
          )
          const stable = read.filter((c) => previousRead.some((p) => serialKey(p) === serialKey(c)))
          previousRead = read
          if (stable.length > 0) setCandidates(stable)
        })
        .catch(() => undefined)
        .finally(() => {
          ocrBusy = false
        })
    }

    async function start() {
      const video = videoRef.current
      if (!video || !navigator.mediaDevices?.getUserMedia) {
        setState('unavailable')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia(CAMERA)
      } catch (error) {
        const name = error instanceof DOMException ? error.name : ''
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
        return
      }
      if (stopped) return cleanup()
      video.srcObject = stream
      await video.play().catch(() => undefined)

      const track = stream.getVideoTracks()[0]
      trackRef.current = track
      const caps = capabilities(track)
      if (track && caps.focusMode?.includes('continuous')) {
        void applyAdvanced(track, { focusMode: 'continuous' })
      }
      setTorch({ available: caps.torch === true, on: false })
      setState('scanning')

      // El OCR tarda en cargar: se prepara en paralelo y el código de barras no lo espera.
      setTextStatus('loading')
      enginesRef.current
        .text()
        .then((engine) => {
          if (stopped) return
          textEngine = engine
          setTextStatus(engine ? 'ready' : 'failed')
        })
        .catch(() => {
          if (!stopped) setTextStatus('failed')
        })

      const barcode = await enginesRef.current.barcode().catch(() => null)

      const tick = async () => {
        if (stopped) return
        const frame = currentFrame(video)
        if (frame) {
          const code = barcode ? await barcode.read(frame).catch(() => null) : null
          if (code) return finish(code)
          if (textEngine && !ocrBusy && Date.now() - lastOcrAt >= OCR_INTERVAL_MS) {
            readText(textEngine, frame)
          }
        }
        if (!stopped) timer = window.setTimeout(() => void tick(), BARCODE_INTERVAL_MS)
      }
      void tick()
    }

    void start()
    return () => {
      stopped = true
      cleanup()
    }
  }, [])

  async function toggleTorch() {
    const track = trackRef.current
    if (!track) return
    const on = !torch.on
    await applyAdvanced(track, { torch: on })
    setTorch({ available: true, on })
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-asphalt">
        <video ref={videoRef} className="size-full object-cover" muted playsInline />
        {state === 'scanning' && (
          <div
            className="pointer-events-none absolute rounded-md border-4 border-caution"
            style={{
              left: `${GUIDE.x * 100}%`,
              top: `${GUIDE.y * 100}%`,
              width: `${GUIDE.width * 100}%`,
              height: `${GUIDE.height * 100}%`,
            }}
          />
        )}
      </div>

      <p className="mt-3 text-asphalt-soft" role="status">
        {state === 'starting' && es.scanner.starting}
        {state === 'scanning' && es.scanner.aim}
        {state === 'denied' && es.scanner.denied}
        {state === 'unavailable' && es.scanner.unavailable}
      </p>
      {state === 'scanning' && textStatus === 'loading' && (
        <p className="mt-1 text-sm text-asphalt-soft">{es.scanner.textLoading}</p>
      )}
      {state === 'scanning' && textStatus === 'failed' && (
        <p className="mt-1 text-sm text-asphalt-soft">{es.scanner.textFailed}</p>
      )}

      {candidates.length > 0 && (
        <div className="mt-3 space-y-2 rounded-lg border-2 border-pit bg-info-bg p-3">
          <p className="font-bold">{es.scanner.textFound}</p>
          {candidates.map((candidate) => (
            <Button key={candidate} block onClick={() => finishRef.current(candidate)}>
              {es.scanner.useCandidate(candidate)}
            </Button>
          ))}
        </div>
      )}

      {state === 'scanning' && torch.available && (
        <Button variant="secondary" block className="mt-3" onClick={() => void toggleTorch()}>
          {torch.on ? es.scanner.torchOff : es.scanner.torchOn}
        </Button>
      )}
    </div>
  )
}
