# 0006 — Static frontend served by the API, without a build step

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

The users are Ciso and his family. They need a responsive interface that works
on the phone and on the computer, in Portuguese, with large text and clear
labels. The project is developed by one person, who is also studying backend
engineering; the frontend must not become a second project to maintain.

## Decision

- The frontend is a single-page app written in **plain ES modules, HTML and
  CSS**, in `frontend/`. No framework, no bundler, no npm dependencies.
- It is **served by the NestJS app** as static files (`useStaticAssets`). One
  process, one port, one origin: no CORS and no separate deployment.
- Navigation uses a hash router (`#/excursoes/:id/transporte`), so a page reload
  never reaches an API route.
- All user content is escaped by a tagged template (`html`) to prevent HTML
  injection; markup is only inserted unescaped through an explicit `raw()`.
- API messages are in English (they are part of the API contract); the frontend
  translates the known ones to Portuguese.

## Options considered

- **React/Vue with Vite:** richer ecosystem, but adds a build pipeline,
  dependency upgrades and a second deployment for a small set of screens.
- **Server-side templates in Nest:** mixes presentation into the API modules.
- **Static ES modules:** modern browsers support everything needed (modules,
  `fetch`, `<dialog>`, CSS grid). Chosen.

## Consequences

- `docker compose up` delivers the whole product.
- The API stays a clean JSON API that another client (a mobile app, a
  participant portal) can use later.
- If the interface grows a lot, migrating to a framework is possible screen by
  screen, because all data access already goes through `js/api.js`.
