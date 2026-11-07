/**
 * Vellum — Primitivas <Avatar /> e <AvatarStack />
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Monogramas em Newsreader sobre papel (sem fotografias nesta fase).
 */
import { cn } from "@/lib/utils";

interface AvatarProps {
  initials: string;
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  /** Realça o utilizador atual. */
  highlight?: boolean;
}

const SIZES = {
  xs: "size-5 text-[9.5px]",
  sm: "size-6 text-[10.5px]",
  md: "size-8 text-[13px]",
};

export function Avatar({ initials, name, size = "sm", className, highlight }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        "grid shrink-0 place-items-center rounded-md border bg-elevated font-serif leading-none text-primary",
        highlight ? "border-accent-primary/60" : "border-subtle",
        SIZES[size],
        className,
      )}
    >
      <span aria-hidden="true">{initials}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

interface AvatarStackProps {
  people: ReadonlyArray<{ userId: string; initials: string; name: string }>;
  max?: number;
  size?: AvatarProps["size"];
  currentUserId?: string;
  className?: string;
}

export function AvatarStack({ people, max = 4, size = "sm", currentUserId, className }: AvatarStackProps) {
  const visible = people.slice(0, max);
  const rest = people.length - visible.length;
  return (
    <span className={cn("flex items-center gap-0.5", className)}>
      {visible.map((p) => (
        <Avatar
          key={p.userId}
          initials={p.initials}
          name={p.name}
          size={size}
          highlight={p.userId === currentUserId}
        />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "nums grid place-items-center rounded-md border border-subtle bg-surface font-mono text-muted",
            SIZES[size],
          )}
          title={`Mais ${rest}`}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
