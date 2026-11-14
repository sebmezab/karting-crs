# supabase/ — Fase 1

Vacío en Fase 0 (la demo no tiene backend). Estructura prevista (SPEC §12.2):

- `migrations/`: SQL versionado, **una migración por cambio**. Toda tabla con `organization_id` (directo o derivado),
  `created_at`, `updated_at`, `created_by`, **RLS activado con denegación por defecto**.
- `tests/`: tests de RLS con pgTAP (`*.sql`). `npm run test:rls` los ejecuta con `supabase test db` en cuanto exista
  el primero. Para cada tabla: un usuario sin permiso no lee ni escribe, incluido cross-organization.
- `seed/`: datos de demo CRS 2026 (ficticios), equivalentes a `src/data/mock/seed-crs2026.ts`.

Reglas: nunca `service_role` en el frontend ni en el repo; operaciones privilegiadas solo en Edge Functions o funciones
`SECURITY DEFINER` revisadas; vistas públicas mediante vistas/funciones que exponen solo columnas públicas.
