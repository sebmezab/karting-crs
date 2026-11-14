# ADR 0005 — Minimización de datos personales

**Fecha:** 14-11-2026 · **Estado:** Aceptada

## Contexto

La Ley 21.719 rige desde el 1-12-2026, con protección reforzada para menores (Micro, Mini y Junior: 8 a 14 años).
Un dato que no se guarda no se puede filtrar (SPEC §11.1).

## Decisión

- Se guarda solo: nombre, email, teléfono (opcional), **año** de nacimiento, licencia FADECH, contacto de emergencia
  (opcional, solo staff de la fecha) y tutor si es menor.
- **Nunca**: RUT, fecha de nacimiento completa, dirección, género, nacionalidad, fotos de documento, salud, tarjetas.
- Vistas públicas: nombre (menores como "Nombre I.", `publicDisplayName`), número, categoría, resultados, sanciones
  oficiales. Sin año → se asume menor.
- El motivo de una selección a revisión no se muestra al piloto ni al público (`toPublicInspectionView`).
- La demo usa solo personas ficticias con emails `@example.com`.

## Consecuencias

- Agregar un dato personal requiere justificarlo con la tabla de §11.1, actualizar `docs/privacy/` y el checklist de PR.
- Validar con un abogado antes de marzo 2027 (SPEC §13, pregunta 8).
