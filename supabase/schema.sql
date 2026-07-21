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

-- ============================================================
-- Migración: repetición espaciada (sistema Leitner)
-- Una fila por (alumno, ejercicio) con la caja actual (1-5) y cuándo toca
-- repasarlo de nuevo. Se crea/actualiza cada vez que el alumno responde un
-- ejercicio, sin importar en qué página lo haya resuelto (ver
-- app/api/repaso/route.ts). No es un log de intentos (para eso ya existe
-- "intentos") — es el estado ACTUAL de repaso de cada par alumno-ejercicio.
-- Segura de correr aunque la tabla ya exista o corras esto de nuevo.
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

-- Cada alumno solo ve y modifica su propio calendario de repaso
drop policy if exists "alumno_ve_su_repaso" on repaso_programado;
create policy "alumno_ve_su_repaso" on repaso_programado for select
  using (auth.uid() = alumno_id);

drop policy if exists "alumno_crea_su_repaso" on repaso_programado;
create policy "alumno_crea_su_repaso" on repaso_programado for insert
  with check (auth.uid() = alumno_id);

drop policy if exists "alumno_actualiza_su_repaso" on repaso_programado;
create policy "alumno_actualiza_su_repaso" on repaso_programado for update
  using (auth.uid() = alumno_id);

-- ============================================================
-- Migración: racha que no penaliza el riesgo
-- nivel_maximo_dominado guarda el nivel más alto (1=básico ... 5=universitario)
-- en el que el alumno ha acertado alguna vez. Se usa en app/api/gamificacion
-- para decidir si un fallo resetea la racha: solo se resetea si el ejercicio
-- fallado es de nivel igual o menor al que ya domina: fallar algo MÁS DIFÍCIL
-- de lo que domina no le cuesta la racha.
-- Segura de correr aunque la columna ya exista.
-- ============================================================
alter table perfiles
  add column if not exists nivel_maximo_dominado int not null default 0;

-- ============================================================
-- Migración: no reprocesar el mismo PDF dos veces
-- pdf_hash guarda el sha256 del archivo subido; app/api/upload-pdf/route.ts
-- lo calcula antes de llamar a Claude y rechaza la subida si ya existe un
-- tema con el mismo hash. Nullable a propósito: los temas subidos antes de
-- esta migración no tienen hash, y no pasa nada — unique ignora los null.
-- Segura de correr aunque la columna ya exista.
-- ============================================================
alter table temas
  add column if not exists pdf_hash text unique;

-- ============================================================
-- Migración: limpia los "\_" sueltos (guion bajo escapado en LaTeX, usado
-- antes como marcador de "número faltante") y los reemplaza por "\square"
-- (casilla vacía estándar). No toca los guiones bajos de subíndices legítimos
-- como "a_n" o "T_{n+1}" — el patrón "\_" (con backslash) es distinto de un
-- subíndice normal, así que replace() no les afecta.
-- Segura de correr de nuevo (si ya no hay "\_", no cambia nada).
-- ============================================================
update ejercicios
set enunciado = replace(enunciado, '\_', '\square')
where strpos(enunciado, '\_') > 0;
