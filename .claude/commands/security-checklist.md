---
description: Revisa los cambios actuales contra la checklist de privacidad y seguridad del proyecto (SPEC §11)
---

Revisa los cambios pendientes (`git diff` contra `main` y archivos sin commitear) contra esta checklist. Reporta cada punto como ✅ / ⚠️ / ❌ con archivo y línea.

**Datos personales (§11.1)**

- ¿Se agregó un dato personal nuevo? ¿Está justificado por la tabla de minimización? (Nunca RUT, fecha de nacimiento completa, dirección, género, salud, tarjetas.)
- ¿Las vistas públicas muestran solo nombre, número, categoría, resultados, sanciones oficiales y documentos públicos?
- ¿Se respeta el tratamiento de menores (nombre + inicial configurable, sin fotos)?
- ¿Se actualizó `docs/privacy/registro-tratamiento.md` si cambió qué datos se tratan?

**Autorización (§11.2)**

- ¿Toda tabla nueva tiene RLS activado, políticas con denegación por defecto y test en `supabase/tests/`?
- ¿Las acciones sensibles usan `has_permission(event_id, ...)` en la BD? El frontend solo oculta botones.
- ¿Alguna referencia a `service_role` o secretos en el código o el repo?

**Entradas y salida**

- Validación Zod en cliente + constraints en BD.
- Sin `dangerouslySetInnerHTML`; texto escaneado tratado como no confiable.
- Subida de archivos: tipos y tamaño restringidos, nombres generados, URLs firmadas para no públicos.

**Trazabilidad**

- ¿Las acciones sensibles escriben en `audit_log` (solo inserción)?
- ¿Los registros oficiales se corrigen con un registro nuevo en vez de editarse?

**Cadena de suministro**

- ¿Dependencias nuevas? Justificar cada una; `npm audit --omit=dev`.

Termina con `npm run check`.
