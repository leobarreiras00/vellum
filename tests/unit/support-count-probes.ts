/**
 * Vellum — Auxiliar dos testes do Zod: conta as sondas `Function("")`
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
const RealFunction = globalThis.Function;

/** Conta as chamadas `Function("")` (a sonda do Zod) enquanto `fn` corre. */
export async function countProbes(fn: () => Promise<void>): Promise<number> {
  let probes = 0;
  const isProbe = (args: unknown[]) => args.length === 1 && args[0] === "";
  globalThis.Function = new Proxy(RealFunction, {
    construct(target, args, newTarget) {
      if (isProbe(args)) probes++;
      return Reflect.construct(target, args, newTarget);
    },
    apply(target, thisArg, args) {
      if (isProbe(args)) probes++;
      return Reflect.apply(target, thisArg, args);
    },
  });
  try {
    await fn();
  } finally {
    globalThis.Function = RealFunction;
  }
  return probes;
}
