import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para Server Components y Route Handlers que necesitan
// saber QUIÉN está autenticado (a diferencia de supabaseServer.ts, que usa la
// service role key y no conoce ninguna sesión de usuario).
// Usa la anon key + las cookies de la petición, así que respeta RLS.
export function crearClienteServidorConSesion() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Los Server Components no pueden escribir cookies (solo Route
            // Handlers y Server Actions pueden); el middleware ya se encarga
            // de refrescar la sesión en cada request, así que ignoramos el error.
          }
        },
      },
    }
  );
}
