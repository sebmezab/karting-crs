import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

const BASE = '/karting-crs/'

/**
 * Archivos del OCR (Tesseract) servidos desde la propia app en `ocr/`, en vez del CDN por
 * defecto de tesseract.js: no se carga código de terceros en tiempo de ejecución (§11.2) y
 * funciona igual en dev, preview y GitHub Pages. Solo los núcleos "lstm" (los que se usan).
 */
const OCR_ASSETS: Record<string, string> = {
  'worker.min.js': 'tesseract.js/dist/worker.min.js',
  'core/tesseract-core-lstm.wasm.js': 'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'core/tesseract-core-simd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'core/tesseract-core-relaxedsimd-lstm.wasm.js':
    'tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'lang/eng.traineddata.gz': '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
}

function ocrAssets(): Plugin {
  const read = (file: string) =>
    readFileSync(fileURLToPath(new URL(`./node_modules/${file}`, import.meta.url)))
  return {
    name: 'karting-ocr-assets',
    configureServer(server) {
      server.middlewares.use(`${BASE}ocr/`, (req, res, next) => {
        const source = OCR_ASSETS[(req.url ?? '').replace(/^\//, '').split('?')[0] ?? '']
        if (!source) return next()
        res.setHeader(
          'Content-Type',
          source.endsWith('.js') ? 'text/javascript' : 'application/octet-stream',
        )
        res.end(read(source))
      })
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(OCR_ASSETS)) {
        this.emitFile({ type: 'asset', fileName: `ocr/${fileName}`, source: read(source) })
      }
    },
  }
}

// GitHub Pages sirve el sitio en /karting-crs/ (ver docs/decisions/0002-hosting-y-routing.md).
// Se usa la misma base en dev, preview y build para que las rutas sean idénticas.
export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss(), ocrAssets()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  preview: { port: 4173, strictPort: true },
})
