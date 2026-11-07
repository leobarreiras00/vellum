/**
 * Vellum — Contexto do Workspace (cliente)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Recebe do layout (servidor) o instantâneo do workspace e mantém-no
 * sincronizado: cada Server Action devolve o instantâneo atualizado, que
 * substitui o local. Expõe ainda avisos (toasts) e as verificações RBAC por
 * projeto. Esconder ações aqui é conveniência; o servidor valida sempre.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import type { WorkspaceActionResult } from "@/app/(workspace)/actions";
import { useAuth } from "@/context/AuthContext";
import { effectiveRole, hasPermission, type EffectiveRole, type Permission, type RbacSubject } from "@/lib/rbac";
import { projectSubject, type WorkspaceSnapshot } from "@/lib/workspace-types";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "error";
}

interface WorkspaceContextValue {
  snapshot: WorkspaceSnapshot;
  /** Executa uma Server Action e aplica o instantâneo devolvido. */
  run: <T>(
    action: () => Promise<WorkspaceActionResult<T>>,
    options?: { success?: string; silent?: boolean },
  ) => Promise<WorkspaceActionResult<T>>;
  isPending: boolean;
  /** Sujeito RBAC no contexto de um projeto (papel de projeto restringe). */
  subjectFor: (projectId?: string | null) => RbacSubject | null;
  roleIn: (projectId?: string | null) => EffectiveRole | null;
  can: (permission: Permission, projectId?: string | null) => boolean;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  initial: WorkspaceSnapshot;
  children: ReactNode;
}

export function WorkspaceProvider({ initial, children }: WorkspaceProviderProps) {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Novo instantâneo do servidor (refresh, troca de perfil): passa a mandar.
  useEffect(() => {
    setSnapshot(initial);
  }, [initial]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = ++toastId.current;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const run = useCallback<WorkspaceContextValue["run"]>(
    (action, options) =>
      new Promise((resolve) => {
        startTransition(async () => {
          const result = await action();
          if (result.ok) {
            setSnapshot(result.snapshot);
            if (options?.success) notify(options.success);
          } else if (!options?.silent) {
            notify(result.error, "error");
          }
          resolve(result);
        });
      }),
    [notify],
  );

  const subjectFor = useCallback(
    (projectId?: string | null): RbacSubject | null => {
      if (!user) return null;
      const project = projectId ? snapshot.projects.find((p) => p.id === projectId) : null;
      return projectSubject(user, project);
    },
    [user, snapshot.projects],
  );

  const roleIn = useCallback(
    (projectId?: string | null) => {
      const subject = subjectFor(projectId);
      return subject ? effectiveRole(subject) : null;
    },
    [subjectFor],
  );

  const can = useCallback(
    (permission: Permission, projectId?: string | null) => hasPermission(subjectFor(projectId), permission),
    [subjectFor],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({ snapshot, run, isPending, subjectFor, roleIn, can, toasts, notify, dismiss }),
    [snapshot, run, isPending, subjectFor, roleIn, can, toasts, notify, dismiss],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace tem de ser usado dentro de <WorkspaceProvider>.");
  return context;
}
