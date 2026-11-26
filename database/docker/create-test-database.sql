-- Runs once, when the PostgreSQL volume is created for the first time.
-- The end-to-end tests use their own database so they never touch local data.
CREATE DATABASE ciso_excursoes_test;
