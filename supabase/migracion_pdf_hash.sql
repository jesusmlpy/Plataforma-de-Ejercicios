-- ============================================================
-- Migración: no reprocesar el mismo PDF dos veces
-- Corre esto en el SQL Editor de tu proyecto de Supabase.
-- Segura de correr aunque la columna ya exista.
-- ============================================================

alter table temas
  add column if not exists pdf_hash text unique;
