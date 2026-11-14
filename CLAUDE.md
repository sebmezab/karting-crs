# CLAUDE.md — Plataforma de campeonatos de karting

Plataforma web oficial de un campeonato de karting: inscripciones, control técnico (neumáticos y equipos),
revisión post-sesión, sanciones y resultados. Multi-organización y multi-campeonato. Referencia:
Campeonato Regional Sur (CRS). **Fuente de verdad funcional: [docs/SPEC.md](docs/SPEC.md).**

**Fase actual: 0 — demo navegable** (sin backend, datos ficticios en memoria + localStorage, GitHub Pages).
Próxima: Fase 1 (Supabase, auth, RLS). Ver SPEC §5 y §10.

## Arquitectura en 1 página

```
React + Vite + TS (SPA, PWA, HashRouter)  ──►  data/ (interfaces de repositorio)
        │                                         ├─ mock/      Fase 0: memoria + localStorage
        │ usa                                     └─ supabase/  Fase 1: Postgres + RLS + Realtime
        ▼
   domain/  ◄── lógica pura (reglas del reglamento), sin React ni datos, 100% testeada
```

- Los componentes **solo** acceden a datos con `useRepositories()` / `useQuery()` (`src/data/DataProvider.tsx`).
  Cambiar de mock a Supabase = cambiar una línea en `src/main.tsx` (ADR 0004).
- Toda escritura del repositorio **re-valida** con las mismas funciones de `domain/` y escribe `audit_log`.
- `subscribe()` notifica cambios (mock: evento `storage` entre pestañas; Fase 1: Supabase Realtime).
- Permisos: catálogo fijo en código + roles configurables + asignación por fecha (SPEC §4.2, ADR 0003).
  En Fase 0 el "usuario" es la persona elegida en el selector **Ver como** (`src/app/session.tsx`).

## Mapa de carpetas

| Carpeta          | Qué hay                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/`    | Reglas puras: `tires/` (ciclo y validación 7.1), `permissions/`, `equipment/`, `registration/`, `inspection/`, `rules/` (Zod de `championship.rules`), `privacy/` |
| `src/data/`      | `repositories.ts` (contratos), `types.ts`, `demo.ts` (personas y casos de demo), `mock/` (seed CRS 2026 + store)                                                  |
| `src/features/`  | Pantallas por módulo: `public/`, `registration/`, `tech-inspection/`, `post-session/`, `exceptions/`, `admin/`                                                    |
| `src/ui/`        | Componentes visuales compartidos (`KartPlate`, `Verdict`, `Button`, `BarcodeScanner`…)                                                                            |
| `src/app/`       | Shell: rutas, layout, sesión de demo, navegación filtrada por permisos                                                                                            |
| `src/i18n/es.ts` | **Todos** los textos de UI (español de Chile) y mensajes de reglas                                                                                                |
| `e2e/`           | Playwright (móvil Pixel 7 y notebook 1366×768)                                                                                                                    |
| `docs/`          | `SPEC.md`, `features/` (criterios Dado/Cuando/Entonces), `decisions/` (ADRs), `glossary.md`, `privacy/`                                                           |
| `supabase/`      | Fase 1: `migrations/`, `tests/` (RLS, pgTAP), `seed/`                                                                                                             |

## Comandos

| Comando                             | Qué hace                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                       | Servidor de desarrollo en `http://localhost:5173/karting-crs/`                                                         |
| `npm run build` / `npm run preview` | Build de producción / servirlo en `:4173/karting-crs/`                                                                 |
| `npm test`                          | Vitest (unitarios + componentes)                                                                                       |
| `npm run test:e2e`                  | Playwright (construye y levanta preview solo). Requiere `npx playwright install chromium`                              |
| **`npm run check`**                 | typecheck + lint + tests con cobertura (≥ 90% en `domain/`) + tests de RLS. **Correr antes de dar algo por terminado** |
| `npm run icons`                     | Regenera los PNG de la PWA desde `public/icon.svg`                                                                     |
| `db:migrate`, `db:seed`             | Fase 1 (aún no existen)                                                                                                |

> Windows: ejecuta Vitest/Vite/Playwright **siempre vía `npm run …`**. Usan `scripts/run-bin.mjs`, que normaliza
> la letra de unidad (`c:` → `C:`); sin eso se cargan dos copias de Vitest/React y fallan con errores confusos.

## Reglas inquebrantables

1. **Test-first** (SPEC §12.4): criterios en `docs/features/<modulo>.md` → tests en rojo → implementación → `npm run check`.
   Nombres de test en español, describiendo el caso de negocio. Nunca desactivar ni saltar tests. Usa `/new-feature`.
2. Reglas de negocio = **funciones puras en `src/domain/`**, con comentario del porqué (citar reglamento: `// Reglamento CRS 10.3`).
   `domain/` no importa React ni `data/` (lo impone ESLint).
3. Componentes nunca importan `src/data/mock/` (ESLint). Solo `useRepositories()`.
4. **Reglas como configuración**: nada del reglamento se fija en código; va en `championship.rules` (Zod) o `scoring_ruleset`.
5. **Privacidad (SPEC §11.1)**: nunca guardar RUT, fecha de nacimiento completa (solo año), dirección, género, salud ni
   tarjetas. Vistas públicas: solo nombre (menores abreviados con `publicDisplayName`), número, categoría y resultados.
   El motivo de una selección a revisión **nunca** se muestra al piloto (`toPublicInspectionView`).
6. **Seguridad (SPEC §11.2)**: sin `dangerouslySetInnerHTML` (ESLint), texto escaneado se normaliza (`normalizeSerial`),
   nunca `service_role` ni secretos en el repo. Desde Fase 1: **toda tabla con RLS (denegación por defecto) y su test**
   en `supabase/tests/`; permisos con `has_permission(event_id, key)`.
7. `audit_log` es solo inserción. Los registros oficiales se corrigen con un registro nuevo, no se editan.
8. UI mobile-first: objetivos táctiles ≥ 44 px (botones ≥ 48), alto contraste, estado siempre con ícono + texto + color.
   Todos los textos en `src/i18n/es.ts`; fechas `dd-mm-aaaa` en `America/Santiago` (`src/lib/format.ts`).
9. Si cambia una decisión: actualizar `docs/SPEC.md`, este archivo o agregar un ADR en `docs/decisions/`.

## Cómo agregar…

- **Un permiso**: `/new-permission` → `src/domain/permissions/catalog.ts` (+ plantillas en `roleTemplates.ts`) + test.
- **Una regla de neumáticos/equipos/inscripción**: criterio en `docs/features/` → test en `src/domain/<modulo>/` →
  función pura → mensaje en `i18n/es.ts` → usarla en el repositorio (re-validación) y en la UI.
- **Un parámetro del reglamento**: agregarlo al esquema Zod en `src/domain/rules/championshipRules.ts` y al preset CRS.
- **Una regla de puntaje** (Fase 3): `/new-scoring-rule`.
- **Una pantalla**: `src/features/<modulo>/XPage.tsx`, ruta en `src/app/App.tsx`, entrada en `src/app/navigation.ts`
  con su condición de permiso; e2e si es un flujo crítico.
- **Un método de datos**: contrato en `src/data/repositories.ts` → implementación en `mock/` (+ test en
  `mock/mockRepositories.test.ts`) → en Fase 1 también en `supabase/`.

## Verificación independiente

Al terminar una funcionalidad, pide al subagente `qa-reviewer` (`.claude/agents/qa-reviewer.md`) que la revise contra
sus criterios. Un hook _Stop_ (`.claude/settings.json`) corre `npm run check` y bloquea el cierre si falla.
Checklist de seguridad: `/security-checklist`.
