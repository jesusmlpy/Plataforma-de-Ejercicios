import { createClient } from "@supabase/supabase-js";

// Cliente con permisos de servicio, SOLO para usarse dentro de rutas de API
// (app/api/.../route.ts), nunca en componentes de cliente.
// La SUPABASE_SERVICE_ROLE_KEY tiene permisos totales: jamás la expongas
// con el prefijo NEXT_PUBLIC_ ni la mandes al navegador.
export function crearClienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
