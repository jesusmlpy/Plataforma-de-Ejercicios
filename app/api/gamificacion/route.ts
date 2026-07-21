import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidorConSesion } from "@/lib/supabaseServerSesion";

// Puntos otorgados por ejercicio correcto, según su nivel. Se calculan aquí
// (no en el cliente) para que nadie pueda mandar un valor de puntos arbitrario.
const PUNTOS_POR_NIVEL: Record<string, number> = {
  basico: 5,
  intermedio: 10,
  avanzado: 15,
  dificil: 20,
  universitario: 30,
};

// ============================================================
// POST /api/gamificacion
// Recibe: { nivel: string, acierto: boolean }
// Actualiza puntos_totales, racha_actual y racha_maxima del alumno
// autenticado. Es gamificación global de la plataforma, no por ejercicio:
// vive en "perfiles", no en "ejercicios" ni "intentos".
// Si no hay sesión, no hace nada (se puede seguir practicando sin login,
// solo no se guarda el progreso).
// ============================================================
export async function POST(req: NextRequest) {
  const { nivel, acierto } = await req.json();

  const supabase = crearClienteServidorConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true, sinSesion: true });
  }

  const { data: perfil, error: errorLectura } = await supabase
    .from("perfiles")
    .select("puntos_totales, racha_actual, racha_maxima")
    .eq("id", user.id)
    .single();

  if (errorLectura || !perfil) {
    return NextResponse.json({ error: "No se pudo leer el perfil." }, { status: 500 });
  }

  const puntosGanados = acierto ? PUNTOS_POR_NIVEL[nivel] ?? 0 : 0;
  const racha_actual = acierto ? perfil.racha_actual + 1 : 0;
  const racha_maxima = Math.max(perfil.racha_maxima, racha_actual);
  const puntos_totales = perfil.puntos_totales + puntosGanados;

  const { error: errorEscritura } = await supabase
    .from("perfiles")
    .update({ puntos_totales, racha_actual, racha_maxima })
    .eq("id", user.id);

  if (errorEscritura) {
    return NextResponse.json({ error: "No se pudo actualizar el perfil." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, puntosGanados, puntos_totales, racha_actual, racha_maxima });
}
