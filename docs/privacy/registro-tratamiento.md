# Registro de actividades de tratamiento (borrador)

Exigido por SPEC §11.1 (Ley 21.719, vigente desde el 1-12-2026). **Borrador técnico: validar con un abogado antes de
marzo 2027.** Responsable del tratamiento: la organización del campeonato. Encargado: la plataforma.

Estado actual (Fase 0): la demo **no trata datos personales reales**. Usa personas ficticias (`@example.com`) guardadas
solo en el navegador de quien la usa (localStorage). El botón "Enviar comentario" abre el correo del usuario: la
plataforma no almacena ese texto.

## Tratamientos previstos desde Fase 1

| Dato                              | Finalidad                            | Base                   | Quién accede                        | Retención                                    |
| --------------------------------- | ------------------------------------ | ---------------------- | ----------------------------------- | -------------------------------------------- |
| Nombre completo                   | Identificar al piloto en resultados  | Inscripción (contrato) | Público (menores: nombre + inicial) | Historial deportivo permanente; anonimizable |
| Email                             | Login y notificaciones               | Inscripción            | Titular, admin de la organización   | Mientras la cuenta exista                    |
| Teléfono (opcional)               | Contacto operativo                   | Consentimiento         | Staff de la fecha                   | Mientras la cuenta exista                    |
| Año de nacimiento                 | Categorías y pesos por edad          | Reglamento             | Staff, titular                      | Mientras la cuenta exista                    |
| Licencia FADECH                   | Requisito para competir              | Reglamento             | Secretaría, staff                   | Temporada + 1 año (por definir)              |
| Contacto de emergencia (opcional) | Seguridad en pista                   | Consentimiento         | Solo staff de la fecha              | Se borra al cierre de temporada              |
| Tutor responsable                 | Consentimiento y contacto de menores | Ley (menores)          | Admin, staff de la fecha            | Mientras el piloto sea menor                 |
| Logs técnicos                     | Seguridad y soporte                  | Interés legítimo       | Administradores de la plataforma    | 12 meses, sin datos personales               |

## Pendientes antes del lanzamiento

- Política de privacidad y términos versionados, con registro de aceptación.
- Pantalla "Mis datos": ver, corregir, exportar, solicitar eliminación (anonimización conservando historial).
- Procedimiento de brechas (detectar, contener, evaluar, notificar; prioridad si hay menores).
- Contrato responsable/encargado con cada organización.
