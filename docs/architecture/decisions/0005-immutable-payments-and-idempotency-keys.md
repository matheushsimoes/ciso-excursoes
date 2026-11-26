# 0005 — Immutable payments and idempotency keys

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Payments are the most sensitive data in the system: they are money that a real
person handed over to Ciso. Two problems need a clear answer:

1. **Corrections.** A payment registered with the wrong amount, or money given
   back after a cancellation, must not erase what happened.
2. **Duplicates.** The app is used on mobile connections. A double tap or a
   retry after a timeout can send the same payment twice.

## Decision

**Payments are append-only.** There is no update or delete endpoint for
payments. Corrections and give-backs are recorded as `refund` rows linked to the
original payment, with date and reason (RN59). Balances are always calculated
from payments and refunds, never stored (RN41).

**Every payment request carries an idempotency key** in the `Idempotency-Key`
header (the frontend generates one with `crypto.randomUUID()` each time the
payment dialog opens):

- first request: the payment is created and the key is stored in
  `payment.idempotency_key` (unique index) → `201 Created`;
- same key, same payload: the stored payment is returned → `200 OK` with
  `Idempotent-Replayed: true`;
- same key, different payload: → `422 Unprocessable Entity`;
- two identical requests at the same instant: the unique index makes one of them
  fail, and the repository answers it with the stored payment.

The key is optional in the API so scripts and tests can omit it, but the
frontend always sends it.

## Options considered

- **Editable payments with an audit table:** keeps history, but the "current"
  value can still be changed and the audit must be read to understand a balance.
- **Client-side protection only (disable the button):** does not cover network
  retries.
- **Separate idempotency table with stored responses** (Stripe style): more
  general, more moving parts than this system needs. Storing the key on the
  payment row is enough because the response is the payment itself.

## Consequences

- The statement of a participation is a faithful ledger: payments, refunds and
  the resulting balance.
- A refund larger than the remaining refundable amount is rejected with
  `409 Conflict`; concurrent refunds are serialized by a row lock (ADR 0004).
- Online payments (UC49) can reuse the same flow later: the gateway's event id
  becomes the idempotency key.
