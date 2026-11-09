/**
 * Vellum — Testes da Content Security Policy
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import { buildCsp, cspMode, generateNonce } from "@/lib/csp";

const directive = (csp: string, name: string) =>
  csp
    .split("; ")
    .find((d) => d.startsWith(`${name} `) || d === name)
    ?.split(" ")
    .slice(1) ?? null;

describe("buildCsp (produção)", () => {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, { dev: false });

  it("scripts: só com nonce, sem unsafe-inline nem unsafe-eval", () => {
    const script = directive(csp, "script-src")!;
    expect(script).toContain(`'nonce-${nonce}'`);
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(script.some((v) => v === "*" || v === "https:" || v === "data:")).toBe(false);
  });

  it("bloqueia plugins, <base>, formulários externos e enquadramento", () => {
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(directive(csp, "base-uri")).toEqual(["'self'"]);
    expect(directive(csp, "form-action")).toEqual(["'self'"]);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
  });

  it("os pedidos de rede só vão para a própria origem", () => {
    expect(directive(csp, "connect-src")).toEqual(["'self'"]);
    expect(directive(csp, "default-src")).toEqual(["'self'"]);
  });

  it("sobe pedidos http para https", () => {
    expect(directive(csp, "upgrade-insecure-requests")).toEqual([]);
  });

  it("não deixa o nonce partir a política (só base64 seguro)", () => {
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

describe("buildCsp (desenvolvimento)", () => {
  it("permite unsafe-eval só em desenvolvimento e não força https", () => {
    const csp = buildCsp("abc", { dev: true });
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("generateNonce", () => {
  it("é imprevisível e novo em cada pedido", () => {
    const set = new Set(Array.from({ length: 200 }, generateNonce));
    expect(set.size).toBe(200);
    expect([...set][0]!.length).toBeGreaterThanOrEqual(22);
  });
});

describe("cspMode", () => {
  it("é «enforce» por omissão e aceita report-only/off", () => {
    expect(cspMode(undefined)).toBe("enforce");
    expect(cspMode("")).toBe("enforce");
    expect(cspMode("qualquer-coisa")).toBe("enforce");
    expect(cspMode("report-only")).toBe("report-only");
    expect(cspMode(" OFF ")).toBe("off");
  });
});
