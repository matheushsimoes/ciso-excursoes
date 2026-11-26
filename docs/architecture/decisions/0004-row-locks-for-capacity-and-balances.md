# 0004 — Enforce capacity and balance rules with row locks

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Several business rules depend on data that two requests can change at the same
time:

- a vehicle cannot carry more passengers than its capacity (RN19), and a seat
  belongs to one passenger only (RN17);
- a room cannot exceed its capacity (RN25);
- a participant buys at most one ticket type per activity (RN32);
- a payment cannot exceed the outstanding balance (RN58), and refunds cannot
  exceed the payment (RN59).

Checking these rules in application code with a plain `SELECT` and then writing
is a classic check-then-act race: two requests read the same "1 seat left" and
both succeed. Ciso often registers payments from his phone while a family member
does the same on the computer, so this is not theoretical.

## Decision

Each rule is checked **inside a database transaction, after locking the row that
represents the limited resource** with `SELECT ... FOR UPDATE`:

| Rule | Locked row |
| --- | --- |
| Vehicle capacity, seat | `excursion_vehicle` (and the participation being moved) |
| Room capacity | `room` |
| One ticket type per activity | `participation` |
| Payment ≤ balance | the paid `participation` or `ticket_purchase` |
| Refund ≤ payment | `payment` |

The rule itself stays a pure function in the module's `domain/` folder (for
example `assertCanAssignTransport`, `assertCanPay`) and is unit-tested without a
database. The repository runs it as a callback inside the transaction, after the
lock and the fresh read.

Unique constraints remain the last line of defence (seat per vehicle, person per
excursion, idempotency key). PostgreSQL error `23505` is translated to
`409 Conflict` by `isUniqueViolation`.

## Options considered

- **Check in application code only:** simple, but wrong under concurrency.
- **`SERIALIZABLE` isolation:** correct, but every conflicting transaction fails
  and must be retried by the caller; harder to explain and to test.
- **Optimistic locking with a version column:** good for "last write wins"
  edits, awkward for counting rows (capacity) and needs schema changes.
- **Pessimistic row locks (`FOR UPDATE`):** correct, local to the operation and
  cheap at this scale. Chosen.

## Consequences

- Concurrent requests on the same resource are serialized; others are not
  affected. At the expected volume (tens of passengers per trip) the wait is
  negligible.
- Locks are always taken in the same order (participation before vehicle or
  room) to avoid deadlocks.
- End-to-end tests fire parallel requests (for example, two passengers for the
  last seat, two identical payments) and assert that exactly one succeeds.
