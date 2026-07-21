"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabaseClient";

export default function PaginaLogin() {
  const [modo, setModo] = useState<"entrar" | "registrarse">("entrar");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const router = useRouter();

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);

    const supabase = crearClienteNavegador();

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });

      if (error) {
        setMensaje(error.message);
        setCargando(false);
        return;
      }

      const destino = new URLSearchParams(window.location.search).get("redirigido_de") ?? "/";
      router.push(destino);
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email: correo,
        password: contrasena,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (error) {
        setMensaje(error.message);
        setCargando(false);
        return;
      }

      setMensaje(
        "Cuenta creada. Si tu proyecto de Supabase pide confirmar el correo, revisa tu bandeja de entrada antes de entrar."
      );
      setCargando(false);
    }
  }

  async function entrarConGoogle() {
    const supabase = crearClienteNavegador();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="max-w-sm mx-auto mt-10 tarjeta-juego border-violet-100 p-6">
      <h1 className="text-2xl font-extrabold text-violet-900 mb-6 text-center">
        {modo === "entrar" ? "¡Hola de nuevo!" : "Crea tu cuenta"}
      </h1>

      <form onSubmit={manejarEnvio} className="space-y-3">
        <input
          type="email"
          placeholder="Correo"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className="block w-full border-2 border-violet-200 focus:border-violet-400 focus:outline-none rounded-2xl p-2.5 text-sm"
        />
        <input
          type="password"
          placeholder="Contraseña"
          required
          minLength={6}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          className="block w-full border-2 border-violet-200 focus:border-violet-400 focus:outline-none rounded-2xl p-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={cargando}
          className="boton-juego w-full bg-violet-600 hover:bg-violet-500 text-white py-2.5"
        >
          {cargando ? "Un momento..." : modo === "entrar" ? "Entrar" : "Registrarme"}
        </button>
      </form>

      <button
        onClick={entrarConGoogle}
        className="boton-juego w-full mt-3 bg-white border-2 border-violet-200 py-2.5 text-sm"
      >
        Continuar con Google
      </button>

      <button
        onClick={() => {
          setModo(modo === "entrar" ? "registrarse" : "entrar");
          setMensaje(null);
        }}
        className="w-full mt-4 text-sm text-violet-700 underline"
      >
        {modo === "entrar" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>

      {mensaje && <p className="mt-4 text-sm text-rose-600 font-medium">{mensaje}</p>}
    </div>
  );
}
