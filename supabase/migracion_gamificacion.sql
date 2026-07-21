-- ============================================================
-- Migración: gamificación global (puntos, racha, nivel del alumno)
-- Corre esto en el SQL Editor de tu proyecto de Supabase.
-- Segura de correr aunque las columnas ya existan o corras esto más de una vez.
-- ============================================================

alter table perfiles
  add column if not exists puntos_totales int not null default 0,
  add column if not exists racha_actual int not null default 0,
  add column if not exists racha_maxima int not null default 0;
