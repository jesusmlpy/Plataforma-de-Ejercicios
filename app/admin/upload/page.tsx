"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PaginaSubirPDF() {
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
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-blue-900 mb-2">Subir nuevo PDF de ejercicios</h1>
      <p className="text-slate-600 text-sm mb-6">
        Sube el PDF y la plataforma detecta automáticamente el tema, los ejercicios y sus niveles
        de dificultad — no necesitas escribir nada a mano.
      </p>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="block w-full text-sm border border-slate-300 rounded p-2"
        />

        <button
          type="submit"
          disabled={!archivo || estado === "procesando"}
          className="bg-blue-800 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {estado === "procesando" ? "Procesando PDF..." : "Subir y procesar"}
        </button>
      </form>

      {mensaje && (
        <p className={`mt-4 text-sm ${estado === "error" ? "text-rose-600" : "text-emerald-600"}`}>
          {mensaje}
        </p>
      )}
    </div>
  );
}
