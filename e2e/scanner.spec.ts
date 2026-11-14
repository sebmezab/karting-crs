import { writeFileSync } from 'node:fs'
import { chromium, expect, test, type Page } from '@playwright/test'
import { openAs } from './helpers'

/**
 * Lectura real con la cámara (T-L1, T-L5): Chromium recibe como "cámara" un video con la etiqueta
 * de la hoja de códigos de prueba. Sin `BarcodeDetector` en Chromium de escritorio, esto ejercita
 * el lector zxing (el mismo de iPhone) y el OCR servido desde la app.
 */

const WIDTH = 1280
const HEIGHT = 720

/** Convierte una captura PNG en un cuadro Y4M (I420) centrado sobre fondo blanco. */
async function toY4m(page: Page, png: Buffer, scale: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ dataUrl, width, height, scale }) => {
      const img = new Image()
      img.src = dataUrl
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('sin canvas')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, width, height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h)
      const { data } = ctx.getImageData(0, 0, width, height)
      const ySize = width * height
      const out = new Uint8Array(ySize * 1.5)
      for (let i = 0; i < ySize; i++) {
        const r = data[i * 4] ?? 0
        const g = data[i * 4 + 1] ?? 0
        const b = data[i * 4 + 2] ?? 0
        out[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      }
      out.fill(128, ySize) // sin color (U y V neutros)
      let binary = ''
      for (let i = 0; i < out.length; i += 0x8000) {
        binary += String.fromCharCode(...out.subarray(i, i + 0x8000))
      }
      return btoa(binary)
    },
    {
      dataUrl: `data:image/png;base64,${png.toString('base64')}`,
      width: WIDTH,
      height: HEIGHT,
      scale,
    },
  )
  const header = Buffer.from(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F15:1 Ip A1:1 C420jpeg\nFRAME\n`)
  return Buffer.concat([header, Buffer.from(base64, 'base64')])
}

/** Captura la etiqueta de la hoja de pruebas: completa (barras + número) o solo el número. */
async function labelVideo(page: Page, serial: string, part: 'label' | 'text', file: string) {
  await openAs(page, 'tech_inspector', '/tecnica/codigos')
  const figure = page.getByRole('figure').filter({ hasText: serial })
  const target = part === 'label' ? figure : figure.locator('figcaption')
  const png = await target.screenshot()
  writeFileSync(file, await toY4m(page, png, part === 'label' ? 2.5 : 2))
}

async function openScannerWithCamera(videoFile: string, baseURL: string) {
  const browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${videoFile}`,
    ],
  })
  const context = await browser.newContext({ baseURL, permissions: ['camera'] })
  const page = await context.newPage()
  await openAs(page, 'tech_inspector', '/tecnica/neumaticos')
  await page.getByPlaceholder('N° de kart').fill('312')
  await page.getByRole('button', { name: 'Buscar kart' }).click()
  await page.getByRole('button', { name: 'Escanear Delantero izq.' }).click()
  return { browser, page }
}

test.describe('escáner con cámara (código de barras o número impreso)', () => {
  // Lanza su propio Chromium con cámara simulada: basta correrlo en un proyecto.
  test.beforeEach(({ browserName }, info) => {
    test.skip(info.project.name !== 'laptop-14' || browserName !== 'chromium')
  })
  test.setTimeout(120_000)

  test('T-L1: lee el código de barras de la etiqueta y completa el serial solo', async ({
    page,
    baseURL,
  }, info) => {
    const file = info.outputPath('etiqueta.y4m')
    await labelVideo(page, 'MG-312-A1', 'label', file)
    const scanner = await openScannerWithCamera(file, baseURL ?? '')
    try {
      await expect(scanner.page.locator('#serial-FL')).toHaveValue('MG-312-A1', {
        timeout: 30_000,
      })
    } finally {
      await scanner.browser.close()
    }
  })

  test('T-L5: sin código de barras lee el número impreso y lo ofrece para confirmar', async ({
    page,
    baseURL,
  }, info) => {
    const file = info.outputPath('numero.y4m')
    await labelVideo(page, 'MG-312-A1', 'text', file)
    const scanner = await openScannerWithCamera(file, baseURL ?? '')
    try {
      const use = scanner.page.getByRole('button', { name: 'Usar MG-312-A1' })
      await expect(use).toBeVisible({ timeout: 60_000 })
      await expect(scanner.page.locator('#serial-FL')).toHaveValue('')
      await use.click()
      await expect(scanner.page.locator('#serial-FL')).toHaveValue('MG-312-A1')
    } finally {
      await scanner.browser.close()
    }
  })
})
