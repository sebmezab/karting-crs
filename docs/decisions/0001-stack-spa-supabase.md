# ADR 0001 — SPA React + Vite + TypeScript con Supabase

**Fecha:** 14-11-2026 · **Estado:** Aceptada

## Contexto

Equipo mínimo, presupuesto casi cero hasta el lanzamiento (marzo 2027), necesidad de multi-tenant, tiempo real para
el staff en pista y un camino a apps nativas sin rediseño (SPEC §3).

## Decisión

- Frontend: React + Vite + TypeScript estricto + Tailwind CSS, empaquetado como **PWA**.
- Backend: **Supabase** (Postgres + Auth + Row Level Security + Realtime), sin servidor propio. Un solo proyecto
  multi-tenant (Pro cobra cómputo por proyecto).
- Apps nativas futuras: Capacitor envolviendo la misma web.

## Alternativas descartadas

- Backend propio (Node/Express): más código que operar y asegurar; RLS da la barrera de seguridad en la BD.
- Firebase: modelo documental menos apto para reglas relacionales (ciclos, staff por fecha, puntaje).
- Next.js/SSR: no se necesita; un sitio estático se aloja gratis y migra trivialmente.

## Consecuencias

- Como el frontend habla directo con la BD, **la única barrera real es RLS** (SPEC §11.2): toda tabla con políticas y tests.
- Supabase Free pausa el proyecto tras 7 días sin uso: aceptable para demo/pruebas, Pro para el campeonato.
