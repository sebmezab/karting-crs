# ADR 0006 — Tipos de datos a mano en Fase 0; generados desde Supabase en Fase 1

**Fecha:** 14-11-2026 · **Estado:** Aceptada

## Contexto

La SPEC §12.2 pide una sola fuente de verdad para los tipos: Zod para configuración/formularios y tipos generados
desde Supabase para la BD. En Fase 0 no hay BD.

## Decisión

- `src/data/types.ts` se escribe a mano siguiendo el modelo de SPEC §6 (camelCase).
- En Fase 1 se reemplaza por los tipos generados (`supabase gen types typescript`) y un mapeo en la implementación
  `supabase/` de los repositorios. Los tipos a mano se eliminan, no se mantienen en paralelo.
- La configuración (`championship.rules`) ya usa Zod como fuente única (`src/domain/rules/`).

## Consecuencias

- Hasta Fase 1, un cambio al modelo se hace en `types.ts` y en el seed.
