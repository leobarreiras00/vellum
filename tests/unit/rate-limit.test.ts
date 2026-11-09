/**
 * Vellum — Testes do limitador de tentativas
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";
import { MINUTE, RateLimiter, type RateRule } from "@/lib/rate-limit";

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

const rule = (key: string, max: number, windowMs = MINUTE): RateRule => ({ key, max, windowMs });

describe("RateLimiter", () => {
  it("permite até `max` tentativas e limita a seguinte", () => {
    const c = clock();
    const rl = new RateLimiter({ now: c.now });
    for (let i = 0; i < 3; i++) expect(rl.consume([rule("a", 3)]).limited).toBe(false);
    const blocked = rl.consume([rule("a", 3)]);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterMs).toBe(MINUTE);
  });

  it("liberta quando a janela termina", () => {
    const c = clock();
    const rl = new RateLimiter({ now: c.now });
    rl.consume([rule("a", 1)]);
    expect(rl.consume([rule("a", 1)]).limited).toBe(true);
    c.advance(MINUTE + 1);
    expect(rl.consume([rule("a", 1)]).limited).toBe(false);
  });

  it("devolve o tempo restante da janela", () => {
    const c = clock();
    const rl = new RateLimiter({ now: c.now });
    rl.consume([rule("a", 1)]);
    c.advance(20_000);
    expect(rl.consume([rule("a", 1)]).retryAfterMs).toBe(40_000);
  });

  it("uma origem esgotada não bloqueia outra conta com outro IP", () => {
    const c = clock();
    const rl = new RateLimiter({ now: c.now });
    const attacker = (acct: string) => [
      rule("ip:1.1.1.1", 4),
      rule(`acct-ip:${acct}:1.1.1.1`, 2),
      rule(`acct:${acct}`, 10),
    ];
    for (let i = 0; i < 4; i++) rl.consume(attacker("vitima"));
    expect(rl.consume(attacker("vitima")).limited).toBe(true);
    // Utilizador legítimo noutro IP, mesma conta: ainda entra.
    const legit = [rule("ip:2.2.2.2", 4), rule("acct-ip:vitima:2.2.2.2", 2), rule("acct:vitima", 10)];
    expect(rl.consume(legit).limited).toBe(false);
  });

  it("o teto por conta trava ataques distribuídos por muitos IPs", () => {
    const c = clock();
    const rl = new RateLimiter({ now: c.now });
    let blockedAt = -1;
    for (let i = 0; i < 20; i++) {
      const r = rl.consume([rule(`ip:10.0.0.${i}`, 100), rule(`acct-ip:x:10.0.0.${i}`, 8), rule("acct:x", 10)]);
      if (r.limited && blockedAt < 0) blockedAt = i;
    }
    expect(blockedAt).toBe(10);
  });

  it("quando uma regra já limita, as seguintes não são contadas", () => {
    const c = clock();
    const rl = new RateLimiter({ now: c.now });
    rl.consume([rule("ip", 1), rule("conta", 5)]);
    rl.consume([rule("ip", 1), rule("conta", 5)]);
    // 2.ª chamada limitou em «ip» e não tocou em «conta»
    expect(rl.peek([rule("conta", 1)]).limited).toBe(true); // count=1 >= 1
    expect(rl.peek([rule("conta", 2)]).limited).toBe(false); // continua em 1
  });

  it("peek não gasta quota", () => {
    const rl = new RateLimiter({ now: clock().now });
    for (let i = 0; i < 10; i++) rl.peek([rule("a", 1)]);
    expect(rl.consume([rule("a", 1)]).limited).toBe(false);
  });

  it("reset limpa chaves concretas", () => {
    const rl = new RateLimiter({ now: clock().now });
    rl.consume([rule("a", 1)]);
    expect(rl.consume([rule("a", 1)]).limited).toBe(true);
    rl.reset("a");
    expect(rl.consume([rule("a", 1)]).limited).toBe(false);
  });

  it("max = 0 bloqueia sempre", () => {
    const rl = new RateLimiter({ now: clock().now });
    expect(rl.consume([rule("a", 0)]).limited).toBe(true);
  });

  it("varre entradas expiradas (a memória não cresce sem limite)", () => {
    const c = clock();
    const rl = new RateLimiter({ now: c.now, sweepEvery: 10 });
    for (let i = 0; i < 9; i++) rl.consume([rule(`k${i}`, 1)]);
    expect(rl.size).toBe(9);
    c.advance(MINUTE + 1);
    rl.consume([rule("novo", 1)]); // 10.ª operação dispara a varredura
    expect(rl.size).toBe(1);
  });

  it("respeita o teto de chaves, expulsando as mais antigas", () => {
    const rl = new RateLimiter({ now: clock().now, maxEntries: 50, sweepEvery: 1_000_000 });
    for (let i = 0; i < 500; i++) rl.consume([rule(`atacante:${i}`, 5)]);
    expect(rl.size).toBeLessThanOrEqual(51);
    // as mais recentes sobrevivem
    expect(rl.peek([rule("atacante:499", 1)]).limited).toBe(true);
    expect(rl.peek([rule("atacante:0", 1)]).limited).toBe(false);
  });
});
