/** Formatos de Chile (SPEC §3): dd-mm-aaaa, zona horaria America/Santiago. */
const TZ = 'America/Santiago'

function parts(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of new Intl.DateTimeFormat('es-CL', { timeZone: TZ, ...options }).formatToParts(
    date,
  )) {
    out[p.type] = p.value
  }
  return out
}

/** "aaaa-mm-dd" (fecha sin hora) → "dd-mm-aaaa". No aplica zona horaria. */
export function formatDay(isoDay: string): string {
  const [y, m, d] = isoDay.slice(0, 10).split('-')
  return `${d}-${m}-${y}`
}

/** Instante ISO → "dd-mm-aaaa hh:mm" en hora de Chile. */
export function formatDateTime(iso: string): string {
  const p = parts(new Date(iso), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute}`
}

/** Instante ISO → "hh:mm" en hora de Chile. */
export function formatTime(iso: string): string {
  const p = parts(new Date(iso), { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${p.hour}:${p.minute}`
}

/** Pesos chilenos: "$15.000". */
export function formatClp(amount: number): string {
  return `$${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(amount)}`
}
