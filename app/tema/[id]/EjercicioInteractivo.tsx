"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextoConLatex from "@/components/TextoConLatex";
import Mascota, { type ExpresionMascota } from "@/components/Mascota";
import RectaNumericaInteractiva, {
  type ParametrosRectaNumerica,
} from "./RectaNumericaInteractiva";
import RellenoBlancos, { type ParametrosRellenoBlancos } from "./RellenoBlancos";

type Ejercicio = {
  id: string;
  numero: number;
  nivel: string;
  enunciado: string;
  tipo_respuesta: "numerica" | "abierta" | "opcion_multiple";
  respuesta_correcta: string | null;
  opciones: string[] | null;
  // tipo_interaccion + parametros deciden qué componente visual usa el alumno
  // para responder (independiente de tipo_respuesta, que decide cómo se
  // califica) — ver README → "Arquitectura: tipos de interacción".
  tipo_interaccion?: string | null;
  parametros?: unknown;
  pista?: string | null;
};

function esParametrosRectaNumerica(p: unknown): p is ParametrosRectaNumerica {
  return (
    !!p &&
    typeof p === "object" &&
    typeof (p as Record<string, unknown>).min === "number" &&
    typeof (p as Record<string, unknown>).max === "number" &&
    Array.isArray((p as Record<string, unknown>).valores)
  );
}

function esParametrosRellenoBlancos(p: unknown): p is ParametrosRellenoBlancos {
  const espacios = (p as Record<string, unknown>)?.espacios;
  return (
    !!p &&
    typeof p === "object" &&
    Array.isArray(espacios) &&
    espacios.length > 0 &&
    espacios.every(
      (e) =>
        e &&
        typeof e === "object" &&
        Array.isArray((e as Record<string, unknown>).opciones) &&
        typeof (e as Record<string, unknown>).respuesta === "string"
    )
  );
}

export default function EjercicioInteractivo({ ejercicio }: { ejercicio: Ejercicio }) {
  const router = useRouter();
  const [respuesta, setRespuesta] = useState("");
  const [estado, setEstado] = useState<"pendiente" | "correcto" | "incorrecto" | "revisando">(
    "pendiente"
  );
  const [retroalimentacion, setRetroalimentacion] = useState<string | null>(null);
  const [puntosGanados, setPuntosGanados] = useState<number | null>(null);
  const [mostrarPista, setMostrarPista] = useState(false);

  // Gamificación global de la plataforma (puntos_totales/racha_actual/racha_maxima
  // en "perfiles", ver app/api/gamificacion/route.ts) — independiente de este
  // ejercicio o tema. Si no hay sesión, la API simplemente no guarda nada.
  async function registrarResultado(acierto: boolean) {
    try {
      const res = await fetch("/api/gamificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel: ejercicio.nivel, acierto }),
      });
      const data = await res.json();
      if (acierto && typeof data.puntosGanados === "number" && data.puntosGanados > 0) {
        setPuntosGanados(data.puntosGanados);
        setTimeout(() => setPuntosGanados(null), 1200);
      }
      router.refresh(); // refleja los puntos/racha nuevos en la insignia del header
    } catch {
      // Si falla la persistencia, el alumno igual ve su resultado local;
      // solo no se actualizan puntos/racha esta vez.
    }
  }

  async function revisarRespuesta() {
    if (respuesta.trim() === "") return;

    if (ejercicio.tipo_respuesta === "numerica") {
      const normalizar = (s: string) => s.replace(/\s|\+/g, "").trim();
      const acierto = normalizar(respuesta) === normalizar(ejercicio.respuesta_correcta ?? "");
      setEstado(acierto ? "correcto" : "incorrecto");
      registrarResultado(acierto);
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
        respuestaCorrecta: ejercicio.respuesta_correcta,
      }),
    });
    const data = await res.json();
    setEstado(data.esCorrecto ? "correcto" : "incorrecto");
    setRetroalimentacion(data.comentario ?? null);
    registrarResultado(data.esCorrecto);
  }

  const colorBorde =
    estado === "correcto"
      ? "border-emerald-400"
      : estado === "incorrecto"
      ? "border-rose-400"
      : "border-violet-100";

  const usaRectaNumerica =
    ejercicio.tipo_interaccion === "recta_numerica" && esParametrosRectaNumerica(ejercicio.parametros);
  const usaRellenoBlancos =
    ejercicio.tipo_interaccion === "relleno_blancos" && esParametrosRellenoBlancos(ejercicio.parametros);

  const expresionMascota: ExpresionMascota =
    estado === "correcto" ? "feliz" : estado === "incorrecto" ? "triste" : "neutral";

  return (
    <div className={`tarjeta-juego relative ${colorBorde} p-5`}>
      {puntosGanados !== null && (
        <span className="absolute -top-4 right-4 text-emerald-600 font-extrabold text-lg animar-puntos">
          +{puntosGanados}
        </span>
      )}

      <div className="flex items-start gap-3 mb-3">
        <Mascota expresion={expresionMascota} size={52} />
        <div className="flex-1 min-w-0">
          {usaRellenoBlancos ? (
            <RellenoBlancos
              numero={ejercicio.numero}
              enunciado={ejercicio.enunciado}
              parametros={ejercicio.parametros as ParametrosRellenoBlancos}
              onResultado={(correcto) => {
                setEstado(correcto ? "correcto" : "incorrecto");
                registrarResultado(correcto);
              }}
            />
          ) : (
            <p className="font-bold text-slate-800 max-w-full overflow-x-auto">
              <span className="text-violet-400 mr-1">{ejercicio.numero}.</span>
              <TextoConLatex texto={ejercicio.enunciado} />
            </p>
          )}
        </div>
      </div>

      {ejercicio.pista && (
        <div className="mb-3 ml-[64px]">
          <button
            type="button"
            onClick={() => setMostrarPista((v) => !v)}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
          >
            💡 {mostrarPista ? "Ocultar pista" : "Ver pista"}
          </button>
          {mostrarPista && (
            <p className="text-sm text-amber-800 bg-amber-50 border-2 border-amber-200 rounded-2xl px-3 py-2 mt-1.5">
              {ejercicio.pista}
            </p>
          )}
        </div>
      )}

      {usaRellenoBlancos ? null : usaRectaNumerica ? (
        <RectaNumericaInteractiva
          parametros={ejercicio.parametros as ParametrosRectaNumerica}
          onResultado={(correcto) => {
            setEstado(correcto ? "correcto" : "incorrecto");
            registrarResultado(correcto);
          }}
        />
      ) : (
        <>
          <div className="flex gap-2">
            <input
              value={respuesta}
              onChange={(e) => {
                const valor = e.target.value;
                setRespuesta(valor);
                if (valor.trim() === "") {
                  setEstado("pendiente");
                  setRetroalimentacion(null);
                }
              }}
              placeholder="Tu respuesta..."
              className="flex-1 border-2 border-violet-200 focus:border-violet-400 focus:outline-none rounded-2xl px-4 py-2 text-sm"
            />
            <button
              onClick={revisarRespuesta}
              disabled={estado === "revisando" || respuesta.trim() === ""}
              className="boton-juego bg-violet-600 text-white text-sm px-5 py-2 hover:bg-violet-500"
            >
              {estado === "revisando" ? "Revisando..." : "Revisar"}
            </button>
          </div>

          {respuesta.trim() !== "" && estado === "correcto" && (
            <p className="text-emerald-600 text-sm mt-2 font-bold">¡Correcto!</p>
          )}
          {respuesta.trim() !== "" && estado === "incorrecto" && (
            <p className="text-rose-600 text-sm mt-2 font-bold">
              Aún no. Intenta de nuevo.
              {retroalimentacion && (
                <span className="block text-slate-600 font-normal mt-1">{retroalimentacion}</span>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
