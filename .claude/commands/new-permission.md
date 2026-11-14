---
description: Agrega un permiso atómico al catálogo RBAC (SPEC §4.2)
argument-hint: <grupo.accion> <descripción>
---

Agrega el permiso: $ARGUMENTS

1. Test primero en `src/domain/permissions/permissions.test.ts`: el permiso existe en el catálogo, tiene etiqueta en español y (si aplica) se incluye en la plantilla de rol correcta.
2. Regístralo en `src/domain/permissions/catalog.ts` (`PERMISSIONS`, con grupo y etiqueta). Las claves son `grupo.accion` en inglés, minúsculas.
3. Si corresponde, agrégalo a las plantillas en `src/domain/permissions/roleTemplates.ts` (usa comodines `grupo.*` solo donde la SPEC los usa).
4. Usa `hasPermission(...)` en la UI para mostrar/ocultar la acción. Recuerda: el frontend **no** es la barrera de seguridad.
5. Desde Fase 1: agrega el permiso al seed de la BD, usa `has_permission(event_id, 'grupo.accion')` en las políticas RLS y agrega su test en `supabase/tests/`.
6. Actualiza la tabla de permisos en `docs/SPEC.md` §4.2 y `docs/features/permissions.md`.
7. `npm run check`.
