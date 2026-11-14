# ADR 0004 — Capa de datos con interfaces de repositorio (mock / supabase)

**Fecha:** 14-11-2026 · **Estado:** Aceptada

## Contexto

La Fase 0 no tiene backend, pero el código debe pasar a Supabase en Fase 1 sin reescribir pantallas (SPEC §10).

## Decisión

- `src/data/repositories.ts` define contratos **async** (`DataRepositories`) más `subscribe()` para cambios.
- Implementaciones: `src/data/mock/` (Fase 0: memoria + localStorage, sincronización entre pestañas con el evento
  `storage`) y `src/data/supabase/` (Fase 1).
- Los componentes acceden solo con `useRepositories()` / `useQuery()`; ESLint prohíbe importar `data/mock` desde
  `features/`, `ui/` y `app/`. La implementación se elige en `src/main.tsx`.
- Toda escritura re-valida con `domain/` (lo mismo hará la BD) y registra `audit_log`.

## Alternativas descartadas

- Usar el cliente de Supabase directo en componentes: impediría la demo sin backend y acoplaría la UI.
- Librería de estado/caché (TanStack Query, Redux): innecesaria para el alcance; `useQuery` propio es ~40 líneas.

## Consecuencias

- Cada método nuevo se implementa dos veces (mock y supabase) y se testea en `mock/mockRepositories.test.ts`.
