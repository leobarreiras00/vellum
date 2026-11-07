/**
 * Vellum — Testes do kit Mermaid (templates, prompt e erros em PT-PT)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import {
  MERMAID_TEMPLATES,
  buildMermaidPrompt,
  detectDiagramType,
  explainMermaidError,
  extractMermaidCode,
} from "@/lib/mermaid-kit";

describe("templates", () => {
  it("tem os 6 tipos pedidos, cada um a começar pela palavra-chave", () => {
    expect(MERMAID_TEMPLATES.map((t) => t.keyword)).toEqual([
      "flowchart TD",
      "sequenceDiagram",
      "gantt",
      "erDiagram",
      "mindmap",
      "stateDiagram-v2",
    ]);
    for (const t of MERMAID_TEMPLATES) expect(t.code.startsWith(t.keyword)).toBe(true);
  });

  it("deteta o tipo de diagrama ignorando comentários", () => {
    expect(detectDiagramType("%% nota\nsequenceDiagram\n A->>B: oi")).toBe("Sequência");
    expect(detectDiagramType("graph LR\n A-->B")).toBe("Fluxograma");
    expect(detectDiagramType("inventado")).toBeNull();
  });
});

describe("assistente de prompt", () => {
  it("inclui o pedido, o tipo e as regras", () => {
    const prompt = buildMermaidPrompt("Fluxo de aprovação de despesas", "gantt");
    expect(prompt).toContain('"""Fluxo de aprovação de despesas"""');
    expect(prompt).toContain("`gantt`");
    expect(prompt).toContain("```mermaid");
    expect(prompt).toContain("Não uses diretivas %%{init}%%");
  });

  it("modo automático não inclui exemplo", () => {
    expect(buildMermaidPrompt("x", "auto")).not.toContain("Exemplo de referência");
  });

  it("extrai código de respostas com bloco ```mermaid", () => {
    expect(extractMermaidCode("Aqui está:\n```mermaid\nflowchart TD\n  A-->B\n```\nFim")).toBe("flowchart TD\n  A-->B");
    expect(extractMermaidCode("  pie title X\r\n")).toBe("pie title X");
  });
});

describe("erros amigáveis", () => {
  const code = "flowchart TD\n  A[Início] --> B{Decisão\n  B --> C";

  it("indica a linha e traduz os tokens esperados", () => {
    const error = explainMermaidError(
      new Error("Parse error on line 3:\n...B --> C\n------^\nExpecting 'SQE', 'DIAMOND_STOP', got 'NODE_STRING'"),
      code,
    );
    expect(error.line).toBe(3);
    expect(error.message).toBe("Erro de sintaxe na linha 3: encontrei um identificador, mas esperava «]», «}».");
    expect(error.excerpt).toBe("B --> C");
  });

  it("tipo desconhecido e código vazio", () => {
    expect(explainMermaidError(new Error("No diagram type detected matching given configuration"), "olá").message).toBe(
      "Não reconheço o tipo de diagrama.",
    );
    expect(explainMermaidError("", "  ").message).toBe("O diagrama está vazio.");
  });

  it("fim inesperado sugere fechar blocos", () => {
    const error = explainMermaidError(
      new Error("Parse error on line 2: Expecting 'PE', got 'EOF'"),
      "flowchart TD\n A(",
    );
    expect(error.hint).toContain("termina a meio");
  });
});

describe("tokens internos", () => {
  it("omite tokens internos e limita a linha ao código existente", () => {
    const error = explainMermaidError(
      new Error("Parse error on line 4:\n...\nExpecting 'SQE', 'DOUBLECIRCLEEND', 'PE', got '1'"),
      "flowchart TD\n  A --> B{X\n  B --> C",
    );
    expect(error.line).toBe(3);
    expect(error.message).toBe("Erro de sintaxe na linha 3: encontrei um símbolo inesperado, mas esperava «]», «)».");
  });
});
