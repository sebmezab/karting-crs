# Inscripción — criterios de aceptación

Fuente: SPEC §7.3 y §6.6 (`registration.late_fee_per_day_clp`). Código: `src/domain/registration/`. E2E: `e2e/registration.spec.ts`.

## Número de kart

- **R-1** Dado un número dentro del rango de la categoría y libre en el campeonato, cuando se valida, entonces es válido.
- **R-2** Dado un número fuera del rango de la categoría (p.ej. 250 en DD2 Senior 301–399), cuando se valida, entonces es inválido indicando el rango.
- **R-3** Dado un número ya usado por otra inscripción del campeonato, cuando se valida, entonces es inválido; si es la propia inscripción del piloto, es válido (el número se mantiene toda la temporada).
- **R-4** Dado un número no entero o negativo, cuando se valida, entonces es inválido.

## Plazo y multa

- **R-5** Dada una inscripción antes o justo en el cierre (`registration_deadline`), cuando se calcula la multa, entonces no es tardía y la multa es 0.
- **R-6** Dada una inscripción 1 minuto después del cierre, cuando se calcula, entonces es tardía con 1 día de multa (CRS: $15.000 por día).
- **R-7** Dada una inscripción 2 días y 1 hora después del cierre, cuando se calcula, entonces son 3 días de multa (se cobra por día iniciado).

## Flujo (demo)

- **R-8** Dado el piloto de la demo con inscripción de temporada, cuando abre la inscripción a F6, entonces ve su categoría y número fijos y puede elegir hasta 2 chasis y 2 motores de su equipo.
- **R-9** Dado que confirma una declaración válida, cuando envía, entonces la inscripción queda "pendiente de validación" y se registra en el log de auditoría.
