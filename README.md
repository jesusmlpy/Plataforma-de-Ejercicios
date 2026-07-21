# Plataforma de Ejercicios — Starter Kit

Este es el arranque del proyecto: subes un PDF de ejercicios, la plataforma lo manda
a la API de Claude para extraer los ejercicios automáticamente (tema, nivel, enunciado,
respuesta), los guarda en Supabase, y aparecen solos en la página principal — sin tocar
código cada vez que agregas un tema nuevo.

## Qué ya está armado

- `supabase/schema.sql` — todas las tablas (temas, ejercicios, perfiles, intentos) con
  seguridad a nivel de fila (RLS) ya configurada, más un trigger que crea automáticamente
  un `perfil` (rol `alumno`) cada vez que alguien se registra.
- `app/api/upload-pdf/route.ts` — recibe el PDF, llama a Claude, guarda todo en Supabase.
  Solo acepta la petición si quien la hace está autenticado y es profesor.
- `app/api/calificar/route.ts` — califica con IA las respuestas de tipo "abierta"
  (explicaciones/demostraciones).
- `app/page.tsx` — lista de temas, generada dinámicamente desde la base de datos.
- `app/tema/[id]/page.tsx` — ejercicios de un tema, agrupados por nivel de dificultad.
- `app/admin/upload/page.tsx` — formulario para que el profesor suba el PDF.
- **Autenticación real** (`app/login`, `middleware.ts`, `lib/supabaseServerSesion.ts`):
  login/registro con correo y contraseña, botón de "Continuar con Google", y `/admin/**`
  protegido tanto por middleware (sesión) como por la página y la API (rol `profesor`).
- **LaTeX en pantalla** (`components/TextoConLatex.tsx`) — los enunciados con notación
  `$...$` se renderizan con KaTeX en vez de mostrarse como texto plano.
- **Recta numérica interactiva** (`app/tema/[id]/RectaNumericaInteractiva.tsx`) — primer
  tipo de interacción del catálogo descrito abajo; ver esa sección para el roadmap completo.

## Cómo funciona la autenticación

- **Registro/login con correo**: `app/login/page.tsx` usa `supabase.auth.signUp` /
  `signInWithPassword`. Al registrarse, el trigger `on_auth_user_created` (en
  `supabase/schema.sql`) crea la fila en `perfiles` automáticamente con `rol = 'alumno'`.
- **Login con Google**: mismo formulario, botón "Continuar con Google" →
  `supabase.auth.signInWithOAuth({ provider: "google" })`. Para que funcione:
  1. En el [dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto →
     **Authentication → Providers → Google**, actívalo y pega tu Client ID/Secret de
     Google Cloud Console.
  2. En Google Cloud Console, agrega como "Authorized redirect URI":
     `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
  3. En Supabase → **Authentication → URL Configuration**, agrega tu dominio (local y de
     Vercel) a "Redirect URLs", por ejemplo `http://localhost:3000/auth/callback` y
     `https://tu-app.vercel.app/auth/callback`.
- **Volver a alguien profesor**: no hay UI para esto (a propósito, para no dejar que
  cualquiera se autoasigne el rol). Se hace a mano desde Supabase → **Table Editor →
  perfiles**, cambiando `rol` a `profesor` en la fila de ese usuario, o con SQL:
  ```sql
  update perfiles set rol = 'profesor' where id = 'uuid-del-usuario';
  ```
- **Protección de `/admin`**: `middleware.ts` redirige a `/login` a quien no tenga sesión.
  `app/admin/upload/page.tsx` y `app/api/upload-pdf/route.ts` además verifican que el
  `rol` en `perfiles` sea `profesor` — estar logueado no es suficiente.

## Arquitectura: tipos de interacción (roadmap)

Hoy todos los ejercicios se responden igual: un input de texto que se califica por
`tipo_respuesta` (`numerica` | `abierta` | `opcion_multiple`, ver `app/api/calificar/route.ts`
y `EjercicioInteractivo.tsx`). Eso funciona para aritmética, pero no alcanza para temas como
geometría o funciones, donde el alumno necesita ubicar puntos, graficar, o arrastrar elementos.

La idea para escalar a esos temas **sin reescribir el sistema cada vez que se agrega uno
nuevo** es agregar, además de `tipo_respuesta` (cómo se califica), un campo independiente
`tipo_interaccion` + `parametros` (jsonb) en la tabla `ejercicios` que diga **qué componente
visual usar** para responder. Cada tipo nuevo es un componente de React parametrizado y
autocontenido — agregarlo no toca el resto de los ejercicios ni de los temas existentes.

Catálogo (columna `tipo_interaccion`, ver el `check` en `supabase/schema.sql`):

| `tipo_interaccion`        | Qué hace                                       | Estado |
| -------------------------- | ----------------------------------------------- | ------ |
| `null` (default)           | Input de texto libre — el flujo que ya existía  | ✅ Construido |
| `recta_numerica`           | Ubicar uno o más puntos en una recta numérica    | ✅ Construido — `app/tema/[id]/RectaNumericaInteractiva.tsx` |
| `plano_cartesiano`         | Ubicar puntos o graficar en una cuadrícula (x, y) | Roadmap |
| `figura_geometrica`        | Vértices, lados o áreas de figuras               | Roadmap — evaluar la API de GeoGebra antes de construir un motor de geometría propio |
| `grafica_funcion`          | Dibujar o leer curvas de funciones                | Roadmap — también candidato a GeoGebra en vez de un motor propio |
| `relleno_blancos`          | Completar espacios dentro del enunciado           | Roadmap |
| `arrastrar_emparejar`      | Arrastrar elementos para emparejarlos             | Roadmap |
| `opcion_multiple_visual`   | Opción múltiple con imágenes o diagramas          | Roadmap |

`parametros` de `recta_numerica` (el único implementado por ahora):

```json
{ "min": -10, "max": 10, "valores": [-3, 5] }
```

Para agregar un tipo nuevo del catálogo cuando haga falta:

1. Crear su componente de React (parametrizado, en su propio archivo — mismo patrón que
   `RectaNumericaInteractiva.tsx`).
2. Agregar una rama en `EjercicioInteractivo.tsx` para `ejercicio.tipo_interaccion === '<tipo_nuevo>'`.
3. Agregar la regla correspondiente al prompt de extracción en `app/api/upload-pdf/route.ts`
   para que Claude clasifique ese tipo y arme el `parametros` correcto al leer el PDF.
4. Nada más del sistema necesita cambiar — los ejercicios de otros tipos e interacciones
   siguen funcionando igual.

## Lo que falta (siguiente paso, ideal para hacer en Claude Code)

1. **Bucket de Storage** — crear el bucket `pdfs-ejercicios` en tu proyecto de Supabase
   (Storage → New bucket → público de solo lectura).
2. **Panel de progreso del profesor** — una vista que lea la tabla `intentos` y muestre
   qué alumno resolvió qué, y con qué porcentaje de aciertos.
3. **Resto del catálogo de tipos de interacción** — `plano_cartesiano`, `figura_geometrica`,
   `grafica_funcion`, `relleno_blancos`, `arrastrar_emparejar`, `opcion_multiple_visual`
   (ver la sección de arriba).
4. **Confirmación de correo** — si activas "Confirm email" en Supabase (recomendado en
   producción), el usuario debe dar clic en el enlace del correo antes de poder entrar;
   ya está soportado (`emailRedirectTo` apunta a `/auth/callback`), solo actívalo en
   Authentication → Providers → Email.

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
5. En Supabase → **Authentication → URL Configuration**, agrega
   `http://localhost:3000/auth/callback` a "Redirect URLs" (si no lo agregas, el login
   con Google o la confirmación de correo no van a redirigir bien).
6. Corre el proyecto:

```bash
npm run dev
```

7. Abre `http://localhost:3000/login` y crea tu cuenta. Luego vuélvete profesor tú mismo
   siguiendo el paso de "Volver a alguien profesor" de arriba, y sube tu primer PDF
   desde `http://localhost:3000/admin/upload` (por ejemplo, el de "80 Ejercicios de
   Números con Signo" que ya tienes).

## Despliegue a Vercel

1. Sube este repo a GitHub (`git push`).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
   Vercel detecta Next.js automáticamente, no hace falta configurar el build.
3. En **Settings → Environment Variables** del proyecto de Vercel, agrega las mismas
   cuatro variables de tu `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
4. Deploy. Vercel te da un dominio tipo `https://tu-app.vercel.app`.
5. **Importante — actualiza Supabase con tu dominio real de Vercel**, si no el login se
   queda pegado o redirige a `localhost`:
   - Authentication → URL Configuration → **Site URL**: `https://tu-app.vercel.app`
   - Authentication → URL Configuration → **Redirect URLs**: agrega
     `https://tu-app.vercel.app/auth/callback`
   - Si usas login con Google, agrega también esa URL en Google Cloud Console si tu
     provider la valida por dominio (el redirect URI de Google en sí no cambia, sigue
     siendo el de `supabase.co`).
6. Cada vez que hagas `git push` a la rama principal, Vercel vuelve a desplegar solo.

## Stack

- **Next.js 14** (App Router) — frontend + backend en un solo proyecto.
- **Supabase** — base de datos Postgres + autenticación (correo y Google) + storage de
  archivos.
- **API de Claude** — extrae ejercicios estructurados del PDF y califica respuestas abiertas.
- **Tailwind CSS** — estilos.
