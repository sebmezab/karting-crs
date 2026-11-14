# Equipamiento (pasaporte técnico) — criterios de aceptación

Fuente: SPEC §7.2 y §6.6 (`equipment_limits`, `engine_requires_seal`). Código: `src/domain/equipment/`.

- **E-1** Dado un piloto que declara 1–2 chasis y 1–2 motores con sello, cuando se valida, entonces es válido.
- **E-2** Dado un piloto que declara más chasis que `equipment_limits.chassis`, cuando se valida, entonces es inválido indicando el límite.
- **E-3** Dado un piloto que declara más motores que `equipment_limits.engine`, cuando se valida, entonces es inválido indicando el límite.
- **E-4** Dado `engine_requires_seal = true` y un motor sin sello vigente, cuando se valida, entonces es inválido indicando el motor.
- **E-5** Dado `engine_requires_seal = false`, cuando un motor no tiene sello, entonces es válido.
- **E-6** Dado un equipo ya inscrito por **otro piloto en la misma fecha**, cuando se declara, entonces es inválido.
- **E-7** Dado que no se declara ningún chasis o ningún motor, cuando se valida, entonces es inválido (se necesita al menos uno de cada uno).
- **E-8** Dado el mismo equipo declarado dos veces, cuando se valida, entonces es inválido.
