-- ============================================================
-- Migración: limpia los "\_" sueltos (guion bajo escapado en LaTeX, usado
-- antes como marcador de "número faltante") y los reemplaza por "\square".
-- No toca subíndices legítimos como "a_n" o "T_{n+1}" (no tienen backslash).
-- Corre esto en el SQL Editor de tu proyecto de Supabase.
-- Segura de correr más de una vez.
-- ============================================================

update ejercicios
set enunciado = replace(enunciado, '\_', '\square')
where strpos(enunciado, '\_') > 0;
