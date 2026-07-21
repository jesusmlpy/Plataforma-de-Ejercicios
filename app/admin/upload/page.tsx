import { redirect } from "next/navigation";
import { crearClienteServidorConSesion } from "@/lib/supabaseServerSesion";
import SubirPDFForm from "./SubirPDFForm";

// El middleware ya bloquea /admin para quien no tiene sesión; aquí además
// comprobamos el rol, porque estar logueado no basta — hay que ser profesor.
export default async function PaginaSubirPDF() {
  const supabase = crearClienteServidorConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirigido_de=/admin/upload");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "profesor") {
    return (
      <p className="text-rose-600">
        Esta sección es solo para profesores. Si crees que deberías tener acceso, pide a un
        administrador que cambie tu rol a "profesor" en la tabla <code>perfiles</code> desde el
        dashboard de Supabase.
      </p>
    );
  }

  return <SubirPDFForm />;
}
