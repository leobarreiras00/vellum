/**
 * Vellum — Régua de KPIs do Dashboard (4 indicadores, tabular-nums)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * I.   Tempo de Uso Real — hoje, semana, mês e % da meta diária.
 * II.  Índice de Esforço Aplicado (0–100%).
 * III. Tracking de Notas e Páginas — notas, documentos, diagramas Mermaid.
 * IV.  Cadência Editorial — palavras na semana e média por hora ativa.
 */
"use client";

import type { ReactNode } from "react";

import type { EffortScore } from "@/lib/telemetry";
import { cn, formatNumber } from "@/lib/utils";

const decimal = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const hours = (seconds: number) => `${decimal.format(seconds / 3600)} h`;

export interface KpiData {
  today: number;
  week: number;
  month: number;
  goalSeconds: number;
  score: EffortScore;
  notes: number;
  documents: number;
  diagrams: number;
  weekWords: number;
  wordsPerHour: number;
  wordsToday: number;
}

function Kpi({
  numeral,
  label,
  children,
  className,
  testId,
}: {
  numeral: string;
  label: string;
  children: ReactNode;
  className?: string;
  testId: string;
}) {
  return (
    <div className={cn("flex flex-col py-6 pr-5", className)} data-testid={testId}>
      <dt className="flex items-baseline gap-2">
        <span className="nums font-mono text-[11px] text-accent-primary">{numeral}</span>
        <span className="eyebrow">{label}</span>
      </dt>
      <dd className="mt-3 flex flex-1 flex-col">{children}</dd>
    </div>
  );
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="block h-1 overflow-hidden rounded-full bg-surface"
    >
      <span
        className="block h-full rounded-full bg-accent-primary transition-[width] duration-300 ease-editorial"
        style={{ width: `${Math.min(1, value) * 100}%` }}
      />
    </span>
  );
}

export function KpiRuler({ data }: { data: KpiData }) {
  const goalRatio = data.goalSeconds ? data.today / data.goalSeconds : 0;
  const parts = [
    { label: "Consistência", value: data.score.consistency, weight: "40%" },
    { label: "Tempo ativo", value: data.score.time, weight: "30%" },
    { label: "Palavras", value: data.score.words, weight: "20%" },
    { label: "Edições", value: data.score.edits, weight: "10%" },
  ];

  return (
    <dl className="grid border-y border-subtle sm:grid-cols-2 xl:grid-cols-4">
      <Kpi numeral="I" label="Tempo de uso real" testId="kpi-tempo" className="pl-1">
        <span className="nums font-serif text-[44px] font-normal leading-none">{hours(data.today)}</span>
        <span className="mt-1 text-xs text-muted">hoje</span>
        <span className="nums mt-4 grid grid-cols-2 gap-3 text-sm">
          <span>
            <span className="block text-[11px] text-muted">Esta semana</span>
            <span className="text-primary">{hours(data.week)}</span>
          </span>
          <span>
            <span className="block text-[11px] text-muted">Total mensal</span>
            <span className="text-primary">{hours(data.month)}</span>
          </span>
        </span>
        <span className="mt-auto pt-4">
          <Bar value={goalRatio} label="Meta diária" />
          <span className="nums mt-1.5 block text-xs text-muted">
            {Math.round(goalRatio * 100)}% da meta diária de {hours(data.goalSeconds)}
          </span>
        </span>
      </Kpi>

      <Kpi
        numeral="II"
        label="Índice de esforço aplicado"
        testId="kpi-esforco"
        className="border-t border-subtle pl-1 sm:border-l sm:border-t-0 sm:pl-5"
      >
        <span className="flex items-baseline gap-1">
          <span className="nums font-serif text-[44px] font-normal leading-none" data-testid="effort-score">
            {data.score.score}
          </span>
          <span className="font-serif text-2xl text-muted">%</span>
        </span>
        <span className="nums mt-1 text-xs text-muted">{data.score.activeDays} de 7 dias com foco ≥ 15 min</span>
        <span className="mt-4 grid gap-1.5">
          {parts.map((p) => (
            <span
              key={p.label}
              className="nums grid grid-cols-[84px_minmax(0,1fr)_30px] items-center gap-2 text-[11px] text-muted"
            >
              <span>{p.label}</span>
              <Bar value={p.value} label={`${p.label} (peso ${p.weight})`} />
              <span className="text-right">{Math.round(p.value * 100)}</span>
            </span>
          ))}
        </span>
      </Kpi>

      <Kpi
        numeral="III"
        label="Notas e páginas"
        testId="kpi-paginas"
        className="border-t border-subtle pl-1 xl:border-l xl:border-t-0 xl:pl-5"
      >
        <span className="nums font-serif text-[44px] font-normal leading-none">
          {formatNumber(data.notes + data.documents + data.diagrams)}
        </span>
        <span className="mt-1 text-xs text-muted">peças de conhecimento ativas</span>
        <span className="nums mt-4 divide-y divide-subtle border-y border-subtle text-sm">
          {[
            ["Notas rápidas", data.notes],
            ["Documentos de projeto", data.documents],
            ["Diagramas Mermaid", data.diagrams],
          ].map(([label, value]) => (
            <span key={label} className="flex items-baseline justify-between py-1.5">
              <span className="text-muted">{label}</span>
              <span className="font-mono text-xs text-primary">{formatNumber(value as number)}</span>
            </span>
          ))}
        </span>
      </Kpi>

      <Kpi
        numeral="IV"
        label="Cadência editorial"
        testId="kpi-cadencia"
        className="border-t border-subtle pl-1 sm:border-l sm:pl-5 xl:border-t-0"
      >
        <span className="nums font-serif text-[44px] font-normal leading-none">{formatNumber(data.weekWords)}</span>
        <span className="mt-1 text-xs text-muted">palavras esta semana</span>
        <span className="nums mt-4 grid grid-cols-2 gap-3 text-sm">
          <span>
            <span className="block text-[11px] text-muted">Por hora ativa</span>
            <span className="text-primary">{formatNumber(data.wordsPerHour)} pal./h</span>
          </span>
          <span>
            <span className="block text-[11px] text-muted">Hoje</span>
            <span className="text-primary">{formatNumber(data.wordsToday)} pal.</span>
          </span>
        </span>
      </Kpi>
    </dl>
  );
}
