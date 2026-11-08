/**
 * Vellum — Utilitários base
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta classes condicionais e resolve conflitos de Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Curva editorial padrão (ver .claude/skills/motion-choreography.md). */
export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;
/** Movimentos de elementos que já estão no ecrã (motion-choreography lei 2). */
export const EASE_MOVE = [0.65, 0, 0.35, 1] as const;

export const APP_VERSION = "0.1.0";
export const REPOSITORY_URL = "https://github.com/leobarreiras00/vellum";
export const COPYRIGHT_YEAR = 2026;

const numberFormatter = new Intl.NumberFormat("pt-PT");

/** Formata números com separadores PT-PT (ex.: 12 480). */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Converte segundos em duração compacta: "0 min", "45 min", "2 h 05 min". */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

/** Converte segundos em relógio "hh:mm:ss" (para contadores ao vivo). */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Conta palavras num texto simples (suporta acentuação PT). */
export function countWords(text: string): number {
  const matches = text.trim().match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

/** Gera um slug ASCII a partir de um título em PT-PT. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** «1 palavra», «2 palavras» (número formatado em pt-PT). */
export function countLabel(n: number, singular: string, pluralForm: string): string {
  return `${formatNumber(n)} ${n === 1 ? singular : pluralForm}`;
}
