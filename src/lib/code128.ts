/**
 * Codificador mínimo de Code 128 (juego B) para dibujar códigos de barras de prueba como los de
 * una etiqueta de neumático. Solo se usa en la hoja de códigos de prueba (Fase 0).
 */

/** Anchos barra/espacio de cada símbolo 0..106 (106 = parada). */
// prettier-ignore
export const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
] as const

const START_B = 104
const STOP = 106
const QUIET_ZONE_MODULES = 10

/** Devuelve los módulos (true = barra) de `text` en Code 128 B, con zona de silencio. */
export function code128Modules(text: string): boolean[] {
  const values = [...text].map((char) => {
    const code = char.charCodeAt(0)
    if (code < 32 || code > 126) throw new Error(`Carácter no soportado en Code 128 B: ${char}`)
    return code - 32
  })
  const checksum = values.reduce((sum, value, i) => sum + value * (i + 1), START_B) % 103
  const symbols = [START_B, ...values, checksum, STOP]

  const modules: boolean[] = Array<boolean>(QUIET_ZONE_MODULES).fill(false)
  for (const symbol of symbols) {
    const pattern = CODE128_PATTERNS[symbol] ?? ''
    ;[...pattern].forEach((width, i) => {
      for (let k = 0; k < Number(width); k++) modules.push(i % 2 === 0)
    })
  }
  return modules.concat(Array<boolean>(QUIET_ZONE_MODULES).fill(false))
}
