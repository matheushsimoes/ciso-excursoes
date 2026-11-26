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

## What it does

| Area | Highlights |
| --- | --- |
| Dashboard | Money still to receive, upcoming departures with seats sold |
| Excursions | Day trips and overnight trips, status lifecycle (draft → open → confirmed → in progress → finished, or cancelled) |
| Passengers | Individual price per passenger, cancellation, replacement, full history per person |
| Transport | Bus types, several buses per trip, interactive seat map |
| Accommodation | Hotels and rooms per trip, occupancy, rooms that block confirmation when someone has no bed |
| Activities | Ticket types with frozen sale price, demand vs. tickets bought from suppliers |
| Finance | Payments with idempotency keys, refunds, expenses, realized and projected result |
| Reports | Passenger list with age at departure, CSV export for travel insurance, who still owes |

The interface is in Portuguese, responsive (phone and desktop) and printable.

## Tech stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (ES modules) |
| Backend | Node.js 24, NestJS 12 |
| Database | PostgreSQL 16, TypeORM, versioned SQL migrations |
| Frontend | Plain HTML, CSS and ES modules served by the API (no build step) |
| Validation | class-validator, class-transformer |
| Testing | Jest (unit), Supertest (end-to-end against a real database, including concurrency tests) |
| Tooling | Docker, Docker Compose, GitHub Actions, oxlint, Prettier |

## Architecture

The application is a **modular monolith**. Each business area is a self-contained NestJS module with its own domain rules, DTOs, entities, repository, service and controller:

```
person ─┐
excursion ─┼─ participation ─┬─ transport
           │                 ├─ accommodation
           │                 ├─ activity
           │                 └─ finance ── report
```

- **Domain rules are pure functions** (for example `assertCanPay`, `assertCanAssignTransport`) with unit tests that need no database.
- **Repository per module**: an abstract class is the injection token; the TypeORM implementation uses raw SQL where it is clearer (views, aggregates).
- **Concurrency-safe rules**: capacity, seat, balance and refund checks run inside a transaction after a row lock (`SELECT ... FOR UPDATE`).
- **Money** is a decimal string in the API and integer cents in calculations. **Business dates** are `YYYY-MM-DD` strings.
- **Payments are append-only**: corrections are refunds; duplicates are prevented with the `Idempotency-Key` header.
- Balances and financial results are **always calculated**, never stored.

Decisions are recorded as ADRs in [`docs/architecture/decisions/`](docs/architecture/decisions/):

| ADR | Decision |
| --- | --- |
| [0001](docs/architecture/decisions/0001-esm-module-system.md) | ESM module system |
| [0002](docs/architecture/decisions/0002-business-dates-as-strings.md) | Business dates as strings |
| [0003](docs/architecture/decisions/0003-money-as-decimal-strings.md) | Money as decimal strings |
| [0004](docs/architecture/decisions/0004-row-locks-for-capacity-and-balances.md) | Row locks for capacity and balance rules |
| [0005](docs/architecture/decisions/0005-immutable-payments-and-idempotency-keys.md) | Immutable payments and idempotency keys |
| [0006](docs/architecture/decisions/0006-static-frontend-served-by-the-api.md) | Static frontend served by the API |
| [0007](docs/architecture/decisions/0007-sql-migrations-with-a-minimal-runner.md) | SQL migrations with a minimal runner |

## Engineering principles

- **Domain before implementation.** Business rules are defined and documented before the features that implement them.
- **Documentation as the source of truth.** Business and architecture decisions live in the repository, versioned with the code.
- **Incremental evolution.** The system is built first as a working product for one real business, avoiding unnecessary complexity.

## Project structure

```
backend/                 NestJS application
  src/
    person/ excursion/ participation/ transport/
    accommodation/ activity/ finance/ report/
    health/              GET /health (database connectivity)
    common/              Money, database errors, validators
  scripts/
    migrate.mjs          Applies pending SQL migrations
    seed-demo.mjs        Creates demo data through the API
    import-hotel-sheet.mjs  Imports an excursion from the hotel spreadsheet (CSV)
    imports/             Import configuration per excursion
  data/                  Spreadsheets with personal data (ignored by git)
  test/                  End-to-end tests
frontend/                Web interface (served by the API)
database/
  migrations/            Versioned SQL migrations
  docker/                PostgreSQL init script (test database)
  scripts/               Local database reset
docs/
  requirements/          Business rules and use cases
  domain/                Domain model and decisions
  architecture/          ADRs and diagrams
  changelog.md           Notable changes
Dockerfile               Production image (migrations run on start)
docker-compose.yml       PostgreSQL + app
```

## Running

### Everything with Docker

Requirements: Docker.

```bash
docker compose up --build
```

Open http://localhost:3000. Migrations are applied automatically when the app starts.

To load demo data (two excursions, twelve people, payments, rooms and tickets) into an empty database:

```bash
docker compose exec app node scripts/seed-demo.mjs
```

### Importing an excursion from the hotel spreadsheet

Export the "HOTEL GERAL" sheet as CSV (`;` separator) to `backend/data/` — a folder ignored by git, because the sheet has personal data — and run, with the app running:

```bash
cd backend
node scripts/import-hotel-sheet.mjs scripts/imports/rio-2027.json data/rio-2027.csv \
  --payments data/rio-2027-pgtos.csv --dry-run   # preview
node scripts/import-hotel-sheet.mjs scripts/imports/rio-2027.json data/rio-2027.csv \
  --payments data/rio-2027-pgtos.csv
```

`--payments` reads the "PGTOS" sheet (also exported as CSV): "TOTAL A PAGAR" becomes the contracted amount (empty, 0 or "-" means courtesy) and each monthly value becomes a payment on day 1 of that month. The script compares each balance with the "FALTA" column at the end.

The configuration file holds the excursion, buses, hotel, room costs, package price per room type, courtesy rooms and activities. The script prints warnings for data to review (future birth dates, invalid e-mails, incomplete CEPs).

### Development

Requirements: Node.js 24 and Docker.

```bash
# PostgreSQL only
docker compose up -d postgres

cd backend
cp .env.example .env
# DATABASE_URL="postgresql://ciso:ciso@localhost:5432/ciso_excursoes"

npm install
npm run migrate
npm run start:dev      # http://localhost:3000
npm run seed:demo      # optional, in another terminal
```

## Tests

The PostgreSQL container creates the `ciso_excursoes_test` database the first time its volume is created.

```bash
cd backend
DATABASE_URL=postgresql://ciso:ciso@localhost:5432/ciso_excursoes_test npm run migrate

npm run typecheck
npm run test       # unit tests
npm run test:e2e   # end-to-end tests (uses .env.test and resets the data between tests)
npm run test:cov   # coverage
```

CI runs lint, typecheck, build, unit tests, migrations and end-to-end tests on every push.

## API overview

All endpoints return JSON. Validation errors return `400`, missing records `404`, broken business rules `409`.

| Resource | Endpoints |
| --- | --- |
| People | `GET/POST /persons`, `GET/PATCH /persons/:id`, `GET /persons/:id/participations` |
| Excursions | `GET/POST /excursions`, `GET/PATCH /excursions/:id`, `PATCH /excursions/:id/status` |
| Participations | `GET/POST /excursions/:id/participations`, `GET /participations/:id`, `PATCH .../contracted-amount`, `POST .../cancel`, `POST .../replace` |
| Transport | `/bus-types`, `GET /excursions/:id/transport`, `POST /excursions/:id/buses`, `PATCH/DELETE /excursion-buses/:id`, `GET /excursion-vehicles/:id/seats`, `PATCH /participations/:id/transport` |
| Accommodation | `/hotels`, `GET /excursions/:id/accommodation`, `POST /excursions/:id/hotels`, `POST /excursion-hotels/:id/rooms`, `PATCH/DELETE /rooms/:id`, `PATCH /participations/:id/room` |
| Activities | `/excursions/:id/activities`, `/activities/:id/ticket-types`, `/participations/:id/ticket-purchases`, `GET /excursions/:id/ticket-demand`, `/suppliers`, `/ticket-types/:id/supplier-purchases` |
| Finance | `POST /payments` (`Idempotency-Key` header), `POST /payments/:id/refunds`, `GET /participations/:id/statement`, `/excursions/:id/expenses`, `GET /excursions/:id/financial-summary` |
| Reports | `GET /dashboard`, `GET /excursions/:id/reports/passengers?format=csv` |
| Health | `GET /health` |

The full mapping from use cases to endpoints and screens is in [`docs/requirements/use-cases.md`](docs/requirements/use-cases.md#17-implementação).

## Status

All MVP use cases are implemented. Planned next steps:

- **Authentication** before exposing the app on the internet.
- **Deployment on AWS** (container + managed PostgreSQL), with backups.
- **Observability**: structured logs and request metrics.
- Online payments and a participant portal (UC48, UC49).
