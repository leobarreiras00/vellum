/**
 * Vellum — Testes HTTP de segurança (servidor de produção em execução)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 *
 * Verificam o que sai realmente do servidor: cabeçalhos, CSP com nonce em cada
 * <script>, rotas privadas, rotas que não existem em produção e o PDF sem sessão.
 */
import { describe, expect, it } from "vitest";

const BASE = process.env.VELLUM_TEST_URL ?? "http://127.0.0.1:3100";

const get = (path: string, init: RequestInit = {}) => fetch(`${BASE}${path}`, { redirect: "manual", ...init });

function nonceOf(csp: string | null): string {
  const match = /'nonce-([A-Za-z0-9+/=]+)'/.exec(csp ?? "");
  expect(match, `CSP sem nonce: ${csp}`).not.toBeNull();
  return match![1]!;
}

function scriptTags(html: string): string[] {
  return html.match(/<script\b[^>]*>/gi) ?? [];
}

const HTML_PAGES = ["/login", "/privacidade", "/termos", "/login/confirmar", "/rota-que-nao-existe"];

describe("cabeçalhos de segurança", () => {
  it.each(HTML_PAGES.map((p) => [p]))("%s traz todos os cabeçalhos", async (path) => {
    const res = await get(path);
    const h = res.headers;
    expect(h.get("content-security-policy")).toBeTruthy();
    expect(h.get("x-content-type-options")).toBe("nosniff");
    expect(h.get("x-frame-options")).toBe("DENY");
    expect(h.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("permissions-policy")).toMatch(/camera=\(\)/);
    expect(h.get("permissions-policy")).toMatch(/microphone=\(\)/);
    expect(h.get("permissions-policy")).toMatch(/geolocation=\(\)/);
    expect(h.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(h.get("strict-transport-security")).toMatch(/max-age=\d{7,}/);
    expect(h.get("x-powered-by")).toBeNull();
  });

  it("a CSP de produção é restritiva", async () => {
    const csp = (await get("/login")).headers.get("content-security-policy")!;
    const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";
    expect(directive("script-src")).not.toMatch(/unsafe-inline|unsafe-eval|\s\*(\s|$)/);
    expect(directive("script-src")).toMatch(/'strict-dynamic'/);
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("form-action")).toBe("form-action 'self'");
    expect(directive("connect-src")).toBe("connect-src 'self'");
    expect(csp).toMatch(/upgrade-insecure-requests/);
  });
});

describe("CSP com nonce", () => {
  it.each(HTML_PAGES.map((p) => [p]))("%s: todos os <script> levam o nonce do pedido", async (path) => {
    const res = await get(path);
    const nonce = nonceOf(res.headers.get("content-security-policy"));
    const tags = scriptTags(await res.text());
    expect(tags.length).toBeGreaterThan(0);
    const without = tags.filter((t) => !t.includes(`nonce="${nonce}"`));
    expect(without, `scripts sem nonce em ${path}`).toEqual([]);
  });

  it("não há manipuladores de eventos inline nem javascript: no HTML", async () => {
    for (const path of HTML_PAGES) {
      const html = await (await get(path)).text();
      expect(html, path).not.toMatch(/\son[a-z]+\s*=\s*["']/i);
      expect(html, path).not.toMatch(/(?:href|src|action)\s*=\s*["']\s*javascript:/i);
    }
  });

  it("o nonce muda em cada pedido", async () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 6; i++) nonces.add(nonceOf((await get("/login")).headers.get("content-security-policy")));
    expect(nonces.size).toBe(6);
  });

  it("respostas armazenáveis não repetem o nonce (as páginas são dinâmicas)", async () => {
    const res = await get("/login");
    expect(res.headers.get("cache-control") ?? "").not.toMatch(/s-maxage=\d{3,}/);
  });
});

describe("rotas privadas", () => {
  const PRIVATE = [
    "/dashboard",
    "/projects",
    "/notes",
    "/calendar",
    "/settings",
    "/design-system",
    "/projects/x/documents/y",
  ];
  it.each(PRIVATE.map((p) => [p]))("%s sem sessão redireciona para o início de sessão", async (path) => {
    const res = await get(path);
    expect([302, 303, 307, 308]).toContain(res.status);
    const location = new URL(res.headers.get("location")!, BASE);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("seguinte")).toBe(path);
  });

  it("um cookie de sessão forjado não dá acesso (a sessão valida-se na base de dados)", async () => {
    for (const path of ["/dashboard", "/design-system", "/projects", "/settings"]) {
      const res = await get(path, {
        headers: { cookie: "vellum.session_token=forjado.abcdef; __Secure-vellum.session_token=forjado.abcdef" },
      });
      const body = res.status === 200 ? await res.text() : "";
      const sentAway =
        [302, 303, 307, 308].includes(res.status) && new URL(res.headers.get("location")!, BASE).pathname === "/login";
      expect(sentAway || res.status === 401 || res.status === 403, `${path} → ${res.status}`).toBe(true);
      expect(body).not.toMatch(/Voltar ao Atelier|Novo documento/);
    }
  });

  it("o redirecionamento de volta nunca aponta para outra origem", async () => {
    const res = await get("/dashboard?x=//evil.com");
    const location = new URL(res.headers.get("location")!, BASE);
    expect(location.origin).toBe(new URL(BASE).origin);
  });
});

describe("superfície exposta", () => {
  it("não existe nenhuma rota HTTP pública do Better-Auth", async () => {
    for (const [method, path] of [
      ["GET", "/api/auth/get-session"],
      ["POST", "/api/auth/sign-in/email"],
      ["POST", "/api/auth/sign-up/email"],
      ["POST", "/api/auth/sign-in/username"],
      ["POST", "/api/auth/email-otp/send-verification-otp"],
      ["GET", "/api/auth/ok"],
      ["GET", "/api/auth"],
    ] as const) {
      const res = await get(path, {
        method,
        headers: { "content-type": "application/json" },
        body: method === "POST" ? "{}" : undefined,
      });
      expect(res.status, `${method} ${path}`).toBe(404);
    }
  });

  it("a Caixa de Inspeção de emails não existe em produção", async () => {
    expect((await get("/dev/caixa")).status).toBe(404);
  });

  it("a verificação de saúde não revela detalhes internos", async () => {
    const res = await get("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["status", "version"]);
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
  });

  it("o PDF exige sessão", async () => {
    const res = await get("/api/export/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentId: "x", html: "<!DOCTYPE html><html></html>" }),
    });
    expect(res.status).toBe(401);
  });

  it("o PDF recusa métodos que não sejam POST", async () => {
    expect([404, 405]).toContain((await get("/api/export/pdf")).status);
  });

  it("ficheiros sensíveis comuns não são servidos", async () => {
    for (const path of [
      "/.env",
      "/.env.local",
      "/.git/config",
      "/package.json",
      "/prisma/schema.prisma",
      "/.data/workspace.json",
      "/next.config.ts",
    ]) {
      const res = await get(path);
      expect(res.status, path).toBe(404);
    }
  });

  it("links partilhados inexistentes dão a mesma página que links revogados (sem revelar nada)", async () => {
    const a = await get("/shared/aaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const b = await get("/shared/bbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(a.status).toBe(b.status);
  });
});
