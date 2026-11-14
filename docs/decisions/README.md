# Decisiones de arquitectura (ADRs)

Una nota corta por decisión importante: contexto, decisión, alternativas descartadas y consecuencias.
Sirven para que una sesión futura no "deshaga" una decisión sin saber por qué se tomó.
Para cambiar una decisión, agrega un ADR nuevo que la reemplace (no edites el anterior salvo para marcarlo "Reemplazado por ADR N").

| N°                                         | Decisión                                                          | Estado   |
| ------------------------------------------ | ----------------------------------------------------------------- | -------- |
| [0001](0001-stack-spa-supabase.md)         | SPA React + Vite + Supabase                                       | Aceptada |
| [0002](0002-hosting-y-routing.md)          | GitHub Pages (demo) → Cloudflare Pages (producción), HashRouter   | Aceptada |
| [0003](0003-rbac-permisos-atomicos.md)     | RBAC con permisos atómicos, roles configurables y staff por fecha | Aceptada |
| [0004](0004-capa-de-datos-repositorios.md) | Capa `data/` con repositorios (mock / supabase)                   | Aceptada |
| [0005](0005-minimizacion-de-datos.md)      | Minimización de datos personales                                  | Aceptada |
| [0006](0006-tipos-a-mano-en-fase-0.md)     | Tipos a mano en Fase 0, generados desde Supabase en Fase 1        | Aceptada |
| [0007](0007-windows-run-bin.md)            | Lanzador `run-bin.mjs` para Vitest/Vite/Playwright en Windows     | Aceptada |
