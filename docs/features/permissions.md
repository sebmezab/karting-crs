# Permisos y roles (RBAC) — criterios de aceptación

Fuente: SPEC §4.2. Código: `src/domain/permissions/`. ADR: `docs/decisions/0003-rbac-permisos-atomicos.md`.

- **P-1** Dado el catálogo de permisos, cuando se consulta, entonces contiene todos los permisos de la tabla §4.2, cada uno con grupo y etiqueta en español, y sin claves duplicadas.
- **P-2** Dado un patrón con comodín (`sessions.*`), cuando se expande, entonces se obtienen todos los permisos del grupo.
- **P-3** Dado un permiso o patrón que no existe en el catálogo, cuando se expande, entonces es un error (evita roles mal configurados).
- **P-4** Dadas las 6 plantillas estándar (Director de carrera, Director técnico, Revisor técnico, Comisario deportivo, Cronometrista, Secretaría), cuando se expanden, entonces tienen exactamente los permisos sugeridos en §4.2.
- **P-5** Dada una persona con varios roles en la misma fecha, cuando se calculan sus permisos efectivos, entonces son la **unión** de los permisos de sus roles.
- **P-6** Dada una persona con un rol en la fecha 5, cuando se calculan sus permisos en la fecha 6, entonces no tiene ninguno (el staff es por fecha).
- **P-7** Dado un rol sin el permiso, cuando se consulta `hasPermission`, entonces es falso y la UI oculta la acción (la barrera real es la BD desde Fase 1).
