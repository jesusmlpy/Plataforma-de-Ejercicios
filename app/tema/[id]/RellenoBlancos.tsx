"use client";

import { useState } from "react";
import TextoConLatex from "@/components/TextoConLatex";

// Cada espacio en blanco tiene su propio conjunto de opciones y su propia
// respuesta correcta (no un solo string) — así un mismo ejercicio puede
// mezclar espacios con opciones distintas si hiciera falta.
export type EspacioRellenoBlancos = {
  opciones: string[];
  respuesta: string;
};

export type ParametrosRellenoBlancos = {
  espacios: EspacioRellenoBlancos[];
};

// Marcador que usa el enunciado para indicar dónde va cada espacio, en
// orden — el primer "___" corresponde a parametros.espacios[0], el
// segundo a espacios[1], etc. Ver la regla en app/api/upload-pdf/route.ts.
const MARCADOR_ESPACIO = "___";

export default function RellenoBlancos({
  numero,
  enunciado,
  parametros,
  onResultado,
}: {
  numero: number;
  enunciado: string;
  parametros: ParametrosRellenoBlancos;
  onResultado: (correcto: boolean) => void;
}) {
  const { espacios } = parametros;
  const [seleccion, setSeleccion] = useState<(string | null)[]>(espacios.map(() => null));
  const [revisado, setRevisado] = useState(false);

  const partes = enunciado.split(MARCADOR_ESPACIO);
  const todosElegidos = seleccion.every((s) => s !== null);
  const totalCorrectos = espacios.filter((e, i) => seleccion[i] === e.respuesta).length;

  function elegir(indice: number, opcion: string) {
    if (revisado) return;
    setSeleccion((prev) => {
      const copia = [...prev];
      copia[indice] = opcion;
      return copia;
    });
  }

  function revisar() {
    setRevisado(true);
    onResultado(totalCorrectos === espacios.length);
  }

  function reintentar() {
    setSeleccion(espacios.map(() => null));
    setRevisado(false);
  }

  return (
    <div>
      <p className="font-bold text-slate-800 leading-loose max-w-full overflow-x-auto">
        <span className="text-violet-400 mr-1">{numero}.</span>
        {partes.map((parte, i) => (
          <span key={i}>
            <TextoConLatex texto={parte} />
            {i < espacios.length && (
              <span className="inline-flex gap-1 mx-1 align-middle">
                {espacios[i].opciones.map((opcion) => {
                  const elegida = seleccion[i] === opcion;
                  const esCorrecta = revisado && opcion === espacios[i].respuesta;
                  const marcadaMal = revisado && elegida && opcion !== espacios[i].respuesta;
                  return (
                    <button
                      key={opcion}
                      onClick={() => elegir(i, opcion)}
                      disabled={revisado}
                      className={`boton-juego px-3 py-1 text-sm font-mono ${
                        esCorrecta
                          ? "bg-emerald-400 text-emerald-950"
                          : marcadaMal
                          ? "bg-rose-400 text-rose-950"
                          : elegida
                          ? "bg-violet-600 text-white"
                          : "bg-white border-2 border-violet-200 hover:border-violet-400 text-slate-700"
                      }`}
                    >
                      {opcion}
                    </button>
                  );
                })}
              </span>
            )}
          </span>
        ))}
      </p>

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={revisar}
          disabled={!todosElegidos || revisado}
          className="boton-juego bg-violet-600 text-white text-sm px-5 py-2 hover:bg-violet-500"
        >
          Revisar
        </button>
        {revisado && (
          <button onClick={reintentar} className="boton-juego bg-white border-2 border-violet-200 text-violet-700 text-sm px-4 py-2">
            Reintentar
          </button>
        )}
      </div>

      {revisado && (
        <p className="text-sm mt-2 font-bold">
          {totalCorrectos === espacios.length ? (
            <span className="text-emerald-600">¡Todo correcto!</span>
          ) : (
            <span className="text-rose-600">
              {totalCorrectos} de {espacios.length} correctos.
            </span>
          )}
        </p>
      )}
    </div>
  );
}
