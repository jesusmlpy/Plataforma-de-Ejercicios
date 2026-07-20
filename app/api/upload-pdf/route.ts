import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabaseServer";

// ============================================================
// POST /api/upload-pdf
// Recibe: form-data con el archivo PDF + el título del tema
// Hace:
//   1. Sube el PDF original a Supabase Storage (bucket "pdfs-ejercicios")
//   2. Manda el PDF (en base64) a la API de Claude pidiendo que
//      devuelva SOLO un JSON con los ejercicios estructurados
//   3. Inserta el tema y cada ejercicio en la base de datos
// El profesor solo sube el PDF; todo lo demás es automático.
// ============================================================

const PROMPT_EXTRACCION = `Eres un asistente que convierte hojas de ejercicios de matemáticas en JSON estructurado.

Lee el PDF adjunto y devuelve ÚNICAMENTE un objeto JSON (sin texto adicional, sin backticks de markdown) con esta forma exacta:

{
  "titulo_tema": "string — nombre corto del tema, ej. 'Números con signo'",
  "descripcion": "string — una oración describiendo el tema",
  "ejercicios": [
    {
      "numero": 1,
      "nivel": "basico | intermedio | avanzado | dificil | universitario",
      "enunciado": "el texto completo del ejercicio, en LaTeX inline con $...$ si hay notación matemática",
      "tipo_respuesta": "numerica | abierta | opcion_multiple",
      "respuesta_correcta": "string o null si tipo_respuesta es 'abierta'",
      "opciones": null
    }
  ]
}

Reglas:
- Si el PDF ya trae una clave de respuestas, úsala para llenar "respuesta_correcta".
- Si un ejercicio es de explicación/demostración sin respuesta numérica única, usa "tipo_respuesta": "abierta" y "respuesta_correcta": null.
- Clasifica el "nivel" según la dificultad aparente del ejercicio dentro del documento.
- No inventes ejercicios que no estén en el PDF.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const archivo = formData.get("pdf") as File | null;

    if (!archivo) {
      return NextResponse.json({ error: "No se recibió ningún PDF." }, { status: 400 });
    }

    const supabase = crearClienteServidor();

    // 1. Subir el PDF original a Supabase Storage
    const bytes = await archivo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const nombreArchivo = `${Date.now()}-${archivo.name}`;

    const { error: errorSubida } = await supabase.storage
      .from("pdfs-ejercicios")
      .upload(nombreArchivo, buffer, { contentType: "application/pdf" });

    if (errorSubida) {
      return NextResponse.json({ error: `Error al subir PDF: ${errorSubida.message}` }, { status: 500 });
    }

    const { data: urlPublica } = supabase.storage
      .from("pdfs-ejercicios")
      .getPublicUrl(nombreArchivo);

    // 2. Mandar el PDF a la API de Claude para extraer los ejercicios
    const base64Pdf = buffer.toString("base64");

    const respuestaClaude = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64Pdf },
              },
              { type: "text", text: PROMPT_EXTRACCION },
            ],
          },
        ],
      }),
    });

    if (!respuestaClaude.ok) {
      const detalle = await respuestaClaude.text();
      return NextResponse.json({ error: `Error de la API de Claude: ${detalle}` }, { status: 500 });
    }

    const dataClaude = await respuestaClaude.json();
    const bloqueTexto = dataClaude.content.find((b: any) => b.type === "text");
    const textoLimpio = (bloqueTexto?.text ?? "").replace(/```json|```/g, "").trim();

    let extraido: {
      titulo_tema: string;
      descripcion: string;
      ejercicios: Array<{
        numero: number;
        nivel: string;
        enunciado: string;
        tipo_respuesta: string;
        respuesta_correcta: string | null;
        opciones: unknown;
      }>;
    };

    try {
      extraido = JSON.parse(textoLimpio);
    } catch {
      return NextResponse.json(
        { error: "Claude no devolvió JSON válido. Revisa el PDF e inténtalo de nuevo." },
        { status: 500 }
      );
    }

    // 3. Insertar el tema
    const { data: temaInsertado, error: errorTema } = await supabase
      .from("temas")
      .insert({
        titulo: extraido.titulo_tema,
        descripcion: extraido.descripcion,
        pdf_url: urlPublica.publicUrl,
      })
      .select()
      .single();

    if (errorTema) {
      return NextResponse.json({ error: `Error al crear tema: ${errorTema.message}` }, { status: 500 });
    }

    // 4. Insertar los ejercicios asociados a ese tema
    const filasEjercicios = extraido.ejercicios.map((ej) => ({
      tema_id: temaInsertado.id,
      numero: ej.numero,
      nivel: ej.nivel,
      enunciado: ej.enunciado,
      tipo_respuesta: ej.tipo_respuesta,
      respuesta_correcta: ej.respuesta_correcta,
      opciones: ej.opciones ?? null,
    }));

    const { error: errorEjercicios } = await supabase.from("ejercicios").insert(filasEjercicios);

    if (errorEjercicios) {
      return NextResponse.json(
        { error: `Tema creado, pero falló guardar ejercicios: ${errorEjercicios.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      tema: temaInsertado,
      total_ejercicios: filasEjercicios.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Error desconocido" }, { status: 500 });
  }
}
