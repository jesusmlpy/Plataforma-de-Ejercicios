"use client";

import { InlineMath } from "react-katex";

// Los enunciados vienen con notación matemática marcada como $...$ (ver el
// prompt de extracción en app/api/upload-pdf/route.ts). Partimos el texto en
// segmentos alternando texto plano y fórmulas para renderizar cada uno con KaTeX.
export default function TextoConLatex({ texto }: { texto: string }) {
  const partes = texto.split(/(\$[^$]+\$)/g);

  return (
    <>
      {partes.map((parte, i) =>
        parte.startsWith("$") && parte.endsWith("$") ? (
          <InlineMath key={i} math={parte.slice(1, -1)} />
        ) : (
          <span key={i}>{parte}</span>
        )
      )}
    </>
  );
}
