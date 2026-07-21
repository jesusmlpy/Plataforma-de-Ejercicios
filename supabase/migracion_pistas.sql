-- ============================================================
-- Migración: columna "pista" en ejercicios
-- Corre esto en el SQL Editor de tu proyecto de Supabase.
-- Segura de correr aunque la columna ya exista.
-- ============================================================

alter table ejercicios
  add column if not exists pista text;
