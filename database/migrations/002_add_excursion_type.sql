ALTER TABLE excursion
    ADD COLUMN type VARCHAR(20) NOT NULL;

ALTER TABLE excursion
    ADD CONSTRAINT ck_excursion_type
        CHECK (type IN ('DAY_TRIP', 'OVERNIGHT'));