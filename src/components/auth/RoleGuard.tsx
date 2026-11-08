/**
 * Vellum — <RoleGuard />
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Mostra `children` só se o utilizador tiver um dos papéis em `allowed`
 * (e, opcionalmente, a permissão `permission`). Caso contrário mostra `fallback`.
 *
 *   <RoleGuard allowed={["OWNER", "EDITOR"]} fallback={<SoLeitura />}>
 *     <BotaoEditar />
 *   </RoleGuard>
 *
 * Num projeto, passe `subject` (de useWorkspace().subjectFor(projectId)) para
 * avaliar com o papel de projeto, que pode restringir o papel do workspace.
 *
 * Proteção de interface apenas: a mesma regra tem de existir no servidor.
 */
"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  hasAnyRole,
  hasPermission,
  type EffectiveRole,
  type Permission,
  type PlatformRole,
  type RbacSubject,
} from "@/lib/rbac";

interface RoleGuardProps {
  /** Papéis aceites. SUPER_ADMIN passa sempre, salvo `strict`. */
  allowed?: readonly (EffectiveRole | PlatformRole)[];
  /** Permissão exigida (alternativa ou complemento a `allowed`). */
  permission?: Permission;
  /** Não deixar SUPER_ADMIN passar automaticamente. */
  strict?: boolean;
  /** Sujeito alternativo (ex.: papel efetivo dentro de um projeto). */
  subject?: RbacSubject | null;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({ allowed, permission, strict = false, subject, fallback = null, children }: RoleGuardProps) {
  const { user } = useAuth();
  const who = subject === undefined ? user : subject;
  if (!who) return <>{fallback}</>;

  const bypass = !strict && who.platformRole === "SUPER_ADMIN";
  const roleOk = !allowed || bypass || hasAnyRole(who, allowed);
  const permissionOk = !permission || hasPermission(who, permission);

  return <>{roleOk && permissionOk ? children : fallback}</>;
}
