-- ============================================================
-- Migration: 003
-- Description: Records when and why a participation was cancelled.
--
-- Cancelling keeps the participation row (RN43); these columns keep
-- the operational history of the cancellation itself.
-- ============================================================

ALTER TABLE participation
    ADD COLUMN cancelled_at TIMESTAMPTZ,
    ADD COLUMN cancellation_reason VARCHAR(255);

ALTER TABLE participation
    ADD CONSTRAINT ck_participation_cancelled_at
        CHECK (
            (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
            OR (status = 'ACTIVE' AND cancelled_at IS NULL)
        );
