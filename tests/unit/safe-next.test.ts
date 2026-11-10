/**
 * Vellum — Testes do redirecionamento seguro
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-next";

const FALLBACK = "/dashboard";

describe("safeNextPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/documents/abc?x=1#topo", "/documents/abc?x=1#topo"],
    ["/projects/p1/notes", "/projects/p1/notes"],
    ["/s/abc123", "/s/abc123"],
  ])("aceita %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    ["//evil.com"],
    ["///evil.com"],
    ["/\\evil.com"],
    ["\\\\evil.com"],
    ["https://evil.com"],
    ["http://evil.com/x"],
    ["javascript:alert(1)"],
    ["data:text/html,<script>"],
    ["evil.com"],
    [""],
    ["/\t/evil.com"],
    ["/\n/evil.com"],
    ["/\r/evil.com"],
    ["/\u0000/evil.com"],
    ["/​/evil.com"],
    ["/ /evil.com"],
    ["/﻿/evil.com"],
    ["/\u0085/evil.com"],
    ["/ok\\..\\evil"],
    ["/login"],
    ["/login/confirmar"],
    ["/login?seguinte=/dashboard"],
    ["/" + "a".repeat(3000)],
  ])("recusa %j", (input) => {
    expect(safeNextPath(input)).toBe(FALLBACK);
  });

  it.each([[null], [undefined], [42], [{}], [["/a"]]])("recusa não-strings (%j)", (input) => {
    expect(safeNextPath(input)).toBe(FALLBACK);
  });

  it("usa o destino por omissão indicado", () => {
    expect(safeNextPath("//x", "/inicio")).toBe("/inicio");
  });

  it("normaliza segmentos «..» sem sair da origem", () => {
    expect(safeNextPath("/a/../../b")).toBe("/b");
  });

  it("nunca devolve algo que, num navegador, saia da origem", () => {
    const hostile = ["/%2f/evil.com", "/%5cevil.com", "/.//evil.com", "/a/..//evil.com", "/?//evil.com"];
    for (const h of hostile) {
      const out = safeNextPath(h);
      expect(new URL(out, "https://vellum.invalid").origin).toBe("https://vellum.invalid");
      expect(out.startsWith("//")).toBe(false);
    }
  });
});
