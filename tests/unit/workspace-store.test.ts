/**
 * Vellum — Testes do repositório do workspace (autorização, isolamento entre
 * ateliers, instantâneo leve, partilha)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 *
 * Por omissão corre sobre o armazenamento em ficheiro JSON real (um ficheiro
 * temporário). `npm run test:pg` corre exatamente a mesma suite sobre
 * PostgreSQL (ver vitest.pg.config.ts), para provar que os dois backends
 * cumprem as mesmas regras de autorização e isolamento.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import type { SessionUser } from "@/lib/auth";
import type { DocContent } from "@/lib/document-content";
import { ForbiddenError } from "@/lib/rbac";

process.env.AUTH_SECRET = "teste-secreto-com-mais-de-trinta-e-dois-caracteres-ok";
process.env.VELLUM_DATA_FILE = path.join(mkdtempSync(path.join(tmpdir(), "vellum-store-")), "workspace.json");
process.env.VELLUM_EXAMPLE_DATA = "false";
process.env.APP_URL = "https://vellum.test";

type Store = typeof import("@/lib/workspace-store");
let store: Store;

/** O estado completo guardado, tal como está no backend ativo (para provar que não há segredos em claro). */
async function rawStore(): Promise<string> {
  const { getStoreBackend } = await import("@/lib/store");
  return JSON.stringify(await (await getStoreBackend()).read());
}

const person = (id: string, workspaceRole: SessionUser["workspaceRole"] = "OWNER"): SessionUser => ({
  userId: id,
  platformRole: "USER",
  workspaceRole,
  name: `Pessoa ${id}`,
  username: id,
  email: `${id}@exemplo.pt`,
  initials: "PP",
  workspaceName: `Atelier ${id}`,
  theme: "warm-cream",
  isDemo: false,
});

const paragraph = (text: string): DocContent => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

// 400 KB de base64 válido (cabe no limite de uma imagem).
const BIG_IMAGE = `data:image/png;base64,${"A".repeat(400_000)}`;

beforeAll(async () => {
  store = await import("@/lib/workspace-store");
});

/** Acrescenta uma pessoa ao atelier do dono (o convite por email faz o mesmo no produto). */
async function addMember(
  owner: SessionUser,
  id: string,
  role: NonNullable<SessionUser["workspaceRole"]>,
): Promise<SessionUser> {
  const { getStoreBackend } = await import("@/lib/store");
  const user = person(id, role);
  await (
    await getStoreBackend()
  ).write((data) => {
    const workspaceId = data.memberships.find((m) => m.userId === owner.userId)!.workspaceId;
    data.people.push({ id, name: user.name, email: user.email, platformRole: "USER" });
    data.memberships.push({ workspaceId, userId: id, role, joinedAt: new Date().toISOString() });
  });
  return user;
}

async function setup(id: string) {
  const owner = person(id);
  const project = await store.createProject(owner, {
    name: `Projeto ${id}`,
    description: "",
    icon: "book-open",
    color: "terracota",
  });
  const doc = await store.createDocument(owner, {
    projectId: project.id,
    parentId: null,
    title: "Doc",
    summary: "",
    plainText: "",
  });
  await store.saveDocumentContent(owner, {
    id: doc.id,
    title: "Doc",
    summary: "",
    contentJson: paragraph("conteúdo secreto"),
  });
  return { owner, project, doc };
}

describe("instantâneo leve", () => {
  it("não inclui o conteúdo rico dos documentos, mesmo com imagens grandes", async () => {
    const { owner, doc } = await setup("snap1");
    const withImage: DocContent = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: BIG_IMAGE, alt: "" } },
        { type: "mermaid", attrs: { code: "graph TD; A-->B" } },
        { type: "paragraph", content: [{ type: "text", text: "olá" }] },
      ],
    };
    await store.saveDocumentContent(owner, { id: doc.id, title: "Doc", summary: "", contentJson: withImage });
    const snapshot = await store.getWorkspaceSnapshot(owner);
    const view = snapshot.documents.find((d) => d.id === doc.id)!;
    expect("contentJson" in view).toBe(false);
    expect(view.plainText).toContain("olá");
    expect(snapshot.diagramCount).toBe(1);
    const size = JSON.stringify(snapshot).length;
    expect(size).toBeLessThan(40_000);
    expect(JSON.stringify(snapshot)).not.toContain("AAAAAAAA");
  });

  it("o tamanho do instantâneo não cresce com o conteúdo dos documentos", async () => {
    const owner = person("snap2");
    const project = await store.createProject(owner, {
      name: "Grande",
      description: "",
      icon: "book-open",
      color: "salvia",
    });
    const baseline = JSON.stringify(await store.getWorkspaceSnapshot(owner)).length;
    for (let i = 0; i < 5; i++) {
      const d = await store.createDocument(owner, {
        projectId: project.id,
        parentId: null,
        title: `D${i}`,
        summary: "",
        plainText: "",
      });
      await store.saveDocumentContent(owner, {
        id: d.id,
        title: `D${i}`,
        summary: "",
        contentJson: { type: "doc", content: [{ type: "image", attrs: { src: BIG_IMAGE } }] },
      });
    }
    const after = JSON.stringify(await store.getWorkspaceSnapshot(owner)).length;
    expect(after - baseline).toBeLessThan(5 * 2_000); // ~ metadados por documento, nunca as imagens
  });
});

describe("getDocumentContent", () => {
  it("devolve o conteúdo e a versão ao dono", async () => {
    const { owner, doc } = await setup("gdc1");
    const view = await store.getDocumentContent(owner, doc.id);
    expect(view.contentJson).toEqual(paragraph("conteúdo secreto"));
    expect(view.id).toBe(doc.id);
    expect(view.updatedAt).toBeTruthy();
  });

  it("outro atelier não consegue ler (não revela sequer que existe)", async () => {
    const { doc } = await setup("gdc2");
    const stranger = person("gdc2-intruso");
    await expect(store.getDocumentContent(stranger, doc.id)).rejects.toBeInstanceOf(store.NotFoundError);
    await expect(store.getDocumentContent(stranger, "doc_inexistente")).rejects.toBeInstanceOf(store.NotFoundError);
  });

  it("documentos eliminados deixam de ser legíveis", async () => {
    const { owner, doc } = await setup("gdc3");
    await store.deleteDocument(owner, doc.id);
    await expect(store.getDocumentContent(owner, doc.id)).rejects.toBeInstanceOf(store.NotFoundError);
  });

  it("segunda barreira: conteúdo hostil já guardado nunca chega ao editor, ao conflito, ao export nem aos links", async () => {
    const { owner, project, doc } = await setup("gdc4");
    const hostile = JSON.parse(
      '{"type":"doc","content":[{"type":"paragraph","attrs":{"__proto__":{"onerror":"alert(1)"}},"content":[{"type":"text","text":"olá"}]}]}',
    ) as DocContent;
    const { getStoreBackend } = await import("@/lib/store");
    await (
      await getStoreBackend()
    ).write((data) => {
      const stored = data.documents.find((d) => d.id === doc.id)!;
      stored.contentJson = hostile;
      stored.plainText = "texto simples seguro";
    });

    const dump = (v: unknown) => JSON.stringify(v);
    const fallback = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "texto simples seguro" }] }],
    };

    const view = await store.getDocumentContent(owner, doc.id);
    expect(view.contentJson).toEqual(fallback);
    expect(dump(view)).not.toContain("__proto__");

    const exported = await store.getExportBundle(owner, doc.id);
    expect(exported.content).toEqual(fallback);

    const link = await store.createShareLink(owner, {
      projectId: project.id,
      documentId: doc.id,
      role: "VIEWER",
      password: null,
      expiresInDays: 7,
    });
    const shared = await store.readSharedDocument(link.url.split("/shared/")[1]!, null);
    expect(shared).not.toBeNull();
    expect(shared!.document.contentJson).toEqual(fallback);
    expect(dump(shared)).not.toContain("__proto__");
  });
});

describe("isolamento entre ateliers", () => {
  it("um utilizador não vê, edita, apaga nem partilha dados de outro", async () => {
    const a = await setup("iso-a");
    const b = person("iso-b");
    const snapshotB = await store.getWorkspaceSnapshot(b);
    expect(snapshotB.projects.map((p) => p.id)).not.toContain(a.project.id);
    expect(snapshotB.documents.map((d) => d.id)).not.toContain(a.doc.id);
    expect(JSON.stringify(snapshotB)).not.toContain("conteúdo secreto");

    const NF = store.NotFoundError;
    await expect(
      store.saveDocumentContent(b, { id: a.doc.id, title: "x", summary: "", contentJson: paragraph("pirata") }),
    ).rejects.toBeInstanceOf(NF);
    await expect(store.deleteDocument(b, a.doc.id)).rejects.toBeInstanceOf(NF);
    await expect(store.deleteProject(b, a.project.id)).rejects.toBeInstanceOf(NF);
    await expect(store.getExportBundle(b, a.doc.id)).rejects.toBeInstanceOf(NF);
    await expect(
      store.createShareLink(b, {
        projectId: a.project.id,
        documentId: null,
        role: "VIEWER",
        password: null,
        expiresInDays: 7,
      }),
    ).rejects.toBeInstanceOf(NF);
    await expect(
      store.addComment(b, { documentId: a.doc.id, kind: "comment", quote: "", body: "olá" }),
    ).rejects.toBeInstanceOf(NF);
    expect(await store.findDocument(b, a.project.id, a.doc.id)).toBeNull();
    expect(await store.findProject(b, a.project.id)).toBeNull();
    // O original ficou intacto.
    const still = await store.getDocumentContent(a.owner, a.doc.id);
    expect(still.contentJson).toEqual(paragraph("conteúdo secreto"));
  });

  it("o backup exportado só contém o atelier de quem pede", async () => {
    const a = await setup("iso-c");
    const b = await setup("iso-d");
    const backup = await store.exportWorkspaceBackup(b.owner);
    expect(backup.json).toContain("Projeto iso-d");
    expect(backup.json).not.toContain("Projeto iso-c");
    expect(a.doc.id).toBeTruthy();
  });
});

describe("papéis (RBAC) no repositório", () => {
  it("Leitor e Comentador não conseguem gravar nem apagar; Editor grava mas não apaga o que não é seu", async () => {
    const { owner, doc } = await setup("rbac1");
    for (const role of ["VIEWER", "COMMENTER"] as const) {
      const actor = { ...owner, workspaceRole: role };
      await expect(
        store.saveDocumentContent(actor, { id: doc.id, title: "x", summary: "", contentJson: paragraph("não") }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(store.deleteDocument(actor, doc.id)).rejects.toBeInstanceOf(ForbiddenError);
    }
    const editor = { ...owner, workspaceRole: "EDITOR" as const };
    await expect(
      store.saveDocumentContent(editor, { id: doc.id, title: "Doc", summary: "", contentJson: paragraph("sim") }),
    ).resolves.toMatchObject({ status: "saved" });
    // Foi o dono quem o criou; um EDITOR com outro id não pode apagá-lo.
    const otherEditor = { ...editor, userId: "rbac1-editor" };
    await expect(store.deleteDocument(otherEditor, doc.id)).rejects.toBeInstanceOf(store.NotFoundError);
  });

  it("o Leitor pode ler o conteúdo; ninguém sem papel no projeto é elevado", async () => {
    const { owner, doc } = await setup("rbac2");
    const viewer = { ...owner, workspaceRole: "VIEWER" as const };
    await expect(store.getDocumentContent(viewer, doc.id)).resolves.toMatchObject({ id: doc.id });
    const noRole = { ...owner, workspaceRole: null };
    await expect(store.getDocumentContent(noRole, doc.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("o papel de projeto só restringe, nunca eleva", async () => {
    const { owner, project, doc } = await setup("rbac3");
    const editor = await addMember(owner, "rbac3-editor", "EDITOR");
    const viewer = await addMember(owner, "rbac3-viewer", "VIEWER");
    const save = (user: SessionUser) =>
      store.saveDocumentContent(user, {
        id: doc.id,
        title: "Doc",
        summary: "",
        contentJson: paragraph(`por ${user.userId}`),
      });

    // Sem papel de projeto: vale o do workspace.
    await expect(save(editor)).resolves.toMatchObject({ status: "saved" });
    await expect(save(viewer)).rejects.toBeInstanceOf(ForbiddenError);

    // Restringir o Editor a Leitor neste projeto tira-lhe a escrita.
    await store.setProjectMember(owner, project.id, editor.userId, "VIEWER");
    await expect(save(editor)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(store.getDocumentContent(editor, doc.id)).resolves.toMatchObject({ id: doc.id });

    // Dar ao Leitor do workspace o papel de Editor no projeto NÃO o eleva.
    await store.setProjectMember(owner, project.id, viewer.userId, "EDITOR");
    await expect(save(viewer)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("um Editor não gere membros, links nem apaga documentos de outras pessoas", async () => {
    const { owner, project, doc } = await setup("rbac4");
    const editor = await addMember(owner, "rbac4-editor", "EDITOR");
    await expect(store.setProjectMember(editor, project.id, owner.userId, "VIEWER")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(store.deleteProject(editor, project.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(store.deleteDocument(editor, doc.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(store.setWorkspaceMember(editor, owner.userId, "VIEWER")).rejects.toBeInstanceOf(ForbiddenError);
    // O que ele próprio cria, pode apagar.
    const mine = await store.createDocument(editor, {
      projectId: project.id,
      parentId: null,
      title: "Meu",
      summary: "",
      plainText: "",
    });
    await expect(store.deleteDocument(editor, mine.id)).resolves.toMatchObject({ projectId: project.id });
  });
});

describe("gravação e conflitos", () => {
  it("quem parte de uma versão antiga recebe o conflito com a versão do servidor, sem perder dados", async () => {
    const { owner, doc } = await setup("conf1");
    const editor = await addMember(owner, "conf1-editor", "EDITOR");
    const base = await store.getDocumentContent(owner, doc.id);

    await store.saveDocumentContent(editor, {
      id: doc.id,
      title: "Do editor",
      summary: "",
      contentJson: paragraph("versão do editor"),
    });

    const stale = await store.saveDocumentContent(owner, {
      id: doc.id,
      title: "Doc",
      summary: "",
      contentJson: paragraph("versão antiga do dono"),
      baseUpdatedAt: base.updatedAt,
    });
    expect(stale.status).toBe("conflict");
    if (stale.status !== "conflict") return;
    expect(stale.server.contentJson).toEqual(paragraph("versão do editor"));
    expect(stale.server.title).toBe("Do editor");
    // Nada foi sobrescrito.
    expect((await store.getDocumentContent(owner, doc.id)).contentJson).toEqual(paragraph("versão do editor"));

    // «Manter a minha» (force) grava.
    const forced = await store.saveDocumentContent(owner, {
      id: doc.id,
      title: "Doc",
      summary: "",
      contentJson: paragraph("a minha"),
      baseUpdatedAt: base.updatedAt,
      force: true,
    });
    expect(forced.status).toBe("saved");
  });

  it("o mesmo autor nunca entra em conflito consigo próprio", async () => {
    const { owner, doc } = await setup("conf2");
    const base = await store.getDocumentContent(owner, doc.id);
    for (let i = 0; i < 3; i++) {
      const r = await store.saveDocumentContent(owner, {
        id: doc.id,
        title: "Doc",
        summary: "",
        contentJson: paragraph(`v${i}`),
        baseUpdatedAt: base.updatedAt,
      });
      expect(r.status).toBe("saved");
    }
  });

  it("o conteúdo gravado é limpo pela lista fechada do editor", async () => {
    const { owner, doc } = await setup("conf3");
    const hostile = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { textAlign: "left", onclick: "x" }, content: [{ type: "text", text: "ok" }] },
      ],
    } as DocContent;
    const parsed = (await import("@/lib/workspace-types")).documentContentSaveSchema.parse({
      id: doc.id,
      title: "Doc",
      summary: "",
      contentJson: hostile,
    });
    await store.saveDocumentContent(owner, parsed);
    const saved = (await store.getDocumentContent(owner, doc.id)).contentJson!;
    expect(saved.content[0]!.attrs).toEqual({ textAlign: "left" });
  });
});

describe("partilha por link", () => {
  const input = (
    projectId: string,
    over: Partial<{
      role: "VIEWER" | "COMMENTER" | "EDITOR";
      password: string | null;
      documentId: string | null;
      expiresInDays: number;
    }> = {},
  ) => ({
    projectId,
    documentId: null,
    role: "VIEWER" as const,
    password: null,
    expiresInDays: 7,
    ...over,
  });
  const tokenOf = (url: string) => url.split("/shared/")[1]!;

  it("o token só existe na resposta de criação (na base fica o hash) e resolve para o projeto certo", async () => {
    const { owner, project } = await setup("sh1");
    const link = await store.createShareLink(owner, input(project.id));
    const token = tokenOf(link.url);
    expect(token.length).toBeGreaterThanOrEqual(30);
    const raw = await rawStore();
    expect(raw).not.toContain(token);
    const resolved = await store.resolveShareToken(token);
    expect(resolved.ok && resolved.access.project.id).toBe(project.id);
  });

  it("tokens inventados, truncados ou de outro formato não resolvem", async () => {
    const { owner, project } = await setup("sh2");
    const token = tokenOf((await store.createShareLink(owner, input(project.id))).url);
    for (const bad of [
      "",
      "x",
      token.slice(0, -1),
      `${token}x`,
      token.toUpperCase(),
      "../" + token,
      `${token}'`,
      "a".repeat(30),
    ]) {
      expect((await store.resolveShareToken(bad)).ok, bad).toBe(false);
    }
  });

  it("revogar fecha o link de imediato", async () => {
    const { owner, project } = await setup("sh3");
    const link = await store.createShareLink(owner, input(project.id));
    await store.revokeShareLink(owner, link.id);
    const resolved = await store.resolveShareToken(tokenOf(link.url));
    expect(resolved).toMatchObject({ ok: false, reason: "revoked" });
  });

  it("só quem gere o projeto cria ou revoga links", async () => {
    const { owner, project } = await setup("sh4");
    for (const role of ["EDITOR", "COMMENTER", "VIEWER"] as const) {
      await expect(store.createShareLink({ ...owner, workspaceRole: role }, input(project.id))).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    }
    const link = await store.createShareLink(owner, input(project.id));
    await expect(store.revokeShareLink({ ...owner, workspaceRole: "EDITOR" }, link.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    // E outro atelier nem sabe que o link existe.
    await expect(store.revokeShareLink(person("sh4-intruso"), link.id)).rejects.toBeDefined();
    expect((await store.resolveShareToken(tokenOf(link.url))).ok).toBe(true);
  });

  it("a palavra-passe do link é guardada com hash e verificada", async () => {
    const { owner, project } = await setup("sh5");
    const link = await store.createShareLink(owner, input(project.id, { password: "segredo-do-link" }));
    const token = tokenOf(link.url);
    const raw = await rawStore();
    expect(raw).not.toContain("segredo-do-link");
    expect(await store.checkSharePassword(token, "segredo-do-link")).toBe(true);
    expect(await store.checkSharePassword(token, "errada")).toBe(false);
    const resolved = await store.resolveShareToken(token);
    expect(resolved.ok && resolved.access.needsPassword).toBe(true);
  });

  it("links sem palavra-passe nunca passam em checkSharePassword", async () => {
    const { owner, project } = await setup("sh6");
    const token = tokenOf((await store.createShareLink(owner, input(project.id))).url);
    expect(await store.checkSharePassword(token, "")).toBe(false);
    expect(await store.checkSharePassword(token, "qualquer")).toBe(false);
  });

  it("o âmbito do link de documento inclui só esse documento e as subpáginas", async () => {
    const { owner, project, doc } = await setup("sh7");
    const child = await store.createDocument(owner, {
      projectId: project.id,
      parentId: doc.id,
      title: "Filha",
      summary: "",
      plainText: "",
    });
    const outsider = await store.createDocument(owner, {
      projectId: project.id,
      parentId: null,
      title: "Fora",
      summary: "",
      plainText: "",
    });
    const token = tokenOf((await store.createShareLink(owner, input(project.id, { documentId: doc.id }))).url);
    const resolved = await store.resolveShareToken(token);
    expect(resolved.ok && resolved.access.documents.map((d) => d.id).sort()).toEqual([doc.id, child.id].sort());
    expect(await store.readSharedDocument(token, outsider.id)).toBeNull();
    expect((await store.readSharedDocument(token, child.id))?.document.id).toBe(child.id);
  });

  it("papéis do link: Leitor não comenta nem edita; Comentador comenta mas não edita; Editor edita", async () => {
    const { owner, project, doc } = await setup("sh8");
    const viewer = tokenOf((await store.createShareLink(owner, input(project.id, { role: "VIEWER" }))).url);
    const commenter = tokenOf((await store.createShareLink(owner, input(project.id, { role: "COMMENTER" }))).url);
    const editor = tokenOf((await store.createShareLink(owner, input(project.id, { role: "EDITOR" }))).url);
    const guest = { userId: null, guestName: "Visitante" };
    const comment = { documentId: doc.id, kind: "comment" as const, quote: "", body: "Bom texto" };
    const save = {
      documentId: doc.id,
      title: "Doc",
      summary: "",
      contentJson: paragraph("alterado"),
      baseUpdatedAt: null,
    };

    await expect(store.addSharedComment(viewer, guest, comment)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(store.saveSharedDocument(viewer, guest, save)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(store.addSharedComment(commenter, guest, comment)).resolves.toBeUndefined();
    await expect(store.saveSharedDocument(commenter, guest, save)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(store.saveSharedDocument(editor, guest, save)).resolves.toMatchObject({ conflict: false });
    // O que o convidado grava passa pela mesma validação do editor.
    const hostile = { ...save, contentJson: { type: "doc", content: [{ type: "script" }] } as unknown as DocContent };
    await expect(store.saveSharedDocument(editor, guest, hostile)).rejects.toBeDefined();
    const after = await store.getDocumentContent(owner, doc.id);
    expect(after.contentJson).toEqual(paragraph("alterado"));
  });

  it("um link de um projeto não dá acesso a documentos de outro projeto", async () => {
    const a = await setup("sh9");
    const b = await setup("sh10");
    const token = tokenOf((await store.createShareLink(a.owner, input(a.project.id))).url);
    expect(await store.readSharedDocument(token, b.doc.id)).toBeNull();
    await expect(
      store.addSharedComment(
        token,
        { userId: null, guestName: "x" },
        { documentId: b.doc.id, kind: "comment", quote: "", body: "x" },
      ),
    ).rejects.toBeDefined();
  });

  it("apagar o projeto fecha os links", async () => {
    const { owner, project } = await setup("sh11");
    const token = tokenOf((await store.createShareLink(owner, input(project.id))).url);
    await store.deleteProject(owner, project.id);
    expect((await store.resolveShareToken(token)).ok).toBe(false);
  });
});
