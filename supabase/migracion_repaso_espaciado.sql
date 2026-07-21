-- ============================================================
-- Migración: repetición espaciada (sistema Leitner)
-- Corre esto en el SQL Editor de tu proyecto de Supabase.
-- Segura de correr aunque la tabla ya exista o corras esto más de una vez.
-- ============================================================

create table if not exists repaso_programado (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid references perfiles(id) on delete cascade,
  ejercicio_id uuid references ejercicios(id) on delete cascade,
  caja_leitner int not null default 1 check (caja_leitner between 1 and 5),
  proxima_revision timestamptz not null default now(),
  actualizado_en timestamptz default now(),
  unique (alumno_id, ejercicio_id)
);

create index if not exists idx_repaso_alumno_fecha on repaso_programado(alumno_id, proxima_revision);

alter table repaso_programado enable row level security;

drop policy if exists "alumno_ve_su_repaso" on repaso_programado;
create policy "alumno_ve_su_repaso" on repaso_programado for select
  using (auth.uid() = alumno_id);

drop policy if exists "alumno_crea_su_repaso" on repaso_programado;
create policy "alumno_crea_su_repaso" on repaso_programado for insert
  with check (auth.uid() = alumno_id);

drop policy if exists "alumno_actualiza_su_repaso" on repaso_programado;
create policy "alumno_actualiza_su_repaso" on repaso_programado for update
  using (auth.uid() = alumno_id);
