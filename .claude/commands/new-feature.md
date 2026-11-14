---
description: Implementa una funcionalidad siguiendo el ciclo test-first obligatorio (SPEC §12.4)
argument-hint: <módulo> <descripción breve>
---

Implementa: $ARGUMENTS

Sigue el ciclo obligatorio, sin saltarte pasos:

1. **Criterios**: agrega o actualiza los criterios de aceptación en `docs/features/<módulo>.md` en formato _Dado / Cuando / Entonces_, derivados de `docs/SPEC.md`. Muéstralos antes de seguir.
2. **Tests primero**: escribe los tests (Vitest en `src/domain/**` para reglas; Testing Library para componentes con lógica; Playwright en `e2e/` si es un flujo crítico). Nombres en español del caso de negocio. Ejecútalos y **confirma que fallan** (rojo).
3. **Implementa** lo mínimo para pasar a verde. Reglas de negocio como funciones puras en `src/domain/`.
4. **Refactoriza** con los tests en verde.
5. Corre `npm run check` (y `npm run test:e2e` si tocaste un flujo). Nada se da por terminado en rojo ni con tests desactivados.
6. Si cambió una decisión: actualiza `CLAUDE.md`, `docs/SPEC.md` o agrega un ADR en `docs/decisions/`.
7. Pide al subagente `qa-reviewer` que revise el módulo.
