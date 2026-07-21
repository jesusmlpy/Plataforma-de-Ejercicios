import "./globals.css";
import "katex/dist/katex.min.css";
import type { ReactNode } from "react";
import { Baloo_2 } from "next/font/google";
import Link from "next/link";
import { crearClienteServidorConSesion } from "@/lib/supabaseServerSesion";
import CerrarSesionBoton from "@/components/CerrarSesionBoton";
import InsigniaGamificacion from "@/components/InsigniaGamificacion";

// Tipografía redondeada y juguetona (estilo "app de juego para niños") en
// vez de la fuente del sistema — se aplica en todo el sitio vía Tailwind
// (ver fontFamily.sans en tailwind.config.ts).
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-juego",
});

export const metadata = {
  title: "Plataforma de Ejercicios",
  description: "Ejercicios interactivos generados automáticamente desde PDFs",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = crearClienteServidorConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let esProfesor = false;
  let puntosTotales = 0;
  let rachaActual = 0;
  if (user) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol, puntos_totales, racha_actual")
      .eq("id", user.id)
      .single();
    esProfesor = perfil?.rol === "profesor";
    puntosTotales = perfil?.puntos_totales ?? 0;
    rachaActual = perfil?.racha_actual ?? 0;
  }

  return (
    <html lang="es" className={baloo.variable}>
      <body className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 text-slate-900">
        <header className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-3 rounded-b-3xl shadow-lg">
          <Link href="/" className="font-extrabold text-base sm:text-xl tracking-tight flex items-center gap-2">
            <span aria-hidden="true">🎲</span> Plataforma de Ejercicios
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            {user && <InsigniaGamificacion puntosTotales={puntosTotales} rachaActual={rachaActual} />}
            {esProfesor && (
              <Link href="/admin/upload" className="boton-juego bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap">
                Subir PDF (profesor)
              </Link>
            )}
            {user ? (
              <CerrarSesionBoton />
            ) : (
              <Link href="/login" className="boton-juego bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap">
                Iniciar sesión
              </Link>
            )}
          </div>
        </header>
        <main className="max-w-4xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
