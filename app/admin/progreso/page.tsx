import { redirect } from "next/navigation";
import { crearClienteServidorConSesion } from "@/lib/supabaseServerSesion";
import { crearClienteServidor } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Solo cuenta la actividad guardada en "intentos" desde que se empezó a
// registrar (ver app/api/repaso/route.ts) — la práctica anterior a eso no
// dejó rastro y no aparece aquí.
export default async function PaginaProgreso() {
  const supabaseSesion = crearClienteServidorConSesion();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  if (!user) redirect("/login?redirigido_de=/admin/progreso");

  const { data: perfilPropio } = await supabaseSesion
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfilPropio?.rol !== "profesor") {
    return (
      <p className="text-rose-600">
        Esta sección es solo para profesores. Si crees que deberías tener acceso, pide a un
        administrador que cambie tu rol a "profesor" en la tabla <code>perfiles</code> desde el
        dashboard de Supabase.
      </p>
    );
  }

  // A partir de aquí usamos el cliente con permisos de servicio: esta página
  // ya verificó arriba que quien la ve es profesor (mismo patrón que
  // app/api/upload-pdf/route.ts), así que puede leer los datos de todos los
  // alumnos sin necesitar políticas RLS nuevas para "ver todo".
  const supabase = crearClienteServidor();

  const { data: alumnos } = await supabase
    .from("perfiles")
    .select("id, nombre, puntos_totales, racha_actual, nivel_maximo_dominado")
    .eq("rol", "alumno");

  const { data: intentos } = await supabase
    .from("intentos")
    .select("alumno_id, es_correcto, intentado_en");

  // perfiles no guarda el correo (vive en auth.users) — lo traemos con la
  // API de administración para poder identificar a cada alumno en la tabla.
  const {
    data: { users: usuarios },
  } = await supabase.auth.admin.listUsers();
  const correoPorId = new Map(usuarios.map((u) => [u.id, u.email]));

  const filas = (alumnos ?? []).map((alumno) => {
    const intentosAlumno = (intentos ?? []).filter((i) => i.alumno_id === alumno.id);
    const total = intentosAlumno.length;
    const correctos = intentosAlumno.filter((i) => i.es_correcto).length;
    const porcentaje = total > 0 ? Math.round((correctos / total) * 100) : null;
    const ultimaActividad = intentosAlumno.reduce(
      (max, i) => (i.intentado_en > max ? i.intentado_en : max),
      ""
    );
    return {
      id: alumno.id,
      nombre: alumno.nombre || correoPorId.get(alumno.id) || "Alumno sin nombre",
      nivel: Math.floor(alumno.puntos_totales / 100) + 1,
      rachaActual: alumno.racha_actual,
      total,
      correctos,
      porcentaje,
      ultimaActividad,
    };
  });

  filas.sort((a, b) => (b.ultimaActividad || "").localeCompare(a.ultimaActividad || ""));

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-violet-900 mb-1">Progreso de tus alumnos</h1>
      <p className="text-sm text-slate-600 mb-6">
        Solo cuenta la actividad registrada desde que se activó el seguimiento — la práctica
        anterior a eso no aparece aquí.
      </p>

      {filas.length === 0 ? (
        <p className="text-slate-500">Todavía no hay alumnos registrados.</p>
      ) : (
        <div className="tarjeta-juego border-violet-100 p-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b-2 border-slate-100">
                <th className="p-3">Alumno</th>
                <th className="p-3">Ejercicios intentados</th>
                <th className="p-3">% de aciertos</th>
                <th className="p-3">Nivel</th>
                <th className="p-3">Racha actual</th>
                <th className="p-3">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-bold text-violet-900">{f.nombre}</td>
                  <td className="p-3">{f.total}</td>
                  <td className="p-3">
                    {f.porcentaje === null ? (
                      <span className="text-slate-400">Sin datos</span>
                    ) : (
                      <span
                        className={
                          f.porcentaje >= 70
                            ? "text-emerald-600 font-bold"
                            : f.porcentaje >= 40
                            ? "text-amber-600 font-bold"
                            : "text-rose-600 font-bold"
                        }
                      >
                        {f.porcentaje}%
                      </span>
                    )}
                  </td>
                  <td className="p-3">{f.nivel}</td>
                  <td className="p-3">{f.rachaActual}</td>
                  <td className="p-3 text-slate-500">
                    {f.ultimaActividad
                      ? new Date(f.ultimaActividad).toLocaleDateString("es-MX")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
