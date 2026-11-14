## Qué y por qué

<!-- Qué cambia y por qué. Si es un cambio grande, enlaza el plan. -->

## Criterios de aceptación

<!-- Enlace a docs/features/<modulo>.md y los criterios que cubre este PR. -->

## Checklist (SPEC §12.5)

- [ ] Los tests se escribieron **antes** que la implementación y cubren los criterios.
- [ ] `npm run check` pasa en local.
- [ ] Si toca un flujo crítico: e2e agregado/actualizado y `npm run test:e2e` pasa.
- [ ] ¿Tabla nueva? Tiene RLS (denegación por defecto) y test en `supabase/tests/`.
- [ ] ¿Se agregó un dato personal? Justificado con SPEC §11.1 y actualizado `docs/privacy/`.
- [ ] ¿Acción sensible? Escribe en `audit_log`.
- [ ] ¿Dependencia nueva? Justificada y revisada.
- [ ] ¿Cambió una decisión? Actualizado `CLAUDE.md` / `docs/SPEC.md` / ADR en `docs/decisions/`.
