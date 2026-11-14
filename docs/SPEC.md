# SPEC — Plataforma de Gestión de Campeonatos de Karting

> Documento de especificación para desarrollo con Claude Code.
> Origen: sesión de diseño con Sebastián (piloto DD2, Club de Karting Concepción), 14-nov-2026.
> Campeonato de referencia: **Campeonato Regional Sur (CRS)**, organizado por una organización formada por dos clubes (CKC + otro), con fiscalización ARAB/FADECH.
> **Todo lo de este documento es configurable**; los datos del CRS son solo referencia y datos de demo.

---

## 1. Contexto y problema

La gestión del campeonato hoy es artesanal:

| Área | Situación actual | Dolor |
|---|---|---|
| Inscripción | Google Form compartido por link en un grupo de WhatsApp | Sin visibilidad pública; datos dispersos |
| Inscripción técnica | Formularios en papel (series de neumáticos, chasis y motores) | Se pierden datos; no hay cruce entre fechas |
| Control de neumáticos | Marcación en papel durante la fecha | **No se verifica la regla de reutilización entre fechas porque es demasiado tedioso** |
| Revisión post-sesión | Coordinación verbal | El staff técnico no sabe con certeza qué karts revisar al salir de pista |
| Resultados en vivo | MyLaps + transponders (facilitados por FADECH), visibles en Speedhive | Funciona bien, pero vive en otra plataforma; a futuro se integrará para tener todo en un solo ecosistema |
| Resultados oficiales | Impresos y pegados en un tablero físico; el campeonato es un Excel → PDF enviado por WhatsApp | Desfase, poca trazabilidad de sanciones |

## 2. Visión

Plataforma web **oficial** y **ecosistema único** del evento: organización, staff técnico, comisarios, pilotos y espectadores administran y siguen todo el evento en el mismo lugar (inscripciones, técnica, revisiones, sanciones, resultados y, a futuro, resultados en vivo). Se parte por el control técnico. Debe ser **multi-organización y multi-campeonato desde el día 1** (potencial producto comercial a futuro).

### Principios
- **Reglas como configuración, no como código.** Todo lo que dependa del reglamento (ciclo de neumáticos, límites de equipo, puntaje) se parametriza por campeonato.
- **Mobile-first para el staff en pista.** El técnico opera con una mano, de pie y al sol.
- **Trazabilidad.** Cada acción relevante (marcación, excepción, selección para revisión, sanción) registra quién, cuándo y por qué.
- **Integrar, no reinventar, el cronometraje.** MyLaps/Speedhive siguen siendo la fuente del tiempo. Hoy el vivo se ve en Speedhive; en una fase futura la plataforma consumirá esos datos (API/export, por investigar) para mostrar los mismos resultados dentro de la app. Diseñar `session_result` para recibir datos importados (`source = import`) desde el inicio.

## 3. Stack y arquitectura

| Capa | Decisión | Motivo |
|---|---|---|
| Frontend | **React + Vite + TypeScript**, Tailwind CSS | SPA estática, simple de desplegar |
| Formato app | **PWA** (manifest + service worker básico) | Se "instala" desde el navegador con ícono en el teléfono |
| Apps nativas (futuro) | **Capacitor** envolviendo la misma web | Pasar a Android/iOS sin rediseño: decisión de costo, no de arquitectura |
| Backend | **Supabase** (Postgres + Auth + Row Level Security + Realtime) | Multi-tenant con RLS, tiempo real para listas del staff, sin servidor propio |
| Hosting (demo y pruebas) | **GitHub Pages** | Disponible; compatible porque es SPA estática que habla directo con Supabase |
| Hosting (producción) | **Cloudflare Pages** (plan gratuito) | Mismo build estático, migración trivial. Ancho de banda ilimitado, previews por commit, dominio propio con SSL. Se descarta Vercel Hobby porque prohíbe uso comercial (Pro = US$20/usuario/mes). GitHub Pages no está permitido para SaaS comercial |

### 3.1 Costos estimados (verificado nov-2026; confirmar antes de contratar)

| Etapa | Hosting | Supabase | Total/mes |
|---|---|---|---|
| Demo y pruebas (nov-2026 → feb-2027) | GitHub Pages: US$0 | Free: US$0 | **US$0** |
| Campeonato CRS 2027 (1 organización) | Cloudflare Pages Free: US$0 | **Pro: US$25** (recomendado) | **≈ US$25** |
| Producto comercial (varias organizaciones) | Cloudflare Pages Free o Pro (US$20–25) | Pro US$25 + uso; un solo proyecto multi-tenant | **≈ US$25–50** |

**Ojo con Supabase Free:** los límites de volumen sobran (500 MB de BD, 50.000 usuarios activos/mes), pero **el proyecto se pausa tras 7 días sin actividad**. Entre fechas de campeonato (semanas sin uso) la app quedaría caída hasta reactivarla manualmente. Aceptable para la demo y las pruebas; **para el campeonato oficial usar Pro** (sin pausa, backups diarios). Mantener **un solo proyecto Supabase multi-tenant**: Pro cobra cómputo por proyecto.

Dominio propio: ≈ US$10–15/año.
| Escaneo códigos de barra | `BarcodeDetector` nativo, con fallback a `@zxing/browser` | Funciona en el navegador del celular; iOS Safari requiere el fallback |
| Routing | `HashRouter` (o `basename` + 404.html redirect) | GitHub Pages no soporta rutas de SPA nativamente |

### Restricciones de UI
- Responsive: teléfono (360–430 px) y notebook de **14" como máximo** (≈1366–1536 px). No diseñar para pantallas grandes.
- Botones grandes, alto contraste (uso al aire libre) y feedback visual claro (verde/ámbar/rojo) en validaciones.
- Hay internet en pista. **No se requiere modo offline** en el MVP, pero hay que manejar con gracia la pérdida momentánea de conexión (reintento y aviso).
- Idioma: español (Chile). Fechas en formato dd-mm-aaaa y zona horaria America/Santiago.

## 4. Roles y permisos

### 4.1 Roles permanentes (nivel organización)
- **Admin de organización**: crea campeonatos, categorías y fechas; asigna el staff de cada fecha; configura reglas.
- **Piloto**: cuenta propia; ve y edita su perfil, su equipo y sus inscripciones; ve su historial, sanciones y resultados.

### 4.2 Roles por fecha — configurables (RBAC)
El staff **cambia en cada fecha**, una persona puede cumplir **varios roles** y los nombres y responsabilidades **varían entre campeonatos y países**. Por eso los roles **no se programan fijos**: se modelan como **conjuntos de permisos atómicos** configurables.

**Tres niveles:**
1. **Catálogo de permisos (fijo, en código):** acciones atómicas que la app sabe ejecutar. Es lo único que se programa.
2. **Roles (configurables por organización):** un rol = nombre + conjunto de permisos. La plataforma trae **plantillas estándar** que la organización puede usar tal cual, copiar y modificar, o crear **roles personalizados** activando permisos uno a uno (toggles).
3. **Asignación por fecha:** persona + rol + fecha. Los permisos efectivos de una persona en una fecha son la **unión** de los permisos de todos sus roles en esa fecha (el revisor técnico de la fecha 5 solo opera en la fecha 5).

**Catálogo inicial de permisos** (agrupado; ampliable):

| Grupo | Permisos |
|---|---|
| Inscripciones | `entries.view`, `entries.validate`, `entries.mark_paid`, `entries.export` |
| Técnica | `tech.mark_tires`, `tech.verify_equipment`, `tech.view_passport` |
| Excepciones | `exceptions.request`, `exceptions.decide` |
| Sesiones | `sessions.manage` (crear/editar), `sessions.start` (dar inicio), `sessions.close`, `results.enter` (Top N/provisional) |
| Revisión post-sesión | `inspection.select` (asignar karts a revisión), `inspection.assign_inspector`, `inspection.resolve` (declarar resolución técnica: OK/observado) |
| Sanciones | `penalties.create`, `penalties.decide`, `penalties.publish` |
| Resultados | `results.publish_official` |
| Documentos | `documents.publish`, `documents.view_internal` |
| Comunicaciones | `notifications.send` |
| Fecha | `event.view_all`, `event.manage_staff` |

**Plantillas de rol estándar** (preset editable; nombres según reglamento chileno/FIA):

| Plantilla | Permisos sugeridos |
|---|---|
| Director de carrera | `event.view_all`, `sessions.*`, `results.publish_official`, `documents.publish`, `notifications.send` |
| Director técnico | `tech.*`, `inspection.*`, `exceptions.decide` |
| Revisor técnico | `tech.mark_tires`, `tech.verify_equipment`, `tech.view_passport`, `inspection.resolve`, `exceptions.request` |
| Comisario deportivo | `exceptions.decide`, `inspection.select`, `penalties.*`, `documents.publish` |
| Cronometrista | `sessions.close`, `results.enter` |
| Secretaría | `entries.*`, `documents.publish` |

**Modelo de datos:**
```
permission            -- catálogo en código (enum/seed), no editable por usuarios
role (id, organization_id NULL, name, description, is_template bool)
   -- organization_id NULL = plantilla global de la plataforma
role_permission (role_id, permission_key)
event_staff (event_id, person_id, role_id)   -- reemplaza event_staff.role de texto
```
- Validación en el **frontend** (mostrar/ocultar acciones) y en la **base de datos** (políticas RLS que llaman a una función `has_permission(event_id, permission_key)`). La seguridad real está en la BD.
- Atajo: "copiar staff de la fecha anterior".
- Auditoría: cambios a roles y asignaciones quedan en `audit_log`.

Una persona puede tener varios roles en la misma fecha.

## 5. Alcance por fases

| Fase | Contenido | Prioridad |
|---|---|---|
| **0 — Demo navegable** | Prototipo con datos de ejemplo, sin backend, publicado en GitHub Pages | **Inmediata** (para mostrar a la directiva) |
| **1 — Registro técnico** | Organización/campeonato/fechas, roles configurables y staff por fecha, tablón de documentos, inscripción web, pasaporte técnico, marcación de neumáticos con validación, excepciones | Alta |
| **2 — Revisión post-sesión** | Sesiones, ingreso de Top N, selección de karts a revisar, estados de revisión | Alta |
| **3 — Resultados y campeonato** | Resultados oficiales (provisional → sanciones → oficial), sanciones con trazabilidad, tabla del campeonato automática, historial de piloto, pantalla pública | Media |
| **4 — Resultados en vivo integrados** | Integración con Speedhive/Orbits para mostrar tiempos en vivo y resultados dentro de la plataforma (vista para espectadores, pilotos y staff). Requiere investigación previa de APIs/exports | Futura |
| **Futuro** | Notificaciones push/WhatsApp, firma digital del deslinde, pagos online, apps en tiendas (Capacitor), tienda/club | Baja |

---

## 6. Modelo de datos

Postgres (Supabase). Todas las tablas de negocio llevan `organization_id` (directo o derivado) para RLS. Timestamps `created_at` y `updated_at` y `created_by` en todas.

### 6.1 Núcleo multi-tenant

**Concepto de organización:** la organización es **la entidad que organiza un campeonato o fechas**, no un club. Si dos clubes organizan juntos un campeonato, eso es **una sola organización** (con nombre propio y staff de ambos clubes). Si uno de esos clubes organiza otro campeonato o fechas por su cuenta, es **otra organización distinta**. No se modela la relación club ↔ campeonato ni co-organización N:M; una persona puede pertenecer a varias organizaciones.

```
organization (id, name, slug, logo_url)
person (id, auth_user_id NULL, full_name, email, phone NULL,
        birth_year NULL,            -- SOLO el año: basta para categorías por edad y pesos (ver 11.1)
        guardian_person_id NULL)    -- tutor responsable si es menor de edad
   -- NO se almacena: RUT, fecha de nacimiento completa, dirección, género, fotos de identidad
   -- una persona existe una sola vez en la plataforma; puede ser piloto, staff o ambos
organization_member (organization_id, person_id, role: 'admin' | 'member')
```

### 6.2 Campeonato y configuración
```
championship (id, organization_id, name, season_year, status: draft|active|closed,
              rules jsonb)          -- ver 6.6
category (id, championship_id, name, number_min, number_max,
          tire_brand, tire_model, sort_order)
event  -- "fecha"
      (id, championship_id, round_number, date, venue,
       counts_for_points bool,          -- p.ej. fecha 1 de verano = false
       counts_for_tire_cycle bool,      -- p.ej. fecha 1 = false
       is_tire_change_event bool NULL,  -- override manual; NULL = calculado por regla
       registration_deadline timestamptz,
       status: planned|open|in_progress|provisional|official)
event_staff (event_id, person_id, role_id)  -- roles configurables, ver 4.2
```

### 6.3 Pilotos e inscripciones
```
driver_profile (person_id, license_number NULL,   -- licencia FADECH, necesaria para validar inscripción
                emergency_contact_name NULL, emergency_contact_phone NULL,
                   -- opcional; visible solo para staff de la fecha; ver 11.1
                team NULL)
championship_entry (id, championship_id, category_id, person_id, kart_number,
                    status: active|withdrawn)
   -- el número se mantiene toda la temporada; único por campeonato
event_entry (id, event_id, championship_entry_id,
             status: pending|confirmed|rejected, late_fee bool, paid bool,
             registered_at)
```

### 6.4 Equipamiento (pasaporte técnico)
```
equipment (id, organization_id, owner_person_id,
           type: chassis|engine|tire,
           serial_number,            -- único por (organization_id, type)
           barcode NULL,
           brand, model,
           tire_kind: slick|rain NULL,  -- solo tires
           seal_number NULL)            -- solo engines (sello vigente)
event_equipment (id, event_entry_id, equipment_id,
                 role: chassis_1|chassis_2|engine_1|engine_2|tire,
                 tire_position NULL: FL|FR|RL|RR,
                 registered_by, registered_at,
                 validation_status: ok|warning|blocked|overridden,
                 validation_messages jsonb)
tire_set (id, championship_entry_id, cycle_start_event_id, tire_kind,
          status: active|closed)
tire_set_item (tire_set_id, equipment_id, position, replaced_by_equipment_id NULL,
               replaced_in_event_id NULL, exception_id NULL)
```

### 6.5 Excepciones, revisión, sanciones y resultados
```
exception_request (id, event_id, event_entry_id,
                   type: puncture_replacement|late_entry_used_tires|other,
                   description, requested_by, requested_at,
                   status: pending|approved|rejected,
                   decided_by, decided_at, decision_notes)

session (id, event_id, category_id,
         type: practice|qualifying|prefinal|final|other,
         name, scheduled_at, status: scheduled|running|finished|official)
session_result (id, session_id, event_entry_id, position, laps NULL,
                best_lap_ms NULL, status: classified|dnf|dns|dsq,
                is_provisional bool, source: manual|import)
inspection_selection (id, session_id, event_entry_id,
                      reason: top_n|steward_selection,
                      selected_by, selected_at,
                      status: pending|in_progress|ok|observed,
                      inspector_person_id NULL, notes, closed_at)

penalty (id, event_id, event_entry_id, session_id NULL,
         type: A|M|P|G|D|S,     -- amonestación, multa, tiempo, grilla, descalificación, suspensión
         value NULL,            -- monto, segundos o puestos
         infraction_code NULL,  -- referencia a la tabla de infracciones (Anexo 1)
         description, decided_by, decided_at,
         status: draft|notified|appealed|final,
         visible_to_driver bool default true)
infraction_catalog (id, championship_id, code, description, allowed_types text[])

audit_log (id, organization_id, actor_person_id, action, entity, entity_id,
           payload jsonb, created_at)
```

### 6.6 `championship.rules` (jsonb) — reglas configurables
```json
{
  "tires": {
    "cycle_length_events": 2,
    "marked_kinds": ["slick"],
    "set_size": 4,
    "allow_used_on_change_event": true,
    "late_entry_requires_used": true,
    "puncture_replacement_requires_approval": true
  },
  "equipment_limits": { "chassis": 2, "engine": 2 },
  "engine_requires_seal": true,
  "no_equipment_sharing_between_drivers": true,
  "post_session_inspection": { "default_top_n": 3 },
  "points": "→ ver 6.7 (motor de puntaje configurable)",
  "registration": { "late_fee_per_day_clp": 15000 }
}
```
La UI de administración debe permitir editar estas reglas con formularios, no con JSON crudo (en el MVP, un JSON editable para el admin es aceptable).

### 6.7 Motor de puntaje configurable

Los campeonatos tienen reglas de puntaje distintas, y el reglamento de un mismo campeonato **puede cambiar antes o durante la temporada**. Por eso el puntaje no se programa "a la medida" del CRS: se modela como un **conjunto de reglas genéricas, cada una activable/desactivable y con parámetros**. Las reglas del CRS 2026 son solo la configuración inicial (preset).

**Estructura (`scoring_ruleset`, versionado por campeonato):**
```
scoring_ruleset (id, championship_id, version, valid_from_event_id NULL,
                 config jsonb, created_by, created_at, notes)
```
- Cada cambio de reglas crea una **nueva versión** (no se sobrescribe). Se define si aplica a toda la temporada (recalcular todo) o desde una fecha en adelante.
- La tabla del campeonato siempre se puede **recalcular** desde los resultados oficiales con la versión vigente. Mostrar "calculado con reglas v3".
- Botón **"Simular"**: muestra cómo quedaría la tabla con una versión borrador antes de publicarla (útil mientras el reglamento no está cerrado).

**Bloques de reglas (cada uno con `enabled` y parámetros):**

| Bloque | Regla | Parámetros | Preset CRS 2026 |
|---|---|---|---|
| **Puntos por sesión** | Tabla posición → puntos por tipo de sesión puntuable | tipos de sesión que puntúan; tabla por tipo | Prefinal `[12,10,8,7,6,5,4,3,2,1]`, Final `[15,12,10,8,7,6,5,3,2,1]` |
| **Bonos** | Pole position | puntos; criterio en categorías refundidas | 1 pt (1 por cada categoría refundida) |
| | Participación | puntos; qué cuenta como participar | 1 pt |
| | Vuelta rápida | puntos; sesión | desactivado |
| **Elegibilidad** | Mínimo de vueltas para puntuar | % de vueltas + N vueltas | 50% + 1 vuelta |
| | Mínimo de pilotos por categoría | N pilotos; % de puntos si no se cumple; categorías exentas | 3 pilotos; 50%; exentas Micro y Mini |
| **Carreras interrumpidas** | Bandera roja sin reanudar | vueltas mínimas; % de distancia; % de puntos | ≥ 2 vueltas y < 75% → 50% |
| | Suspendida | vueltas máximas para anular | ≤ 2 vueltas → 0 pts |
| **Fechas** | Fechas que no suman | lista de fechas (flag `counts_for_points`) | F1 de verano |
| **Descartes** | Eliminar las N peores fechas | N | 1 |
| | Restricción de descarte por sanción | tipos de sanción que impiden descartar esa fecha (D, exclusión…) | No se descarta una fecha con D/exclusión en prefinal o final |
| | Fechas no descartables | lista | F1 no se puede eliminar |
| **Sanciones en puntaje** | Pérdida de puntos por sanción | tipo de sanción → efecto (anula sesión, resta N pts) | D anula puntos de la sesión |
| **Desempate** | Cadena ordenada de criterios | lista ordenable: victorias por sesión, 2º lugares, …, poles, mejor resultado en última fecha | Victorias en final → prefinal → 2º en final → 2º en prefinal → … → poles |
| **Premiación de la fecha** | Sesión que define el podio de la fecha | tipo de sesión | Final |

**Requisitos de implementación:**
- El cálculo es una **función pura** `computeStandings(results, penalties, events, rulesetConfig)` en TypeScript, sin acceso a BD, con **tests unitarios por bloque** y un test de integración con el preset CRS.
- Agregar una regla nueva = agregar un bloque al esquema + su implementación, sin tocar las existentes.
- El esquema de `config` se valida con **Zod**; la UI de admin se genera a partir de ese esquema (toggles + campos).
- Cada línea de la tabla del campeonato debe poder **explicarse**: al tocar un piloto se ve el desglose (puntos por sesión, bonos, fecha descartada y por qué).

---

### 6.8 Documentos y tablón oficial

Equivalente digital al **tablón oficial de avisos** (notice board) de la fecha: es donde la organización publica reglamentos, comunicados y resoluciones. Referentes: Rotax Global App (Notice Board), Sportity, Alpha Racehub.

```
document (id, organization_id, championship_id NULL, event_id NULL,
          type: reglamento_campeonato | reglamento_tecnico | reglamento_particular |
                comunicado | boletin | resolucion_comisarios | horario | otro,
          title, number NULL,          -- p.ej. "Comunicado N°3"
          file_url, mime_type,
          visibility: public | drivers | staff,
          published_at, published_by,
          supersedes_document_id NULL, -- nueva versión de un documento
          requires_acknowledgement bool default false)
document_acknowledgement (document_id, person_id, acknowledged_at)
document_read (document_id, person_id, read_at)
```
- Ámbito: un documento pertenece al **campeonato** (reglamentos de temporada) o a una **fecha** (reglamento particular, comunicados, resoluciones, horario).
- **Numeración automática** de comunicados por fecha y **sello de hora de publicación** (relevante para plazos de apelación).
- **Versionado:** un documento nuevo puede reemplazar a uno anterior; el anterior queda visible como "reemplazado".
- **Visibilidad:** público, solo pilotos inscritos o solo staff.
- **Lectura y acuse:** indicador de no leídos; para documentos críticos (p.ej. briefing o cambio de horario), exigir **"Leído y entendido"** al piloto y mostrar al staff quién no lo ha confirmado.
- Al publicar, **notificación** a los afectados (ver 6.9).
- Archivos en **Supabase Storage** (PDF/imagen); límite de tamaño configurable.
- Las resoluciones de comisarios (sanciones) pueden **generar automáticamente** un documento PDF en el tablón.

### 6.9 Notificaciones

Separar dos tipos (patrón de la Rotax Global App):
- **Avisos generales** de la fecha: para todos los inscritos (cambio de horario, nuevo comunicado).
- **Notificaciones personales**: para un piloto (kart seleccionado para revisión, sanción, excepción aprobada/rechazada, inscripción confirmada).

Canales: notificación **push web** (PWA) + bandeja dentro de la app. WhatsApp/email como fase futura. Todo envío queda registrado.

## 7. Reglas de negocio clave

### 7.1 Ciclo de neumáticos
**Determinar si una fecha es "de cambio":**
1. Si `event.is_tire_change_event` no es NULL → usar el override.
2. Si no: ordenar las fechas del campeonato con `counts_for_tire_cycle = true`; la 1ª es de cambio, y luego cada `cycle_length_events` fechas.
   - Ejemplo CRS 2026 (F1 excluida, ciclo 2): F2 cambio, F3 continuación, F4 cambio, F5 continuación, **F6 cambio**.
3. El admin ve el calendario con el tipo calculado y puede sobrescribirlo fecha a fecha.

**Validación al marcar los 4 slicks de un piloto en una fecha:**

| Situación | Resultado |
|---|---|
| Fecha de cambio, cualquier juego (nuevo o usado) | ✅ OK → se crea un `tire_set` nuevo para el ciclo y se cierra el anterior |
| Fecha de continuación, mismos 4 seriales del `tire_set` activo | ✅ OK |
| Fecha de continuación, uno o más seriales distintos | ⛔ Bloqueado, salvo `exception_request` aprobada (pinchazo → reemplazo por usado de desgaste similar) |
| Fecha de continuación, piloto sin `tire_set` activo (ingreso tardío) | ⚠️ Advertencia: deben ser **usados**; el revisor confirma con un check y queda una excepción `late_entry_used_tires` pendiente de aprobación del comisario |
| Serial ya registrado a nombre de **otro piloto** en la organización | ⛔ Bloqueado (intercambio prohibido) |
| Serial repetido dentro del mismo juego | ⛔ Bloqueado |
| Neumático no corresponde a marca/modelo de la categoría | ⚠️ Advertencia (no hay validación automática de modelo por código de barra en el MVP; el revisor confirma) |

Un neumático re-marcado (usado) en una fecha de cambio se convierte en el juego del ciclo y **debe mantenerse hasta el próximo cambio** (regla 10.3), con la misma validación que un juego nuevo.

### 7.2 Equipamiento
- Máximo `equipment_limits.chassis` chasis y `equipment_limits.engine` motores por piloto por fecha.
- Un motor requiere `seal_number` si `engine_requires_seal`.
- Un equipo (chasis, motor o neumático) **no puede estar inscrito por dos pilotos en la misma fecha**.
- El cambio de dueño de un equipo entre fechas se permite solo vía admin y queda en `audit_log`.

### 7.3 Inscripción
- Cierre configurable por fecha (`registration_deadline`). En CRS: miércoles anterior a las 23:59.
- La inscripción fuera de plazo se permite, pero marca `late_fee = true` y muestra la multa calculada.
- El número de kart debe estar dentro del rango de la categoría y ser único en el campeonato.

### 7.4 Revisión post-sesión
- Al cerrar una sesión, el cronometrista ingresa el Top N **tocando números** de la grilla de inscritos de esa categoría (sin tipear). N por defecto = `default_top_n`.
- Se generan automáticamente `inspection_selection` con `reason = top_n`.
- El director técnico o un comisario puede **agregar karts a criterio** (`reason = steward_selection`). Ante los pilotos se muestra solo "Seleccionado para revisión", **sin el motivo**. Internamente queda quién lo pidió y cuándo.
- La lista se ve en tiempo real (Supabase Realtime) en todos los dispositivos del staff.
- Estados: `pending → in_progress → ok | observed`. "Observado" ofrece crear una sanción o un caso para comisarios.

### 7.5 Resultados y sanciones (Fase 3)
- Flujo: resultado **provisional** (ingreso manual o import) → sanciones aplicadas → **oficial** (publicado por el director de carrera).
- Las sanciones de tiempo (P) y grilla (G) recalculan posiciones; la descalificación (D) saca al piloto del resultado.
- La tabla del campeonato se recalcula automáticamente al publicar un resultado oficial, aplicando la versión vigente del `scoring_ruleset` (ver 6.7).
- El piloto ve sus sanciones con tipo, motivo y fecha; historial por temporada.

---

## 8. Pantallas

### Públicas (sin login)
1. **Portada del campeonato**: calendario, categorías, próxima fecha con botón "Inscribirse".
2. **Resultados oficiales** por fecha y categoría.
3. **Tabla del campeonato** por categoría.
4. **Pantalla en pista** (modo TV/notebook): última sesión oficial y lista de karts a revisión; se actualiza sola.

### Piloto
5. **Mi perfil y mi equipo**: chasis, motores (serie + sello), neumáticos registrados.
6. **Inscripción a una fecha**: categoría, número, selección de chasis/motores (máx. 2 c/u).
7. **Mi historial**: fechas, resultados, sanciones, juegos de neumáticos por ciclo.

### Staff en pista (mobile-first)
8. **Panel de la fecha**: según los roles del usuario en esa fecha.
9. **Marcación de neumáticos** (revisor técnico):
   - Buscar piloto por número de kart.
   - Escanear 4 códigos (con cámara) o ingreso manual del serial.
   - Resultado inmediato en semáforo con el mensaje de la regla aplicada (ej. *"Fecha de continuación: este juego debe ser el mismo de la Fecha 4. Neumático RR no coincide."*).
   - Botón "Solicitar excepción" cuando corresponda.
10. **Verificación de equipo**: confirmar chasis/motores declarados (escaneo o manual).
11. **Excepciones pendientes** (comisarios): aprobar o rechazar con nota.
12. **Sesiones** (cronometrista): lista de sesiones de la fecha → cerrar sesión → ingresar Top N.
13. **Revisión post-sesión**: lista en tiempo real, agregar kart a criterio, cambiar estado.
14. **Sanciones** (comisarios): crear sanción desde catálogo de infracciones.

### Tablón y documentos
- **Tablón de la fecha / campeonato**: documentos ordenados por fecha de publicación, filtro por tipo, indicador de no leídos, botón "Leído y entendido" cuando aplique.
- **Publicar documento** (staff con `documents.publish`): subir PDF, tipo, número, visibilidad, reemplaza a…, notificar.

### Administración (organización)
15. **Campeonatos**: crear/editar, reglas, categorías con rangos de numeración.
16. **Calendario**: fechas, flags (`counts_for_points`, `counts_for_tire_cycle`), tipo de fecha de neumáticos (calculado + override).
17. **Staff por fecha**: asignar personas a roles para cada fecha (copiar staff de la fecha anterior como atajo).
17b. **Roles y permisos**: listado de roles (plantillas + personalizados); editor con toggles de permisos agrupados.
18. **Inscripciones**: validar, marcar pagos, exportar a CSV (para cargar en Orbits).

---

## 9. Datos de ejemplo (seed) — CRS 2026

**Organización**: Organización Campeonato Regional Sur (dos clubes, una entidad).
**Campeonato de demo**: Campeonato Regional Sur 2026 (historial para poblar los casos de prueba).

**Calendario 2026 de referencia** (Kartódromo Concepción):

| Fecha | Día | Puntos | Ciclo neumáticos |
|---|---|---|---|
| F1 | 21-02-2026 | No (fecha de verano) | No cuenta |
| F2 | 21-03-2026 | Sí | Cambio |
| F3 | 23-05-2026 | Sí | Continuación |
| F4 | 22-08-2026 | Sí | Cambio |
| F5 | 10-10-2026 | Sí | Continuación |
| F6 | 21-11-2026 | — | **Fecha de prueba del sistema** |

**Fechas de verano / sueltas:** las fechas de noviembre y febrero se llaman "fechas de campeonato" pero en la práctica son **fechas sueltas** (no suman ni definen ciclo). El campeonato real parte en **marzo 2027**. Estas fechas se usan como **pruebas en terreno** del sistema (ver sección 10). El modelo debe soportar eventos que no pertenecen al ciclo de neumáticos ni al puntaje (`counts_for_points = false`, `counts_for_tire_cycle = false`) y, de ser necesario, eventos sueltos dentro de un "campeonato" contenedor de temporada de verano.

**Categorías y numeración:**

| Categoría | Números | Neumático |
|---|---|---|
| Micro Max | 1–49 | MG SC2 |
| Mini Max | 50–99 | MG SC2 |
| Junior Max | 101–199 | MG SI (blancos) |
| Senior Max | 201–299 | MG SI |
| DD2 Senior | 301–399 | MG SI |
| DD2 Master | 401–499 | MG SI |
| DD2 Super Master XL | 501–599 | MG SI |
| DD2 Promocional | 601–699 | MG SI |

Los números X01, X02 y X03 están reservados (opcionalmente) para el top 3 de la temporada anterior.

**Escala de sanciones**: A (amonestación), M (multa $5.000–$300.000), P (tiempo 5–60 s), G (grilla: 3 puestos a último), D (descalificación de sesión/fecha), S (suspensión 30–90 días).

Para la demo, generar ~25 pilotos **ficticios** (nunca datos reales de personas en la demo) repartidos en 3–4 categorías, con historial de neumáticos en F4–F5 que permita mostrar **un caso OK, un caso bloqueado (serial distinto en continuación) y un caso de intercambio entre pilotos**.

---

## 10. Plan de ejecución

### Hitos con fechas reales

| Hito | Fecha | Objetivo |
|---|---|---|
| Demo a la directiva | Nov 2026 (sesiones de fin de semana) | Validar la idea con el prototipo de Fase 0 |
| **Prueba 1 en terreno** | **21-11-2026** (fecha de verano) | Usar el sistema en paralelo al papel (al menos marcación de neumáticos y revisión post-sesión); recoger feedback de staff y pilotos |
| **Prueba 2 en terreno** | **Febrero 2027** (fecha de verano) | Versión mejorada con el feedback de noviembre, ya con backend real (Fase 1 + 2) |
| **Lanzamiento oficial** | **Marzo 2027** (inicio del campeonato) | Sistema implementado como herramienta oficial del campeonato |

Durante las pruebas el papel sigue siendo el registro oficial; la app corre en paralelo para comparar y recoger feedback. Incluir un botón visible de **"Enviar comentario"** en la app durante las pruebas.

### Fase 0 — Demo navegable (primer entregable)
Objetivo: **lanzar la idea**, no validar la aplicación. Sebastián la opera él mismo desde su celular en una sesión de práctica para mostrar el concepto a la directiva; luego otras personas la prueban. Prioridad: que se entienda el valor en 2–3 minutos (flujos claros, buen aspecto, casos de ejemplo impactantes), por sobre la completitud. Una versión más armada se presenta después en una reunión dedicada.
- React + Vite + Tailwind, **sin Supabase**: datos de la sección 9 en un store local (JSON + estado en memoria/`localStorage`).
- **Selector de rol** visible (Piloto / Revisor técnico / Comisario / Cronometrista / Admin) para recorrer los flujos sin login.
- Flujos mínimos:
  1. Piloto: perfil + inscripción a F6 con su equipo.
  2. Revisor técnico: marcación de neumáticos con escaneo real por cámara y validación en semáforo (los 3 casos de ejemplo).
  3. Cronometrista + técnico: cerrar sesión, tocar Top 3, ver la lista de revisión, agregar uno a criterio, marcar OK/observado.
  4. Público: tabla del campeonato (puede ser estática en la demo).
- Deploy en **GitHub Pages** (GitHub Action con `vite build`, `base` configurado y `HashRouter`).
- Estructurar el código para que el store local se reemplace por Supabase sin tocar componentes (capa `data/` con interfaces de repositorio).

### Fase 1 — Registro técnico real
- Proyecto Supabase, migraciones SQL del modelo de la sección 6, políticas RLS por organización y por rol de fecha.
- Auth (magic link por email) para staff y pilotos.
- Pantallas 5, 6, 8–11, 15–18.
- Lógica de validación de neumáticos en una función Postgres (`validate_tire_marking`) o en un módulo TypeScript compartido con tests unitarios exhaustivos de la tabla 7.1.

### Fase 2 — Revisión post-sesión
- Pantallas 12–13 + pantalla pública 4 (parte de revisión), con Realtime.

### Fase 3 — Resultados, sanciones y campeonato
- Pantallas 1–3, 7, 14; motor de puntaje configurable y versionado (6.7), con simulador y desglose por piloto.

---

### 10.1 Ideas tomadas de plataformas existentes

Revisión de Rotax Global App/EVA, Alpha Timing (Racehub + Club Management System), Sportity, Creventic App y Racer Scan. Funcionalidades útiles para incorporar (con fase sugerida):

| Idea | Referente | Fase |
|---|---|---|
| Tablón oficial digital con documentos, avisos generales y notificaciones personales | Rotax Global App, Sportity, Creventic | 1 |
| Briefing de pilotos digital: cláusulas que el piloto debe leer y aceptar una a una, con registro de quién aceptó | Alpha Timing | 1–2 |
| *Signing-on* digital: declaración/deslinde configurable (campos personalizados, lógica condicional) firmada desde el celular, con prellenado de datos | Alpha Timing | 2 |
| Subida de licencia FADECH por el piloto al inscribirse y recordatorios automáticos por documentos faltantes | Alpha Timing | 2 |
| Lista pública de inscritos por categoría (ocultando categorías sin inscritos) | Alpha Timing | 1 |
| Horario de la fecha (time schedule) siempre actualizado y visible | Creventic, Rotax | 1 |
| Credencial/pase de entrada digital del piloto (QR) para acreditación en pista | Creventic | Futuro |
| Base de datos de neumáticos escaneados compartida entre fechas y campeonatos de la organización | Alpha Timing, Racer Scan | 1 |
| Mensajes de dirección de carrera a pilotos durante la fecha | Alpha Racehub | 2 |
| Documentos disponibles sin conexión (cache de la PWA) | Sportity | 2 |
| Indicador de documentos no leídos | Sportity | 1 |
| Seguimiento de tabla y diferencias de puntos para pilotos y espectadores | Alpha Racehub | 3 |
| Verificación de procedencia de motores Rotax (EvaNet): registrar resultado o integrar | Rotax EVA | Futuro |

## 11. Privacidad, seguridad y robustez (foco transversal)

La seguridad y la protección de datos son **requisitos de primer nivel**, no tareas del final. Ningún módulo se considera terminado si no cumple esta sección.

### 11.1 Protección de datos personales (Ley 21.719)

**Marco legal:** en Chile rige la **Ley 21.719** (reforma la Ley 19.628), **vigente desde el 1-12-2026**. Crea la Agencia de Protección de Datos Personales, multas altas y protección reforzada para **menores de edad**. La prueba de noviembre ocurre antes de la entrada en vigencia, pero **febrero y marzo 2027 ya quedan bajo la ley**. Para comercializar en otros países, revisar la normativa local (p.ej. GDPR si hubiera clientes europeos). *Este documento no es asesoría legal; validar con un abogado antes del lanzamiento oficial.*

**Principio rector: minimización.** Solo se guarda el dato si es **imprescindible para operar el campeonato**. Un dato que no se guarda no se puede filtrar.

| Dato | ¿Se guarda? | Motivo |
|---|---|---|
| Nombre completo | ✅ | Identificar al piloto en resultados |
| Email | ✅ | Login y notificaciones |
| Teléfono | Opcional | Contacto operativo; nunca público |
| **Año** de nacimiento | ✅ | Las categorías y pesos del reglamento se definen por **año** de nacimiento; no se necesita el día ni el mes |
| N° licencia FADECH | ✅ | Requisito reglamentario para competir |
| Contacto de emergencia | Opcional | Seguridad en pista; visible solo al staff de la fecha; se puede borrar al cierre de temporada |
| Tutor responsable (menores) | ✅ si es menor | Consentimiento y contacto |
| RUT | ❌ | No aporta a la operación; aumenta el riesgo |
| Fecha de nacimiento completa | ❌ | Basta el año |
| Dirección, género, nacionalidad, foto de documento | ❌ | Innecesarios |
| Datos de salud (alergias, grupo sanguíneo) | ❌ | Datos sensibles; si algún día se requiere, diseño aparte con consentimiento explícito |
| Datos de pago (tarjetas) | ❌ | Nunca en la plataforma; si se cobra online, vía pasarela externa |

**Menores de edad:** Micro, Mini y Junior Max son categorías de **8 a 14 años**. Por lo tanto:
- La cuenta de un menor la crea y administra su **padre, madre o tutor**, que es quien da el consentimiento.
- Se publica lo mínimo de un menor: nombre, número, categoría y resultados. Considerar mostrar **nombre + inicial del apellido** en vistas públicas (configurable por organización).
- Sin fotos de menores en el MVP.

**Derechos del titular y obligaciones:**
- **Política de privacidad** y términos visibles, aceptados al registrarse (registrar versión y fecha de aceptación).
- **Consentimiento** registrado (quién, cuándo, para qué finalidad).
- Pantalla **"Mis datos"**: ver, corregir, **exportar** (JSON/CSV) y **solicitar eliminación** de la cuenta.
- **Eliminación vs. historial deportivo:** los resultados oficiales son registro público del campeonato; al eliminar una cuenta, la persona se **anonimiza** ("Piloto #123") y se borran sus datos de contacto, conservando el historial deportivo.
- **Retención:** definir plazos (p.ej. contacto de emergencia se borra al cierre de temporada; logs técnicos 12 meses).
- **Roles legales:** la **organización** del campeonato es la responsable de los datos; la plataforma actúa como **encargada** del tratamiento. Al comercializar, contrato/condiciones que lo establezcan.
- **Registro de actividades de tratamiento** (qué datos, para qué, cuánto tiempo, quién accede), mantenido en `docs/privacy/`.
- **Procedimiento de brechas:** detectar, contener, evaluar y notificar a la Agencia y a los afectados según la ley (con prioridad si involucra menores).

**Visibilidad por defecto:** público = nombre, número, categoría, resultados, sanciones oficiales y documentos públicos. Todo lo demás es privado y se muestra solo a quien tenga el permiso correspondiente.

### 11.2 Seguridad de la aplicación

Referencia: **OWASP ASVS nivel 2** y **OWASP Top 10**. Controles mínimos:

**Autorización (lo más crítico en esta arquitectura):**
- Como el frontend habla directo con Supabase, **la única barrera real es la base de datos**. **RLS activado en el 100% de las tablas, con denegación por defecto.** Ninguna tabla sin políticas.
- Permisos evaluados en la BD con `has_permission(event_id, permission_key)` (ver 4.2). El frontend solo oculta botones; nunca es la barrera.
- La clave `service_role` de Supabase **jamás** en el frontend ni en el repositorio. Operaciones privilegiadas solo en Edge Functions o funciones `SECURITY DEFINER` revisadas.
- Vistas públicas a través de **vistas/funciones que exponen solo columnas públicas** (nunca `select *` sobre `person`).
- **Tests automáticos de RLS** (pgTAP o tests de integración): para cada tabla, verificar que un usuario sin permiso **no** puede leer ni escribir, incluyendo cross-organization.

**Autenticación:**
- Login por **magic link** o código OTP (sin contraseñas que filtrar). Opcional: Google.
- **MFA obligatorio** para administradores de organización.
- Sesiones con expiración razonable; cerrar sesión en todos los dispositivos.
- Rate limiting en login/OTP (configuración de Supabase Auth) y CAPTCHA en registro público.

**Datos y entradas:**
- **Validación con Zod** en el cliente y **constraints/checks** en la BD (la BD no confía en el cliente).
- Prevención de XSS: nunca `dangerouslySetInnerHTML` con datos de usuario; sanitizar cualquier texto enriquecido.
- **Subida de archivos:** solo tipos permitidos (PDF, imágenes), tamaño máximo, nombres generados por el sistema, políticas de Storage por organización; documentos no públicos servidos con **URLs firmadas de corta duración**.
- Escaneo de códigos: tratar el contenido leído como texto no confiable.

**Infraestructura y cabeceras:**
- HTTPS obligatorio. En producción (Cloudflare Pages, archivo `_headers`): **Content-Security-Policy** estricta, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (cámara solo en el propio origen). *GitHub Pages no permite cabeceras: otra razón para migrar antes del lanzamiento.*
- Secretos solo en variables de entorno/secrets de CI; `.env` en `.gitignore`; escaneo de secretos en el repo (GitHub secret scanning / gitleaks).

**Cadena de suministro:**
- Dependencias mínimas y conocidas; `package-lock.json` versionado; **Dependabot** + `npm audit` en CI; revisar cada dependencia nueva antes de agregarla.

**Integridad y trazabilidad:**
- `audit_log` **solo inserción** (sin update/delete para nadie, ni admins) en todas las acciones sensibles: marcación, excepciones, selecciones, resultados, sanciones, cambios de roles y permisos, exportaciones de datos.
- Los registros oficiales (resultados publicados, sanciones finales) no se editan: se corrigen con un nuevo registro que referencia al anterior.

**Disponibilidad y continuidad:**
- Supabase Pro: **backups diarios**; probar una restauración antes del lanzamiento.
- El día de la fecha, si la app falla, existe el **plan B en papel** y un mecanismo para cargar después lo registrado en papel.
- Manejo de errores sin filtrar detalles internos al usuario; logs sin datos personales.

**Proceso:**
- Checklist de seguridad en cada PR (ver 12.5).
- Revisión de seguridad completa (incluido un pentest liviano o revisión externa) **antes de marzo 2027**.

### 11.3 Otros requisitos no funcionales
- **Rendimiento**: la validación de neumáticos debe responder en < 1 s en 4G.
- **Tests**: unitarios para reglas de neumáticos, límites de equipo y puntaje; tests de RLS; e2e básico (Playwright) para el flujo de marcación.
- **Accesibilidad**: contraste alto, tamaños táctiles ≥ 44 px, uso al sol.

## 12. Desarrollo con Claude Code (código pensado para agentes)

Este sistema se va a **construir y mantener con Claude Code** a lo largo del tiempo. Cada sesión futura empezará sin memoria de las anteriores, leyendo el código y la documentación. Por eso, el código y el repositorio deben optimizarse para que **un agente entienda el sistema rápido, modifique con seguridad y verifique su propio trabajo**.

### 12.1 Documentación viva en el repositorio
- **`CLAUDE.md` en la raíz**: qué es el sistema, arquitectura en 1 página, mapa de carpetas, comandos (`dev`, `test`, `check`, `db:migrate`, `db:seed`), convenciones, reglas inquebrantables (p.ej. "toda tabla nueva con RLS y test de RLS", "nunca guardar RUT"), y cómo agregar un permiso, una regla de puntaje o un módulo. Mantenerlo **corto y actualizado**; enlaza a los docs de detalle.
- **`docs/SPEC.md`**: este documento, como fuente de verdad funcional. Actualizarlo cuando cambie una decisión.
- **`docs/decisions/` (ADRs)**: una nota corta por decisión importante (contexto, decisión, alternativas descartadas). Evita que una sesión futura "deshaga" una decisión sin saber por qué se tomó.
- **`docs/glossary.md`**: glosario de dominio español ↔ código (fecha = `event`, revisor técnico = `tech_inspector`, juego de neumáticos = `tire_set`, comunicado = `bulletin`…).
- **`docs/privacy/`**: registro de tratamiento y política de datos (11.1).
- `CLAUDE.md` específicos por carpeta cuando un módulo tenga reglas propias (p.ej. `src/domain/scoring/CLAUDE.md`).

### 12.2 Estructura del código
- **Código en inglés, interfaz en español** (textos de UI centralizados para permitir i18n futuro).
- **Organización por módulo de dominio** (no por tipo técnico):
  ```
  src/
    domain/          # lógica pura, sin React ni Supabase, 100% testeada
      tires/  scoring/  permissions/  equipment/  inspection/
    features/        # UI + casos de uso por módulo
      registration/  tech-inspection/  post-session/  documents/  admin/
    data/            # repositorios (interfaz) + implementaciones (mock | supabase)
    ui/              # componentes visuales compartidos
  supabase/
    migrations/      # SQL versionado, una migración por cambio
    tests/           # tests de RLS
    seed/            # datos de demo (CRS)
  ```
- **Reglas de negocio como funciones puras** en `domain/` (`validateTireMarking`, `computeStandings`, `hasPermission`): fáciles de leer, testear y modificar sin efectos colaterales.
- **Una sola fuente de verdad para tipos:** esquemas **Zod** para configuración y formularios; **tipos generados desde Supabase** para la BD. Nada de tipos duplicados a mano.
- **TypeScript estricto** (`strict: true`, sin `any`), ESLint + Prettier.
- Archivos y funciones **pequeños y con nombres explícitos**; comentarios que explican el **porqué** (referenciando el artículo del reglamento cuando aplique, p.ej. `// Reglamento CRS 10.3`).
- **Patrones repetibles:** agregar una regla de puntaje, un permiso o un tipo de documento siempre se hace igual (registrar en el catálogo + implementar + test). Documentar el "cómo" en `CLAUDE.md`.
- Evitar abstracciones mágicas y metaprogramación: el código obvio es más fácil de modificar para un agente.

### 12.3 Verificación automática (el agente se revisa a sí mismo)
- **Un solo comando `npm run check`** que corre typecheck + lint + tests unitarios + tests de RLS. Claude Code debe ejecutarlo antes de dar por terminada cualquier tarea.
- **Los tests son la especificación ejecutable:** cada fila de la tabla 7.1 (neumáticos) y cada bloque de 6.7 (puntaje) tiene su test con nombre descriptivo en español del caso de negocio.
- **CI en GitHub Actions** que corre `check` en cada push/PR y bloquea el merge si falla.
- **Datos de demo reproducibles** (`db:seed`) para probar flujos manualmente.

### 12.4 Flujo de testing obligatorio (test-first)

**Regla:** ninguna funcionalidad se implementa sin que antes existan sus tests. El flujo vive en el repositorio (no en el prompt de cada sesión), para que toda sesión futura lo siga igual.

**Ciclo por funcionalidad:**
1. **Criterios de aceptación** escritos antes de programar, en formato *Dado / Cuando / Entonces*, en `docs/features/<modulo>.md` (derivados de esta SPEC). Ej.: *Dado un piloto con juego activo de F4, cuando en F5 (continuación) se escanea un neumático distinto, entonces la marcación queda bloqueada con el mensaje de la regla 10.3.*
2. **Escribir los tests primero** a partir de esos criterios y verificar que **fallan** (rojo).
3. **Implementar** lo mínimo para que pasen (verde).
4. **Refactorizar** con los tests en verde.
5. Correr `npm run check` completo; nada se da por terminado con tests fallando o desactivados.

**Pirámide de tests:**

| Nivel | Herramienta | Qué cubre | Cuándo es obligatorio |
|---|---|---|---|
| Unitario | Vitest | Lógica pura de `domain/` (neumáticos, puntaje, permisos, límites) | Siempre que se toque una regla de negocio |
| Seguridad de datos | pgTAP o tests de integración contra Supabase local | RLS: quién puede leer/escribir qué, incluido cross-organization | Toda tabla, política o permiso nuevo |
| Componentes | Vitest + Testing Library | Formularios, validaciones, estados de UI | Componentes con lógica |
| End-to-end | Playwright (viewport móvil y 14") | Flujos críticos completos: inscripción, marcación, revisión post-sesión, publicación de resultados | Cada flujo crítico nuevo o modificado |

**Cómo se hace cumplir (tres capas):**
1. **`CLAUDE.md`**: describe el ciclo anterior como regla inquebrantable. Es lo que toda sesión lee al empezar.
2. **Hooks de Claude Code** (`.claude/settings.json`): un hook al terminar la tarea (*Stop*) que ejecuta `npm run check` y obliga al agente a corregir si algo falla. La regla deja de depender de que el agente "se acuerde".
3. **CI en GitHub Actions**: corre `check` + e2e en cada PR y bloquea el merge si falla. Última barrera, independiente del agente.

**Verificación independiente:** quien escribe el código no debe ser el único que lo valida. Se define un **subagente revisor** en `.claude/agents/qa-reviewer.md` que, sin haber escrito el código, revisa cada funcionalidad contra sus criterios de aceptación: busca casos no cubiertos (bordes, permisos, datos inválidos), agrega tests faltantes y ejecuta el e2e. Para hitos importantes (antes de cada prueba en terreno), hacer además una **sesión aparte de QA** dedicada solo a probar.

**Cobertura:** objetivo ≥ 90% en `domain/` y 100% de las tablas con test de RLS. No perseguir cobertura en la UI; ahí mandan los e2e de flujos críticos.

### 12.5 Forma de trabajo
- Cambios en **ramas pequeñas** con PR y descripción de qué/por qué; commits descriptivos.
- **Checklist de PR** (en `.github/pull_request_template.md`): ¿tabla nueva con RLS y test? ¿se agregó un dato personal (justificarlo con 11.1)? ¿se actualizó `CLAUDE.md`/SPEC/ADR si cambió una decisión? ¿pasa `npm run check`?
- Antes de cambios grandes, el agente propone un plan y lo deja en el PR.
- **Comandos personalizados de Claude Code** en `.claude/commands/` para tareas repetitivas (p.ej. `/new-permission`, `/new-scoring-rule`, `/security-review`).

## 13. Preguntas abiertas
1. ¿Cómo se agrupan oficialmente los ciclos de neumáticos? ¿Lo define cada Reglamento Particular? (El modelo soporta override por fecha.)
2. ¿Quién crea las cuentas del staff? ¿Las personas del staff también son pilotos?
3. ¿Se cobra la inscripción por la plataforma o se mantiene la transferencia con validación manual?
4. Integración Speedhive/Orbits (Fase 4): ¿qué export entrega el cronometrista (CSV de Orbits, PDF)? ¿Speedhive tiene API accesible y bajo qué condiciones? ¿Quién es dueño de la cuenta Speedhive del evento (club, FADECH, cronometrista)? Pendiente: Sebastián consulta con el cronometraje e investigación técnica de APIs.
5. ~~Co-organización entre clubes~~ → **Resuelto**: una organización por entidad organizadora (ver 6.1).
6. Deslinde de responsabilidad: ¿se quiere firma digital en la inscripción?
7. Verificación de motores con EvaNet (Rotax): ¿solo registrar el resultado de la verificación o explorar integración?
8. Privacidad: validar con un abogado la política de datos, el tratamiento de menores y los roles responsable/encargado antes de marzo 2027.
9. ¿Mostrar el apellido completo de pilotos menores en vistas públicas, o solo la inicial?
