-- ============================================================
-- Migración: tipos de interacción + reclasificación de ejercicios existentes
-- Corre esto en el SQL Editor de tu proyecto de Supabase.
-- Segura de correr aunque las columnas ya existan o corras esto más de una vez.
-- ============================================================

-- 1. Agrega las columnas que faltan en "ejercicios"
alter table ejercicios
  add column if not exists tipo_interaccion text check (tipo_interaccion in (
    'recta_numerica','plano_cartesiano','figura_geometrica','grafica_funcion',
    'relleno_blancos','arrastrar_emparejar','opcion_multiple_visual'
  )),
  add column if not exists parametros jsonb;

-- 2. Reclasifica los ejercicios de "ubicar en la recta numérica" que ya
--    estaban guardados con el flujo de texto libre (de antes de que existiera
--    RectaNumericaInteractiva), sin necesidad de volver a subir el PDF.
update ejercicios
set
  tipo_interaccion = 'recta_numerica',
  parametros = jsonb_build_object('min', -10, 'max', 10, 'valores', jsonb_build_array(-7, 3, 0, -2, 6))
where enunciado ilike 'Ubica en una recta numérica los siguientes números%'
  and tipo_interaccion is null;
