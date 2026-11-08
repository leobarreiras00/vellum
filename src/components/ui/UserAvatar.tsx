/**
 * Vellum — <UserAvatar /> (fotografia de perfil ou iniciais)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Usado em todos os sítios onde aparece uma pessoa: ProfileModal, Sidebar,
 * Topbar, cabeçalho do documento e Comentários. Com `avatarUrl` mostra a
 * fotografia (256×256, guardada na base de dados); sem ela, as iniciais.
 */
import { cn } from "@/lib/utils";

export interface UserAvatarPerson {
  name: string;
  initials?: string;
  avatarUrl?: string | null;
}

const SIZES = {
  xs: "size-5 text-[9.5px]",
  sm: "size-7 text-[11px]",
  md: "size-8 text-[13px]",
  lg: "size-16 text-2xl",
  xl: "size-28 text-4xl",
} as const;

export type UserAvatarSize = keyof typeof SIZES;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function UserAvatar({
  user,
  size = "sm",
  highlight = false,
  className,
}: {
  user: UserAvatarPerson;
  size?: UserAvatarSize;
  /** Realça a pessoa atual (anel terracota). */
  highlight?: boolean;
  className?: string;
}) {
  return (
    <span
      title={user.name}
      data-testid="user-avatar"
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border bg-elevated font-serif leading-none text-primary",
        highlight ? "border-accent-primary/60" : "border-subtle",
        SIZES[size],
        className,
      )}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL 256×256 guardado na base de dados
        <img
          src={user.avatarUrl}
          alt={user.name}
          data-avatar="photo"
          draggable={false}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <>
          <span aria-hidden="true">{user.initials ?? initialsOf(user.name)}</span>
          <span className="sr-only">{user.name}</span>
        </>
      )}
    </span>
  );
}
