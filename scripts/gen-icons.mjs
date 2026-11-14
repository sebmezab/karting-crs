// Genera los íconos PNG de la PWA (192 y 512 px) a partir de public/icon.svg usando el
// Chromium de Playwright (ya es dependencia de desarrollo; evita sumar otra librería).
// Uso: npm run icons   (requiere `npx playwright install chromium`)
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = readFileSync('public/icon.svg', 'utf8')
const browser = await chromium.launch()
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    await page.setContent(
      `<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
    )
    await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true })
    await page.close()
    console.log(`public/icon-${size}.png`)
  }
} finally {
  await browser.close()
}
