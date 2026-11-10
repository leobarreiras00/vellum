/**
 * Vellum — Limitador de tentativas (janela fixa, em memória)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Módulo puro (sem Next): partilhado pelo início de sessão, registo, recuperação
 * de palavra-passe, desbloqueio de links partilhados e exportação PDF.
 *
 *  - Cada chamada conta em TODAS as regras (ex.: por IP, por conta+IP e um teto
 *    por conta), para que uma só origem não consiga bloquear a conta de outra
 *    pessoa nem esgotar a quota global.
 *  - As entradas expiradas são varridas e o número de chaves tem um teto
 *    (as mais antigas saem primeiro), por isso um atacante a variar
 *    identificadores não faz a memória crescer sem limite.
 *  - Uma só instância do servidor (Railway, 1 réplica). Com várias réplicas,
 *    os limites passam a ser por réplica.
 */

export interface RateRule {
  /** Chave já com prefixo de domínio, ex.: `login:ip:203.0.113.7`. */
  key: string;
  /** Tentativas permitidas dentro da janela. */
  max: number;
  windowMs: number;
}

export interface RateResult {
  limited: boolean;
  /** Milissegundos até a regra mais restritiva libertar (0 se não limitado). */
  retryAfterMs: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly entries = new Map<string, Entry>();
  private operations = 0;

  constructor(private readonly options: { maxEntries?: number; sweepEvery?: number; now?: () => number } = {}) {}

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  get size(): number {
    return this.entries.size;
  }

  /**
   * Regista uma tentativa nas regras, por ordem; limita se alguma for excedida.
   * Quando uma regra já excede o limite, as seguintes não são contadas: assim, quem
   * esgota a quota da sua origem não consegue criar chaves por conta sem fim.
   */
  consume(rules: readonly RateRule[]): RateResult {
    const now = this.now();
    this.maintain(now);
    let retryAfterMs = 0;
    for (const rule of rules) {
      const entry = this.entries.get(rule.key);
      if (!entry || entry.resetAt <= now) {
        this.entries.set(rule.key, { count: 1, resetAt: now + rule.windowMs });
        if (rule.max < 1) retryAfterMs = rule.windowMs;
      } else {
        entry.count += 1;
        if (entry.count > rule.max) retryAfterMs = entry.resetAt - now;
      }
      if (retryAfterMs > 0) break;
    }
    return { limited: retryAfterMs > 0, retryAfterMs };
  }

  /** Estado sem contar (para mostrar «tente mais tarde» sem gastar quota). */
  peek(rules: readonly RateRule[]): RateResult {
    const now = this.now();
    let retryAfterMs = 0;
    for (const rule of rules) {
      const entry = this.entries.get(rule.key);
      if (entry && entry.resetAt > now && entry.count >= rule.max) {
        retryAfterMs = Math.max(retryAfterMs, entry.resetAt - now);
      }
    }
    return { limited: retryAfterMs > 0, retryAfterMs };
  }

  reset(...keys: string[]): void {
    for (const key of keys) this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  private maintain(now: number): void {
    const maxEntries = this.options.maxEntries ?? 10_000;
    const sweepEvery = this.options.sweepEvery ?? 200;
    this.operations += 1;
    if (this.operations % sweepEvery !== 0 && this.entries.size <= maxEntries) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
    // Ainda acima do teto: os mais antigos (ordem de inserção) saem primeiro.
    let excess = this.entries.size - maxEntries;
    if (excess > 0) {
      for (const key of this.entries.keys()) {
        this.entries.delete(key);
        if (--excess <= 0) break;
      }
    }
  }
}

const globalForLimiter = globalThis as unknown as { vellumRateLimiter?: RateLimiter };

/** Instância partilhada pelo processo (sobrevive ao hot reload e aos vários bundles do Next). */
export const rateLimiter = (globalForLimiter.vellumRateLimiter ??= new RateLimiter());

export const MINUTE = 60_000;
