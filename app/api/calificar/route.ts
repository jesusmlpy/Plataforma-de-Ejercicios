import { NextRequest, NextResponse } from "next/server";

// Para ejercicios de explicación/demostración no hay una única respuesta
// correcta en texto, así que le pedimos a Claude que evalúe el razonamiento
// del alumno y devuelva SOLO un JSON: { "esCorrecto": bool, "comentario": string }
export async function POST(req: NextRequest) {
  const { enunciado, respuestaAlumno, respuestaCorrecta } = await req.json();

  // Cuando el ejercicio ya trae una respuesta de referencia guardada (ej.
  // problemas de varios pasos donde Claude podría recalcular distinto cada
  // vez), se la pasamos para que compare contra ella en vez de re-derivar
  // la respuesta desde cero solo con el enunciado.
  const referencia = respuestaCorrecta
    ? `\n\nRespuesta de referencia (úsala para verificar, no la repitas literalmente): ${respuestaCorrecta}`
    : "";

  const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Eres un profesor de matemáticas de nivel básico-medio evaluando la respuesta de un alumno.

Ejercicio: ${enunciado}${referencia}

Respuesta del alumno: ${respuestaAlumno}

Primero decide qué exige el enunciado:
- Si el enunciado pide EXPLÍCITAMENTE justificar, explicar, verificar, demostrar, dar un
  ejemplo/contraejemplo, o describir un patrón/proceso — evalúa el razonamiento paso a
  paso, no solo la conclusión. Sé conservador: si el alumno se salta un paso, lo justifica
  mal, o da un salto lógico no explicado, marca "esCorrecto": false aunque la conclusión
  final sea la correcta. Una conclusión correcta sin la justificación pedida no cuenta.
- Si el enunciado NO pide justificación explícita (ej. "ordena estos números", "calcula",
  "encuentra el valor de", "escribe el opuesto") — basta con que la respuesta final sea
  correcta. No exijas explicación que nadie pidió: producir el resultado correcto (la
  lista bien ordenada, el valor correcto, etc.) ya demuestra que entendió.
- No hace falta que use las mismas palabras que la referencia, solo que la idea
  matemática sea válida (y esté justificada, únicamente si el enunciado lo pidió).

Responde ÚNICAMENTE con este JSON, sin texto adicional ni backticks:
{"esCorrecto": true o false, "comentario": "si es false, nombra específicamente cuál paso o parte del razonamiento falta o está mal — no un genérico 'está incorrecto'. Si es true, confirma en breve por qué está bien. Máximo 2 frases, tono amable."}`,
        },
      ],
    }),
  });

  const data = await respuesta.json();
  const texto = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";

  try {
    const limpio = texto.replace(/```json|```/g, "").trim();
    const resultado = JSON.parse(limpio);
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ esCorrecto: false, comentario: "No se pudo evaluar automáticamente." });
  }
}
