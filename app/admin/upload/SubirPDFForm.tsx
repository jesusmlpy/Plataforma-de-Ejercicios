"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function SubirPDFForm() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"listo" | "procesando" | "error">("listo");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const router = useRouter();

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    if (!archivo) return;

    setEstado("procesando");
    setMensaje(null);

    const formData = new FormData();
    formData.append("pdf", archivo);

    const res = await fetch("/api/upload-pdf", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      setEstado("error");
      setMensaje(data.error ?? "Ocurrió un error al procesar el PDF.");
      return;
    }

    setMensaje(`Tema "${data.tema.titulo}" creado con ${data.total_ejercicios} ejercicios.`);
    setEstado("listo");
    setTimeout(() => router.push(`/tema/${data.tema.id}`), 1200);
  }

  return (
    <div className="max-w-lg tarjeta-juego border-amber-100 p-6">
      <h1 className="text-2xl font-extrabold text-violet-900 mb-2">Subir nuevo PDF de ejercicios</h1>
      <p className="text-slate-600 text-sm mb-6">
        Sube el PDF y la plataforma detecta automáticamente el tema, los ejercicios y sus niveles
        de dificultad — no necesitas escribir nada a mano.
      </p>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="block w-full text-sm border-2 border-violet-200 rounded-2xl p-2.5"
        />

        <button
          type="submit"
          disabled={!archivo || estado === "procesando"}
          className="boton-juego bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5"
        >
          {estado === "procesando" ? "Procesando PDF..." : "Subir y procesar"}
        </button>
      </form>

      {mensaje && (
        <p className={`mt-4 text-sm font-medium ${estado === "error" ? "text-rose-600" : "text-emerald-600"}`}>
          {mensaje}
        </p>
      )}
    </div>
  );
}
