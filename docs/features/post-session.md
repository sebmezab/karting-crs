# Revisión post-sesión — criterios de aceptación

Fuente: SPEC §7.4. Código: `src/domain/inspection/`, `src/features/post-session/`. E2E: `e2e/post-session.spec.ts`.

## Dominio

- **I-1** Dado un Top N tocado en orden, cuando se cierra la sesión, entonces se crea una selección `top_n` en estado `pending` por cada uno de los primeros N karts, en ese orden.
- **I-2** Dado un Top N con un kart repetido, cuando se crean las selecciones, entonces es un error.
- **I-3** Dado un kart no seleccionado, cuando el director técnico o un comisario lo agrega a criterio, entonces se crea una selección `steward_selection` con quién y cuándo.
- **I-4** Dado un kart ya seleccionado en la sesión, cuando se intenta agregar de nuevo, entonces se rechaza sin duplicar.
- **I-5** Dada una selección, cuando cambia de estado, entonces solo se permite `pending → in_progress → ok | observed` (y `pending → ok | observed` directo); cualquier otra transición es un error. Al cerrar (`ok`/`observed`) se registra la hora de cierre.
- **I-6** Dada una selección, cuando se muestra al piloto o al público, entonces se ve solo "Seleccionado para revisión" y el estado, **sin el motivo** ni quién la pidió.

## Flujo (demo)

- **I-7** Dado el cronometrista en F6, cuando cierra una sesión y toca 3 números de la grilla, entonces la lista de revisión muestra esos 3 karts como pendientes.
- **I-8** Dado el director técnico, cuando agrega un kart a criterio, entonces aparece en la lista; ante el piloto se ve igual que un Top N.
- **I-9** Dado el revisor técnico, cuando marca una revisión como OK u Observado, entonces el estado se actualiza en todas las pestañas abiertas (simulación de Realtime) y queda en el log de auditoría.
- **I-10** Dado un rol sin `inspection.select`, cuando ve la lista, entonces no ve el botón "Agregar kart a revisión".
