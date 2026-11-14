# ADR 0002 — GitHub Pages para la demo, Cloudflare Pages en producción; HashRouter

**Fecha:** 14-11-2026 · **Estado:** Aceptada

## Contexto

La demo (Fase 0) debe publicarse ya y gratis. GitHub Pages no soporta rutas de SPA ni cabeceras HTTP, y sus términos
no permiten SaaS comercial. Vercel Hobby prohíbe uso comercial.

## Decisión

- Demo y pruebas: **GitHub Pages** vía GitHub Actions (`.github/workflows/deploy-pages.yml`), repo `karting-crs`,
  servido en `/karting-crs/` → `base: '/karting-crs/'` en `vite.config.ts` (igual en dev, preview y build).
- Routing con **`HashRouter`** (`/#/ruta`): funciona en Pages sin trucos de `404.html`.
- Producción (antes de marzo 2027): **Cloudflare Pages** (gratis, ancho de banda ilimitado, dominio propio) con
  archivo `_headers` (CSP estricta, HSTS, `Permissions-Policy` con cámara solo en el propio origen).

## Alternativas descartadas

- `BrowserRouter` + `404.html` redirect: más frágil; se puede migrar al pasar a Cloudflare si se quieren URLs limpias.
- Vercel Hobby: prohíbe uso comercial.

## Consecuencias

- En la demo no hay cabeceras de seguridad (limitación de Pages): otra razón para migrar antes del lanzamiento.
- Si se cambia el nombre del repo, cambiar `base` en `vite.config.ts` y `baseURL` en `playwright.config.ts`.
