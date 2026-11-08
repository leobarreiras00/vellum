/**
 * Vellum — Testes da Fase 6 (máscaras, imagens, ligações, pesquisa, ilustrações, registo)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { getSchema } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { findMatches } from "@/components/editor/extensions/FindReplace";
import { normalizeHref } from "@/components/editor/extensions/VellumLink";
import { registerSchema } from "@/lib/auth-schemas";
import { docContentSchema, docToMarkdown, docToPlainText, type DocContent } from "@/lib/document-content";
import { docToExportHtml } from "@/lib/exporters/html-render";
import { dataUrlBytes, dataUrlToBytes, isSafeImageSrc, sniffImageType } from "@/lib/image-tools";
import {
  CURATED_COVERS,
  coverSpecSchema,
  illustrationDataUrl,
  motifFor,
  renderIllustrationSvg,
} from "@/lib/illustrations";
import { digitsOnly, formatClock, formatOtp, normalizeClock } from "@/lib/input-masks";
import { countLabel } from "@/lib/utils";
import { noteInputSchema, profileInputSchema } from "@/lib/workspace-types";

// PNG 1×1 transparente.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

describe("máscaras de campos", () => {
  it("formata o código como 000 000 e aceita colar com espaços", () => {
    expect(formatOtp("123456")).toBe("123 456");
    expect(formatOtp("123 4")).toBe("123 4");
    expect(formatOtp("12a3b4c5d6e7")).toBe("123 456");
    expect(digitsOnly("1-2-3", 2)).toBe("12");
  });
  it("formata e normaliza horas HH:MM", () => {
    expect(formatClock("930")).toBe("09:30");
    expect(formatClock("1745")).toBe("17:45");
    expect(normalizeClock("9:05")).toBe("09:05");
    expect(normalizeClock("24:00")).toBeNull();
  });
  it("concorda singular e plural", () => {
    expect(countLabel(1, "palavra", "palavras")).toBe("1 palavra");
    expect(countLabel(2, "palavra", "palavras")).toBe("2 palavras");
  });
});

describe("imagens", () => {
  it("reconhece o tipo real pelos bytes", () => {
    expect(sniffImageType(dataUrlToBytes(PNG))).toBe("image/png");
    expect(sniffImageType(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toBeNull();
    expect(dataUrlBytes(PNG)).toBeGreaterThan(60);
  });
  it("só aceita data URLs de imagem e https", () => {
    expect(isSafeImageSrc(PNG)).toBe(true);
    expect(isSafeImageSrc("https://exemplo.pt/a.png")).toBe(true);
    expect(isSafeImageSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeImageSrc("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isSafeImageSrc("http://exemplo.pt/a.png")).toBe(false);
  });
  const withImage: DocContent = {
    type: "doc",
    content: [
      { type: "paragraph", attrs: { indent: 2 }, content: [{ type: "text", text: "Recuado" }] },
      { type: "image", attrs: { src: PNG, alt: "Ponto", caption: "Figura 1 · ponto", widthPct: 50, align: "left" } },
    ],
  };
  it("valida imagens no conteúdo guardado", () => {
    expect(docContentSchema.safeParse(withImage).success).toBe(true);
    const bad = structuredClone(withImage);
    bad.content[1]!.attrs!.src = "javascript:alert(1)";
    expect(docContentSchema.safeParse(bad).success).toBe(false);
  });
  it("exporta imagens e recuos para HTML e Markdown", () => {
    const html = docToExportHtml(withImage, []);
    expect(html).toContain('style="margin-left: 4em"');
    expect(html).toContain('<figure class="vx-figure" data-align="left" style="width: 50%">');
    expect(html).toContain("<figcaption>Figura 1 · ponto</figcaption>");
    expect(docToMarkdown(withImage)).toContain(`![Ponto](${PNG} "Figura 1 · ponto")`);
    expect(docToPlainText(withImage)).toContain("Figura 1 · ponto");
  });
  it("valida a imagem das Notas Rápidas no servidor", () => {
    const base = { title: "Nota", content: "", color: "terracota" };
    expect(noteInputSchema.safeParse({ ...base, image: PNG }).success).toBe(true);
    expect(noteInputSchema.safeParse({ ...base, image: "data:image/png;base64,QUJD" }).success).toBe(false);
  });
});

describe("ligações e pesquisa no documento", () => {
  it("normaliza ligações e recusa esquemas perigosos", () => {
    expect(normalizeHref("vellum.pt/manual")).toBe("https://vellum.pt/manual");
    expect(normalizeHref("leonardo@exemplo.pt")).toBe("mailto:leonardo@exemplo.pt");
    expect(normalizeHref("javascript:alert(1)")).toBeNull();
  });
  it("encontra ocorrências sem acentos nem maiúsculas", () => {
    const schema = getSchema([StarterKit]);
    const doc = PMNode.fromJSON(schema, {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Coração e coracao, CORAÇÃO." }] },
        { type: "paragraph", content: [{ type: "text", text: "Sem nada." }] },
      ],
    });
    expect(findMatches(doc, "coracao")).toHaveLength(3);
    expect(findMatches(doc, "Coração", true)).toHaveLength(1);
    expect(findMatches(doc, "")).toHaveLength(0);
  });
});

describe("ilustrações (gerador local)", () => {
  const spec = { collection: "herbario" as const, style: "gravura" as const, prompt: "flor de camélia", seed: 7 };
  it("é determinístico e sem texto do utilizador no SVG", () => {
    const a = renderIllustrationSvg(spec);
    expect(a).toBe(renderIllustrationSvg(spec));
    expect(a).not.toContain("camélia");
    expect(a.startsWith("<svg")).toBe(true);
    expect(renderIllustrationSvg({ ...spec, seed: 8 })).not.toBe(a);
    expect(illustrationDataUrl(spec)).toMatch(/^data:image\/svg\+xml;base64,/);
  });
  it("escolhe o motivo pela descrição em português", () => {
    expect(motifFor("ponte sobre o rio", "herbario")).toBe("architecture");
    expect(motifFor("lua cheia", "velino")).toBe("celestial");
    expect(motifFor("", "sumi-e")).toBe("landscape");
  });
  it("tem 12 capas curadas válidas e recusa SVG carregado", () => {
    expect(CURATED_COVERS).toHaveLength(12);
    for (const c of CURATED_COVERS) expect(coverSpecSchema.safeParse(c.spec).success).toBe(true);
    expect(coverSpecSchema.safeParse({ type: "upload", src: "data:image/svg+xml;base64,PHN2Zz4=" }).success).toBe(
      false,
    );
  });
});

describe("registo e perfil", () => {
  const input = {
    name: "Leonardo Barreiras",
    username: "leonardo_barreiras",
    email: "leonardo@exemplo.pt",
    password: "papel-velino-2026",
    theme: "warm-cream",
  };
  it("exige a aceitação expressa dos Termos e da Privacidade", () => {
    expect(registerSchema.safeParse(input).success).toBe(false);
    expect(registerSchema.safeParse({ ...input, acceptTerms: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...input, acceptTerms: true }).success).toBe(true);
  });
  it("limita cargo e bio do perfil", () => {
    expect(profileInputSchema.safeParse({ name: "Leonardo Barreiras", title: "Editor", bio: "" }).success).toBe(true);
    expect(profileInputSchema.safeParse({ name: "L", title: "", bio: "" }).success).toBe(false);
    expect(profileInputSchema.safeParse({ name: "Leonardo", title: "", bio: "x".repeat(401) }).success).toBe(false);
  });
});
