/**
 * Vellum — Mural de Notas Rápidas (cliente)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Captura rápida à maneira do OneNote, com estética editorial: título,
 * conteúdo, tinta, projeto opcional, fixação, pesquisa instantânea e
 * «Converter em Documento de Projeto». Criar/editar exige canEditDocument.
 */
"use client";

import { FileOutput, Lock, PenLine, Pin, PinOff, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  convertNoteAction,
  createNoteAction,
  deleteNoteAction,
  toggleNotePinAction,
  updateNoteAction,
} from "@/app/(workspace)/actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { InkPicker } from "@/components/ui/Ink";
import { NoteSlip } from "@/components/workspace/NoteSlip";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { canDeleteDocument } from "@/lib/rbac";
import { cn, formatNumber } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";
import { normalizeSearch, type InkColor, type NoteView } from "@/lib/workspace-types";

interface NotesClientProps {
  startComposing: boolean;
  initialProject: string | null;
  focusNoteId: string | null;
}

const NO_PROJECT = "__sem__";

export function NotesClient({ startComposing, initialProject, focusNoteId }: NotesClientProps) {
  const { user } = useAuth();
  const { snapshot, run, can, isPending } = useWorkspace();
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>(
    initialProject && !startComposing ? initialProject : "",
  );
  const [editing, setEditing] = useState<NoteView | null>(null);
  const [converting, setConverting] = useState<NoteView | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const canEdit = can("document:edit");

  // "/" foca a pesquisa (fora de campos de texto).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !/input|textarea|select/i.test(target.tagName) && !target.isContentEditable) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Nota vinda da paleta ⌘K: rola até ela.
  useEffect(() => {
    if (!focusNoteId) return;
    requestAnimationFrame(() =>
      document.getElementById(`nota-${focusNoteId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
  }, [focusNoteId]);

  const filtered = useMemo(() => {
    const tokens = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
    return snapshot.notes.filter((note) => {
      if (projectFilter === NO_PROJECT && note.projectId) return false;
      if (projectFilter && projectFilter !== NO_PROJECT && note.projectId !== projectFilter) return false;
      if (!tokens.length) return true;
      const project = snapshot.projects.find((p) => p.id === note.projectId)?.name ?? "";
      const hay = normalizeSearch(`${note.title} ${note.content} ${project}`);
      return tokens.every((t) => hay.includes(t));
    });
  }, [snapshot.notes, snapshot.projects, query, projectFilter]);

  const pinned = filtered.filter((n) => n.isPinned);
  const rest = filtered.filter((n) => !n.isPinned);

  function actionsFor(note: NoteView) {
    if (!canEdit || !user) return undefined;
    const canDelete = canDeleteDocument(user, { createdById: note.userId });
    return (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          aria-label={note.isPinned ? "Desafixar nota" : "Fixar no topo"}
          title={note.isPinned ? "Desafixar" : "Fixar no topo"}
          onClick={() =>
            run(() => toggleNotePinAction(note.id, !note.isPinned), {
              success: note.isPinned ? "Nota desafixada." : "Nota fixada no topo.",
            })
          }
        >
          {note.isPinned ? <PinOff aria-hidden="true" strokeWidth={1.5} /> : <Pin aria-hidden="true" strokeWidth={1.5} />}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Editar nota" title="Editar" onClick={() => setEditing(note)}>
          <PenLine aria-hidden="true" strokeWidth={1.5} />
        </Button>
        {!note.documentId && (
          <Button variant="ghost" size="sm" onClick={() => setConverting(note)} title="Converter em Documento de Projeto">
            <FileOutput aria-hidden="true" strokeWidth={1.5} />
            Converter
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label="Eliminar nota"
            title="Eliminar"
            disabled={isPending}
            onClick={() => run(() => deleteNoteAction(note.id), { success: "Nota eliminada." })}
          >
            <Trash2 aria-hidden="true" strokeWidth={1.5} />
          </Button>
        )}
      </>
    );
  }

  const masonry = "columns-1 gap-4 sm:columns-2 2xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-10">
      <header>
        <p className="eyebrow">{snapshot.workspace.name}</p>
        <h1 className="mt-3 text-4xl font-normal leading-tight tracking-tight">Notas Rápidas</h1>
        <p className="nums mt-2 font-serif text-lg italic text-muted">
          Capture agora, organize depois · {formatNumber(snapshot.notes.length)} notas no mural
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Coluna de captura */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <RoleGuard
            permission="document:edit"
            fallback={
              <p className="flex items-start gap-2 rounded-xl border border-dashed border-subtle p-4 text-sm text-muted">
                <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />O seu papel permite ler o
                mural, mas não criar ou editar notas.
              </p>
            }
          >
            <Composer startOpen={startComposing} defaultProject={initialProject} />
          </RoleGuard>

          <div className="space-y-3 rounded-xl border border-subtle bg-surface/50 p-4">
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" strokeWidth={1.5} />
              <Input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar notas…"
                aria-label="Pesquisar notas"
                className="pl-8 pr-10"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2">/</kbd>
            </div>
            <div>
              <Label htmlFor="notes-project-filter">Projeto</Label>
              <Select id="notes-project-filter" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                <option value="">Todos os projetos</option>
                <option value={NO_PROJECT}>Sem projeto</option>
                {snapshot.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="nums text-xs text-muted" aria-live="polite">
              {filtered.length === snapshot.notes.length
                ? `${filtered.length} notas`
                : `${filtered.length} de ${snapshot.notes.length} notas`}
            </p>
          </div>
        </div>

        {/* Mural */}
        <div>
          {filtered.length === 0 && (
            <p className="border-t border-subtle pt-8 font-serif text-xl italic text-muted">
              {query ? `Nenhuma nota com «${query}».` : "O mural está vazio."}
            </p>
          )}
          {pinned.length > 0 && (
            <section aria-labelledby="notes-pinned">
              <p id="notes-pinned" className="eyebrow mb-3 flex items-center gap-1.5">
                <Pin aria-hidden="true" className="size-3" strokeWidth={1.5} />
                Fixadas
              </p>
              <div className={masonry}>
                {pinned.map((note) => (
                  <NoteSlip key={note.id} note={note} actions={actionsFor(note)} highlight={note.id === focusNoteId} />
                ))}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section aria-labelledby="notes-rest" className={cn(pinned.length > 0 && "mt-6 border-t border-subtle pt-5")}>
              <p id="notes-rest" className="eyebrow mb-3">
                {pinned.length > 0 ? "Restantes" : "Todas as notas"}
              </p>
              <div className={masonry}>
                {rest.map((note) => (
                  <NoteSlip key={note.id} note={note} actions={actionsFor(note)} highlight={note.id === focusNoteId} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <NoteEditorDialog note={editing} onClose={() => setEditing(null)} />
      <ConvertDialog note={converting} onClose={() => setConverting(null)} />
    </div>
  );
}

/* ==========================================================================
   Compositor
   ========================================================================== */

function Composer({ startOpen, defaultProject }: { startOpen: boolean; defaultProject: string | null }) {
  const { snapshot, run, can, isPending } = useWorkspace();
  const projects = snapshot.projects.filter((p) => can("document:edit", p.id));
  const [open, setOpen] = useState(startOpen);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<InkColor>("terracota");
  const [projectId, setProjectId] = useState(defaultProject && projects.some((p) => p.id === defaultProject) ? defaultProject : "");
  const [isPinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (startOpen) requestAnimationFrame(() => titleRef.current?.focus());
  }, [startOpen]);

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!title.trim() && !content.trim()) {
      setError("Escreva um título ou algum conteúdo.");
      return;
    }
    const result = await run(
      () => createNoteAction({ title, content, color, projectId: projectId || null, isPinned }),
      { success: "Nota guardada no mural." },
    );
    if (result.ok) {
      setTitle("");
      setContent("");
      setPinned(false);
      setError(null);
      titleRef.current?.focus();
    }
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          void submit();
        }
      }}
      data-ink={color}
      aria-label="Nova nota rápida"
      className="relative overflow-hidden rounded-xl border border-subtle bg-elevated shadow-paper"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-ink" />
      <div className="space-y-2 px-4 pb-3 pt-4">
        <label htmlFor={`${id}-title`} className="sr-only">
          Título da nota
        </label>
        <input
          ref={titleRef}
          id={`${id}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Escrever uma nota…"
          maxLength={100}
          className="w-full bg-transparent font-serif text-lg text-primary placeholder:text-muted/70 focus:outline-none focus-visible:outline-none"
        />
        {open && (
          <>
            <label htmlFor={`${id}-content`} className="sr-only">
              Conteúdo da nota
            </label>
            <textarea
              id={`${id}-content`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ideias, listas, frases soltas…"
              rows={4}
              maxLength={4000}
              className="w-full resize-y bg-transparent text-sm leading-relaxed text-primary placeholder:text-muted/70 focus:outline-none focus-visible:outline-none"
            />
            <div className="space-y-3 border-t border-subtle pt-3">
              <InkPicker value={color} onChange={setColor} label="Cor da nota" />
              <div className="flex items-center gap-2">
                <label htmlFor={`${id}-project`} className="sr-only">
                  Projeto
                </label>
                <Select
                  id={`${id}-project`}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="h-8 flex-1 text-[13px]"
                >
                  <option value="">Sem projeto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Button
                  variant={isPinned ? "secondary" : "ghost"}
                  size="icon"
                  aria-pressed={isPinned}
                  aria-label="Fixar no topo"
                  title="Fixar no topo"
                  onClick={() => setPinned((v) => !v)}
                  className={cn(isPinned && "text-ink")}
                >
                  <Pin aria-hidden="true" strokeWidth={1.5} className={cn(isPinned && "fill-ink/20")} />
                </Button>
              </div>
              {error && <FieldError>{error}</FieldError>}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">
                  <kbd>⌘↵</kbd> guardar
                </span>
                <Button variant="primary" type="submit" disabled={isPending}>
                  Guardar nota
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </form>
  );
}

/* ==========================================================================
   Editar nota
   ========================================================================== */

function NoteEditorDialog({ note, onClose }: { note: NoteView | null; onClose: () => void }) {
  const { snapshot, run, can, isPending } = useWorkspace();
  const projects = snapshot.projects.filter((p) => can("document:edit", p.id) || p.id === note?.projectId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<InkColor>("terracota");
  const [projectId, setProjectId] = useState("");
  const [isPinned, setPinned] = useState(false);
  const formId = useId();

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setProjectId(note.projectId ?? "");
    setPinned(note.isPinned);
  }, [note]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!note) return;
    const result = await run(
      () => updateNoteAction(note.id, { title, content, color, projectId: projectId || null, isPinned }),
      { success: "Nota atualizada." },
    );
    if (result.ok) onClose();
  }

  return (
    <Dialog
      open={note !== null}
      onClose={onClose}
      eyebrow="Editar nota"
      title={note?.title || "Nota sem título"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor={`${formId}-t`}>Título</Label>
          <Input id={`${formId}-t`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label htmlFor={`${formId}-c`}>Conteúdo</Label>
          <Textarea id={`${formId}-c`} value={content} onChange={(e) => setContent(e.target.value)} maxLength={4000} className="min-h-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${formId}-p`}>Projeto</Label>
            <Select id={`${formId}-p`} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Sem projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-primary">Cor</legend>
            <InkPicker value={color} onChange={setColor} />
          </fieldset>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="size-4 accent-[rgb(var(--accent-primary-rgb))]"
          />
          Fixar no topo do mural
        </label>
      </form>
    </Dialog>
  );
}

/* ==========================================================================
   Converter em Documento de Projeto
   ========================================================================== */

function ConvertDialog({ note, onClose }: { note: NoteView | null; onClose: () => void }) {
  const router = useRouter();
  const { snapshot, run, can, isPending } = useWorkspace();
  const projects = snapshot.projects.filter((p) => can("document:create", p.id));
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (!note) return;
    const preferred = note.projectId && projects.some((p) => p.id === note.projectId) ? note.projectId : projects[0]?.id;
    setProjectId(preferred ?? "");
  }, [note]);

  async function convert() {
    if (!note || !projectId) return;
    const result = await run(() => convertNoteAction(note.id, projectId), {
      success: "Nota convertida em documento.",
    });
    if (result.ok) {
      onClose();
      router.push(routes.page(result.data.projectId, result.data.id));
    }
  }

  return (
    <Dialog
      open={note !== null}
      onClose={onClose}
      size="sm"
      eyebrow="Converter em Documento de Projeto"
      title={note?.title || "Nota sem título"}
      description="O texto da nota passa a ser uma página nova no projeto escolhido. A nota fica no mural, ligada ao documento."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={convert} disabled={isPending || !projectId}>
            <FileOutput aria-hidden="true" strokeWidth={1.5} />
            Converter
          </Button>
        </>
      }
    >
      {projects.length === 0 ? (
        <p className="text-sm text-muted">Não tem permissão para criar documentos em nenhum projeto.</p>
      ) : (
        <div>
          <Label htmlFor="convert-project">Projeto de destino</Label>
          <Select id="convert-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      )}
    </Dialog>
  );
}
