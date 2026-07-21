import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { crearClienteServidor } from "@/lib/supabaseServer";
import { crearClienteServidorConSesion } from "@/lib/supabaseServerSesion";

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
      "opciones": null,
      "tipo_interaccion": "recta_numerica | relleno_blancos | null — qué componente visual usa el alumno para responder (ver reglas)",
      "parametros": "objeto específico de tipo_interaccion, o null (ver reglas)",
      "pista": "string — consejo breve (ver reglas)"
    }
  ]
}

Reglas:
- Si el PDF ya trae una clave de respuestas, úsala para llenar "respuesta_correcta".
- Si un ejercicio pide ubicar uno o más valores en una recta numérica, usa "tipo_interaccion": "recta_numerica", "tipo_respuesta": "abierta", "respuesta_correcta": null, y llena "parametros" con {"min": number, "max": number, "valores": [number, ...]} — "min"/"max" son el rango visible de la recta (deja un margen razonable alrededor de los valores) y "valores" son los puntos que el alumno debe ubicar.
- Si un ejercicio tiene varios espacios en blanco a rellenar de una lista corta y fija de opciones (ej. "escribe <, > o = entre cada par", verdadero/falso, elegir el operador correcto), usa "tipo_interaccion": "relleno_blancos", "tipo_respuesta": "opcion_multiple", "respuesta_correcta": null, y:
  - En "enunciado", reemplaza cada espacio en blanco por el texto literal "___" (tres guiones bajos, fuera de cualquier "$...$"), en el mismo orden en que aparecen. Ej.: "a) $-5$ ___ $2$ b) $-8$ ___ $-3$".
  - Llena "parametros" con {"espacios": [{"opciones": ["<", ">", "="], "respuesta": "<"}, ...]} — un objeto por cada "___", en el mismo orden, cada uno con sus propias "opciones" (la lista corta de opciones válidas, ej. ["<", ">", "="] o ["Verdadero", "Falso"]) y su "respuesta" correcta individual.
- Si un ejercicio pide graficar, dibujar, o cualquier otra representación visual sin una única respuesta de texto (y no es recta numérica ni relleno de blancos), usa "tipo_respuesta": "abierta" y "respuesta_correcta": null, y deja "tipo_interaccion" y "parametros" en null — todavía no hay más tipos de interacción soportados.
- Si un ejercicio es de explicación/demostración sin respuesta numérica única, usa "tipo_respuesta": "abierta" y "respuesta_correcta": null.
- "tipo_respuesta": "numerica" es SOLO para cuando la respuesta es un único valor o expresión corta que el alumno puede escribir tal cual (ej. "-8", "3/4"). Si la respuesta correcta tiene varias partes, una lista ordenada, unidades con explicación, una justificación ("Verdadero, porque...", "Falso, ej. ..."), o cualquier texto además del valor (ej. "-5 está más abajo", "a) +5 mil; b) mes 4"), usa "tipo_respuesta": "abierta" en vez de "numerica" — aunque el ejercicio sea de matemáticas y tenga una respuesta objetivamente correcta, si no es un solo valor exacto que se pueda comparar como texto, no es "numerica". En "respuesta_correcta" sigue guardando la respuesta completa (se usa como referencia para la calificación por IA, no para comparación exacta).
- Si un ejercicio pide encontrar un único valor faltante dentro de una operación (ej. "(-7) + ___ = +2") y la respuesta es un solo valor que el alumno escribirá libremente en el cuadro de texto (no aplica relleno_blancos porque no hay una lista corta de opciones fijas — la respuesta es cualquier número), representa el espacio dentro del LaTeX con "\square" en vez de un guion bajo suelto — ej. "$(-7) + \square = +2$", nunca "$(-7) + \_ = +2$" ni "$(-7) + _ = +2$".
- Para cualquier otro ejercicio, deja "tipo_interaccion" y "parametros" en null.
- Llena "pista" con un consejo breve y amable (máximo 2 frases, tono de "ayudita", no de solucionario) que combine: (a) cómo debe expresar su respuesta el alumno — el formato esperado, si debe justificar, si lleva signo o unidades, etc. — y (b) una pequeña ayuda conceptual o el primer paso para resolverlo. Nunca reveles el resultado final ni hagas el cálculo completo en la pista.
- Clasifica el "nivel" según la dificultad aparente del ejercicio dentro del documento.
- No inventes ejercicios que no estén en el PDF.`;

export async function POST(req: NextRequest) {
  try {
    // El middleware ya bloquea /admin/upload sin sesión, pero la ruta de API
    // se puede llamar directo, así que el chequeo de rol se repite aquí.
    const supabaseSesion = crearClienteServidorConSesion();
    const {
      data: { user },
    } = await supabaseSesion.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { data: perfil } = await supabaseSesion
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfil?.rol !== "profesor") {
      return NextResponse.json({ error: "Solo profesores pueden subir ejercicios." }, { status: 403 });
    }

    const formData = await req.formData();
    const archivo = formData.get("pdf") as File | null;

    if (!archivo) {
      return NextResponse.json({ error: "No se recibió ningún PDF." }, { status: 400 });
    }

    const supabase = crearClienteServidor();

    const bytes = await archivo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 0. Evitar reprocesar el mismo PDF dos veces: si ya existe un tema con
    // el mismo hash del archivo, no se vuelve a subir ni a mandar a Claude.
    const pdfHash = createHash("sha256").update(buffer).digest("hex");
    const { data: temaExistente } = await supabase
      .from("temas")
      .select("id, titulo")
      .eq("pdf_hash", pdfHash)
      .maybeSingle();

    if (temaExistente) {
      return NextResponse.json(
        {
          error: `Este PDF ya se subió antes como el tema "${temaExistente.titulo}". Si quieres agregar contenido nuevo, sube un archivo distinto.`,
        },
        { status: 409 }
      );
    }

    // 1. Subir el PDF original a Supabase Storage
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
        max_tokens: 16000,
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
        tipo_interaccion: string | null;
        parametros: unknown;
        pista: string | null;
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
        pdf_hash: pdfHash,
        creado_por: user.id,
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
      tipo_interaccion: ej.tipo_interaccion ?? null,
      parametros: ej.parametros ?? null,
      pista: ej.pista ?? null,
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
