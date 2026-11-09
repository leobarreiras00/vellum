/**
 * Vellum — Endereço IP do cliente
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * O Railway (e qualquer proxy inverso) ACRESCENTA o IP do cliente ao fim de
 * `X-Forwarded-For`; tudo o que vem antes foi enviado pelo próprio cliente e
 * pode ser forjado. Por isso lê-se a partir do fim: `hops` é o número de
 * proxies de confiança à frente da aplicação (por omissão 1, o Railway).
 * Configurável com `VELLUM_PROXY_HOPS`.
 */

/** Aceita IPv4/IPv6 simples; qualquer outra coisa (cabeçalho forjado) cai em «unknown». */
const IP_PATTERN = /^[0-9a-fA-F:.]{2,45}$/;

export function clientIpFrom(headers: { get(name: string): string | null | undefined }, hops = proxyHops()): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const candidate = parts[Math.max(0, parts.length - hops)];
    if (candidate && IP_PATTERN.test(candidate)) return candidate.toLowerCase();
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real && IP_PATTERN.test(real)) return real.toLowerCase();
  return "unknown";
}

function proxyHops(): number {
  const raw = Number(process.env.VELLUM_PROXY_HOPS ?? "1");
  return Number.isInteger(raw) && raw >= 1 && raw <= 5 ? raw : 1;
}
