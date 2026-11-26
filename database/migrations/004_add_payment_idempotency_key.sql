-- ============================================================
-- Migration: 004
-- Description: Idempotency key for payments.
--
-- The client sends an Idempotency-Key with each payment request.
-- Retrying the same request (double click, network retry) returns
-- the payment already registered instead of charging twice.
-- ============================================================

ALTER TABLE payment
    ADD COLUMN idempotency_key VARCHAR(100);

CREATE UNIQUE INDEX uq_payment_idempotency_key
    ON payment (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
