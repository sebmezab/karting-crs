# Glosario — dominio (español) ↔ código (inglés)

Código en inglés, interfaz en español (SPEC §12.2).

| Español (reglamento / UI)                         | Código                                        | Notas                                                                                 |
| ------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Organización                                      | `organization`                                | Entidad que organiza el campeonato (no un club). Dos clubes juntos = una organización |
| Campeonato                                        | `championship`                                | Tiene `rules` (jsonb, Zod)                                                            |
| Fecha (del campeonato)                            | `event` / `RaceEvent`                         | `round_number` = número de fecha (F1…F6)                                              |
| Categoría                                         | `category`                                    | Rango de números de kart y neumático                                                  |
| Inscripción de temporada                          | `championship_entry`                          | Número de kart fijo toda la temporada                                                 |
| Inscripción a la fecha                            | `event_entry`                                 | `late_fee` = inscripción fuera de plazo                                               |
| Piloto                                            | `driver` / `driver_profile`                   | Una `person` puede ser piloto y staff                                                 |
| Tutor responsable                                 | `guardian_person_id`                          | Obligatorio para menores                                                              |
| Pasaporte técnico                                 | `equipment` + `event_equipment`               | Chasis, motores y neumáticos                                                          |
| Chasis / Motor / Neumático                        | `chassis` / `engine` / `tire`                 |                                                                                       |
| Sello (de motor)                                  | `seal_number`                                 |                                                                                       |
| Juego de neumáticos                               | `tire_set`                                    | 4 slicks de un ciclo                                                                  |
| Fecha de cambio / continuación                    | `TireEventKind`: `change` / `continuation`    | `not_counted` = no cuenta para el ciclo                                               |
| Marcación de neumáticos                           | tire marking (`validateTireMarking`)          |                                                                                       |
| Intercambio de neumáticos                         | `serial_owned_by_other_driver`                | Prohibido                                                                             |
| Excepción (pinchazo, ingreso tardío)              | `exception_request`                           | `puncture_replacement`, `late_entry_used_tires`                                       |
| Sesión (práctica, clasificación, prefinal, final) | `session` / `RaceSession`                     | `practice`, `qualifying`, `prefinal`, `final`                                         |
| Revisión post-sesión                              | `inspection_selection`                        | `top_n` o `steward_selection` (a criterio)                                            |
| Observado                                         | `observed`                                    | Resultado de revisión con hallazgo                                                    |
| Sanción (A, M, P, G, D, S)                        | `penalty`                                     | Amonestación, multa, tiempo, grilla, descalificación, suspensión                      |
| Tabla del campeonato                              | standings (`computeStandings`, Fase 3)        |                                                                                       |
| Descarte                                          | dropped round                                 |                                                                                       |
| Tablón oficial                                    | `document` (notice board)                     | Fase 1                                                                                |
| Comunicado                                        | `bulletin` / `comunicado`                     |                                                                                       |
| Director de carrera                               | race director (`tpl-race-director`)           |                                                                                       |
| Director técnico                                  | technical director (`tpl-technical-director`) |                                                                                       |
| Revisor técnico                                   | tech inspector (`tpl-tech-inspector`)         |                                                                                       |
| Comisario deportivo                               | steward (`tpl-steward`)                       |                                                                                       |
| Cronometrista                                     | timekeeper (`tpl-timekeeper`)                 |                                                                                       |
| Secretaría                                        | secretary (`tpl-secretary`)                   |                                                                                       |
| Staff de la fecha                                 | `event_staff`                                 | Persona + rol + fecha                                                                 |
| Registro de actividad                             | `audit_log`                                   | Solo inserción                                                                        |
