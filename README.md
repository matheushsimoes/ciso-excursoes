# Ciso Excursões

Excursion management system built for Ciso Excursões, a family-run bus excursion business in Brazil.

The goal is to replace the spreadsheets currently used to run the business with a single web application that centralizes the whole operation, from passenger sign-up to the financial result of each trip.

> 🇧🇷 *Sistema de gestão de excursões desenvolvido para a Ciso Excursões, substituindo o controle em planilhas por uma aplicação web. A documentação de domínio e requisitos está em português, em `docs/`.*

## Scope

The system is designed to manage:

- Excursions and excursion types
- Passengers and their participation in excursions
- Transport and seat allocation
- Hotels and accommodation
- Activities and tickets
- Payments, cancellations and refunds
- Expenses and financial results
- Operational reports

## Tech stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (ES modules) |
| Backend | Node.js, NestJS |
| Database | PostgreSQL 16, TypeORM, versioned SQL migrations |
| Validation | class-validator, class-transformer |
| Testing | Jest (unit), Supertest (end-to-end against a real database) |
| Tooling | Docker Compose, oxlint, Prettier |

## Architecture

The application is a **modular monolith**: each business area (for example `person` and `excursion`) is a self-contained NestJS module with its own domain logic, DTOs, entities, service and controller. Persistence sits behind a repository interface with a TypeORM implementation, so domain rules do not depend on the ORM.

The monolith can be split later if real needs for scale or module independence appear, without paying the cost of distributed systems up front.

Key design decisions are recorded as ADRs in [`docs/architecture/decisions/`](docs/architecture/decisions/), including:

- [ESM module system](docs/architecture/decisions/0001-esm-module-system.md)
- [Business dates stored as strings](docs/architecture/decisions/0002-business-dates-as-strings.md), to avoid time zone drift
- [Money as decimal strings](docs/architecture/decisions/0003-money-as-decimal-strings.md), to avoid floating-point rounding errors

## Engineering principles

- **Domain before implementation.** Business rules are defined and documented before the features that implement them.
- **Documentation as the source of truth.** Business and architecture decisions live in the repository, versioned with the code.
- **Incremental evolution.** The system is built first as a working product for one real business, avoiding unnecessary complexity.

## Project structure

```
backend/              NestJS application
  src/
    person/           Passengers and people
    excursion/        Excursions and excursion types
    database/         TypeORM configuration
    common/           Shared validators and utilities
  test/               End-to-end tests
database/migrations/  Versioned SQL migrations
docs/
  requirements/       Business rules and use cases
  domain/             Domain model and decisions
  architecture/       ADRs and diagrams
  changelog.md        Notable changes
```

## Running locally

Requirements: Node.js (current LTS) and Docker.

```bash
cd backend

# Start PostgreSQL
docker compose up -d

# Configure the connection string
cp .env.example .env
# DATABASE_URL="postgresql://ciso:ciso@localhost:5432/ciso_excursoes"

# Apply the SQL migrations in database/migrations/ in order, then:
npm install
npm run start:dev
```

## Tests

```bash
cd backend
npm run test       # unit tests
npm run test:e2e   # end-to-end tests (uses .env.test and resets the database)
npm run test:cov   # coverage
```

## Status

Under active development. The `person` and `excursion` modules are implemented with REST endpoints for creating, listing, fetching and updating records. The remaining areas in the scope above are planned.
