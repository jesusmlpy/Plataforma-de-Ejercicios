-- ============================================================
-- Migración: racha que no penaliza el riesgo
-- Corre esto en el SQL Editor de tu proyecto de Supabase.
-- Segura de correr aunque la columna ya exista.
-- ============================================================

alter table perfiles
  add column if not exists nivel_maximo_dominado int not null default 0;
