/**
 * Vellum — Perfis de demonstração RBAC
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Contas semeadas no motor de sessão provisório para testar a matriz RBAC com
 * um clique. Desativadas em produção, salvo VELLUM_DEMO_AUTH="true".
 * As palavras-passe são públicas de propósito: só existem neste modo.
 */
import type { PlatformRole, WorkspaceRole } from "@/lib/rbac";
import type { ThemeId } from "@/lib/themes";

export interface DemoProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  platformRole: PlatformRole;
  workspaceRole: WorkspaceRole;
  theme: ThemeId;
  /** Linha curta para o seletor. */
  blurb: string;
}

export const DEMO_WORKSPACE_NAME = "Atelier Vellum";

export const DEMO_PROFILES: readonly DemoProfile[] = [
  {
    id: "demo-leo",
    name: "Leonardo Barreiras",
    username: "leonardo_barreiras",
    email: "leonardo@vellum.pt",
    password: "Atelier-2026",
    platformRole: "SUPER_ADMIN",
    workspaceRole: "OWNER",
    theme: "warm-cream",
    blurb: "Administra a plataforma e o atelier.",
  },
  {
    id: "demo-ana",
    name: "Ana Silva",
    username: "ana.silva",
    email: "ana@vellum.local",
    password: "Editora-2026",
    platformRole: "USER",
    workspaceRole: "EDITOR",
    theme: "sage-paper",
    blurb: "Escreve e edita; elimina só o que é seu.",
  },
  {
    id: "demo-marta",
    name: "Marta Rocha",
    username: "marta.rocha",
    email: "marta@vellum.local",
    password: "Revisora-2026",
    platformRole: "USER",
    workspaceRole: "COMMENTER",
    theme: "sand-dune",
    blurb: "Revê e comenta, sem alterar o texto.",
  },
  {
    id: "demo-pedro",
    name: "Pedro Costa",
    username: "pedro.costa",
    email: "pedro@vellum.local",
    password: "Leitor-2026",
    platformRole: "USER",
    workspaceRole: "VIEWER",
    theme: "nordic-slate",
    blurb: "Apenas leitura.",
  },
];

/** Avaliado no servidor; o resultado é passado ao cliente como prop. */
export function isDemoAuthEnabled(): boolean {
  const flag = process.env.VELLUM_DEMO_AUTH;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return process.env.NODE_ENV !== "production";
}

/** Rótulo do perfil, ex.: "Super Admin / Owner". */
export function demoRoleTag(profile: Pick<DemoProfile, "platformRole" | "workspaceRole">): string {
  const workspace = profile.workspaceRole.charAt(0) + profile.workspaceRole.slice(1).toLowerCase();
  return profile.platformRole === "SUPER_ADMIN" ? `Super Admin / ${workspace}` : workspace;
}
