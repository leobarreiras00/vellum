/**
 * Vellum — Primitivas <Avatar /> e <AvatarStack />
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Monogramas em Newsreader sobre papel, ou a fotografia de perfil (256×256,
 * recortada no ProfileModal) quando existe.
 */
import { cn } from "@/lib/utils";

interface AvatarProps {
  initials: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Realça o utilizador atual. */
  highlight?: boolean;
  /** Fotografia de perfil (data URL). Sem ela, mostra o monograma. */
  src?: string | null;
}

const SIZES = {
  xs: "size-5 text-[9.5px]",
  sm: "size-6 text-[10.5px]",
  md: "size-8 text-[13px]",
  lg: "size-16 text-2xl",
  xl: "size-28 text-4xl",
};

export function Avatar({ initials, name, size = "sm", className, highlight, src }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL 256×256 guardado na base de dados
      <img
        src={src}
        alt={name}
        title={name}
        data-avatar="photo"
        className={cn(
          "shrink-0 rounded-full border object-cover",
          highlight ? "border-accent-primary/60" : "border-subtle",
          SIZES[size],
          className,
        )}
      />
    );
  }
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
  people: ReadonlyArray<{ userId: string; initials: string; name: string; avatar?: string | null }>;
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
          src={p.avatar}
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
