/**
 * Datos personales en vistas públicas (SPEC 11.1). Se guarda solo el AÑO de nacimiento, por
 * eso la minoría de edad se evalúa por temporada. Sin año registrado → se asume menor.
 */
export function isMinorBySeason(birthYear: number | null, seasonYear: number): boolean {
  if (birthYear === null) return true
  return seasonYear - birthYear < 18
}

export function publicDisplayName(
  person: { fullName: string; birthYear: number | null },
  options: { seasonYear: number; abbreviateMinors: boolean },
): string {
  const parts = person.fullName.trim().split(/\s+/)
  const full = parts.join(' ')
  if (!options.abbreviateMinors || !isMinorBySeason(person.birthYear, options.seasonYear)) {
    return full
  }
  const [first, surname] = parts
  if (!first || !surname) return full
  return `${first} ${surname.charAt(0)}.`
}
