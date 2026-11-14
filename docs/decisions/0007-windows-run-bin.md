# ADR 0007 — Lanzador `scripts/run-bin.mjs` para Vitest, Vite y Playwright

**Fecha:** 14-11-2026 · **Estado:** Aceptada

## Contexto

En Windows, si la terminal (p.ej. VS Code) abre el proyecto como `c:\AppDev\…` en minúscula, Node resuelve los mismos
módulos con dos rutas distintas. Resultado: Vitest falla con "failed to find the current suite" y el build de Vite
empaqueta **dos copias de React** ("Cannot read properties of null (reading 'useState')", pantalla en blanco).

## Decisión

Los scripts `dev`, `build`, `preview`, `test*` y `test:e2e` invocan el CLI por su ruta absoluta con la letra de unidad
normalizada a mayúscula (`node scripts/run-bin.mjs <paquete> …`). En Linux/macOS (CI) no cambia nada.

## Alternativas descartadas

- Pedir a cada persona abrir la carpeta con `C:` en mayúscula: frágil y fácil de olvidar.
- `process.chdir` dentro de la config: llega tarde, el CLI ya se cargó con la otra ruta.

## Consecuencias

- No ejecutar `npx vitest` / `npx vite build` directo en Windows; usar siempre `npm run …`.
