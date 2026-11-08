/**
 * Vellum — Dashboard Executivo de Tracking e Esforço (cliente)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Visão executiva: 4 KPIs, horas e esforço por projeto, mapa de consistência
 * anual, «Continuar a Escrever» e próximos Dias Importantes. Num atelier vazio
 * mostra um estado inicial com «Carregar dados de exemplo» e «Criar projeto».
 * (A tabela de papéis vive agora em Definições → Equipa & Permissões.)
 */
"use client";

import { AtelierVignette } from "@/components/illustrations/AtelierVignette";
import { ArrowRight, CalendarDays, FolderPlus, Sparkles, Star, StickyNote, Timer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { restoreExampleDataAction } from "@/app/(workspace)/actions";
import { ConsistencyHeatmap } from "@/app/(workspace)/dashboard/_components/ConsistencyHeatmap";
import { FocusSessionDialog } from "@/app/(workspace)/dashboard/_components/FocusSessionDialog";
import { KpiRuler, hours } from "@/app/(workspace)/dashboard/_components/KpiRuler";
import { ProjectEffortChart } from "@/app/(workspace)/dashboard/_components/ProjectEffortChart";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Button, buttonVariants } from "@/components/ui/Button";
import { InkTag } from "@/components/ui/Ink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useShell } from "@/components/layout/ShellContext";
import { NoteSlip } from "@/components/workspace/NoteSlip";
import { useAuth } from "@/context/AuthContext";
import { useTelemetry } from "@/context/TelemetryContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { addDays, compareEvents, dayShortLabel, relativeDayLabel, timeRangeLabel, weekdayLabel } from "@/lib/calendar";
import { expandEvents } from "@/lib/recurrence";
import { relativeTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/rbac";
import { effortScore, periodTotals, sumRange } from "@/lib/telemetry";
import { cn, formatClock, formatNumber, countLabel } from "@/lib/utils";
import { routes } from "@/lib/workspace-routes";
import { lisbonDay } from "@/lib/workspace-types";

export function DashboardClient({ greeting, today: todayLabel }: { greeting: string; today: string }) {
  const { user, role } = useAuth();
  const { snapshot, can, run, isPending } = useWorkspace();
  const { openProjectForm } = useShell();
  const telemetry = useTelemetry();
  const [focusOpen, setFocusOpen] = useState(false);

  if (!user) return null;

  const today = lisbonDay(new Date());
  const { effort } = snapshot;
  const liveSeconds = telemetry.todaySeconds - effort.todaySeconds;
  // Dados do servidor + sessão ao vivo ainda por enviar (hoje).
  const byDay = { ...effort.byDay, [today]: (effort.byDay[today] ?? 0) + liveSeconds };
  const wordsByDay = { ...effort.wordsByDay, [today]: telemetry.wordsToday };
  const editsByDay = { ...effort.editsByDay, [today]: telemetry.editsToday };
  const goalSeconds = snapshot.preferences.dailyGoalMinutes * 60;
  const periods = periodTotals(byDay, today);
  const score = effortScore({ byDay, wordsByDay, editsByDay, today, goalSeconds });
  const weekWords = periodTotals(wordsByDay, today).week;
  const wordsPerHour = periods.week > 0 ? Math.round(weekWords / (periods.week / 3600)) : 0;

  const firstName = user.name.split(/\s+/)[0] ?? user.name;
  const projectById = new Map(snapshot.projects.map((p) => [p.id, p]));
  const legends = new Map(snapshot.legends.map((l) => [l.id, l]));
  const recent = [...snapshot.documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const maxDocEffort = Math.max(1, ...recent.map((d) => d.effortSeconds));
  const important = expandEvents(
    snapshot.events.filter((e) => e.isImportant),
    today,
    addDays(today, 730),
  )
    .sort(compareEvents)
    .slice(0, 5);
  const todayEvents = expandEvents(snapshot.events, today, today).sort(compareEvents);
  const pinned = snapshot.notes.filter((n) => n.isPinned).slice(0, 2);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-10 md:px-10">
      <p className="eyebrow first-letter:uppercase">{todayLabel}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-normal leading-tight tracking-tight md:text-5xl">
            {greeting}, {firstName}
            <span className="text-accent-primary">.</span>
          </h1>
          <p className="mt-3 max-w-prose font-serif text-lg text-muted">
            Sessão em <span className="text-primary">{snapshot.workspace.name}</span> como{" "}
            <span className="text-primary">{role ? ROLE_LABELS[role] : "visitante"}</span>.
          </p>
        </div>
        <div className="hidden sm:block">
          <AtelierVignette />
        </div>
      </div>

      {snapshot.projects.length === 0 && (
        <EmptyAtelier
          canManage={can("project:manage")}
          busy={isPending}
          onLoadExamples={() =>
            void run(() => restoreExampleDataAction(), {
              success: "Dados de exemplo carregados: três projetos prontos a explorar.",
            })
          }
          onNewProject={() => openProjectForm()}
        />
      )}

      <div className="mt-8">
        {/* Sessão ao vivo */}
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-subtle bg-surface/60 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", telemetry.isActive ? "bg-accent-primary" : "border border-muted")}
            />
            <span className={telemetry.isActive ? "text-primary" : "text-muted"}>
              {telemetry.isActive ? "Esforço Ativo" : "Em Pausa"}
            </span>
          </span>
          <span className="nums inline-flex items-center gap-1.5 text-muted">
            <Timer aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            Sessão atual <span className="font-mono text-primary">{formatClock(telemetry.sessionSeconds)}</span>
          </span>
          <span className="nums text-muted">
            {formatNumber(telemetry.editsToday)} edições hoje · pausa ao fim de {Math.round(telemetry.idleMs / 60_000)}{" "}
            min sem atividade
          </span>
          <Button variant="secondary" size="sm" className="ml-auto" onClick={() => setFocusOpen(true)}>
            <Timer aria-hidden="true" strokeWidth={1.6} />
            Registar sessão de foco
          </Button>
        </div>

        <KpiRuler
          data={{
            ...periods,
            goalSeconds,
            score,
            notes: snapshot.notes.length,
            documents: snapshot.documents.length,
            diagrams: snapshot.diagramCount,
            weekWords,
            wordsPerHour,
            wordsToday: telemetry.wordsToday,
          }}
        />

        <section aria-labelledby="dash-projetos" className="mt-12">
          <SectionHeading
            index="01"
            id="dash-projetos"
            title="Horas e esforço por projeto"
            description="O seu tempo ativo em cada projeto e o ritmo diário no intervalo escolhido."
          />
          <div className="mt-4">
            <ProjectEffortChart projects={snapshot.projects} byProjectDay={effort.byProjectDay} today={today} />
          </div>
        </section>

        <section aria-labelledby="dash-mapa" className="mt-12">
          <SectionHeading
            index="02"
            id="dash-mapa"
            title="Mapa de consistência anual"
            description={`Cada quadrado é um dia; a terracota plena marca a meta de ${hours(goalSeconds)} cumprida.`}
          />
          <div className="mt-5">
            <ConsistencyHeatmap byDay={byDay} wordsByDay={wordsByDay} goalSeconds={goalSeconds} today={today} />
          </div>
        </section>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
          <section aria-labelledby="dash-escrever">
            <SectionHeading index="03" id="dash-escrever" title="Continuar a escrever" />
            {recent.length === 0 ? (
              <p className="mt-6 font-serif text-muted">Ainda não há páginas. Crie um projeto para começar.</p>
            ) : (
              <ol className="mt-2 divide-y divide-subtle">
                {recent.map((doc) => {
                  const project = projectById.get(doc.projectId);
                  return (
                    <li key={doc.id}>
                      <Link
                        href={routes.page(doc.projectId, doc.id)}
                        className="group -mx-2 block rounded-lg px-2 py-3.5 transition-colors hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                      >
                        <span className="flex items-baseline justify-between gap-4">
                          <span className="truncate font-serif text-lg leading-snug text-primary group-hover:text-accent-primary">
                            {doc.title}
                          </span>
                          <span className="nums shrink-0 text-xs text-muted">{relativeTime(doc.updatedAt)}</span>
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                          {project && <InkTag color={project.color}>{project.name}</InkTag>}
                          <span className="nums">{countLabel(doc.wordCount, "palavra", "palavras")}</span>
                          <span
                            className="ml-auto flex w-full items-center gap-2 sm:w-44"
                            data-ink={project?.color ?? "grafite"}
                          >
                            <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                              <span
                                className="block h-full rounded-full bg-ink"
                                style={{ width: `${(doc.effortSeconds / maxDocEffort) * 100}%` }}
                              />
                            </span>
                            <span className="nums w-14 text-right font-mono text-[11px]" title="Esforço investido">
                              {hours(doc.effortSeconds)}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <div className="grid content-start gap-12">
            <section aria-labelledby="dash-importantes">
              <SectionHeading
                index="04"
                id="dash-importantes"
                title="Próximos dias importantes"
                action={
                  <Link
                    href={routes.calendar}
                    className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent-primary"
                  >
                    Calendário <ArrowRight aria-hidden="true" className="size-3" strokeWidth={1.6} />
                  </Link>
                }
              />
              {important.length === 0 ? (
                <p className="mt-5 font-serif text-muted">
                  Nenhum marco agendado. Marque um evento como Dia Importante.
                </p>
              ) : (
                <ol className="mt-2 divide-y divide-subtle" aria-label="Próximos dias importantes">
                  {important.map((event) => {
                    const legend = event.legendId ? legends.get(event.legendId) : undefined;
                    return (
                      <li key={event.occurrenceKey}>
                        <Link
                          href={`${routes.calendar}?dia=${event.date}`}
                          className="-mx-2 grid grid-cols-[52px_minmax(0,1fr)] gap-3 rounded-lg px-2 py-3 hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                        >
                          <span className="text-center">
                            <span className="nums block font-serif text-2xl leading-none text-accent-primary">
                              {Number(event.date.slice(8))}
                            </span>
                            <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-muted">
                              {dayShortLabel(event.date).split(" ")[1]}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 truncate text-sm text-primary">
                              <Star
                                aria-hidden="true"
                                className="size-3 shrink-0 fill-current text-accent-primary"
                                strokeWidth={1.6}
                              />
                              <span className="truncate">{event.title}</span>
                            </span>
                            <span className="nums mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                              <span className="first-letter:uppercase">{relativeDayLabel(event.date, today)}</span>·
                              <span>{weekdayLabel(event.date)}</span>
                              {legend && <InkTag color={legend.color}>{legend.name}</InkTag>}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
              {todayEvents.length > 0 && (
                <div className="mt-5 rounded-xl border border-subtle bg-surface/50 px-4 py-3">
                  <p className="eyebrow flex items-center gap-1.5">
                    <CalendarDays aria-hidden="true" className="size-3" strokeWidth={1.6} />
                    Hoje na agenda
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {todayEvents.map((e) => (
                      <li key={e.occurrenceKey} className="flex items-baseline gap-3">
                        <span className="nums w-[86px] shrink-0 font-mono text-[11px] text-muted">
                          {timeRangeLabel(e)}
                        </span>
                        <span className="truncate text-primary">{e.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section aria-labelledby="dash-notas">
              <SectionHeading
                index="05"
                id="dash-notas"
                title="Notas fixadas"
                action={
                  <Link
                    href={routes.notes}
                    className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent-primary"
                  >
                    Ver mural <ArrowRight aria-hidden="true" className="size-3" strokeWidth={1.6} />
                  </Link>
                }
              />
              <div className="mt-4 space-y-3">
                {pinned.length === 0 && (
                  <p className="font-serif text-muted">Nenhuma nota fixada. Fixe as que quer ter sempre à mão.</p>
                )}
                {pinned.map((note) => (
                  <NoteSlip key={note.id} note={note} compact />
                ))}
                <RoleGuard permission="document:edit">
                  <Link href={`${routes.notes}?nova=1`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    <StickyNote aria-hidden="true" strokeWidth={1.6} />
                    Nova nota rápida
                  </Link>
                </RoleGuard>
              </div>
            </section>
          </div>
        </div>

        <p className="nums mt-12 border-t border-subtle pt-4 text-xs text-muted">
          Últimos 30 dias: {hours(sumRange(byDay, lisbonDay(new Date(Date.now() - 29 * 86_400_000)), today))} de esforço
          focado. O Motor de Telemetria mede teclado, rato e edição; pausa sozinho ao fim de 2 minutos sem atividade.
        </p>
      </div>

      <FocusSessionDialog open={focusOpen} onClose={() => setFocusOpen(false)} />
    </div>
  );
}

function EmptyAtelier({
  canManage,
  busy,
  onLoadExamples,
  onNewProject,
}: {
  canManage: boolean;
  busy: boolean;
  onLoadExamples: () => void;
  onNewProject: () => void;
}) {
  return (
    <section
      aria-labelledby="atelier-vazio"
      data-testid="dashboard-empty"
      className="paper-grain relative mt-8 overflow-hidden rounded-2xl border border-subtle bg-elevated px-6 py-9 shadow-sheet md:px-10"
    >
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
        <div>
          <p className="eyebrow">Atelier em branco</p>
          <h2 id="atelier-vazio" className="mt-2 font-serif text-3xl font-normal leading-tight">
            Uma mesa limpa, à espera da primeira página<span className="text-accent-primary">.</span>
          </h2>
          <p className="mt-3 max-w-prose font-serif text-lg leading-relaxed text-muted">
            Comece por um projeto seu ou carregue três exemplos editoriais (um romance, uma revista e uma investigação)
            com documentos, diagramas, notas e uma agenda de novembro já preenchida.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {canManage && (
              <Button variant="primary" onClick={onNewProject}>
                <FolderPlus aria-hidden="true" strokeWidth={1.6} />
                Criar projeto
              </Button>
            )}
            {canManage && (
              <Button variant="secondary" onClick={onLoadExamples} disabled={busy} data-testid="load-example-data">
                <Sparkles aria-hidden="true" strokeWidth={1.6} />
                Carregar dados de exemplo
              </Button>
            )}
            {!canManage && (
              <p className="text-sm text-muted">Peça a quem gere o atelier para criar o primeiro projeto.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Pode limpar os exemplos a qualquer momento em Definições → Equipa &amp; Permissões.
          </p>
        </div>
        <ol aria-hidden="true" className="hidden space-y-2.5 md:block">
          {[
            ["Romance", "A Casa das Marés", "terracota"],
            ["Revista", "Atelier · Edição de Inverno", "salvia"],
            ["Investigação", "Hábitos de escrita", "ardosia"],
          ].map(([kind, title, ink], i) => (
            <li
              key={title}
              data-ink={ink}
              className={cn(
                "rounded-lg border border-subtle bg-canvas px-4 py-3 shadow-paper",
                i === 1 && "ml-6",
                i === 2 && "ml-3",
              )}
            >
              <span className="block text-[10.5px] uppercase tracking-[0.14em] text-ink">{kind}</span>
              <span className="mt-0.5 block font-serif text-[17px] text-primary">{title}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
