# domain/tires — reglas del ciclo de neumáticos

Fuente: SPEC §7.1 y `championship.rules.tires`. Criterios: `docs/features/tires.md` (T-C*, T-V*).

- `classifyTireEvents`: override manual (`event.is_tire_change_event`) > cálculo (1ª fecha que cuenta = cambio, luego
  cada `cycle_length_events`). El cálculo **no** se desplaza por overrides de otras fechas.
- `validateTireMarking` devuelve **códigos** (`TireIssueCode`), nunca texto: los mensajes viven en `src/i18n/es.ts`
  (`tireIssueMessage`). Agregar un código nuevo obliga a agregar su mensaje (el `switch` es exhaustivo).
- Bloqueos estructurales (faltante, repetido, serial de otro piloto) aplican en **cualquier** tipo de fecha y se
  evalúan antes que las reglas del ciclo. Un serial ajeno se informa como intercambio, no además como "no coincide".
- En continuación se compara el **conjunto** de seriales (rotar posiciones no es cambiar el juego).
- El texto escaneado es no confiable: todo pasa por `normalizeSerial` (A-Z, 0-9, guion; máx. 32; sin letras ni
  números = vacío). **Para comparar** seriales se usa siempre `serialKey` (ignora guiones): "MG355A2" tipeado es el
  mismo neumático que "MG-355-A2" escaneado (evita evadir el bloqueo por intercambio).
- Lectura con cámara (T-L*, ADR 0008): `serialCandidatesFromText` extrae candidatos del texto de OCR y
  `matchKnownSerial` los corrige contra seriales del mismo piloto (confusiones 1/I/L, 0/O…). Un candidato de OCR
  **nunca** se usa sin confirmación del revisor; el código de barras sí se completa solo.
- `approvedReplacements` es un **conteo**: cada excepción de pinchazo aprobada cubre un solo neumático.
- El repositorio decide cuál es el juego vigente (`currentCycleStartEventId`): se ignoran juegos de ciclos anteriores
  (→ ingreso tardío) y juegos abiertos en la misma fecha (re-marcar reemplaza). Ver T-J1..T-J4.
- Esta misma función se usará en Fase 1 (TS compartido o portada a `validate_tire_marking` en Postgres): si cambia
  el comportamiento, cambia el test primero.
