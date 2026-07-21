"use client";

import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabaseClient";

export default function CerrarSesionBoton() {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = crearClienteNavegador();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={cerrarSesion}
      className="boton-juego bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2"
    >
      Cerrar sesión
    </button>
  );
}
