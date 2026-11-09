/**
 * Vellum — Perfis de demonstração RBAC
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Contas semeadas para testar a matriz RBAC com um clique.
 *
 *  - Desenvolvimento e testes: sempre ativas, com as palavras-passe fixas abaixo
 *    (públicas de propósito: só existem neste modo).
 *  - Produção: desligadas. Só arrancam com `VELLUM_DEMO_AUTH=true` E uma
 *    `VELLUM_DEMO_PASSWORD` própria (12+ caracteres, definida na plataforma).
 *    As palavras-passe fixas deste ficheiro NUNCA são aceites em produção, e as
 *    contas de demonstração nunca são SUPER_ADMIN em produção.
 */
import type { PlatformRole, WorkspaceRole } from "@/lib/rbac";
import type { ThemeId } from "@/lib/themes";

export interface DemoProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  /** Palavra-passe de desenvolvimento (pública). Em produção vale `VELLUM_DEMO_PASSWORD`. */
  password: string;
  platformRole: PlatformRole;
  workspaceRole: WorkspaceRole;
  theme: ThemeId;
  /** Linha curta para o seletor. */
  blurb: string;
}

export const DEMO_WORKSPACE_NAME = "Atelier Vellum";
export const DEMO_PASSWORD_MIN_LENGTH = 12;

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

const isProduction = () => process.env.NODE_ENV === "production";

/** Palavra-passe de demonstração definida na plataforma (produção), ou `null`. */
export function demoPasswordFromEnv(): string | null {
  const value = process.env.VELLUM_DEMO_PASSWORD?.trim();
  if (!value || value.length < DEMO_PASSWORD_MIN_LENGTH) return null;
  // Uma palavra-passe que já é pública (está neste repositório) não serve.
  if (DEMO_PROFILES.some((p) => p.password === value)) return null;
  return value;
}

/**
 * Avaliado no servidor. Produção exige a flag explícita E a palavra-passe própria;
 * sem ela os perfis ficam desligados, mesmo com `VELLUM_DEMO_AUTH=true`.
 */
export function isDemoAuthEnabled(): boolean {
  const flag = process.env.VELLUM_DEMO_AUTH;
  if (flag === "false") return false;
  if (isProduction()) return flag === "true" && demoPasswordFromEnv() !== null;
  return true;
}

/** Palavra-passe com que o perfil é semeado neste ambiente. */
export function demoPasswordFor(profile: DemoProfile): string {
  return isProduction() ? (demoPasswordFromEnv() ?? randomUnusablePassword()) : profile.password;
}

/**
 * Em produção as contas de demonstração nunca administram a plataforma, salvo
 * `VELLUM_DEMO_SUPER_ADMIN=true` (só para a suite E2E, que valida o papel
 * Super Admin; nunca numa demonstração pública).
 */
export function demoPlatformRole(profile: DemoProfile): PlatformRole {
  const keep = process.env.VELLUM_DEMO_SUPER_ADMIN === "true";
  return isProduction() && !keep && profile.platformRole === "SUPER_ADMIN" ? "USER" : profile.platformRole;
}

/**
 * Verdadeiro se `password` é uma das palavras-passe públicas deste ficheiro
 * e o ambiente é de produção — nesse caso a conta deve recusar a entrada.
 */
export function isCompromisedDemoPassword(userId: string, password: string): boolean {
  if (!isProduction()) return false;
  const profile = DEMO_PROFILES.find((p) => p.id === userId);
  return Boolean(profile && profile.password === password);
}

function randomUnusablePassword(): string {
  return `x-${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

/** Rótulo do perfil, ex.: "Super Admin / Owner". */
export function demoRoleTag(profile: Pick<DemoProfile, "platformRole" | "workspaceRole">): string {
  const workspace = profile.workspaceRole.charAt(0) + profile.workspaceRole.slice(1).toLowerCase();
  return profile.platformRole === "SUPER_ADMIN" ? `Super Admin / ${workspace}` : workspace;
}
