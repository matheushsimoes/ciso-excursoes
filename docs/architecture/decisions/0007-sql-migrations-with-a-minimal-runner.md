# 0007 — Versioned SQL migrations applied by a minimal runner

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

The schema is written by hand in `database/migrations/*.sql` (constraints,
partial indexes and checks are part of the business rules). Until now,
migrations were applied with a `psql` loop, which reapplies every file and does
not know what has already run. That is fine for a fresh test database, not for
a database with real data.

## Decision

`backend/scripts/migrate.mjs` applies the SQL files in name order and records
each applied file in a `schema_migrations` table. Each migration runs inside its
own transaction: if it fails, nothing from it is kept and the runner stops.

- `npm run migrate` locally and in CI;
- the Docker image runs it before starting the app, so a deploy always brings
  the schema up to date;
- applied migrations are never edited; changes are new files.

`synchronize` stays disabled in TypeORM: entities describe the schema, they do
not create it.

## Options considered

- **TypeORM migrations:** generated from entities, which would make the ORM the
  source of truth for constraints that are better written in SQL.
- **Flyway / dbmate:** mature, but an extra binary in CI and in the image for a
  feature that fits in about 100 lines.
- **Minimal runner:** chosen. It can be replaced by any of the above later,
  because the migrations are plain SQL.

## Consequences

- A database created before the runner existed has tables but no
  `schema_migrations`; the runner refuses to touch it and points to
  `database/scripts/reset-local-db.sh` (development only).
- There are no down migrations. Reverting is done with a new migration.
