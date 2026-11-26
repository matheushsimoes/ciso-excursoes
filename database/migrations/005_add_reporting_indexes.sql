-- ============================================================
-- Migration: 005
-- Description: Indexes used by searches and reports.
-- ============================================================

-- Person search by name (case-insensitive prefix/contains on small data sets).
CREATE INDEX idx_person_full_name_lower
    ON person (lower(full_name));

-- Active participants per excursion (lists, occupancy, financial reports).
CREATE INDEX idx_participation_excursion_status
    ON participation (excursion_id, status);

-- Expenses and supplier purchases listed by date.
CREATE INDEX idx_expense_excursion_date
    ON expense (excursion_id, expense_date);
