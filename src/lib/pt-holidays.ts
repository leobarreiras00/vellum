/**
 * Vellum — Feriados nacionais de Portugal
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Calculados para qualquer ano (Páscoa pelo algoritmo de Meeus/Jones/Butcher),
 * sem listas fixas no código. O Carnaval é tolerância de ponto, marcado como tal.
 */
import { addDays, toDayKey } from "@/lib/calendar";

export interface Holiday {
  date: string;
  name: string;
  /** Tolerância (não é feriado obrigatório). */
  optional?: boolean;
}

export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toDayKey(year, month, day);
}

const FIXED: Array<[number, number, string]> = [
  [1, 1, "Ano Novo"],
  [4, 25, "Dia da Liberdade"],
  [5, 1, "Dia do Trabalhador"],
  [6, 10, "Dia de Portugal"],
  [8, 15, "Assunção de Nossa Senhora"],
  [10, 5, "Implantação da República"],
  [11, 1, "Dia de Todos os Santos"],
  [12, 1, "Restauração da Independência"],
  [12, 8, "Imaculada Conceição"],
  [12, 25, "Natal"],
];

export function portugueseHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const list: Holiday[] = [
    ...FIXED.map(([m, d, name]) => ({ date: toDayKey(year, m, d), name })),
    { date: addDays(easter, -47), name: "Carnaval", optional: true },
    { date: addDays(easter, -2), name: "Sexta-feira Santa" },
    { date: easter, name: "Páscoa" },
    { date: addDays(easter, 60), name: "Corpo de Deus" },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Mapa dia → feriado para os anos pedidos. */
export function holidayMap(years: number[]): Map<string, Holiday> {
  const map = new Map<string, Holiday>();
  for (const year of new Set(years)) for (const h of portugueseHolidays(year)) map.set(h.date, h);
  return map;
}
