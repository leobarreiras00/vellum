/**
 * Vellum — Testes da deteção do IP do cliente
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIpFrom } from "@/lib/client-ip";

const h = (values: Record<string, string>) => ({ get: (n: string) => values[n.toLowerCase()] ?? null });

afterEach(() => vi.unstubAllEnvs());

describe("clientIpFrom", () => {
  it("usa a entrada acrescentada pelo proxy (a última), não a enviada pelo cliente", () => {
    expect(clientIpFrom(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("um IP forjado à cabeça não muda a identidade", () => {
    const a = clientIpFrom(h({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }));
    const b = clientIpFrom(h({ "x-forwarded-for": "2.2.2.2, 203.0.113.7" }));
    expect(a).toBe(b);
  });

  it("respeita o número de proxies configurado", () => {
    expect(clientIpFrom(h({ "x-forwarded-for": "9.9.9.9, 203.0.113.7, 10.0.0.1" }), 2)).toBe("203.0.113.7");
    vi.stubEnv("VELLUM_PROXY_HOPS", "2");
    expect(clientIpFrom(h({ "x-forwarded-for": "9.9.9.9, 203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("valores inválidos de VELLUM_PROXY_HOPS voltam ao padrão (1)", () => {
    for (const v of ["0", "-1", "abc", "99", "1.5"]) {
      vi.stubEnv("VELLUM_PROXY_HOPS", v);
      expect(clientIpFrom(h({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" }))).toBe("203.0.113.7");
    }
  });

  it("lê um único IP e IPv6", () => {
    expect(clientIpFrom(h({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIpFrom(h({ "x-forwarded-for": "2001:DB8::1" }))).toBe("2001:db8::1");
  });

  it("recorre a x-real-ip e depois a «unknown»", () => {
    expect(clientIpFrom(h({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIpFrom(h({}))).toBe("unknown");
  });

  it("rejeita lixo (injeção de chaves, espaços, comprimento)", () => {
    for (const bad of ["<script>", "1.1.1.1:evil key", "a".repeat(80), "'; DROP TABLE", ""]) {
      expect(clientIpFrom(h({ "x-forwarded-for": bad }))).toBe("unknown");
    }
  });
});
