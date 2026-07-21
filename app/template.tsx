"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A diferencia de layout.tsx (que persiste entre navegaciones), template.tsx
// se vuelve a montar en cada cambio de ruta — por eso es donde va la
// transición: al pasar de "/" a "/tema/[id]", o entre dos temas distintos,
// esta plantilla hace un fade + slide en vez de un salto brusco.
export default function PlantillaAnimada({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
