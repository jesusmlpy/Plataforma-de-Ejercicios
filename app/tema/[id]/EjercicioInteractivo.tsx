"use client";

import { useState } from "react";

type Ejercicio = {
  id: string;
  numero: number;
  enunciado: string;
  tipo_respuesta: "numerica" | "abierta" | "opcion_multiple";
  respuesta_correcta: string | null;
  opciones: string[] | null;
};

export default function EjercicioInteractivo({ ejercicio }: { ejercicio: Ejercicio }) {
  const [respuesta, setRespuesta] = useState("");
  const [estado, setEstado] = useState<"pendiente" | "correcto" | "incorrecto" | "revisando">(
    "pendiente"
  );
  const [retroalimentacion, setRetroalimentacion] = useState<string | null>(null);

  async function revisarRespuesta() {
    if (ejercicio.tipo_respuesta === "numerica") {
      const normalizar = (s: string) => s.replace(/\s|\+/g, "").trim();
      const acierto = normalizar(respuesta) === normalizar(ejercicio.respuesta_correcta ?? "");
      setEstado(acierto ? "correcto" : "incorrecto");
      return;
    }

    // Para ejercicios de tipo "abierta" (explicaciones/demostraciones),
    // se manda a calificar con la API de Claude en lugar de comparar texto exacto.
    setEstado("revisando");
    const res = await fetch("/api/calificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enunciado: ejercicio.enunciado,
        respuestaAlumno: respuesta,
      }),
    });
    const data = await res.json();
    setEstado(data.esCorrecto ? "correcto" : "incorrecto");
    setRetroalimentacion(data.comentario ?? null);
  }

  const colorBorde =
    estado === "correcto"
      ? "border-emerald-400"
      : estado === "incorrecto"
      ? "border-rose-400"
      : "border-slate-200";

  return (
    <div className={`border ${colorBorde} rounded-lg p-4 bg-white`}>
      <p className="font-medium mb-3">
        <span className="text-slate-400 mr-1">{ejercicio.numero}.</span>
        {ejercicio.enunciado}
      </p>

      <div className="flex gap-2">
        <input
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          placeholder="Tu respuesta..."
          className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm"
        />
        <button
          onClick={revisarRespuesta}
          disabled={estado === "revisando" || respuesta.trim() === ""}
          className="bg-blue-800 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {estado === "revisando" ? "Revisando..." : "Revisar"}
        </button>
      </div>

      {estado === "correcto" && (
        <p className="text-emerald-600 text-sm mt-2 font-medium">¡Correcto!</p>
      )}
      {estado === "incorrecto" && (
        <p className="text-rose-600 text-sm mt-2 font-medium">
          Aún no. Intenta de nuevo.
          {retroalimentacion && <span className="block text-slate-600 font-normal mt-1">{retroalimentacion}</span>}
        </p>
      )}
    </div>
  );
}
