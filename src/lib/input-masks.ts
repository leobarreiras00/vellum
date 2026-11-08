/**
 * Vellum — Máscaras de campos (ux-forms-psychology §2)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Funções puras, testadas em tests/unit/input-masks.test.ts.
 */

/** Só os algarismos de `value`, até `max`. */
export function digitsOnly(value: string, max = Infinity): string {
  return value.replace(/\D/g, "").slice(0, max);
}

/** Código de 6 algarismos mostrado como `000 000` (aceita colar `123456` ou `123 456`). */
export function formatOtp(value: string): string {
  const d = digitsOnly(value, 6);
  return d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d;
}

/** Hora `HH:MM` a 24 h enquanto se escreve (`930` → `09:30`, `1745` → `17:45`). */
export function formatClock(value: string): string {
  const raw = value.trim();
  if (/^\d{1,2}:\d{0,2}$/.test(raw)) {
    const [h = "", m = ""] = raw.split(":");
    return `${h}:${m}`;
  }
  const d = digitsOnly(raw, 4);
  if (d.length <= 2) return d;
  if (d.length === 3) return `0${d[0]}:${d.slice(1)}`;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** Normaliza uma hora completa (`9:5` → `09:05`); `null` se inválida. */
export function normalizeClock(value: string): string | null {
  const match = /^(\d{1,2}):?(\d{2})$/.exec(value.trim().replace(/\s/g, "")) ?? /^(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2] ?? 0);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
