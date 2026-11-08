/**
 * Vellum — Command Palette (⌘K / Ctrl+K)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Pesquisa global instantânea (projetos, documentos — título e texto — e
 * notas), ações rápidas respeitando o RBAC e troca imediata entre os 5 temas.
 * Combobox acessível: ↑ ↓ para navegar, ↵ para abrir, Esc para fechar.
 */
"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  CornerDownLeft,
  FilePlus2,
  FileText,
  FolderKanban,
  FolderPlus,
  LayoutDashboard,
  Palette,
  Search,
  Settings2,
  Shapes,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { useShell } from "@/components/layout/ShellContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { InkDot } from "@/components/ui/Ink";
import { ProjectGlyph } from "@/components/ui/ProjectGlyph";
import { useWorkspace } from "@/context/WorkspaceContext";
import { relativeTime } from "@/lib/format";
import { EASE_EDITORIAL, cn } from "@/lib/utils";
import { parseWorkspacePath, routes } from "@/lib/workspace-routes";
import { normalizeSearch } from "@/lib/workspace-types";

interface PaletteItem {
  id: string;
  group: "Ações" | "Navegação" | "Projetos" | "Documentos" | "Notas" | "Temas";
  label: string;
  hint?: string;
  icon: ReactNode;
  haystack: string;
  run: () => void;
  selected?: boolean;
}

const GROUP_ORDER: PaletteItem["group"][] = ["Ações", "Navegação", "Projetos", "Documentos", "Notas", "Temas"];
const PER_GROUP = 6;

function iconOf(Icon: LucideIcon) {
  return <Icon aria-hidden="true" className="size-4 text-muted" strokeWidth={1.6} />;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { snapshot, can } = useWorkspace();
  const { openProjectForm, chooseTheme } = useShell();
  const { theme, themes } = useTheme();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const listboxId = useId();

  // Ao abrir guarda o foco anterior; ao fechar devolve-o e limpa a pesquisa.
  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
    } else {
      setQuery("");
      setCursor(0);
      returnFocus.current?.focus?.();
    }
  }, [open]);

  const allItems = useMemo<PaletteItem[]>(() => {
    const go = (href: string) => () => router.push(href);
    const { projectId } = parseWorkspacePath(pathname);
    const projectName = new Map(snapshot.projects.map((p) => [p.id, p]));
    const items: PaletteItem[] = [];

    if (can("document:edit")) {
      items.push({
        id: "acao-nota",
        group: "Ações",
        label: "Criar nota rápida",
        icon: iconOf(StickyNote),
        haystack: "criar nova nota rapida",
        run: go(`${routes.notes}?nova=1`),
      });
    }
    if (can("project:manage")) {
      items.push({
        id: "acao-projeto",
        group: "Ações",
        label: "Criar projeto",
        icon: iconOf(FolderPlus),
        haystack: "criar novo projeto",
        run: () => openProjectForm(),
      });
    }
    if (projectId && can("document:create", projectId)) {
      items.push({
        id: "acao-pagina",
        group: "Ações",
        label: `Nova página em «${projectName.get(projectId)?.name ?? "projeto"}»`,
        icon: iconOf(FilePlus2),
        haystack: "criar nova pagina documento",
        run: go(`${routes.project(projectId)}?novapagina=1`),
      });
    }
    items.push({
      id: "acao-design",
      group: "Ações",
      label: "Ir para Design System",
      hint: "/design-system",
      icon: iconOf(Shapes),
      haystack: "design system tokens temas tipografia",
      run: go("/design-system"),
    });

    const nav: Array<[string, string, LucideIcon]> = [
      ["Dashboard", routes.dashboard, LayoutDashboard],
      ["Calendário", routes.calendar, CalendarDays],
      ["Notas Rápidas", routes.notes, StickyNote],
      ["Projetos", routes.projects, FolderKanban],
      ["Definições", routes.settings, Settings2],
    ];
    for (const [label, href, Icon] of nav) {
      items.push({
        id: `nav-${href}`,
        group: "Navegação",
        label,
        hint: href,
        icon: iconOf(Icon),
        haystack: label,
        run: go(href),
      });
    }

    for (const p of snapshot.projects) {
      items.push({
        id: `prj-${p.id}`,
        group: "Projetos",
        label: p.name,
        hint: `${p.pageCount} páginas`,
        icon: <ProjectGlyph icon={p.icon} color={p.color} size="sm" />,
        haystack: `${p.name} ${p.description}`,
        run: go(routes.project(p.id)),
      });
    }

    const docs = [...snapshot.documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const d of docs) {
      const project = projectName.get(d.projectId);
      items.push({
        id: `doc-${d.id}`,
        group: "Documentos",
        label: d.title,
        hint: project?.name,
        icon: iconOf(FileText),
        haystack: `${d.title} ${d.summary} ${d.plainText}`,
        run: go(routes.page(d.projectId, d.id)),
      });
    }

    for (const n of snapshot.notes) {
      items.push({
        id: `nota-${n.id}`,
        group: "Notas",
        label: n.title || n.content.slice(0, 60),
        hint: relativeTime(n.updatedAt),
        icon: <InkDot color={n.color} className="mx-1" />,
        haystack: `${n.title} ${n.content}`,
        run: go(`${routes.notes}?nota=${n.id}`),
      });
    }

    for (const t of themes) {
      items.push({
        id: `tema-${t.id}`,
        group: "Temas",
        label: `Tema: ${t.label}`,
        hint: t.description,
        icon: iconOf(Palette),
        haystack: `tema ${t.label} ${t.id}`,
        run: () => chooseTheme(t.id),
        selected: t.id === theme,
      });
    }
    return items;
  }, [snapshot, can, router, pathname, openProjectForm, chooseTheme, themes, theme]);

  const results = useMemo(() => {
    const tokens = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
    const grouped = new Map<PaletteItem["group"], PaletteItem[]>();
    for (const item of allItems) {
      if (tokens.length === 0) {
        // Sem pesquisa: ações, navegação, 5 documentos recentes e temas.
        if (item.group === "Projetos" || item.group === "Notas") continue;
        if (item.group === "Documentos" && (grouped.get("Documentos")?.length ?? 0) >= 5) continue;
      } else {
        const hay = normalizeSearch(`${item.label} ${item.haystack}`);
        if (!tokens.every((t) => hay.includes(t))) continue;
      }
      const list = grouped.get(item.group) ?? [];
      if (list.length < PER_GROUP) list.push(item);
      grouped.set(item.group, list);
    }
    return GROUP_ORDER.flatMap((group) => (grouped.get(group) ?? []).map((item) => item));
  }, [allItems, query]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function execute(item: PaletteItem | undefined) {
    if (!item) return;
    onClose();
    item.run();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      execute(results[cursor]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      event.preventDefault();
    }
  }

  let lastGroup: string | null = null;
  const activeId = results[cursor] ? `${listboxId}-${results[cursor].id}` : undefined;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-primary/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
            className="liquid-glass relative w-full max-w-[620px] overflow-hidden rounded-xl"
          >
            <div className="flex items-center gap-3 border-b border-subtle px-4">
              <Search aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={1.6} />
              <input
                ref={inputRef}
                autoFocus
                role="combobox"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                aria-label="Pesquisar projetos, documentos, notas e comandos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar projetos, documentos, notas ou comandos…"
                className="h-12 w-full bg-transparent font-sans text-[15px] text-primary placeholder:text-muted/70 focus:outline-none focus-visible:outline-none"
              />
              <kbd>Esc</kbd>
            </div>

            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Resultados"
              className="max-h-[min(420px,55vh)] overflow-y-auto p-1.5"
            >
              {results.length === 0 && (
                <p className="px-3 py-8 text-center font-serif text-base text-muted">Nada encontrado para «{query}».</p>
              )}
              {results.map((item, index) => {
                const header = item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                const active = index === cursor;
                return (
                  <div key={item.id}>
                    {header && (
                      <p role="presentation" className="eyebrow px-2.5 pb-1 pt-2.5">
                        {header}
                      </p>
                    )}
                    <div
                      id={`${listboxId}-${item.id}`}
                      role="option"
                      aria-selected={active}
                      data-index={index}
                      onMouseMove={() => setCursor(index)}
                      onClick={() => execute(item)}
                      className={cn(
                        "flex h-9 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm",
                        active ? "bg-accent-primary/[0.08] text-primary" : "text-primary",
                      )}
                    >
                      <span className="grid w-5 shrink-0 place-items-center">{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.selected && (
                        <Check aria-label="Ativo" className="size-3.5 text-accent-primary" strokeWidth={2} />
                      )}
                      {item.hint && (
                        <span className="hidden max-w-[40%] truncate text-xs text-muted sm:block">{item.hint}</span>
                      )}
                      {active ? (
                        <CornerDownLeft aria-hidden="true" className="size-3.5 shrink-0 text-muted" strokeWidth={1.6} />
                      ) : (
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 shrink-0 text-transparent"
                          strokeWidth={1.6}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 border-t border-subtle bg-surface/60 px-4 py-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <kbd>↑</kbd>
                <kbd>↓</kbd> navegar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd>↵</kbd> abrir
              </span>
              <span className="nums ml-auto font-mono">{results.length} resultados</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
