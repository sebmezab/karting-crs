import { describe, expect, it } from 'vitest'
import { matchKnownSerial, serialCandidatesFromText } from './serialFromText'

describe('corrección de confusiones del OCR con seriales conocidos del piloto (T-L7)', () => {
  const known = ['MG-312-A1', 'MG-312-A2', 'MG-312-A3', 'MG-312-A4']

  it('MG-312-AL (1 leído como L) se corrige al serial registrado MG-312-A1', () => {
    expect(matchKnownSerial('MG-312-AL', known)).toBe('MG-312-A1')
  })

  it('corrige O/0, S/5, B/8, Z/2, G/6 y D/Q/0, e ignora guiones', () => {
    expect(matchKnownSerial('M6312A4', known)).toBe('MG-312-A4')
    expect(matchKnownSerial('AB-0O5', ['A8-005'])).toBe('A8-005')
    expect(matchKnownSerial('ZS-DQ', ['25-00'])).toBe('25-00')
  })

  it('un serial idéntico se devuelve tal como está registrado', () => {
    expect(matchKnownSerial('mg312a2', known)).toBe('MG-312-A2')
  })

  it('si no se parece a ninguno, no se corrige', () => {
    expect(matchKnownSerial('MG-312-A9', known)).toBeNull()
  })

  it('si se parece a más de uno, no se corrige (ambiguo)', () => {
    expect(matchKnownSerial('AB-1', ['AB-I', 'AB-L'])).toBeNull()
  })

  it('sin seriales conocidos no hay corrección', () => {
    expect(matchKnownSerial('MG-312-AL', [])).toBeNull()
  })
})

describe('candidatos de serial desde texto leído por OCR (T-L2..T-L4)', () => {
  it('T-L2: propone el serial de la etiqueta e ignora la marca y palabras sin dígitos', () => {
    expect(serialCandidatesFromText('MOJO D2\nMG-327-C4')).toEqual(['MG-327-C4'])
  })

  it('T-L2: normaliza el texto leído (minúsculas, caracteres raros) como un serial escaneado', () => {
    expect(serialCandidatesFromText('  mg-312-a1. ')).toEqual(['MG-312-A1'])
  })

  it('T-L2: descarta textos cortos (menos de 4 caracteres sin contar guiones)', () => {
    expect(serialCandidatesFromText('D2\n10\nX-1')).toEqual([])
  })

  it('T-L3: no une la línea si alguna palabra ya parece serial', () => {
    expect(serialCandidatesFromText('2026 LOTE')).toEqual(['2026'])
  })

  it('T-L2: prioriza los que mezclan letras y números, luego solo números, en orden de lectura', () => {
    expect(serialCandidatesFromText('2026 LOTE\nAB12345 98765')).toEqual([
      'AB12345',
      '2026',
      '98765',
    ])
  })

  it('T-L3: si el OCR separó el serial con espacios, propone también la línea unida', () => {
    const candidates = serialCandidatesFromText('MG 327 C4')
    expect(candidates).toContain('MG327C4')
    expect(candidates).not.toContain('MG')
  })

  it('T-L3: no repite candidatos que son el mismo neumático (los guiones no distinguen)', () => {
    expect(serialCandidatesFromText('MG-327-C4\nMG327C4')).toEqual(['MG-327-C4'])
  })

  it('T-L4: las barras del código leídas como I, L, 1 o | no son candidatos', () => {
    expect(serialCandidatesFromText('|||| IIl1 1111111 lIlI')).toEqual([])
  })

  it('texto vacío no propone nada', () => {
    expect(serialCandidatesFromText('')).toEqual([])
  })

  it('limita la cantidad de candidatos propuestos', () => {
    expect(serialCandidatesFromText('A1B2 C3D4 E5F6 G7H8 J9K1', 3)).toEqual([
      'A1B2',
      'C3D4',
      'E5F6',
    ])
  })
})
