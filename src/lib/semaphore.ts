/**
 * Vellum — Semáforo com fila limitada
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Limita o trabalho pesado em simultâneo (ex.: páginas do Chromium a gerar PDF).
 * Há `limit` execuções ao mesmo tempo; até `maxQueue` pedidos esperam a vez;
 * os restantes são recusados de imediato (o chamador responde 429/503).
 */

export class SemaphoreFullError extends Error {
  constructor() {
    super("Capacidade esgotada.");
    this.name = "SemaphoreFullError";
  }
}

export class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly limit: number,
    private readonly maxQueue: number,
  ) {}

  get running(): number {
    return this.active;
  }

  get queued(): number {
    return this.waiting.length;
  }

  /** Corre `task` quando houver vaga; lança `SemaphoreFullError` se a fila estiver cheia. */
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      if (this.waiting.length >= this.maxQueue) throw new SemaphoreFullError();
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else {
      this.active += 1;
    }
    try {
      return await task();
    } finally {
      const next = this.waiting.shift();
      if (next)
        next(); // a vaga passa diretamente ao seguinte
      else this.active -= 1;
    }
  }
}
