/**
 * Vellum — <IllustrationArt />
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { useMemo } from "react";

import { coverSrc, type CoverSpec } from "@/lib/illustrations";
import { cn } from "@/lib/utils";

export function IllustrationArt({
  spec,
  className,
  size,
  alt = "",
}: {
  spec: CoverSpec;
  className?: string;
  size?: { width: number; height: number };
  alt?: string;
}) {
  const src = useMemo(() => coverSrc(spec, size), [spec, size]);
  // eslint-disable-next-line @next/next/no-img-element -- SVG gerado localmente ou data URL guardado
  return <img src={src} alt={alt} draggable={false} className={cn("block size-full object-cover", className)} />;
}
