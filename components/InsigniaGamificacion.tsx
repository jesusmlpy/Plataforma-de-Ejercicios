// Íconos propios en SVG (nada de emojis) — el render de los emojis nativos
// cambia de fuente en fuente y es lo que hacía que la insignia se viera
// genérica. Cada uno usa currentColor para heredar el color del contenedor.

function IconoNivel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        d="M12 2.5l8 4v8l-8 4-8-4v-8l8-4z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.2l2.3 2.3 4.7-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoEstrella({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        d="M12 2.7l2.7 5.6 6.1.6-4.5 4.2 1.2 6.2L12 16.2l-5.5 3.1 1.2-6.2-4.5-4.2 6.1-.6L12 2.7z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconoFuego({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        d="M12 2c.3 3-3.5 4.7-3.5 9a3.5 3.5 0 007 0c0-1.3-.6-2-1.1-2.8.2 1.5-.8 2.1-.8 2.1.4-2.5-1.2-3.9-1.6-5.6C11.8 3.7 12 2 12 2z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path
        d="M12.3 5c1.8 2.6-1.7 4.2-1.7 7.4a3.4 3.4 0 006.8 0c0-1.7-.9-2.7-1.6-3.6.3 1.8-.9 2.5-.9 2.5.5-3-1.3-4.6-2.6-6.3z"
        fill="currentColor"
      />
    </svg>
  );
}

// Insignia de gamificación global (no por ejercicio ni por tema): puntos
// totales, racha de aciertos y nivel del alumno, calculados a partir de
// perfiles.puntos_totales / racha_actual (ver app/api/gamificacion/route.ts).
export default function InsigniaGamificacion({
  puntosTotales,
  rachaActual,
}: {
  puntosTotales: number;
  rachaActual: number;
}) {
  const nivel = Math.floor(puntosTotales / 100) + 1;

  // El fuego crece y se pone más intenso entre más alta la racha.
  const tamañoFuego = rachaActual >= 7 ? "w-4 h-4" : "w-3.5 h-3.5";
  const claseFuego =
    rachaActual >= 7 ? "text-orange-300 animar-fuego" : rachaActual >= 3 ? "text-orange-300" : "text-white/70";

  return (
    <div className="flex items-center gap-2 text-sm text-white">
      <span
        title="Nivel"
        className="flex items-center gap-1.5 bg-white/15 rounded-full pl-1.5 pr-3 py-1 font-bold"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-300/30 text-violet-100">
          <IconoNivel className="w-3.5 h-3.5" />
        </span>
        {nivel}
      </span>
      <span
        title="Puntos totales"
        className="flex items-center gap-1.5 bg-white/15 rounded-full pl-1.5 pr-3 py-1 font-bold"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-300/30 text-amber-200">
          <IconoEstrella className="w-3.5 h-3.5" />
        </span>
        {puntosTotales}
      </span>
      <span
        title="Racha de aciertos"
        className="flex items-center gap-1.5 bg-white/15 rounded-full pl-1.5 pr-3 py-1 font-bold"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-300/30">
          <IconoFuego className={`transition-all duration-300 ${tamañoFuego} ${claseFuego}`} />
        </span>
        {rachaActual}
      </span>
    </div>
  );
}
