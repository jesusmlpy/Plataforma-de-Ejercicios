import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Plataforma de Ejercicios",
  description: "Ejercicios interactivos generados automáticamente desde PDFs",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-bold text-lg">
            Plataforma de Ejercicios
          </a>
          <a
            href="/admin/upload"
            className="text-sm bg-amber-500 hover:bg-amber-400 transition px-3 py-1.5 rounded"
          >
            Subir PDF (profesor)
          </a>
        </header>
        <main className="max-w-4xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
