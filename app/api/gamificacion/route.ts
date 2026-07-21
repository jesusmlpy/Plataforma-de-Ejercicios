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

// Orden de dificultad, usado para comparar el nivel del ejercicio contra
// nivel_maximo_dominado (ver más abajo). No reutilizamos PUNTOS_POR_NIVEL
// porque aquí lo que importa es el orden, no el puntaje.
const NIVEL_INDICE: Record<string, number> = {
  basico: 1,
  intermedio: 2,
  avanzado: 3,
  dificil: 4,
  universitario: 5,
};

// ============================================================
// POST /api/gamificacion
// Recibe: { nivel: string, acierto: boolean }
// Actualiza puntos_totales, racha_actual, racha_maxima y nivel_maximo_dominado
// del alumno autenticado. Es gamificación global de la plataforma, no por
// ejercicio: vive en "perfiles", no en "ejercicios" ni "intentos".
//
// La racha NO se resetea con cualquier fallo: solo se resetea si el ejercicio
// fallado es de nivel igual o menor al nivel más alto que el alumno ya domina
// (el nivel más alto en el que ha acertado alguna vez). Fallar algo MÁS
// DIFÍCIL de lo que ya domina no le cuesta la racha — el riesgo no se castiga.
//
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
    .select("puntos_totales, racha_actual, racha_maxima, nivel_maximo_dominado")
    .eq("id", user.id)
    .single();

  if (errorLectura || !perfil) {
    return NextResponse.json({ error: "No se pudo leer el perfil." }, { status: 500 });
  }

  const indiceEjercicio = NIVEL_INDICE[nivel] ?? 0;
  const puntosGanados = acierto ? PUNTOS_POR_NIVEL[nivel] ?? 0 : 0;
  const puntos_totales = perfil.puntos_totales + puntosGanados;

  let racha_actual = perfil.racha_actual;
  let nivel_maximo_dominado = perfil.nivel_maximo_dominado;

  if (acierto) {
    racha_actual = perfil.racha_actual + 1;
    nivel_maximo_dominado = Math.max(perfil.nivel_maximo_dominado, indiceEjercicio);
  } else if (indiceEjercicio > 0 && indiceEjercicio <= perfil.nivel_maximo_dominado) {
    // Falló algo de un nivel que ya domina (o más fácil) — sí cuenta.
    racha_actual = 0;
  }
  // Si falló algo más difícil de lo que domina, racha_actual se queda igual.

  const racha_maxima = Math.max(perfil.racha_maxima, racha_actual);

  const { error: errorEscritura } = await supabase
    .from("perfiles")
    .update({ puntos_totales, racha_actual, racha_maxima, nivel_maximo_dominado })
    .eq("id", user.id);

  if (errorEscritura) {
    return NextResponse.json({ error: "No se pudo actualizar el perfil." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, puntosGanados, puntos_totales, racha_actual, racha_maxima });
}
