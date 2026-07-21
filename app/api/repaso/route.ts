import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidorConSesion } from "@/lib/supabaseServerSesion";

// Días hasta la próxima revisión según la caja Leitner en la que quede el
// ejercicio después de responder (no según la caja en la que estaba antes).
const DIAS_POR_CAJA: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 15,
  5: 30,
};

// ============================================================
// POST /api/repaso
// Recibe: { ejercicioId: string, acierto: boolean }
// Sistema de repetición espaciada tipo Leitner: si el alumno acierta, el
// ejercicio sube de caja (más lejos la próxima revisión); si falla, vuelve
// a la caja 1 (se repasa mañana). No es un log de intentos — es el estado
// actual de repaso de ese par alumno-ejercicio ("repaso_programado").
// Si no hay sesión, no hace nada (la repetición espaciada requiere login).
// ============================================================
export async function POST(req: NextRequest) {
  const { ejercicioId, acierto } = await req.json();

  const supabase = crearClienteServidorConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true, sinSesion: true });
  }

  const { data: actual } = await supabase
    .from("repaso_programado")
    .select("caja_leitner")
    .eq("alumno_id", user.id)
    .eq("ejercicio_id", ejercicioId)
    .maybeSingle();

  const cajaActual = actual?.caja_leitner ?? 1;
  const cajaNueva = acierto ? Math.min(cajaActual + 1, 5) : 1;
  const proximaRevision = new Date(
    Date.now() + DIAS_POR_CAJA[cajaNueva] * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase.from("repaso_programado").upsert(
    {
      alumno_id: user.id,
      ejercicio_id: ejercicioId,
      caja_leitner: cajaNueva,
      proxima_revision: proximaRevision,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "alumno_id,ejercicio_id" }
  );

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar el repaso." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, caja: cajaNueva, proximaRevision });
}
