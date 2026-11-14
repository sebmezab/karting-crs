import { normalizeSerial, serialKey } from './validateTireMarking'

/** Bajo este largo (sin guiones) un texto es más probablemente ruido o una marca que un serial. */
const MIN_SERIAL_KEY_LENGTH = 4

/** Las barras de un código leídas por OCR suelen salir como I, L, 1 (y `|`, que se descarta). */
const BAR_NOISE = /^[IL1]+$/

function looksLikeSerial(candidate: string): boolean {
  const key = serialKey(candidate)
  return key.length >= MIN_SERIAL_KEY_LENGTH && /\d/.test(key) && !BAR_NOISE.test(key)
}

/** Un pedazo de serial cortado por el OCR: tiene algún dígito o es muy corto ("MG", "C4"). */
function isFragment(word: string): boolean {
  return /\d/.test(word) || serialKey(word).length < MIN_SERIAL_KEY_LENGTH
}

/** 0 = mezcla letras y números (lo típico de un serial), 1 = solo números. */
function rank(candidate: string): number {
  return /[A-Z]/.test(candidate) ? 0 : 1
}

/**
 * Extrae del texto leído por OCR los candidatos a serial de neumático (T-L2..T-L4).
 *
 * El texto de OCR es NO confiable (§11.2): todo pasa por `normalizeSerial`. Nunca se usa un
 * candidato sin que el revisor lo confirme (T-L5), porque el OCR puede confundir O/0 o I/1.
 */
export function serialCandidatesFromText(text: string, max = 3): string[] {
  const found: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const words = line.split(/\s+/).map(normalizeSerial).filter(Boolean)
    const serialWords = words.filter(looksLikeSerial)
    found.push(...serialWords)
    // El OCR a veces corta un serial en palabras ("MG 327 C4"): si ninguna palabra parece
    // serial por sí sola y todas son pedazos, se prueba la línea unida. Una palabra como
    // "MOJO" (marca) no es un pedazo de serial, y evita proponer "MOJOD2".
    if (serialWords.length === 0 && words.length > 1 && words.every(isFragment)) {
      const joined = normalizeSerial(words.join(''))
      if (looksLikeSerial(joined)) found.push(joined)
    }
  }

  const seen = new Set<string>()
  const unique = found.filter((candidate) => {
    const key = serialKey(candidate)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  // `sort` es estable: dentro de cada grupo se mantiene el orden de lectura.
  return unique.sort((a, b) => rank(a) - rank(b)).slice(0, max)
}

/** Grupos de caracteres que el OCR confunde entre sí; cada uno se reduce a su primer carácter. */
const OCR_CONFUSIONS: readonly string[] = ['0ODQ', '1IL', '5S', '8B', '2Z', '6G']

function confusionKey(serial: string): string {
  return [...serialKey(serial)]
    .map((char) => OCR_CONFUSIONS.find((group) => group.includes(char))?.[0] ?? char)
    .join('')
}

/**
 * Si el texto leído por OCR es un serial ya registrado del piloto salvo confusiones típicas del
 * OCR (1/I/L, 0/O…), devuelve ese serial registrado (T-L7). Ambiguo o sin parecido: null.
 * Solo se usa para PROPONER: el revisor igual confirma (T-L5).
 */
export function matchKnownSerial(candidate: string, known: readonly string[]): string | null {
  const key = confusionKey(candidate)
  if (!key) return null
  const matches = new Map<string, string>()
  for (const serial of known) {
    if (confusionKey(serial) === key) matches.set(serialKey(serial), normalizeSerial(serial))
  }
  return matches.size === 1 ? ([...matches.values()][0] ?? null) : null
}
