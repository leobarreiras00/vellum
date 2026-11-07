/**
 * Vellum — <RoleGuard />
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Mostra `children` só se o utilizador tiver um dos papéis em `allowed`
 * (e, opcionalmente, a permissão `permission`). Caso contrário mostra `fallback`.
 *
 *   <RoleGuard allowed={["OWNER", "EDITOR"]} fallback={<SoLeitura />}>
 *     <BotaoEditar />
 *   </RoleGuard>
 *
 * Proteção de interface apenas: a mesma regra tem de existir no servidor.
 */
"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";
import type { EffectiveRole, Permission, PlatformRole } from "@/lib/rbac";

interface RoleGuardProps {
  /** Papéis aceites. SUPER_ADMIN passa sempre, salvo `strict`. */
  allowed?: readonly (EffectiveRole | PlatformRole)[];
  /** Permissão exigida (alternativa ou complemento a `allowed`). */
  permission?: Permission;
  /** Não deixar SUPER_ADMIN passar automaticamente. */
  strict?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({ allowed, permission, strict = false, fallback = null, children }: RoleGuardProps) {
  const { user, hasRole, can } = useAuth();
  if (!user) return <>{fallback}</>;

  const bypass = !strict && user.platformRole === "SUPER_ADMIN";
  const roleOk = !allowed || bypass || hasRole(allowed);
  const permissionOk = !permission || can(permission);

  return <>{roleOk && permissionOk ? children : fallback}</>;
}
