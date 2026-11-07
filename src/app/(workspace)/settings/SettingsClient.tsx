/**
 * Vellum — Definições (cliente)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Os 5 temas curados com pré-visualização, fonte de leitura, meta diária de
 * esforço e resumo da matriz RBAC ativa. Preferências gravadas no servidor.
 */
"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { updatePreferencesAction } from "@/app/(workspace)/actions";
import { PermissionMatrix } from "@/components/auth/PermissionMatrix";
import { useShell } from "@/components/layout/ShellContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label } from "@/components/ui/Field";
import { InkTag } from "@/components/ui/Ink";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ROLE_LABELS } from "@/lib/rbac";
import { cn, formatDuration } from "@/lib/utils";
import { READING_FONTS, type ReadingFont } from "@/lib/workspace-types";

const FONT_META: Record<ReadingFont, { label: string; family: string; className: string }> = {
  serif: { label: "Newsreader", family: "Serifa editorial", className: "font-serif text-[17px] leading-[1.65]" },
  sans: { label: "Plus Jakarta Sans", family: "Sem serifa", className: "font-sans text-[15px] leading-[1.7]" },
};

export function SettingsClient() {
  const { user, role } = useAuth();
  const { snapshot, run, roleIn, isPending } = useWorkspace();
  const { theme, themes } = useTheme();
  const { chooseTheme } = useShell();
  const prefs = snapshot.preferences;

  const [hours, setHours] = useState(String(Math.floor(prefs.dailyGoalMinutes / 60)));
  const [minutes, setMinutes] = useState(String(prefs.dailyGoalMinutes % 60));
  const [goalError, setGoalError] = useState<string | null>(null);

  useEffect(() => {
    setHours(String(Math.floor(prefs.dailyGoalMinutes / 60)));
    setMinutes(String(prefs.dailyGoalMinutes % 60));
  }, [prefs.dailyGoalMinutes]);

  async function saveGoal(event: React.FormEvent) {
    event.preventDefault();
    const total = Number(hours || 0) * 60 + Number(minutes || 0);
    if (!Number.isFinite(total) || total < 15 || total > 16 * 60) {
      setGoalError("Escolha uma meta entre 15 minutos e 16 horas.");
      return;
    }
    setGoalError(null);
    await run(() => updatePreferencesAction({ dailyGoalMinutes: Math.round(total) }), {
      success: `Meta diária: ${formatDuration(total * 60)}.`,
    });
  }

  const restricted = snapshot.projects.map((p) => ({ project: p, role: roleIn(p.id) })).filter((r) => r.role !== role);
  const goalSeconds = prefs.dailyGoalMinutes * 60;
  const progress = Math.min(1, snapshot.effort.todaySeconds / goalSeconds);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 md:px-10">
      <header>
        <p className="eyebrow">{user?.name}</p>
        <h1 className="mt-3 text-4xl font-normal leading-tight tracking-tight">Definições</h1>
        <p className="mt-2 font-serif text-lg italic text-muted">O papel, a tinta e o ritmo do seu atelier.</p>
      </header>

      {/* 01 Temas */}
      <section aria-labelledby="set-theme" className="mt-10">
        <SectionHeading
          index="01"
          id="set-theme"
          title="Papel de fundo"
          description="Cinco temas curados. A escolha fica neste dispositivo e nas suas preferências."
        />
        <div role="radiogroup" aria-labelledby="set-theme" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {themes.map((t) => {
            const selected = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => chooseTheme(t.id)}
                className={cn(
                  "group rounded-xl border p-2 text-left transition-[border-color,box-shadow] duration-200 ease-editorial",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                  selected ? "border-accent-primary/70 shadow-paper" : "border-subtle hover:border-muted/40",
                )}
              >
                <ThemePreview id={t.id} />
                <span className="mt-2.5 flex items-center justify-between gap-2 px-1">
                  <span className="text-sm font-medium text-primary">{t.label}</span>
                  {selected && <Check aria-hidden="true" className="size-3.5 text-accent-primary" strokeWidth={2} />}
                </span>
                <span className="mt-0.5 block px-1 pb-1 text-[11px] leading-snug text-muted">{t.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 02 Fonte de leitura */}
      <section aria-labelledby="set-font" className="mt-14">
        <SectionHeading
          index="02"
          id="set-font"
          title="Fonte de leitura"
          description="Usada no corpo das páginas. Os títulos mantêm sempre a Newsreader."
        />
        <div role="radiogroup" aria-labelledby="set-font" className="mt-5 grid gap-4 md:grid-cols-2">
          {READING_FONTS.map((font) => {
            const meta = FONT_META[font];
            const selected = prefs.readingFont === font;
            return (
              <button
                key={font}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={isPending}
                onClick={() =>
                  run(() => updatePreferencesAction({ readingFont: font }), {
                    success: `Fonte de leitura: ${meta.label}.`,
                  })
                }
                className={cn(
                  "rounded-xl border bg-elevated p-5 text-left transition-[border-color,box-shadow] duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  selected ? "border-accent-primary/70 shadow-paper" : "border-subtle hover:border-muted/40",
                )}
              >
                <span className="flex items-center justify-between">
                  <span className="eyebrow">{meta.family}</span>
                  {selected && <Check aria-hidden="true" className="size-3.5 text-accent-primary" strokeWidth={2} />}
                </span>
                <span className="mt-2 block text-sm font-medium">{meta.label}</span>
                <span className={cn("mt-3 block text-primary", meta.className)}>
                  «Um atelier para o pensamento escrito: a liberdade dos blocos, o rigor da página.»
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 03 Meta diária */}
      <section aria-labelledby="set-goal" className="mt-14">
        <SectionHeading
          index="03"
          id="set-goal"
          title="Meta diária de esforço"
          description="Tempo de escrita focada que quer cumprir por dia. Aparece no Dashboard e na barra de estado."
        />
        <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form onSubmit={saveGoal} className="flex flex-wrap items-end gap-3" noValidate>
            <div className="w-24">
              <Label htmlFor="goal-hours">Horas</Label>
              <Input
                id="goal-hours"
                type="number"
                inputMode="numeric"
                min={0}
                max={16}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="nums font-mono"
                aria-invalid={Boolean(goalError)}
              />
            </div>
            <div className="w-24">
              <Label htmlFor="goal-minutes">Minutos</Label>
              <Input
                id="goal-minutes"
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="nums font-mono"
                aria-invalid={Boolean(goalError)}
              />
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={isPending}>
              Guardar meta
            </Button>
            <div className="basis-full">
              <FieldError>{goalError}</FieldError>
            </div>
          </form>
          <div className="border-l border-subtle pl-6">
            <p className="eyebrow">Hoje</p>
            <p className="nums mt-2 font-serif text-3xl">
              {formatDuration(snapshot.effort.todaySeconds)}
              <span className="text-lg text-muted"> / {formatDuration(goalSeconds)}</span>
            </p>
            <span className="mt-3 block h-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
              <span className="block h-full rounded-full bg-accent-primary" style={{ width: `${progress * 100}%` }} />
            </span>
          </div>
        </div>
      </section>

      {/* 04 RBAC */}
      <section aria-labelledby="set-rbac" className="mt-14">
        <SectionHeading
          index="04"
          id="set-rbac"
          title="Permissões ativas"
          description="A sua coluna está realçada. O servidor aplica a mesma matriz em todas as ações."
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Papel no workspace:</span>
          <RoleBadge role={role} />
          <RoleBadge role={role} technical />
        </div>
        {restricted.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {restricted.map(({ project, role: r }) => (
              <li key={project.id} className="flex flex-wrap items-center gap-2 text-muted">
                <InkTag color={project.color}>{project.name}</InkTag>
                restringe o seu papel a <span className="text-primary">{r ? ROLE_LABELS[r] : "—"}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5">
          <PermissionMatrix role={role} />
        </div>
      </section>
    </div>
  );
}

/** Miniatura do workspace pintada com o próprio tema (sem hex no componente). */
function ThemePreview({ id }: { id: string }) {
  return (
    <span
      data-theme={id}
      aria-hidden="true"
      className="flex h-24 overflow-hidden rounded-lg border border-subtle bg-canvas"
    >
      <span className="flex w-1/4 flex-col gap-1 border-r border-subtle bg-surface p-1.5">
        <span className="h-1 w-3/4 rounded-full bg-primary/70" />
        <span className="mt-1 h-1 w-full rounded-full bg-muted/40" />
        <span className="h-1 w-2/3 rounded-full bg-muted/40" />
        <span className="h-1 w-5/6 rounded-full bg-accent-primary" />
      </span>
      <span className="flex flex-1 items-start justify-center p-2">
        <span className="flex h-full w-4/5 flex-col gap-1 rounded-sm bg-elevated p-1.5 shadow-paper">
          <span className="h-1.5 w-2/3 rounded-full bg-primary/80" />
          <span className="mt-1 h-0.5 w-full rounded-full bg-muted/40" />
          <span className="h-0.5 w-full rounded-full bg-muted/40" />
          <span className="h-0.5 w-4/5 rounded-full bg-muted/40" />
          <span className="mt-auto size-1.5 rounded-full bg-accent-primary" />
        </span>
      </span>
    </span>
  );
}
