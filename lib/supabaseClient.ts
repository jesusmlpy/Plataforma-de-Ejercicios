import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para usarse en componentes del lado del cliente ("use client").
// Las variables NEXT_PUBLIC_* se configuran en .env.local (ver .env.example).
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
