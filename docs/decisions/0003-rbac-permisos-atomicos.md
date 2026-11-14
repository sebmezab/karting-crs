# ADR 0003 — RBAC con permisos atómicos, roles configurables y staff por fecha

**Fecha:** 14-11-2026 · **Estado:** Aceptada

## Contexto

El staff cambia en cada fecha, una persona cumple varios roles y los nombres de los roles varían entre campeonatos y
países (SPEC §4.2).

## Decisión

Tres niveles:

1. **Catálogo de permisos** fijo en código (`src/domain/permissions/catalog.ts`). Es lo único que se programa.
2. **Roles** = nombre + conjunto de permisos, configurables por organización; plantillas estándar globales
   (`roleTemplates.ts`, `organization_id = NULL` en BD) que admiten comodines por prefijo (`sessions.*`).
3. **Asignación por fecha** (`event_staff`: persona + rol + fecha). Permisos efectivos = **unión** de los roles de la
   persona en esa fecha (`effectivePermissions`).

Validación en el frontend (mostrar/ocultar) y, desde Fase 1, en la BD con `has_permission(event_id, key)` en RLS.

## Alternativas descartadas

- Roles fijos en código (enum): no soporta reglamentos de otros países ni roles combinados.
- Permisos por campeonato en vez de por fecha: el revisor de la fecha 5 no debe operar en la fecha 6.

## Consecuencias

- Toda acción nueva necesita un permiso del catálogo (comando `/new-permission`).
- Ojo con los comodines: `sessions.*` no incluye `results.enter` aunque la UI lo agrupe en "Sesiones" (coincide con la SPEC).
