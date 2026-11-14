# Neumáticos — criterios de aceptación

Fuente: SPEC §7.1 y §6.6 (`rules.tires`). Código: `src/domain/tires/`. Tests: `src/domain/tires/*.test.ts`, `e2e/tech-inspection.spec.ts`.

## Clasificación de fechas (`classifyTireEvents`)

- **T-C1** Dado el calendario CRS 2026 (F1 no cuenta para el ciclo, ciclo de 2 fechas), cuando se clasifican las fechas, entonces F1 = no cuenta, F2 = cambio, F3 = continuación, F4 = cambio, F5 = continuación, F6 = cambio.
- **T-C2** Dada una fecha con override manual (`is_tire_change_event` no nulo), cuando se clasifica, entonces se usa el override y se informa que el origen es "manual".
- **T-C3** Dadas fechas desordenadas, cuando se clasifican, entonces el cálculo usa el orden cronológico.
- **T-C4** Dado un largo de ciclo menor a 1, cuando se clasifica, entonces es un error de configuración.

## Validación de la marcación de 4 slicks (`validateTireMarking`)

- **T-V1** Dada una fecha de cambio, cuando se marcan 4 seriales válidos (nuevos o usados), entonces OK y se abre un juego nuevo para el ciclo (cerrando el anterior).
- **T-V2** Dada una fecha de continuación y un juego activo, cuando se marcan los mismos 4 seriales, entonces OK y se mantiene el juego (aunque cambien de posición).
- **T-V3** Dada una fecha de continuación, cuando uno o más seriales no pertenecen al juego activo, entonces BLOQUEADO con el mensaje "Fecha de continuación: este juego debe ser el mismo de la Fecha N. Neumático XX no coincide." por cada posición.
- **T-V4** Dado el caso T-V3 con una excepción de reemplazo por pinchazo **aprobada**, cuando se valida, entonces queda como EXCEPCIÓN APLICADA (overridden) y no bloqueado. **Cada excepción aprobada cubre un solo neumático**: si hay más seriales distintos que excepciones aprobadas, sigue BLOQUEADO.
- **T-V5** Dada una fecha de continuación y un piloto **sin** juego activo (ingreso tardío), cuando se marcan 4 seriales, entonces ADVERTENCIA: deben ser usados; el revisor debe confirmar con un check y se crea una excepción `late_entry_used_tires` pendiente.
- **T-V6** Dado un serial registrado a nombre de **otro piloto** en la organización, cuando se marca, entonces BLOQUEADO (intercambio prohibido), indicando la posición y a quién pertenece.
- **T-V7** Dado un serial repetido dentro del mismo juego, cuando se valida, entonces BLOQUEADO.
- **T-V8** Dado que el revisor indica que los neumáticos no corresponden a la marca/modelo de la categoría, cuando se valida, entonces ADVERTENCIA (sin validación automática por código de barra en el MVP).
- **T-V9** Dado un serial vacío, cuando se valida, entonces BLOQUEADO: faltan seriales.
- **T-V10** Dado un texto escaneado con espacios, minúsculas o caracteres no permitidos, cuando se normaliza, entonces se guarda en mayúsculas, sin espacios y solo con `A-Z 0-9 -` (el contenido escaneado es texto no confiable, §11.2). Un texto sin letras ni números (p.ej. `---`) cuenta como vacío.
- **T-V10b** Dado un serial tipeado sin guiones (`MG355A2`) y el mismo registrado con guiones (`MG-355-A2`), cuando se compara, entonces son el **mismo** neumático (los guiones no distinguen seriales): no se puede evadir el bloqueo por intercambio ni duplicar un neumático tipeando distinto.
- **T-V11** Dada una fecha que no cuenta para el ciclo, cuando se marcan 4 seriales, entonces OK sin reglas de ciclo, pero se mantienen los bloqueos por intercambio y repetidos.
- **T-V12** Dado un neumático usado re-marcado en fecha de cambio, cuando se valida, entonces se trata igual que un juego nuevo (Reglamento 10.3).

## Lectura con la cámara (código de barras o texto impreso)

La cámara lee el **código de barras** de la etiqueta o, si no lo logra, el **texto impreso** del serial (OCR).

- **T-L1** Dada una etiqueta con código de barras legible, cuando se apunta la cámara, entonces el serial se completa solo (sin confirmar), normalizado como en T-V10.
- **T-L2** Dado un texto leído por OCR con varias palabras y líneas (p.ej. `MOJO D2\nMG-327-C4`), cuando se extraen los candidatos, entonces se proponen los que parecen serial: al menos 4 caracteres y al menos un dígito. Primero los que mezclan letras y números, en orden de lectura.
- **T-L3** Dado un serial que el OCR separó con espacios (`MG 327 C4`), cuando se extraen los candidatos, entonces también se propone la línea unida (`MG327C4`, que es el mismo neumático según T-V10b). Solo se une si ninguna palabra parece serial por sí sola y todas son pedazos (con algún dígito o de menos de 4 caracteres): `MOJO D2` no se une.
- **T-L4** Dado texto que solo tiene `I`, `L`, `1` o `|` (las barras del código leídas como letras), cuando se extraen los candidatos, entonces no se propone (es ruido).
- **T-L5** Dado un serial leído por OCR, cuando aparece, entonces **no** se completa solo: el revisor confirma con "Usar …" (el OCR puede confundir O/0 o I/1). Solo se ofrece si se leyó igual en dos lecturas seguidas.
- **T-L7** Dado un número leído por OCR que difiere de un serial ya registrado **del mismo piloto** solo en caracteres que el OCR confunde (`1/I/L`, `0/O/D/Q`, `5/S`, `8/B`, `2/Z`, `6/G`), cuando se propone, entonces se propone el serial registrado (`MG-312-AL` → `MG-312-A1`). Si se parece a más de uno, no se corrige. Igual requiere confirmación (T-L5).
- **T-L6** Dado un navegador sin cámara o sin permiso, cuando se abre el escáner, entonces se indica que se ingrese el serial a mano.

## Juego vigente y re-marcado (repositorio; Fase 1: función de BD)

- **T-J1** Dado un piloto cuyo único juego activo es de un ciclo **anterior** (faltó a la fecha de cambio), cuando marca en una continuación, entonces se trata como ingreso tardío, no como continuación de ese juego viejo.
- **T-J2** Dado un ingreso tardío ya guardado en la fecha, cuando el revisor corrige un serial en la misma fecha, entonces se re-valida como ingreso tardío (re-marcar reemplaza la marcación anterior), igual que en una fecha de cambio.
- **T-J3** Dada una inscripción que no pertenece a la fecha indicada, cuando se valida o guarda, entonces es un error (no se tocan juegos de otra fecha).
- **T-J4** Dada una excepción ya decidida, cuando se intenta decidir de nuevo, entonces es un error (se corrige con una solicitud nueva).
