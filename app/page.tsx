import { crearClienteServidor } from "@/lib/supabaseServer";
import { crearClienteServidorConSesion } from "@/lib/supabaseServerSesion";
import Link from "next/link";
import EjercicioInteractivo from "./tema/[id]/EjercicioInteractivo";

// Esta página se renderiza en el servidor y siempre trae los temas
// más recientes de la base de datos — por eso cuando subes un PDF nuevo,
// aparece aquí sin que nadie tenga que tocar código.
export const dynamic = "force-dynamic";

export default async function PaginaInicio() {
  const supabase = crearClienteServidor();
  const { data: temas, error } = await supabase
    .from("temas")
    .select("id, titulo, descripcion, creado_en, ejercicios(count)")
    .order("creado_en", { ascending: false });

  if (error) {
    return <p className="text-red-600">Error al cargar temas: {error.message}</p>;
  }

  // Repetición espaciada (Leitner): ejercicios de CUALQUIER tema cuya
  // proxima_revision ya pasó para el alumno logueado. Solo aplica a
  // ejercicios que ya se intentaron antes (repaso_programado se crea la
  // primera vez que se responde uno, ver app/api/repaso/route.ts).
  const supabaseSesion = crearClienteServidorConSesion();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  let paraRepasar: any[] = [];
  if (user) {
    const { data } = await supabaseSesion
      .from("repaso_programado")
      .select(
        "proxima_revision, ejercicio:ejercicios(id, numero, nivel, enunciado, tipo_respuesta, respuesta_correcta, opciones, tipo_interaccion, parametros, pista)"
      )
      .eq("alumno_id", user.id)
      .lte("proxima_revision", new Date().toISOString())
      .order("proxima_revision", { ascending: true })
      .limit(20);
    paraRepasar = (data ?? []).filter((r: any) => r.ejercicio);
  }

  if (!temas || temas.length === 0) {
    return (
      <div className="text-center text-slate-500 mt-16">
        <p className="text-lg">Todavía no hay ningún tema.</p>
        <p className="text-sm mt-2">
          Sube tu primer PDF de ejercicios desde{" "}
          <Link href="/admin/upload" className="text-violet-700 underline">
            el panel del profesor
          </Link>
          .
        </p>
      </div>
    );
  }

  // Colores rotativos para que las fichas de tema se vean como niveles de
  // un juego (cada tema con su propio color), no como una lista uniforme.
  const COLORES = [
    { borde: "border-sky-300", icono: "🔢" },
    { borde: "border-emerald-300", icono: "📐" },
    { borde: "border-amber-300", icono: "✖️" },
    { borde: "border-fuchsia-300", icono: "📊" },
    { borde: "border-rose-300", icono: "🧮" },
  ];

  return (
    <div>
      {paraRepasar.length > 0 && (
        <section className="mb-10">
          <h1 className="text-3xl font-extrabold text-violet-900 mb-1">Para repasar hoy</h1>
          <p className="text-sm text-slate-600 mb-4">
            {paraRepasar.length === 1
              ? "Tienes 1 ejercicio listo para repasar."
              : `Tienes ${paraRepasar.length} ejercicios listos para repasar.`}{" "}
            Mezclados de todos los temas, según cuándo te tocaba verlos de nuevo.
          </p>
          <div className="space-y-3">
            {paraRepasar.map((r: any) => (
              <EjercicioInteractivo key={r.ejercicio.id} ejercicio={r.ejercicio} />
            ))}
          </div>
        </section>
      )}

      <h1 className="text-3xl font-extrabold text-violet-900 mb-6">Temas disponibles</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {temas.map((tema: any, i: number) => {
          const color = COLORES[i % COLORES.length];
          return (
            <Link
              key={tema.id}
              href={`/tema/${tema.id}`}
              className={`tarjeta-juego ${color.borde} p-5 flex gap-4 items-start hover:-translate-y-1 hover:shadow-[0_10px_0_0_rgba(0,0,0,0.06)] transition-transform`}
            >
              <span className="text-4xl" aria-hidden="true">
                {color.icono}
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-violet-900">{tema.titulo}</h2>
                <p className="text-sm text-slate-600 mt-1">{tema.descripcion}</p>
                <p className="text-xs font-bold text-slate-400 mt-2">
                  {tema.ejercicios?.[0]?.count ?? 0} ejercicios
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
