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
          <Link href="/admin/upload" className="text-blue-700 underline">
            el panel del profesor
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Temas disponibles</h1>
      <div className="grid gap-4">
        {temas.map((tema: any) => (
          <Link
            key={tema.id}
            href={`/tema/${tema.id}`}
            className="block border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition bg-white"
          >
            <h2 className="text-lg font-semibold text-blue-800">{tema.titulo}</h2>
            <p className="text-sm text-slate-600 mt-1">{tema.descripcion}</p>
            <p className="text-xs text-slate-400 mt-2">
              {tema.ejercicios?.[0]?.count ?? 0} ejercicios
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
