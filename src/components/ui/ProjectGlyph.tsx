/**
 * Vellum — Ícone de projeto (lista fechada lucide-react)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import {
  BookOpen,
  Compass,
  FlaskConical,
  Layers,
  Library,
  Lightbulb,
  PenTool,
  Target,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { InkColor, ProjectIcon } from "@/lib/workspace-types";

export const PROJECT_ICON_COMPONENTS: Record<ProjectIcon, LucideIcon> = {
  layers: Layers,
  compass: Compass,
  target: Target,
  "book-open": BookOpen,
  "pen-tool": PenTool,
  library: Library,
  lightbulb: Lightbulb,
  flask: FlaskConical,
};

interface ProjectGlyphProps {
  icon: ProjectIcon;
  color: InkColor;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "size-5 rounded-[5px] [&_svg]:size-3",
  md: "size-8 rounded-lg [&_svg]:size-4",
  lg: "size-11 rounded-xl [&_svg]:size-5",
};

export function ProjectGlyph({ icon, color, size = "md", className }: ProjectGlyphProps) {
  const Icon = PROJECT_ICON_COMPONENTS[icon];
  return (
    <span
      data-ink={color}
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center border border-ink/25 bg-ink/[0.08] text-ink",
        SIZES[size],
        className,
      )}
    >
      <Icon strokeWidth={1.6} />
    </span>
  );
}
