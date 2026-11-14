import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library'
import { describe, expect, it } from 'vitest'
import { code128Modules, CODE128_PATTERNS } from './code128'

/** Dibuja las barras como una imagen en escala de grises y la lee con zxing (el lector de la app). */
function decode(modules: boolean[], moduleWidth = 3, height = 60): string {
  const width = modules.length * moduleWidth
  const luminances = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      luminances[y * width + x] = modules[Math.floor(x / moduleWidth)] ? 0 : 255
    }
  }
  const reader = new MultiFormatReader()
  reader.setHints(new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]]]))
  const bitmap = new BinaryBitmap(
    new HybridBinarizer(new RGBLuminanceSource(luminances, width, height)),
  )
  return reader.decode(bitmap).getText()
}

describe('código de barras Code 128 para la hoja de códigos de prueba', () => {
  it('la tabla tiene los 107 patrones y cada símbolo mide 11 módulos (la parada, 13)', () => {
    expect(CODE128_PATTERNS).toHaveLength(107)
    CODE128_PATTERNS.forEach((pattern, i) => {
      const sum = [...pattern].reduce((s, d) => s + Number(d), 0)
      expect(sum).toBe(i === 106 ? 13 : 11)
    })
  })

  it.each(['MG-312-A1', 'MG-355-A2', 'MG-366-U4', 'ab 12/x'])(
    'el lector de la app decodifica "%s" tal cual',
    (text) => {
      expect(decode(code128Modules(text))).toBe(text)
    },
  )

  it('incluye zona de silencio a ambos lados', () => {
    const modules = code128Modules('A1')
    expect(modules.slice(0, 10).every((m) => !m)).toBe(true)
    expect(modules.slice(-10).every((m) => !m)).toBe(true)
  })

  it('rechaza caracteres fuera de Code 128 B', () => {
    expect(() => code128Modules('Ñ')).toThrow()
  })
})
