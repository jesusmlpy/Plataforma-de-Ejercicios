# Plataforma de Ejercicios — Starter Kit

Este es el arranque del proyecto: subes un PDF de ejercicios, la plataforma lo manda
a la API de Claude para extraer los ejercicios automáticamente (tema, nivel, enunciado,
respuesta), los guarda en Supabase, y aparecen solos en la página principal — sin tocar
código cada vez que agregas un tema nuevo.

## Qué ya está armado

- `supabase/schema.sql` — todas las tablas (temas, ejercicios, perfiles, intentos) con
  seguridad a nivel de fila (RLS) ya configurada.
- `app/api/upload-pdf/route.ts` — recibe el PDF, llama a Claude, guarda todo en Supabase.
- `app/api/calificar/route.ts` — califica con IA las respuestas de tipo "abierta"
  (explicaciones/demostraciones).
- `app/page.tsx` — lista de temas, generada dinámicamente desde la base de datos.
- `app/tema/[id]/page.tsx` — ejercicios de un tema, agrupados por nivel de dificultad.
- `app/admin/upload/page.tsx` — formulario para que el profesor suba el PDF.

## Lo que falta (siguiente paso, ideal para hacer en Claude Code)

1. **Autenticación real** — ahora mismo cualquiera puede subir un PDF desde
   `/admin/upload`. Falta conectar `supabase.auth` (login con correo o Google) y
   proteger esa ruta para que solo profesores puedan entrar.
2. **Bucket de Storage** — crear el bucket `pdfs-ejercicios` en tu proyecto de Supabase
   (Storage → New bucket → público de solo lectura).
3. **Panel de progreso del profesor** — una vista que lea la tabla `intentos` y muestre
   qué alumno resolvió qué, y con qué porcentaje de aciertos.
4. **Manejo de LaTeX en pantalla** — los enunciados vienen con `$...$` para notación
   matemática; conviene agregar `react-katex` o `remark-math` para que se vea bien
   renderizado en vez de texto plano.
5. **Despliegue** — subir esto a GitHub y conectarlo a Vercel (gratis para empezar),
   agregando las variables de entorno de `.env.example` en el dashboard de Vercel.

## Cómo arrancarlo localmente

```bash
npm install
cp .env.example .env.local   # y llena tus claves reales
```

1. Crea un proyecto en [supabase.com](https://supabase.com) (gratis).
2. Copia `supabase/schema.sql` y córrelo en el SQL Editor de tu proyecto.
3. En Storage, crea un bucket llamado `pdfs-ejercicios` (público).
4. Copia tus claves de Supabase (Settings → API) y tu API key de Anthropic
   (console.anthropic.com) a `.env.local`.
5. Corre el proyecto:

```bash
npm run dev
```

6. Abre `http://localhost:3000/admin/upload` y sube tu primer PDF de ejercicios
   (por ejemplo, el de "80 Ejercicios de Números con Signo" que ya tienes).

## Stack

- **Next.js 14** (App Router) — frontend + backend en un solo proyecto.
- **Supabase** — base de datos Postgres + autenticación + storage de archivos.
- **API de Claude** — extrae ejercicios estructurados del PDF y califica respuestas abiertas.
- **Tailwind CSS** — estilos.
