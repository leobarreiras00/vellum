/**
 * Vellum — Contexto de autenticação (cliente)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Recebe a sessão já resolvida no servidor (layout raiz) e expõe-a à interface,
 * com atalhos RBAC. Esconder ações aqui é só conveniência: o servidor valida
 * sempre com assertCan.
 */
"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { logoutAction } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/auth";
import {
  effectiveRole,
  hasAnyRole,
  hasPermission,
  type EffectiveRole,
  type Permission,
  type PlatformRole,
} from "@/lib/rbac";

export type AuthStatus = "authenticated" | "anonymous";

interface AuthContextValue {
  user: SessionUser | null;
  status: AuthStatus;
  role: EffectiveRole | null;
  /** Atualiza a sessão no cliente logo após entrar (antes do refresh do servidor). */
  setUser: (user: SessionUser | null) => void;
  can: (permission: Permission) => boolean;
  hasRole: (allowed: readonly (EffectiveRole | PlatformRole)[]) => boolean;
  logout: () => void;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  initialUser: SessionUser | null;
  children: ReactNode;
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [isLoggingOut, startLogout] = useTransition();

  // A sessão do servidor é a fonte de verdade: sincroniza a cada navegação.
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const can = useCallback((permission: Permission) => hasPermission(user, permission), [user]);
  const hasRole = useCallback(
    (allowed: readonly (EffectiveRole | PlatformRole)[]) => hasAnyRole(user, allowed),
    [user],
  );

  const logout = useCallback(() => {
    startLogout(async () => {
      setUser(null);
      await logoutAction();
      router.refresh();
    });
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status: user ? "authenticated" : "anonymous",
      role: user ? effectiveRole(user) : null,
      setUser,
      can,
      hasRole,
      logout,
      isLoggingOut,
    }),
    [user, can, hasRole, logout, isLoggingOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth tem de ser usado dentro de <AuthProvider>.");
  return context;
}
