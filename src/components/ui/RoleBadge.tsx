/**
 * Vellum — Rótulo do papel RBAC
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { ROLE_LABELS, type EffectiveRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  role: EffectiveRole | null;
  /** Mostra o identificador técnico (mono) em vez do rótulo PT-PT. */
  technical?: boolean;
  className?: string;
  title?: string;
}

export function RoleBadge({ role, technical = false, className, title }: RoleBadgeProps) {
  if (!role) return null;
  return (
    <span
      title={title}
      data-role={role}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-subtle bg-surface px-1.5 py-0.5 text-[11px] text-primary",
        technical ? "font-mono" : "font-sans font-medium",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-primary" />
      {technical ? role : ROLE_LABELS[role]}
    </span>
  );
}
