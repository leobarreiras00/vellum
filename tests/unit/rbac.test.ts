/**
 * Vellum — Testes da matriz RBAC e do papel por projeto
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import {
  ForbiddenError,
  assertCan,
  canCommentDocument,
  canDeleteDocument,
  canEditDocument,
  canExportDocument,
  canManageProject,
  type RbacSubject,
  type WorkspaceRole,
} from "@/lib/rbac";
import { projectSubject } from "@/lib/workspace-types";

const as = (workspaceRole: WorkspaceRole, userId = "u1"): RbacSubject => ({
  userId,
  platformRole: "USER",
  workspaceRole,
});

describe("matriz do documento (Fase 3)", () => {
  it.each([
    ["OWNER", true, true, true],
    ["EDITOR", true, true, true],
    ["COMMENTER", false, true, true],
    ["VIEWER", false, false, false],
  ] as const)("%s: editar=%s comentar=%s exportar=%s", (role, edit, comment, exportar) => {
    expect(canEditDocument(as(role))).toBe(edit);
    expect(canCommentDocument(as(role))).toBe(comment);
    expect(canExportDocument(as(role))).toBe(exportar);
  });

  it("Editor só elimina documentos próprios; Proprietário elimina todos", () => {
    expect(canDeleteDocument(as("EDITOR"), { createdById: "u1" })).toBe(true);
    expect(canDeleteDocument(as("EDITOR"), { createdById: "outro" })).toBe(false);
    expect(canDeleteDocument(as("OWNER"), { createdById: "outro" })).toBe(true);
  });

  it("SUPER_ADMIN passa sempre; sem papel não passa", () => {
    expect(canManageProject({ userId: "a", platformRole: "SUPER_ADMIN", workspaceRole: null })).toBe(true);
    expect(canEditDocument({ userId: "a", platformRole: "USER", workspaceRole: null })).toBe(false);
  });

  it("assertCan lança ForbiddenError com mensagem PT-PT genérica", () => {
    expect(() => assertCan(as("VIEWER"), "document:edit")).toThrow(ForbiddenError);
    expect(() => assertCan(as("VIEWER"), "document:edit")).toThrow("Não tem permissão para esta ação.");
  });
});

describe("projectSubject", () => {
  const project = { members: [{ userId: "u1", role: "COMMENTER" as const, addedAt: "" }] };

  it("o papel de projeto restringe, nunca eleva", () => {
    expect(projectSubject(as("EDITOR"), project).workspaceRole).toBe("COMMENTER");
    expect(projectSubject(as("VIEWER"), project).workspaceRole).toBe("VIEWER");
    expect(projectSubject(as("EDITOR", "u2"), project).workspaceRole).toBe("EDITOR");
  });
});
