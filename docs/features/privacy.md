# Privacidad en vistas públicas — criterios de aceptación

Fuente: SPEC §11.1. Código: `src/domain/privacy/`.

- **PR-1** Dado un piloto adulto, cuando aparece en una vista pública (tabla, pantalla en pista), entonces se muestra su nombre completo.
- **PR-2** Dado un piloto menor de edad (según su **año** de nacimiento) y la organización configurada para abreviar menores, cuando aparece en una vista pública, entonces se muestra "Nombre I." (nombre + inicial del apellido).
- **PR-3** Dado un piloto menor y la organización configurada para mostrar nombre completo, entonces se muestra completo.
- **PR-4** Dado un piloto sin año de nacimiento registrado, cuando se decide si es menor, entonces se trata como menor (opción más protectora).
- **PR-5** La edad se calcula solo con el año (temporada − año de nacimiento < 18); no se guarda la fecha completa.
