-- ============================================================
-- Migration: 006
-- Description: Personal details used by the business today
--              (nickname, RG and full address), all optional.
-- ============================================================

-- How Ciso knows the passenger ("Dico", "Marreco"); also searchable.
ALTER TABLE person ADD COLUMN nickname VARCHAR(60);

-- Identity card (RG) and issuing authority, required by some hotels and
-- by the travel insurance. The main document (CPF) stays in "document".
ALTER TABLE person ADD COLUMN rg VARCHAR(20);
ALTER TABLE person ADD COLUMN rg_issuer VARCHAR(20);

ALTER TABLE person ADD COLUMN address VARCHAR(200);
ALTER TABLE person ADD COLUMN neighborhood VARCHAR(100);
ALTER TABLE person ADD COLUMN city VARCHAR(100);
ALTER TABLE person ADD COLUMN state CHAR(2);
ALTER TABLE person ADD COLUMN postal_code VARCHAR(9);

CREATE INDEX idx_person_nickname_lower
    ON person (lower(nickname));
