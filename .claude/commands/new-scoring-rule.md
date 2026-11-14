---
description: Agrega un bloque de regla al motor de puntaje configurable (SPEC §6.7, Fase 3)
argument-hint: <nombre del bloque> <descripción>
---

Agrega la regla de puntaje: $ARGUMENTS

> El motor de puntaje (`computeStandings`) se implementa en Fase 3. Si `src/domain/scoring/` aún no existe, créalo siguiendo este patrón y `src/domain/scoring/CLAUDE.md`.

1. Criterios Dado/Cuando/Entonces en `docs/features/scoring.md`.
2. Tests primero en `src/domain/scoring/blocks/<bloque>.test.ts`: caso activado, desactivado (`enabled: false` no cambia nada) y parámetros en el borde. Nombres en español.
3. Agrega el esquema Zod del bloque (con `enabled` + parámetros) al esquema de `config` del `scoring_ruleset`. La UI de admin se genera desde ese esquema.
4. Implementa el bloque como función pura en `src/domain/scoring/blocks/<bloque>.ts` **sin modificar los bloques existentes**.
5. El bloque debe aportar líneas al **desglose** explicable por piloto.
6. Agrega el valor del preset CRS en el preset y verifica el test de integración del preset.
7. `npm run check`.
