import type { DecodeHintType as HintType } from '@zxing/library'
import type { Rect } from '@/lib/scanRegion'

/**
 * Lectores del escáner de neumáticos. Se cargan solo al abrir la cámara (import dinámico).
 * - Código de barras: `BarcodeDetector` nativo (Chrome Android) o, si no está o no soporta los
 *   formatos, `@zxing/library` sobre el recuadro guía, derecho y girado (iPhone, escritorio).
 * - Texto impreso (OCR): Tesseract, servido desde la propia app (`/ocr/`), sin CDN de terceros.
 * Todo lo leído es texto NO confiable: quien lo recibe lo normaliza (`normalizeSerial`).
 */

export interface Frame {
  video: HTMLVideoElement
  /** Zona del recuadro guía en píxeles del video; null mientras el video no tiene tamaño. */
  region: Rect | null
}
export interface BarcodeEngine {
  read(frame: Frame): Promise<string | null>
}
export interface TextEngine {
  read(frame: Frame): Promise<string>
}
export interface ScanEngines {
  barcode: () => Promise<BarcodeEngine | null>
  text: () => Promise<TextEngine | null>
}

interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}
interface NativeBarcodeDetectorCtor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector
  getSupportedFormats?: () => Promise<string[]>
}

/** Formatos habituales en etiquetas de neumáticos y bodegas (1D) y en códigos 2D. */
const NATIVE_FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'ean_13',
  'ean_8',
  'itf',
  'upc_a',
  'upc_e',
  'qr_code',
  'data_matrix',
  'pdf417',
]

/**
 * Copia la zona del recuadro a un canvas (reducida a `maxWidth`), opcionalmente en grises o
 * girada 90° (etiqueta vertical). Devuelve el contexto, o null si aún no hay imagen.
 */
function drawRegion(
  canvas: HTMLCanvasElement,
  { video, region }: Frame,
  {
    maxWidth,
    filter = 'none',
    rotate = false,
  }: { maxWidth: number; filter?: string; rotate?: boolean },
): CanvasRenderingContext2D | null {
  const r = region ?? { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight }
  if (!r.width || !r.height) return null
  const scale = Math.min(1, maxWidth / Math.max(r.width, r.height))
  const w = Math.round(r.width * scale)
  const h = Math.round(r.height * scale)
  canvas.width = rotate ? h : w
  canvas.height = rotate ? w : h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.filter = filter
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  if (rotate) {
    ctx.translate(h, 0)
    ctx.rotate(Math.PI / 2)
  }
  ctx.drawImage(video, r.x, r.y, r.width, r.height, 0, 0, w, h)
  return ctx
}

/** Luminancia (grises) de un canvas, como la espera zxing. */
function luminances(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = ctx.getImageData(0, 0, width, height)
  const out = new Uint8ClampedArray(width * height)
  for (let i = 0; i < out.length; i++) {
    const p = i * 4
    out[i] = ((data[p] ?? 0) * 299 + (data[p + 1] ?? 0) * 587 + (data[p + 2] ?? 0) * 114) / 1000
  }
  return out
}

async function nativeEngine(): Promise<BarcodeEngine | null> {
  const Native = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor })
    .BarcodeDetector
  if (!Native) return null
  try {
    // Algunos Android exponen la API pero sin formatos (falta el módulo de Google Play): en ese
    // caso se usa zxing en vez de fallar.
    const supported = (await Native.getSupportedFormats?.()) ?? []
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f))
    if (formats.length === 0) return null
    const detector = new Native({ formats })
    return {
      read: async ({ video }) => (await detector.detect(video))[0]?.rawValue || null,
    }
  } catch {
    return null
  }
}

async function zxingEngine(): Promise<BarcodeEngine> {
  const {
    BarcodeFormat,
    BinaryBitmap,
    DecodeHintType,
    HybridBinarizer,
    MultiFormatReader,
    RGBLuminanceSource,
  } = await import('@zxing/library')
  const hints = new Map<HintType, unknown>([
    [DecodeHintType.TRY_HARDER, true],
    [
      DecodeHintType.POSSIBLE_FORMATS,
      [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODABAR,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.ITF,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.PDF_417,
      ],
    ],
  ])
  const reader = new MultiFormatReader()
  reader.setHints(hints)
  const canvas = document.createElement('canvas')
  // Una lectura derecha y la siguiente girada 90°, por si la etiqueta está vertical en el
  // neumático. (El giro propio de zxing para canvas falla en @zxing/browser 0.2.)
  let rotate = false
  return {
    read: async (frame) => {
      rotate = !rotate
      const ctx = drawRegion(canvas, frame, { maxWidth: 1280, rotate })
      if (!ctx) return null
      const source = new RGBLuminanceSource(
        luminances(ctx, canvas.width, canvas.height),
        canvas.width,
        canvas.height,
      )
      try {
        return (
          reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(source))).getText() || null
        )
      } catch {
        return null // no hay código en este cuadro
      } finally {
        reader.reset()
      }
    },
  }
}

export async function createBarcodeEngine(): Promise<BarcodeEngine | null> {
  return (await nativeEngine()) ?? (await zxingEngine())
}

type TesseractWorker = Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>>
let ocrWorker: Promise<TesseractWorker> | null = null

/** Un solo worker de OCR para toda la sesión: cargarlo cuesta (~7 MB la primera vez). */
function getOcrWorker(): Promise<TesseractWorker> {
  ocrWorker ??= (async () => {
    const { default: tesseract } = await import('tesseract.js')
    const base = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.href).href
    const worker = await tesseract.createWorker('eng', tesseract.OEM.LSTM_ONLY, {
      workerPath: `${base}worker.min.js`,
      corePath: `${base}core`,
      langPath: `${base}lang`,
      workerBlobURL: false,
    })
    await worker.setParameters({
      // Un serial: letras, números y guion. Restringirlo reduce confusiones del OCR.
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-',
      tessedit_pageseg_mode: tesseract.PSM.SPARSE_TEXT,
    })
    return worker
  })().catch((error: unknown) => {
    ocrWorker = null // se reintenta la próxima vez que se abra la cámara
    throw error
  })
  return ocrWorker
}

export async function createTextEngine(): Promise<TextEngine | null> {
  const worker = await getOcrWorker()
  const canvas = document.createElement('canvas')
  return {
    read: async (frame) => {
      const ctx = drawRegion(canvas, frame, {
        maxWidth: 1280,
        filter: 'grayscale(1) contrast(1.4)',
      })
      if (!ctx) return ''
      const { data } = await worker.recognize(canvas)
      return data.text
    },
  }
}

export const defaultEngines: ScanEngines = {
  barcode: createBarcodeEngine,
  text: createTextEngine,
}
