// Tests de seguridad de datos (RLS) — SPEC §11.2 y §12.4.
// Fase 0 no tiene base de datos: si no hay tests en supabase/tests, informa y sale OK.
// Desde Fase 1, cada tabla nueva DEBE tener su test aquí y este script los ejecuta
// contra Supabase local (`supabase test db`, pgTAP).
import { readdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const dir = 'supabase/tests'
const tests = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.sql')) : []

if (tests.length === 0) {
  console.log('test:rls → sin tests de RLS todavía (Fase 0 no tiene base de datos). OK.')
  process.exit(0)
}

console.log(`test:rls → ejecutando ${tests.length} archivo(s) pgTAP con "supabase test db"...`)
const result = spawnSync('npx', ['supabase', 'test', 'db'], { stdio: 'inherit', shell: true })
process.exit(result.status ?? 1)
