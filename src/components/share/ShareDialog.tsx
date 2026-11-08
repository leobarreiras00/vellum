/**
 * Vellum — <ShareModal /> · Partilha de documentos e projetos
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Três secções, numa só folha:
 *  I.   Link direto — papel do link (Ler / Comentar / Editar), palavra-passe
 *       opcional, validade, «Copiar link» e revogação;
 *  II.  Convidar por email — email + papel; o convite segue por Brevo/Resend
 *       (ou fica na Caixa de Inspeção em desenvolvimento);
 *  III. Membros atuais — o Proprietário altera papéis e remove acessos
 *       (do projeto ou, sem projeto, do workspace).
 * Tudo volta a ser verificado no servidor (`member:invite`, `member:change-role`).
 */
"use client";

import { Check, Copy, KeyRound, Link2, Lock, Mail, Send, UserMinus, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import {
  createShareLinkAction,
  inviteToShareAction,
  revokeShareLinkAction,
  setProjectMemberAction,
  setWorkspaceMemberAction,
} from "@/app/(workspace)/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input, Label, Select } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ROLE_LABELS, WORKSPACE_ROLES, hasPermission, type WorkspaceRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  SHARE_EXPIRY_DAYS,
  SHARE_EXPIRY_LABELS,
  SHARE_ROLES,
  SHARE_ROLE_LABELS,
  projectSubject,
  type ShareLinkView,
  type ShareRole,
} from "@/lib/workspace-types";

export interface ShareTarget {
  projectId: string | null;
  documentId: string | null;
}

interface ShareModalProps {
  open: boolean;
  target: ShareTarget;
  onClose: () => void;
}

const dateFormat = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeZone: "Europe/Lisbon" });

export function ShareModal({ open, target, onClose }: ShareModalProps) {
  const { snapshot } = useWorkspace();
  const [projectId, setProjectId] = useState<string | null>(target.projectId);

  useEffect(() => {
    if (open) setProjectId(target.projectId);
  }, [open, target.projectId]);

  const project = projectId ? snapshot.projects.find((p) => p.id === projectId) : undefined;
  const document =
    target.documentId && project ? snapshot.documents.find((d) => d.id === target.documentId) : undefined;

  const title = document ? document.title || "Sem título" : project ? project.name : snapshot.workspace.name;
  const eyebrow = document ? "Partilhar documento" : project ? "Partilhar projeto" : "Partilha e membros do workspace";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={eyebrow}
      title={title}
      description={
        document
          ? "O link abre este documento (e as subpáginas) com o papel que escolher."
          : project
            ? "O link abre todos os documentos do projeto com o papel que escolher."
            : "Escolha um projeto para criar links. Aqui gere também quem pertence ao workspace."
      }
      footer={<Button onClick={onClose}>Concluído</Button>}
    >
      <div className="space-y-8" data-testid="share-modal">
        {!target.projectId && (
          <div className="max-w-sm">
            <Label htmlFor="share-project">Projeto a partilhar</Label>
            <Select id="share-project" value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value || null)}>
              <option value="">— Nenhum (só membros) —</option>
              {snapshot.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        {project && <LinkSection projectId={project.id} documentId={document?.id ?? null} />}
        {project && <InviteSection projectId={project.id} documentId={document?.id ?? null} />}
        <MembersSection projectId={project?.id ?? null} />
      </div>
    </Dialog>
  );
}

/* ==========================================================================
   Cabeçalho de secção (numeração romana, régua fina)
   ========================================================================== */

function SectionTitle({ numeral, title, hint }: { numeral: string; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3 border-b border-subtle pb-2">
      <span className="font-mono text-[11px] text-accent-primary">{numeral}</span>
      <h3 className="font-serif text-lg font-normal text-primary">{title}</h3>
      {hint && <span className="ml-auto hidden text-xs text-muted sm:inline">{hint}</span>}
    </div>
  );
}

function useCanInvite(projectId: string) {
  const { subjectFor } = useWorkspace();
  return hasPermission(subjectFor(projectId), "member:invite");
}

/* ==========================================================================
   I. Link direto
   ========================================================================== */

function LinkSection({ projectId, documentId }: { projectId: string; documentId: string | null }) {
  const { snapshot, run, isPending } = useWorkspace();
  const canInvite = useCanInvite(projectId);
  const id = useId();
  const [role, setRole] = useState<ShareRole>("VIEWER");
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  const links = snapshot.shareLinks.filter(
    (l) => l.kind === "link" && l.projectId === projectId && l.documentId === documentId,
  );

  if (!canInvite) {
    return (
      <section aria-labelledby={`${id}-t`}>
        <SectionTitle numeral="I" title="Link direto" />
        <LockedNote>Só o Proprietário do projeto pode criar links de partilha.</LockedNote>
      </section>
    );
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const result = await run(
      () => createShareLinkAction({ projectId, documentId, role, password: password || null, expiresInDays: expiry }),
      { success: "Link de partilha criado." },
    );
    if (!result.ok) {
      setError(result.fieldErrors?.password ?? result.error);
      return;
    }
    setFresh(result.data.id);
    setPassword("");
    try {
      await navigator.clipboard.writeText(result.data.url);
    } catch {
      // Sem acesso à área de transferência: o botão «Copiar link» continua disponível.
    }
  }

  return (
    <section aria-labelledby={`${id}-t`}>
      <SectionTitle numeral="I" title="Partilhar através de link direto" hint="Funciona sem conta Vellum" />
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <Label htmlFor={`${id}-role`}>Qualquer pessoa com o link</Label>
          <Select
            id={`${id}-role`}
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            data-testid="share-link-role"
          >
            {SHARE_ROLES.map((r) => (
              <option key={r} value={r}>
                {SHARE_ROLE_LABELS[r]} ({ROLE_LABELS[r]})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${id}-pass`}>Palavra-passe (opcional)</Label>
          <Input
            id={`${id}-pass`}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sem palavra-passe"
          />
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={isPending} data-testid="share-link-create">
          <Link2 aria-hidden="true" strokeWidth={1.6} />
          Gerar link
        </Button>
        <div className="sm:col-span-3">
          <span className="text-xs font-medium text-primary" id={`${id}-exp`}>
            Validade
          </span>
          <div role="radiogroup" aria-labelledby={`${id}-exp`} className="mt-1.5 flex flex-wrap gap-1.5">
            {SHARE_EXPIRY_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                role="radio"
                aria-checked={expiry === days}
                onClick={() => setExpiry(days)}
                className={cn(
                  "h-7 rounded-md border px-2.5 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  expiry === days
                    ? "border-accent-primary/50 bg-accent-primary/[0.08] text-primary"
                    : "border-subtle text-muted hover:text-primary",
                )}
              >
                {SHARE_EXPIRY_LABELS[days]}
              </button>
            ))}
          </div>
          <FieldError>{error}</FieldError>
        </div>
      </form>

      {links.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Links ativos">
          {links.map((link) => (
            <ShareLinkRow key={link.id} link={link} highlight={link.id === fresh} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ShareLinkRow({ link, highlight }: { link: ShareLinkView; highlight?: boolean }) {
  const { run, isPending } = useWorkspace();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!link.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
    } catch {
      window.prompt("Copie o link:", link.url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <li
      className={cn(
        "rounded-lg border bg-canvas px-3 py-2.5 transition-colors duration-200",
        highlight ? "border-accent-primary/50" : "border-subtle",
      )}
      data-testid="share-link-row"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-primary">
          {SHARE_ROLE_LABELS[link.role]}
        </span>
        {link.hasPassword && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
            <KeyRound aria-hidden="true" className="size-3" strokeWidth={1.6} />
            Com palavra-passe
          </span>
        )}
        <span className="nums text-[11px] text-muted">
          {link.expiresAt ? `Expira a ${dateFormat.format(new Date(link.expiresAt))}` : "Sem expiração"} ·{" "}
          {link.openCount === 1 ? "1 abertura" : `${link.openCount} aberturas`}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Button size="sm" variant={copied ? "secondary" : "primary"} onClick={copy} disabled={!link.url}>
            {copied ? <Check aria-hidden="true" strokeWidth={2} /> : <Copy aria-hidden="true" strokeWidth={1.6} />}
            {copied ? "Copiado" : "Copiar link"}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={isPending}
            aria-label="Revogar link"
            title="Revogar link"
            onClick={() => run(() => revokeShareLinkAction(link.id), { success: "Link revogado." })}
          >
            <X aria-hidden="true" strokeWidth={1.6} />
          </Button>
        </span>
      </div>
      <input
        readOnly
        aria-label="Endereço do link"
        value={link.url ?? "Link criado noutro servidor: gere um novo para o copiar."}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 w-full truncate rounded-md border border-subtle bg-surface/50 px-2 py-1 font-mono text-[11px] text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        data-testid="share-link-url"
      />
    </li>
  );
}

/* ==========================================================================
   II. Convidar por email
   ========================================================================== */

function InviteSection({ projectId, documentId }: { projectId: string; documentId: string | null }) {
  const { snapshot, run, isPending } = useWorkspace();
  const canInvite = useCanInvite(projectId);
  const id = useId();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("EDITOR");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const invites = snapshot.shareLinks.filter(
    (l) => l.kind === "invite" && l.projectId === projectId && l.documentId === documentId,
  );

  if (!canInvite) return null;

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const response = await run(() => inviteToShareAction({ projectId, documentId, email, role, expiresInDays: 30 }), {
      silent: true,
    });
    if (!response.ok) {
      setError(response.fieldErrors?.email ?? response.error);
      return;
    }
    const d = response.data;
    setResult(
      d.delivered
        ? `Convite enviado para ${d.email}.`
        : d.mode === "dev-inbox"
          ? `Convite criado. Sem fornecedor de email: veja-o na Caixa de Inspeção (/dev/caixa).`
          : d.deliveryError
            ? `Convite criado, mas o email não seguiu: ${d.deliveryError} Copie o link abaixo.`
            : `Convite criado. O email não está configurado neste servidor: copie o link abaixo.`,
    );
    if (d.addedAsMember) setResult((r) => `${r} ${d.email} já era do workspace e passou a membro do projeto.`);
    setEmail("");
  }

  return (
    <section aria-labelledby={`${id}-t`}>
      <SectionTitle numeral="II" title="Convidar pessoas por email" hint="Brevo · Resend" />
      <form onSubmit={invite} className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="off"
            placeholder="nome@exemplo.pt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            data-testid="invite-email"
          />
        </div>
        <div>
          <Label htmlFor={`${id}-role`}>Papel</Label>
          <Select id={`${id}-role`} value={role} onChange={(e) => setRole(e.target.value as ShareRole)}>
            {[...SHARE_ROLES].reverse().map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={isPending || !email} data-testid="invite-send">
          <Send aria-hidden="true" strokeWidth={1.6} />
          Convidar
        </Button>
      </form>
      <FieldError>{error}</FieldError>
      {result && (
        <p role="status" className="mt-2 text-xs text-primary" data-testid="invite-result">
          {result}
        </p>
      )}
      {invites.length > 0 && (
        <ul className="mt-4 divide-y divide-subtle rounded-lg border border-subtle" aria-label="Convites pendentes">
          {invites.map((inv) => (
            <InviteRow key={inv.id} invite={inv} />
          ))}
        </ul>
      )}
    </section>
  );
}

function InviteRow({ invite }: { invite: ShareLinkView }) {
  const { run, isPending } = useWorkspace();
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
      <Mail aria-hidden="true" className="size-3.5 text-muted" strokeWidth={1.6} />
      <span className="min-w-0 flex-1 truncate text-primary">{invite.email}</span>
      <span className="text-xs text-muted">
        {ROLE_LABELS[invite.role]} · {invite.openCount > 0 ? "aberto" : "por abrir"}
      </span>
      <Button
        size="sm"
        variant="ghost"
        disabled={!invite.url}
        onClick={async () => {
          if (!invite.url) return;
          await navigator.clipboard.writeText(invite.url).catch(() => undefined);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check aria-hidden="true" strokeWidth={2} /> : <Copy aria-hidden="true" strokeWidth={1.6} />}
        {copied ? "Copiado" : "Link"}
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        disabled={isPending}
        aria-label={`Cancelar o convite de ${invite.email}`}
        title="Cancelar convite"
        onClick={() => run(() => revokeShareLinkAction(invite.id), { success: "Convite cancelado." })}
      >
        <X aria-hidden="true" strokeWidth={1.6} />
      </Button>
    </li>
  );
}

/* ==========================================================================
   III. Membros atuais
   ========================================================================== */

function MembersSection({ projectId }: { projectId: string | null }) {
  const { user } = useAuth();
  const { snapshot, run, can, isPending } = useWorkspace();
  const project = projectId ? snapshot.projects.find((p) => p.id === projectId) : undefined;
  const canManage = project ? can("project:manage", project.id) : can("member:change-role");
  const id = useId();

  const rows = useMemo(() => {
    if (project) {
      return project.members
        .map((pm) => {
          const person = snapshot.members.find((m) => m.userId === pm.userId);
          if (!person) return null;
          const effective = projectSubject(
            { userId: person.userId, platformRole: person.platformRole, workspaceRole: person.role },
            project,
          ).workspaceRole;
          return { person, role: pm.role, effective };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
    }
    return snapshot.members.map((person) => ({ person, role: person.role, effective: person.role }));
  }, [project, snapshot.members]);

  const candidates = project
    ? snapshot.members.filter((m) => !project.members.some((pm) => pm.userId === m.userId))
    : [];
  const [newMember, setNewMember] = useState("");
  const [newRole, setNewRole] = useState<WorkspaceRole>("EDITOR");
  const chosen = candidates.find((c) => c.userId === newMember) ?? candidates[0];

  function setRole(userId: string, role: WorkspaceRole | null, name: string) {
    if (project) {
      void run(() => setProjectMemberAction({ projectId: project.id, userId, role }), {
        success: role ? `Papel de ${name} atualizado.` : `${name} deixou de ter acesso ao projeto.`,
      });
    } else {
      void run(() => setWorkspaceMemberAction({ userId, role }), {
        success: role ? `Papel de ${name} atualizado.` : `${name} saiu do workspace.`,
      });
    }
  }

  return (
    <section aria-labelledby={`${id}-t`}>
      <SectionTitle
        numeral={project ? "III" : "I"}
        title={project ? "Membros do projeto" : "Membros do workspace"}
        hint={project ? "O papel no projeto só restringe o do workspace" : undefined}
      />
      <ul className="divide-y divide-subtle" data-testid="share-members">
        {rows.map(({ person, role, effective }) => {
          const isMe = person.userId === user?.userId;
          return (
            <li key={person.userId} className="flex items-center gap-3 py-2.5">
              <Avatar
                initials={person.initials}
                name={person.name}
                src={"avatar" in person ? (person.avatar as string | null) : null}
                size="md"
                highlight={isMe}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-primary">
                  {person.name}
                  {isMe && <span className="text-muted"> (eu)</span>}
                </span>
                <span className="block truncate text-xs text-muted">
                  {person.email}
                  {project && effective && effective !== role ? ` · efetivo: ${ROLE_LABELS[effective]}` : ""}
                </span>
              </span>
              {canManage && !(isMe && !project) ? (
                <>
                  <Select
                    aria-label={`Papel de ${person.name}`}
                    value={role}
                    disabled={isPending}
                    onChange={(e) => setRole(person.userId, e.target.value as WorkspaceRole, person.name)}
                    className="h-8 w-36 text-[13px]"
                  >
                    {WORKSPACE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending || (isMe && !project)}
                    aria-label={`Remover o acesso de ${person.name}`}
                    title="Remover acesso"
                    onClick={() => setRole(person.userId, null, person.name)}
                  >
                    <UserMinus aria-hidden="true" strokeWidth={1.6} />
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted">{ROLE_LABELS[role]}</span>
              )}
            </li>
          );
        })}
      </ul>

      {project && canManage && candidates.length > 0 && chosen && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => setProjectMemberAction({ projectId: project.id, userId: chosen.userId, role: newRole }), {
              success: `${chosen.name} juntou-se ao projeto.`,
            });
          }}
        >
          <div className="min-w-48 flex-1">
            <Label htmlFor={`${id}-who`}>Adicionar membro do workspace</Label>
            <Select id={`${id}-who`} value={chosen.userId} onChange={(e) => setNewMember(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Select
            aria-label="Papel do novo membro"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as WorkspaceRole)}
            className="w-36"
          >
            {WORKSPACE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          <Button type="submit" size="lg" disabled={isPending}>
            Adicionar
          </Button>
        </form>
      )}

      {!canManage && (
        <LockedNote>
          {project
            ? "Só o Proprietário do projeto altera papéis e remove acessos."
            : "Só o Proprietário do workspace altera papéis e remove acessos."}
        </LockedNote>
      )}
    </section>
  );
}

function LockedNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-xs text-muted">
      <Lock aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
      {children}
    </p>
  );
}

/** Nome histórico do pedido: o modal de partilha. */
export { ShareModal as ShareDialog };
