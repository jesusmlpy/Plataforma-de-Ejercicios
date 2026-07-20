import { crearClienteServidor } from "@/lib/supabaseServer";
import EjercicioInteractivo from "./EjercicioInteractivo";

export const dynamic = "force-dynamic";

const ORDEN_NIVELES = ["basico", "intermedio", "avanzado", "dificil", "universitario"];
const ETIQUETAS_NIVEL: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  dificil: "Difícil",
  universitario: "Universitario",
};

export default async function PaginaTema({ params }: { params: { id: string } }) {
  const supabase = crearClienteServidor();

  const { data: tema } = await supabase.from("temas").select("*").eq("id", params.id).single();
  const { data: ejercicios } = await supabase
    .from("ejercicios")
    .select("*")
    .eq("tema_id", params.id)
    .order("numero", { ascending: true });

  if (!tema) return <p>Tema no encontrado.</p>;

  const porNivel = ORDEN_NIVELES.map((nivel) => ({
    nivel,
    items: (ejercicios ?? []).filter((e: any) => e.nivel === nivel),
  })).filter((grupo) => grupo.items.length > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-900">{tema.titulo}</h1>
      <p className="text-slate-600 mt-1 mb-8">{tema.descripcion}</p>

      {porNivel.map((grupo) => (
        <section key={grupo.nivel} className="mb-8">
          <h2 className="text-lg font-semibold text-amber-700 border-b border-amber-300 pb-1 mb-3">
            {ETIQUETAS_NIVEL[grupo.nivel]}
          </h2>
          <div className="space-y-3">
            {grupo.items.map((ej: any) => (
              <EjercicioInteractivo key={ej.id} ejercicio={ej} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
