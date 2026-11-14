import { describe, expect, it } from 'vitest'
import { guideRectInVideo } from './scanRegion'

const FULL = { x: 0, y: 0, width: 1, height: 1 }

describe('recuadro guía del escáner en píxeles del video (vista con object-cover)', () => {
  it('video horizontal en vista 4:3: se recortan los costados', () => {
    expect(
      guideRectInVideo({ width: 1920, height: 1080 }, { width: 400, height: 300 }, FULL),
    ).toEqual({ x: 240, y: 0, width: 1440, height: 1080 })
  })

  it('video vertical (teléfono) en vista 4:3: se recorta arriba y abajo', () => {
    expect(
      guideRectInVideo({ width: 1080, height: 1920 }, { width: 400, height: 300 }, FULL),
    ).toEqual({ x: 0, y: 555, width: 1080, height: 810 })
  })

  it('el recuadro es una fracción de lo que se ve', () => {
    expect(
      guideRectInVideo(
        { width: 1600, height: 1200 },
        { width: 400, height: 300 },
        { x: 0.25, y: 0.5, width: 0.5, height: 0.25 },
      ),
    ).toEqual({ x: 400, y: 600, width: 800, height: 300 })
  })

  it('sin dimensiones todavía (video cargando) no hay recuadro', () => {
    expect(guideRectInVideo({ width: 0, height: 0 }, { width: 400, height: 300 }, FULL)).toBeNull()
    expect(guideRectInVideo({ width: 640, height: 480 }, { width: 0, height: 0 }, FULL)).toBeNull()
  })
})
