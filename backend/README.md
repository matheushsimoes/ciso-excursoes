# Ciso Excursões: Backend

REST API for the Ciso Excursões management system, built with NestJS, TypeORM and PostgreSQL.

For the product overview, scope and architecture decisions, see the [main README](../README.md).

## Module layout

Each business area is a self-contained NestJS module. `person` and `excursion` follow the same structure:

```
src/<module>/
  domain/                         Domain model and business rules
  dto/                            Request DTOs, validated with class-validator
  entities/                       TypeORM entities
  <module>.repository.ts          Repository interface used by the service
  typeorm-<module>.repository.ts  TypeORM implementation of that interface
  <module>.service.ts             Application logic
  <module>.controller.ts          REST endpoints
  <module>.module.ts              Wiring
```

Shared validators for business dates and money values live in `src/common/validation`. The TypeORM connection is configured in `src/database`. Schema synchronization is turned off: the schema comes only from the SQL migrations in `../database/migrations`.

## Endpoints

| Resource | Endpoints |
| --- | --- |
| People | `POST /persons` · `GET /persons` · `GET /persons/:id` · `PATCH /persons/:id` |
| Excursions | `POST /excursions` · `GET /excursions` · `GET /excursions/:id` · `PATCH /excursions/:id` |

## Setup

```bash
# Start PostgreSQL 16
docker compose up -d

# Configure the connection string
cp .env.example .env
# DATABASE_URL="postgresql://ciso:ciso@localhost:5432/ciso_excursoes"

# Apply the SQL migrations in ../database/migrations in order

npm install
npm run start:dev   # http://localhost:3000 (override with PORT)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Run in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | Lint with oxlint |
| `npm run format` | Format with Prettier |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:cov` | Unit test coverage |

## Tests

Unit tests sit next to the code they cover (`*.spec.ts`).

End-to-end tests in `test/` call the HTTP API through Supertest against a real PostgreSQL database. They:

- read the connection from `.env.test`, so point it to a separate test database;
- truncate every table between suites, so data from one test never leaks into another;
- run serially (`--runInBand`), because the suites share that database.

The project uses native ES modules, so Jest runs with `--experimental-vm-modules` and `ts-jest` in ESM mode.
