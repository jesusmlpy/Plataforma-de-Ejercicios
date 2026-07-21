"use client";

import { useState, type MouseEvent } from "react";

// Parámetros que espera este tipo de interacción (ver README → "Arquitectura:
// tipos de interacción" y la regla correspondiente en app/api/upload-pdf/route.ts).
export type ParametrosRectaNumerica = {
  min: number;
  max: number;
  valores: number[];
};

const ANCHO = 600;
const ALTO = 100;
const PADDING = 30;
const Y_LINEA = 55;

export default function RectaNumericaInteractiva({
  parametros,
  onResultado,
}: {
  parametros: ParametrosRectaNumerica;
  onResultado: (correcto: boolean) => void;
}) {
  const { min, max, valores } = parametros;
  const [puntos, setPuntos] = useState<number[]>([]);
  const [resultado, setResultado] = useState<"correcto" | "incorrecto" | null>(null);

  function valorAPixel(valor: number) {
    return PADDING + ((valor - min) / (max - min)) * (ANCHO - 2 * PADDING);
  }

  function pixelAValor(x: number) {
    const crudo = min + ((x - PADDING) / (ANCHO - 2 * PADDING)) * (max - min);
    return Math.round(Math.min(max, Math.max(min, crudo)));
  }

  function manejarClic(e: MouseEvent<SVGSVGElement>) {
    if (resultado || puntos.length >= valores.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRelativo = ((e.clientX - rect.left) / rect.width) * ANCHO;
    const valor = pixelAValor(xRelativo);
    setPuntos((prev) => (prev.includes(valor) ? prev : [...prev, valor]));
  }

  function revisar() {
    const marcados = [...puntos].sort((a, b) => a - b);
    const esperados = [...valores].sort((a, b) => a - b);
    const acierto =
      marcados.length === esperados.length && marcados.every((v, i) => v === esperados[i]);
    setResultado(acierto ? "correcto" : "incorrecto");
    onResultado(acierto);
  }

  function reintentar() {
    setPuntos([]);
    setResultado(null);
  }

  // No saturar la recta de etiquetas cuando el rango es grande.
  const pasoEtiqueta = Math.max(1, Math.ceil((max - min) / 20));
  const etiquetas: number[] = [];
  for (let v = min; v <= max; v += pasoEtiqueta) etiquetas.push(v);

  return (
    <div>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full max-w-md cursor-pointer select-none"
        onClick={manejarClic}
      >
        <line
          x1={PADDING}
          y1={Y_LINEA}
          x2={ANCHO - PADDING}
          y2={Y_LINEA}
          stroke="#94a3b8"
          strokeWidth={2}
        />
        {etiquetas.map((v) => (
          <g key={v}>
            <line
              x1={valorAPixel(v)}
              y1={Y_LINEA - 5}
              x2={valorAPixel(v)}
              y2={Y_LINEA + 5}
              stroke="#94a3b8"
              strokeWidth={2}
            />
            <text x={valorAPixel(v)} y={Y_LINEA + 20} fontSize={11} textAnchor="middle" fill="#64748b">
              {v}
            </text>
          </g>
        ))}
        {puntos.map((v, i) => (
          <circle
            key={i}
            cx={valorAPixel(v)}
            cy={Y_LINEA}
            r={9}
            stroke="white"
            strokeWidth={2}
            className={
              resultado === "correcto"
                ? "fill-emerald-500 animar-resultado"
                : resultado === "incorrecto"
                ? "fill-rose-500 animar-resultado"
                : "fill-violet-600"
            }
          />
        ))}
      </svg>

      <p className="text-xs font-bold text-slate-500 mt-1">
        Toca la recta para ubicar{" "}
        {valores.length === 1 ? "el valor pedido" : `los ${valores.length} valores pedidos`} (
        {puntos.length}/{valores.length})
      </p>

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={revisar}
          disabled={puntos.length !== valores.length || resultado !== null}
          className="boton-juego bg-violet-600 text-white text-sm px-5 py-2 hover:bg-violet-500"
        >
          Revisar
        </button>
        {resultado && (
          <button onClick={reintentar} className="boton-juego bg-white border-2 border-violet-200 text-violet-700 text-sm px-4 py-2">
            Reintentar
          </button>
        )}
      </div>

      {resultado === "correcto" && (
        <p className="text-emerald-600 text-sm mt-2 font-bold">¡Correcto!</p>
      )}
      {resultado === "incorrecto" && (
        <p className="text-rose-600 text-sm mt-2 font-bold">Aún no. Intenta de nuevo.</p>
      )}
    </div>
  );
}
