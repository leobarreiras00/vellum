/**
 * Vellum — Formatação de datas e durações em PT-PT
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */

const TZ = "Europe/Lisbon";

const dayMonth = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", timeZone: TZ });
const fullDate = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
const time = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });

/** "há 5 min", "há 3 h", "ontem", "há 4 dias", "12 out." */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return dayMonth.format(new Date(iso)).replace(/\.$/, "");
}

/** "7 de novembro de 2026" */
export function longDate(iso: string): string {
  return fullDate.format(new Date(iso));
}

/** "18:15" */
export function clockTime(iso: string): string {
  return time.format(new Date(iso));
}

/** Horas decimais com uma casa: "12,5 h". */
export function hoursLabel(seconds: number): string {
  const hours = seconds / 3600;
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: hours < 10 ? 1 : 0 }).format(hours)} h`;
}

/** Minutos de leitura a ~220 palavras por minuto. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 220));
}
