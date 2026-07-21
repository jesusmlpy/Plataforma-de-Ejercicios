-- ============================================================
-- Esquema de base de datos: Plataforma de Ejercicios
-- Ejecuta esto en el SQL Editor de tu proyecto de Supabase
-- ============================================================

-- Los roles se manejan con una tabla de perfiles ligada a auth.users
create table if not exists perfiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text,
  rol text not null default 'alumno' check (rol in ('alumno','profesor')),
  creado_en timestamptz default now()
);

-- Cada PDF subido genera un "tema" (ej. "Números con signo", "Funciones cuadráticas")
create table if not exists temas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  creado_por uuid references perfiles(id),
  pdf_url text,                 -- referencia al archivo original en Supabase Storage
  creado_en timestamptz default now()
);

-- Ejercicios extraídos automáticamente del PDF por la API de Claude
create table if not exists ejercicios (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid references temas(id) on delete cascade,
  numero int,                            -- posición dentro del tema (1, 2, 3...)
  nivel text check (nivel in ('basico','intermedio','avanzado','dificil','universitario')),
  enunciado text not null,
  tipo_respuesta text check (tipo_respuesta in ('numerica','abierta','opcion_multiple')),
  respuesta_correcta text,               -- null si es de tipo "abierta" (requiere revisión)
  opciones jsonb,                        -- solo si tipo_respuesta = 'opcion_multiple'
  creado_en timestamptz default now()
);

-- Intentos y progreso de cada alumno
create table if not exists intentos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid references perfiles(id) on delete cascade,
  ejercicio_id uuid references ejercicios(id) on delete cascade,
  respuesta_alumno text,
  es_correcto boolean,                   -- null mientras no se ha calificado (ej. abiertas)
  intentado_en timestamptz default now()
);

-- ---------- Crear perfil automáticamente al registrarse ----------
-- Todo usuario nuevo entra como "alumno". Para volver a alguien "profesor",
-- actualiza su fila manualmente desde el Table Editor de Supabase, o con:
--   update perfiles set rol = 'profesor' where id = 'uuid-del-usuario';
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (new.id, new.raw_user_meta_data->>'full_name', 'alumno');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ---------- Índices útiles ----------
create index if not exists idx_ejercicios_tema on ejercicios(tema_id);
create index if not exists idx_intentos_alumno on intentos(alumno_id);
create index if not exists idx_intentos_ejercicio on intentos(ejercicio_id);

-- ---------- Row Level Security (RLS) ----------
alter table perfiles enable row level security;
alter table temas enable row level security;
alter table ejercicios enable row level security;
alter table intentos enable row level security;

-- Cualquier usuario autenticado puede leer temas y ejercicios
create policy "lectura_temas" on temas for select using (true);
create policy "lectura_ejercicios" on ejercicios for select using (true);

-- Solo profesores pueden crear/editar temas y ejercicios
create policy "profesores_crean_temas" on temas for insert
  with check (exists (select 1 from perfiles where id = auth.uid() and rol = 'profesor'));

create policy "profesores_crean_ejercicios" on ejercicios for insert
  with check (exists (select 1 from perfiles where id = auth.uid() and rol = 'profesor'));

-- Cada alumno solo ve y crea sus propios intentos
create policy "alumno_ve_sus_intentos" on intentos for select
  using (auth.uid() = alumno_id);

create policy "alumno_crea_sus_intentos" on intentos for insert
  with check (auth.uid() = alumno_id);

-- Cada quien ve y edita solo su propio perfil (los profesores se asignan manualmente por ti desde el dashboard de Supabase)
create policy "perfil_propio_lectura" on perfiles for select using (auth.uid() = id);
create policy "perfil_propio_edicion" on perfiles for update using (auth.uid() = id);

-- ============================================================
-- Migración: tipos de interacción (roadmap en el README → "Arquitectura:
-- tipos de interacción"). tipo_interaccion decide QUÉ COMPONENTE VISUAL usa
-- el alumno para responder, independiente de tipo_respuesta (que decide
-- cómo se califica) — por ahora solo 'recta_numerica' tiene componente
-- construido; el resto del catálogo es roadmap.
-- Además reclasifica los ejercicios de "ubicar en la recta numérica" que ya
-- estaban guardados con el flujo de texto libre (de antes de que existiera
-- este componente), para que usen RectaNumericaInteractiva sin re-subir el PDF.
-- Segura de correr aunque las columnas ya existan o corras esto de nuevo.
-- ============================================================
alter table ejercicios
  add column if not exists tipo_interaccion text check (tipo_interaccion in (
    'recta_numerica','plano_cartesiano','figura_geometrica','grafica_funcion',
    'relleno_blancos','arrastrar_emparejar','opcion_multiple_visual'
  )),
  add column if not exists parametros jsonb;

update ejercicios
set
  tipo_interaccion = 'recta_numerica',
  parametros = jsonb_build_object('min', -10, 'max', 10, 'valores', jsonb_build_array(-7, 3, 0, -2, 6))
where enunciado ilike 'Ubica en una recta numérica los siguientes números%'
  and tipo_interaccion is null;

-- ============================================================
-- Migración: gamificación global (puntos, racha, nivel del alumno)
-- No es por ejercicio ni por tema — vive en "perfiles" y suma en toda
-- la plataforma. El nivel no se guarda, se calcula en el front a partir
-- de puntos_totales (ver components/InsigniaGamificacion.tsx).
-- Segura de correr aunque las columnas ya existan.
-- ============================================================
alter table perfiles
  add column if not exists puntos_totales int not null default 0,
  add column if not exists racha_actual int not null default 0,
  add column if not exists racha_maxima int not null default 0;

-- ============================================================
-- Migración: pista por ejercicio — consejo breve y opcional (colapsado por
-- defecto en la UI) que indica cómo debe expresarse la respuesta y da una
-- ayuda conceptual para resolverlo, sin revelar el resultado.
-- Segura de correr aunque la columna ya exista.
-- ============================================================
alter table ejercicios
  add column if not exists pista text;
