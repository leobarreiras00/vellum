/**
 * Vellum — Testes do semáforo com fila limitada
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import { Semaphore, SemaphoreFullError } from "@/lib/semaphore";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe("Semaphore", () => {
  it("nunca excede o limite de execuções em simultâneo", async () => {
    const sem = new Semaphore(2, 10);
    let running = 0;
    let peak = 0;
    const gates = Array.from({ length: 6 }, deferred);
    const jobs = gates.map((gate) =>
      sem.run(async () => {
        running++;
        peak = Math.max(peak, running);
        await gate.promise;
        running--;
      }),
    );
    await Promise.resolve();
    expect(sem.running).toBe(2);
    expect(sem.queued).toBe(4);
    for (const gate of gates) {
      gate.resolve();
      await new Promise((r) => setTimeout(r, 0));
    }
    await Promise.all(jobs);
    expect(peak).toBe(2);
    expect(sem.running).toBe(0);
    expect(sem.queued).toBe(0);
  });

  it("recusa de imediato quando a fila está cheia", async () => {
    const sem = new Semaphore(1, 1);
    const gate = deferred();
    const first = sem.run(() => gate.promise);
    const second = sem.run(async () => "segundo");
    await expect(sem.run(async () => "terceiro")).rejects.toBeInstanceOf(SemaphoreFullError);
    gate.resolve();
    await first;
    await expect(second).resolves.toBe("segundo");
  });

  it("liberta a vaga mesmo quando a tarefa falha", async () => {
    const sem = new Semaphore(1, 0);
    await expect(
      sem.run(async () => {
        throw new Error("falhou");
      }),
    ).rejects.toThrow("falhou");
    await expect(sem.run(async () => "ok")).resolves.toBe("ok");
    expect(sem.running).toBe(0);
  });

  it("respeita a ordem de chegada", async () => {
    const sem = new Semaphore(1, 5);
    const order: number[] = [];
    const gate = deferred();
    const jobs = [
      sem.run(async () => {
        await gate.promise;
        order.push(0);
      }),
      ...[1, 2, 3].map((n) => sem.run(async () => void order.push(n))),
    ];
    gate.resolve();
    await Promise.all(jobs);
    expect(order).toEqual([0, 1, 2, 3]);
  });
});
