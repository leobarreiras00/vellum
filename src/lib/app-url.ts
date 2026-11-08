/**
 * Vellum — URL pública da aplicação
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Lida em tempo de execução (servidor) a partir das variáveis de ambiente, por
 * esta ordem: NEXT_PUBLIC_APP_URL, BETTER_AUTH_URL, APP_URL. Nada fica no código
 * a não ser o valor de desenvolvimento local.
 */

/** Leitura dinâmica: o Next não substitui o valor no build, vale o do arranque. */
function readEnv(name: string): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  const value = env[name]?.trim();
  return value ? value : undefined;
}

export function appUrl(): string {
  const url =
    readEnv("NEXT_PUBLIC_APP_URL") ?? readEnv("BETTER_AUTH_URL") ?? readEnv("APP_URL") ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${appUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export { readEnv };
