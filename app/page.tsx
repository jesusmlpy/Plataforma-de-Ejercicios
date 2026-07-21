import { crearClienteServidor } from "@/lib/supabaseServer";
import Link from "next/link";

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
