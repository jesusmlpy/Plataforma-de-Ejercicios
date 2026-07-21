"use client";

import { useEffect, useState } from "react";

export type ExpresionMascota = "neutral" | "feliz" | "triste";

// Personaje simple en SVG (nada de imágenes externas). Las tres expresiones
// viven todas en el mismo SVG, apiladas, y se cruzan con transición de
// opacidad — así el cambio de cara es una transición suave, no un salto.
export default function Mascota({
  expresion,
  size = 56,
}: {
  expresion: ExpresionMascota;
  size?: number;
}) {
  // Un pequeño rebote cada vez que cambia la expresión.
  const [rebotando, setRebotando] = useState(false);

  useEffect(() => {
    setRebotando(true);
    const t = setTimeout(() => setRebotando(false), 300);
    return () => clearTimeout(t);
  }, [expresion]);

  const colorCuerpo =
    expresion === "feliz" ? "#34d399" : expresion === "triste" ? "#94a3b8" : "#8b5cf6";

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`transition-transform duration-300 ease-out ${
        rebotando ? "scale-110" : "scale-100"
      }`}
      aria-hidden="true"
    >
      <circle cx="60" cy="62" r="46" fill={colorCuerpo} className="transition-colors duration-500" />

      {/* Mejillas, solo visibles al estar feliz */}
      <circle
        cx="32"
        cy="72"
        r="7"
        fill="#fca5a5"
        className={`transition-opacity duration-300 ${expresion === "feliz" ? "opacity-70" : "opacity-0"}`}
      />
      <circle
        cx="88"
        cy="72"
        r="7"
        fill="#fca5a5"
        className={`transition-opacity duration-300 ${expresion === "feliz" ? "opacity-70" : "opacity-0"}`}
      />

      {/* Cejas, solo visibles al estar triste */}
      <path
        d="M 33 42 L 47 47"
        stroke="#1e293b"
        strokeWidth="3"
        strokeLinecap="round"
        className={`transition-opacity duration-300 ${expresion === "triste" ? "opacity-100" : "opacity-0"}`}
      />
      <path
        d="M 87 42 L 73 47"
        stroke="#1e293b"
        strokeWidth="3"
        strokeLinecap="round"
        className={`transition-opacity duration-300 ${expresion === "triste" ? "opacity-100" : "opacity-0"}`}
      />

      {/* Ojos: puntos redondos (neutral/triste) vs. arcos felices, cruzados con opacidad */}
      <circle
        cx="42"
        cy="55"
        r="6"
        fill="#1e293b"
        className={`transition-opacity duration-300 ${expresion === "feliz" ? "opacity-0" : "opacity-100"}`}
      />
      <circle
        cx="78"
        cy="55"
        r="6"
        fill="#1e293b"
        className={`transition-opacity duration-300 ${expresion === "feliz" ? "opacity-0" : "opacity-100"}`}
      />
      <path
        d="M 34 57 Q 42 47 50 57"
        stroke="#1e293b"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        className={`transition-opacity duration-300 ${expresion === "feliz" ? "opacity-100" : "opacity-0"}`}
      />
      <path
        d="M 70 57 Q 78 47 86 57"
        stroke="#1e293b"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        className={`transition-opacity duration-300 ${expresion === "feliz" ? "opacity-100" : "opacity-0"}`}
      />

      {/* Boca: una por expresión, cruzadas con opacidad */}
      <path
        d="M 40 78 Q 60 82 80 78"
        stroke="#1e293b"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        className={`transition-opacity duration-300 ${expresion === "neutral" ? "opacity-100" : "opacity-0"}`}
      />
      <path
        d="M 38 76 Q 60 98 82 76"
        stroke="#1e293b"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        className={`transition-opacity duration-300 ${expresion === "feliz" ? "opacity-100" : "opacity-0"}`}
      />
      <path
        d="M 40 90 Q 60 76 80 90"
        stroke="#1e293b"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        className={`transition-opacity duration-300 ${expresion === "triste" ? "opacity-100" : "opacity-0"}`}
      />
    </svg>
  );
}
