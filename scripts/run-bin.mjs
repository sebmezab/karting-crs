// Ejecuta el CLI de un paquete de node_modules con la letra de unidad normalizada a mayúscula.
//
// Por qué: en Windows, si la terminal abre el proyecto como "c:\AppDev\..." (minúscula),
// Vitest y Playwright se cargan dos veces (misma ruta con distinta mayúscula) y fallan con
// errores confusos ("failed to find the current suite", "Cannot read properties of undefined
// (reading 'config')"). npm agrega node_modules/.bin al PATH con la ruta original, así que
// no basta con cambiar el cwd: hay que invocar el CLI por su ruta absoluta normalizada.
// En Linux/macOS no cambia nada.
//
// Uso: node scripts/run-bin.mjs <paquete> [args...]   (p.ej. vitest, @playwright/test)
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const [pkg, ...args] = process.argv.slice(2)
if (!pkg) {
  console.error('Uso: node scripts/run-bin.mjs <paquete> [args...]')
  process.exit(1)
}

const normalize = (p) => p.replace(/^[a-z]:/, (drive) => drive.toUpperCase())
const cwd = normalize(process.cwd())
const pkgDir = path.join(cwd, 'node_modules', pkg)
const manifest = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
const binEntry = typeof manifest.bin === 'string' ? manifest.bin : Object.values(manifest.bin)[0]

const result = spawnSync(process.execPath, [path.join(pkgDir, binEntry), ...args], {
  cwd,
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
