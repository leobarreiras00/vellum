/**
 * Vellum — Mitigação do aviso do TipTap (`mergeAttributes` com a chave `__proto__`)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * O aviso GHSA-cp6q-959q-f8rh lista as versões >= 2.0.0-alpha.0 e < 3.30.4 como afetadas
 * (por isso o `npm audit` o continua a assinalar), mas o código do @tiptap/core 2.27.x
 * instalado já define a chave `__proto__` como propriedade de dados em vez de a atribuir.
 * Duas barreiras, ambas provadas aqui com a função REAL do TipTap:
 *   1. a biblioteca instalada não herda atributos executáveis;
 *   2. mesmo que uma atualização/regressão a perdesse, `docContentSchema` recusa ou limpa
 *      qualquer atributo com chaves perigosas antes de chegar ao editor.
 */
import { mergeAttributes } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { docContentSchema } from "@/lib/document-content";

const HOSTILE_ATTRS = [
  '{"__proto__":{"onerror":"alert(1)"}}',
  '{"constructor":{"prototype":{"onclick":"alert(1)"}}}',
  '{"prototype":{"onmouseover":"alert(1)"}}',
  '{"textAlign":"left","__proto__":{"onerror":"alert(1)"}}',
];

const doc = (attrs: string, node = "paragraph") =>
  JSON.parse(
    `{"type":"doc","content":[{"type":"${node}","attrs":${attrs},"content":[{"type":"text","text":"x"}]}]}`,
  ) as unknown;

describe("aviso do TipTap: __proto__ em atributos", () => {
  it("barreira 1: o @tiptap/core instalado não herda atributos de uma chave __proto__", () => {
    const merged = mergeAttributes({}, JSON.parse(HOSTILE_ATTRS[0]!)) as Record<string, unknown>;
    expect(merged.onerror).toBeUndefined();
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
  });

  it.each(HOSTILE_ATTRS.flatMap((a) => ["paragraph", "heading", "image", "callout"].map((n) => [a, n] as const)))(
    "barreira 2: %s em «%s» é recusado ou limpo antes de chegar ao editor",
    (attrs, node) => {
      const parsed = docContentSchema.safeParse(doc(attrs, node));
      if (!parsed.success) return; // recusado: nunca chega ao editor
      const merged = mergeAttributes({}, ...collectAttrs(parsed.data)) as Record<string, unknown>;
      for (const key of ["onerror", "onclick", "onmouseover"]) expect(merged[key]).toBeUndefined();
      expect(JSON.stringify(parsed.data)).not.toMatch(/__proto__|constructor|prototype|alert/);
    },
  );
});

function collectAttrs(node: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const rec = n as { attrs?: Record<string, unknown>; content?: unknown[]; marks?: unknown[] };
    if (rec.attrs) out.push(rec.attrs);
    rec.content?.forEach(visit);
    rec.marks?.forEach(visit);
  };
  visit(node);
  return out;
}
