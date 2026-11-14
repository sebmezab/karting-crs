// Hook "Stop" de Claude Code (SPEC §12.4, capa 2): antes de que el agente dé por
// terminada la tarea, corre `npm run check`. Si falla, sale con código 2 y el
// agente recibe el resumen por stderr para corregir.
// - Respeta `stop_hook_active` (segundo intento consecutivo) para no entrar en bucle:
//   en ese caso informa el fallo pero deja terminar.
// - Si no hay node_modules (repo recién clonado), no bloquea.
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

let input = {}
try {
  const raw = readFileSync(0, 'utf8')
  input = raw.trim() ? JSON.parse(raw) : {}
} catch {
  input = {}
}

if (!existsSync('node_modules')) {
  process.exit(0)
}

const result = spawnSync('npm', ['run', 'check'], { encoding: 'utf8', shell: true })
if (result.status === 0) {
  process.exit(0)
}

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
const tail = output.split('\n').slice(-60).join('\n')
const message = [
  '`npm run check` FALLÓ. Según CLAUDE.md no se puede dar la tarea por terminada con el check en rojo.',
  'Corrige los errores (no desactives tests ni reglas) y vuelve a correr `npm run check`.',
  '--- últimas líneas ---',
  tail,
].join('\n')

if (input.stop_hook_active) {
  // Ya se bloqueó una vez: informar sin bloquear para evitar un bucle infinito.
  console.error(`[stop-check] Sigue fallando tras un reintento.\n${message}`)
  process.exit(0)
}

console.error(message)
process.exit(2)
