/**
 * Vellum — Sidebar editorial do Workspace
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Fundo bg-surface, borda capilar, retrátil (272 ↔ 60px) com a curva
 * editorial. Contém: monograma, troca rápida de perfil RBAC (demonstração),
 * pesquisa ⌘K, navegação principal e a árvore hierárquica de projetos e
 * páginas, com criação de subpáginas protegida por permissão.
 */
"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { demoLoginAction } from "@/app/(auth)/actions";
import { createDocumentAction } from "@/app/(workspace)/actions";
import { useShell } from "@/components/layout/ShellContext";
import { VellumMark } from "@/components/layout/VellumMark";
import { Avatar } from "@/components/ui/Avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { openProfile, useCurrentAvatar } from "@/components/profile/ProfileModal";
import { openSupport } from "@/components/support/SupportModal";
import { ProjectGlyph } from "@/components/ui/ProjectGlyph";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ROLE_LABELS, effectiveRole, type EffectiveRole } from "@/lib/rbac";
import { EASE_EDITORIAL, cn } from "@/lib/utils";
import { parseWorkspacePath, routes } from "@/lib/workspace-routes";
import { documentAncestors, type DocumentView, type ProjectView } from "@/lib/workspace-types";

export interface SwitchableProfile {
  id: string;
  name: string;
  initials: string;
  role: EffectiveRole;
  tag: string;
  blurb: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  demoProfiles: SwitchableProfile[];
  onProfileSwitched: () => void;
}

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/notes", label: "Notas Rápidas", icon: StickyNote },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/settings", label: "Definições", icon: Settings2 },
];

const WIDTH_OPEN = 272;
const WIDTH_COLLAPSED = 60;

export function Sidebar(props: SidebarProps) {
  const reduce = useReducedMotion();
  const { mobileOpen, onCloseMobile, collapsed } = props;

  // Esc fecha a gaveta móvel.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseMobile();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Desktop */}
      <motion.aside
        aria-label="Navegação do workspace"
        data-print="hide"
        initial={false}
        animate={{ width: collapsed ? WIDTH_COLLAPSED : WIDTH_OPEN }}
        transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE_EDITORIAL }}
        className="hidden shrink-0 overflow-hidden border-r border-subtle bg-surface md:block"
        data-collapsed={collapsed ? "true" : "false"}
      >
        <SidebarContent {...props} collapsed={collapsed} />
      </motion.aside>

      {/* Móvel: gaveta sobreposta */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.button
              type="button"
              aria-label="Fechar navegação"
              className="absolute inset-0 bg-primary/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
            />
            <motion.aside
              aria-label="Navegação do workspace"
              data-print="hide"
              className="absolute inset-y-0 left-0 w-[min(300px,86vw)] border-r border-subtle bg-surface shadow-sheet"
              initial={reduce ? { opacity: 0 } : { x: "-100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-100%", transition: { duration: 0.2, ease: EASE_EDITORIAL } }}
              transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
            >
              <SidebarContent {...props} collapsed={false} isMobile />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ==========================================================================
   Conteúdo
   ========================================================================== */

function SidebarContent({
  collapsed,
  onToggleCollapsed,
  onCloseMobile,
  demoProfiles,
  onProfileSwitched,
  isMobile = false,
}: SidebarProps & { isMobile?: boolean }) {
  const pathname = usePathname();
  const { openPalette, openProjectForm } = useShell();
  const { snapshot, can } = useWorkspace();

  return (
    <div
      className={cn("flex h-full flex-col", isMobile ? "w-full" : collapsed ? "w-[60px]" : "w-[272px]")}
      data-sidebar-content=""
    >
      {/* Topo: monograma + recolher */}
      <div
        className={cn("flex h-12 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pl-4 pr-2")}
      >
        {!collapsed && (
          <Link
            href="/dashboard"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <VellumMark className="text-[17px]" />
          </Link>
        )}
        <button
          type="button"
          onClick={isMobile ? onCloseMobile : onToggleCollapsed}
          aria-label={isMobile ? "Fechar navegação" : collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          title={isMobile ? "Fechar" : collapsed ? "Expandir (⌘\\)" : "Recolher (⌘\\)"}
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-canvas/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-4" strokeWidth={1.6} />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-4" strokeWidth={1.6} />
          )}
        </button>
      </div>

      <div className={cn("space-y-1.5 pb-3", collapsed ? "px-2" : "px-3")}>
        <ProfileSwitcher collapsed={collapsed} profiles={demoProfiles} onSwitched={onProfileSwitched} />

        <button
          type="button"
          onClick={openPalette}
          aria-label="Pesquisar (⌘K)"
          title="Pesquisar (⌘K)"
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-lg border border-subtle bg-canvas/70 text-sm text-muted transition-colors duration-150",
            "hover:border-accent-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            collapsed ? "justify-center px-0" : "px-2.5",
          )}
        >
          <Search aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.6} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Pesquisar…</span>
              <kbd>⌘K</kbd>
            </>
          )}
        </button>
      </div>

      <nav aria-label="Principal" className={cn("border-t border-subtle py-2", collapsed ? "px-2" : "px-3")}>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex h-8 items-center gap-2.5 rounded-lg text-sm transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                    collapsed ? "justify-center" : "px-2.5",
                    active
                      ? "bg-elevated text-primary shadow-paper"
                      : "text-muted hover:bg-canvas/70 hover:text-primary",
                  )}
                >
                  {active && !collapsed && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent-primary"
                    />
                  )}
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
                  <span className={cn(collapsed && "sr-only")}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => openSupport("faq")}
              title={collapsed ? "Ajuda e suporte" : undefined}
              data-testid="sidebar-support"
              className={cn(
                "relative flex h-8 w-full items-center gap-2.5 rounded-lg text-sm text-muted transition-colors duration-150 hover:bg-canvas/70 hover:text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                collapsed ? "justify-center" : "px-2.5",
              )}
            >
              <LifeBuoy aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
              <span className={cn(collapsed && "sr-only")}>Ajuda e suporte</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Árvore de projetos */}
      <div
        className={cn("min-h-0 flex-1 overflow-y-auto border-t border-subtle pb-4 pt-3", collapsed ? "px-2" : "px-3")}
      >
        {collapsed ? (
          <ul className="space-y-1">
            {snapshot.projects.map((project) => (
              <li key={project.id} className="flex justify-center">
                <Link
                  href={routes.project(project.id)}
                  title={project.name}
                  className="rounded-lg p-1 transition-colors hover:bg-canvas/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  <ProjectGlyph icon={project.icon} color={project.color} size="sm" />
                  <span className="sr-only">{project.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between pl-2.5 pr-1">
              <p className="eyebrow" id="sidebar-projects-label">
                Projetos
              </p>
              {can("project:manage") && (
                <button
                  type="button"
                  onClick={() => openProjectForm()}
                  aria-label="Novo projeto"
                  title="Novo projeto"
                  className="grid size-6 place-items-center rounded-md text-muted transition-colors hover:bg-canvas/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  <Plus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
                </button>
              )}
            </div>
            <ProjectTree projects={snapshot.projects} documents={snapshot.documents} />
          </>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Troca rápida de perfil RBAC (modo de demonstração)
   ========================================================================== */

function ProfileSwitcher({
  collapsed,
  profiles,
  onSwitched,
}: {
  collapsed: boolean;
  profiles: SwitchableProfile[];
  onSwitched: () => void;
}) {
  const { user, setUser } = useAuth();
  const { snapshot, notify } = useWorkspace();
  const [isPending, startTransition] = useTransition();
  const avatar = useCurrentAvatar();
  if (!user) return null;
  const role = effectiveRole(user);

  const card = (
    <button
      type="button"
      onClick={() => openProfile()}
      title={collapsed ? `${user.name} — abrir perfil` : undefined}
      aria-label={`Abrir perfil de ${user.name}`}
      data-testid="open-profile"
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors duration-150 hover:bg-canvas/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        collapsed && "justify-center",
      )}
    >
      <UserAvatar user={{ name: user.name, initials: user.initials, avatarUrl: avatar }} size="md" />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium leading-tight text-primary">{user.name}</span>
          <span className="block truncate text-[11px] leading-tight text-muted">
            {snapshot.workspace.name} · {role ? ROLE_LABELS[role] : "—"}
          </span>
        </span>
      )}
    </button>
  );

  if (profiles.length === 0 || collapsed) {
    return <div className="flex items-center">{card}</div>;
  }

  function switchTo(profileId: string, close: () => void) {
    close();
    if (profileId === user?.userId) return;
    startTransition(async () => {
      const result = await demoLoginAction(profileId);
      if (!result.ok) {
        notify(result.error ?? "Não foi possível trocar de perfil.", "error");
        return;
      }
      setUser(result.data);
      onSwitched();
      const next = effectiveRole(result.data);
      notify(`Agora como ${result.data.name} (${next ? ROLE_LABELS[next] : "—"}).`);
    });
  }

  return (
    <div className="flex items-center gap-1">
      {card}
      <Popover
        label="Trocar de perfil RBAC"
        role="menu"
        panelClassName="w-[264px]"
        trigger={(triggerProps) => (
          <button
            type="button"
            {...triggerProps}
            disabled={isPending}
            title="Trocar de perfil (demonstração RBAC)"
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-canvas/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:scale-[0.97] disabled:opacity-60"
          >
            <ChevronsUpDown aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            <span className="sr-only">Trocar de perfil RBAC</span>
          </button>
        )}
      >
        {(close) => (
          <div>
            <p className="eyebrow px-2.5 pb-1.5 pt-1">Testar como…</p>
            {profiles.map((profile) => {
              const current = profile.id === user.userId;
              return (
                <PopoverItem
                  key={profile.id}
                  onClick={() => switchTo(profile.id, close)}
                  aria-current={current ? "true" : undefined}
                  className={cn("items-start", current && "bg-surface")}
                >
                  <Avatar
                    initials={profile.initials}
                    name={profile.name}
                    src={snapshot.members.find((m) => m.userId === profile.id)?.avatar}
                    size="sm"
                    highlight={current}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{profile.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted">{profile.blurb}</span>
                    <RoleBadge role={profile.role} technical className="mt-1.5 text-[10px]" />
                  </span>
                </PopoverItem>
              );
            })}
            <p className="mt-1 border-t border-subtle px-2.5 pb-1 pt-2 text-[11px] leading-snug text-muted">
              Perfis de demonstração: a interface e o servidor aplicam as permissões do papel escolhido.
            </p>
          </div>
        )}
      </Popover>
    </div>
  );
}

/* ==========================================================================
   Árvore hierárquica de projetos e páginas
   ========================================================================== */

const TREE_KEY = "vellum:tree-open";

function useTreeState(activeIds: string[]) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(TREE_KEY) ?? "[]") as unknown;
      if (Array.isArray(stored)) setOpen(new Set(stored.filter((x): x is string => typeof x === "string")));
    } catch {
      // Armazenamento indisponível ou corrompido.
    }
  }, []);

  // Abre automaticamente os antepassados do que está ativo.
  const activeKey = activeIds.join("|");
  useEffect(() => {
    if (!activeKey) return;
    setOpen((prev) => {
      const ids = activeKey.split("|");
      if (ids.every((id) => prev.has(id))) return prev;
      return new Set([...prev, ...ids]);
    });
  }, [activeKey]);

  const persist = (next: Set<string>) => {
    try {
      window.localStorage.setItem(TREE_KEY, JSON.stringify([...next]));
    } catch {
      // Armazenamento indisponível.
    }
  };

  const toggle = useCallback((id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  }, []);

  const ensureOpen = useCallback((id: string) => {
    setOpen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      persist(next);
      return next;
    });
  }, []);

  return { open, toggle, ensureOpen };
}

function ProjectTree({ projects, documents }: { projects: ProjectView[]; documents: DocumentView[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { run, can, isPending } = useWorkspace();
  const { projectId: activeProject, documentId: activeDoc } = parseWorkspacePath(pathname);

  const activeIds = useMemo(() => {
    const ids: string[] = [];
    if (activeProject) ids.push(activeProject);
    if (activeDoc) ids.push(...documentAncestors(documents, activeDoc).map((d) => d.id));
    return ids;
  }, [activeProject, activeDoc, documents]);

  const { open, toggle, ensureOpen } = useTreeState(activeIds);

  const childrenOf = useMemo(() => {
    const map = new Map<string, DocumentView[]>();
    for (const doc of documents) {
      const key = `${doc.projectId}:${doc.parentId ?? "root"}`;
      const list = map.get(key) ?? [];
      list.push(doc);
      map.set(key, list);
    }
    return (projectId: string, parentId: string | null) => map.get(`${projectId}:${parentId ?? "root"}`) ?? [];
  }, [documents]);

  async function createPage(projectId: string, parentId: string | null) {
    const result = await run(() => createDocumentAction({ projectId, parentId, title: "" }), {
      success: parentId ? "Subpágina criada." : "Página criada.",
    });
    if (!result.ok) return;
    ensureOpen(projectId);
    if (parentId) ensureOpen(parentId);
    router.push(`${routes.page(projectId, result.data.id)}?editar=1`);
  }

  if (projects.length === 0) {
    return <p className="px-2.5 text-xs leading-relaxed text-muted">Ainda não há projetos neste atelier.</p>;
  }

  const renderDocs = (projectId: string, parentId: string | null, depth: number, canCreate: boolean) => (
    <ul role="group">
      {childrenOf(projectId, parentId).map((doc) => {
        const kids = childrenOf(projectId, doc.id);
        const expanded = open.has(doc.id);
        const active = doc.id === activeDoc;
        return (
          <li key={doc.id} role="treeitem" aria-expanded={kids.length ? expanded : undefined} aria-selected={active}>
            <TreeRow
              depth={depth}
              href={routes.page(projectId, doc.id)}
              label={doc.title}
              active={active}
              hasChildren={kids.length > 0}
              expanded={expanded}
              onToggle={() => toggle(doc.id)}
              icon={<FileText aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.6} />}
              onCreate={canCreate ? () => createPage(projectId, doc.id) : undefined}
              createLabel={`Nova subpágina em «${doc.title}»`}
              disabled={isPending}
            />
            {kids.length > 0 && expanded && renderDocs(projectId, doc.id, depth + 1, canCreate)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <ul role="tree" aria-labelledby="sidebar-projects-label" className="space-y-0.5">
      {projects.map((project) => {
        const expanded = open.has(project.id);
        const canCreate = can("document:create", project.id);
        const active = project.id === activeProject && !activeDoc;
        return (
          <li key={project.id} role="treeitem" aria-expanded={expanded} aria-selected={active}>
            <TreeRow
              depth={0}
              href={routes.project(project.id)}
              label={project.name}
              active={active}
              hasChildren={childrenOf(project.id, null).length > 0}
              expanded={expanded}
              onToggle={() => toggle(project.id)}
              icon={<ProjectGlyph icon={project.icon} color={project.color} size="sm" />}
              onCreate={canCreate ? () => createPage(project.id, null) : undefined}
              createLabel={`Nova página em «${project.name}»`}
              disabled={isPending}
              strong
            />
            {expanded && renderDocs(project.id, null, 1, canCreate)}
          </li>
        );
      })}
    </ul>
  );
}

interface TreeRowProps {
  depth: number;
  href: string;
  label: string;
  active: boolean;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  onCreate?: () => void;
  createLabel: string;
  disabled?: boolean;
  strong?: boolean;
}

function TreeRow({
  depth,
  href,
  label,
  active,
  hasChildren,
  expanded,
  onToggle,
  icon,
  onCreate,
  createLabel,
  disabled,
  strong,
}: TreeRowProps) {
  return (
    <div
      className={cn(
        "group relative flex h-7 items-center rounded-md pr-1 transition-colors duration-150",
        active ? "bg-elevated shadow-paper" : "hover:bg-canvas/70",
      )}
      style={{ paddingLeft: depth * 12 }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? `Recolher «${label}»` : `Expandir «${label}»`}
          className="grid size-6 shrink-0 place-items-center rounded text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          {expanded ? (
            <ChevronDown aria-hidden="true" className="size-3" strokeWidth={1.75} />
          ) : (
            <ChevronRight aria-hidden="true" className="size-3" strokeWidth={1.75} />
          )}
        </button>
      ) : (
        <span aria-hidden="true" className="w-6 shrink-0" />
      )}
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded px-1 text-[13px] leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          active ? "text-primary" : "text-muted hover:text-primary",
          strong && "text-primary",
        )}
      >
        <span className={cn(!strong && "text-muted")}>{icon}</span>
        <span className="truncate">{label}</span>
      </Link>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          disabled={disabled}
          aria-label={createLabel}
          title={createLabel}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded text-muted opacity-0 transition-opacity duration-150",
            "hover:bg-surface hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
            "group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        >
          <Plus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
}
