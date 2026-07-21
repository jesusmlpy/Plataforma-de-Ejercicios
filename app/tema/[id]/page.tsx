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
// Un color por nivel, de más suave a más intenso — para que la dificultad
// se sienta como un "mapa de niveles" de juego en vez de una lista plana.
const COLOR_NIVEL: Record<string, string> = {
  basico: "bg-emerald-400 text-emerald-950",
  intermedio: "bg-sky-400 text-sky-950",
  avanzado: "bg-amber-400 text-amber-950",
  dificil: "bg-orange-500 text-white",
  universitario: "bg-fuchsia-500 text-white",
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
      <h1 className="text-3xl font-extrabold text-violet-900">{tema.titulo}</h1>
      <p className="text-slate-600 mt-1 mb-8">{tema.descripcion}</p>

      {porNivel.map((grupo) => (
        <section key={grupo.nivel} className="mb-8">
          <h2
            className={`inline-block text-sm font-extrabold rounded-full px-4 py-1.5 mb-3 ${COLOR_NIVEL[grupo.nivel]}`}
          >
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
