/**
 * Vellum — Definições (cliente)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Quatro separadores:
 *  1. Aparência & Papel — temas curados e fonte de leitura;
 *  2. Conta & E-mail — estado do envio (Brevo/Resend), confirmação de início
 *     de sessão, dispositivo de confiança, email de teste e meta diária;
 *  3. Equipa & Permissões — membros, links partilhados ativos, tabela de papéis
 *     e dados de exemplo;
 *  4. Sincronização & Backups — .ics, Markdown e snapshot .vellum.json.
 * O separador fica no endereço (#aparencia, #conta, #equipa, #sincronizacao).
 */
"use client";

import {
  Check,
  Copy,
  Link2,
  Loader2,
  Mail,
  MonitorSmartphone,
  Palette,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  ArrowLeftRight,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

import {
  clearExampleDataAction,
  forgetTrustedDeviceAction,
  getAccountEmailStateAction,
  restoreExampleDataAction,
  revokeShareLinkAction,
  sendTestEmailAction,
  setLoginConfirmationAction,
  updatePreferencesAction,
  type AccountEmailState,
} from "@/app/(workspace)/actions";
import { PermissionMatrix } from "@/components/auth/PermissionMatrix";
import { openProfile } from "@/components/profile/ProfileModal";
import { WallpaperPicker } from "@/components/wallpapers/GeometricBackground";
import { useCopy } from "@/components/editor/useCopy";
import { useShell } from "@/components/layout/ShellContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { SyncHub } from "@/components/settings/SyncHub";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { FieldError, Input, Label } from "@/components/ui/Field";
import { InkTag } from "@/components/ui/Ink";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { relativeTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/rbac";
import { EASE_EDITORIAL, cn, formatDuration } from "@/lib/utils";
import { READING_FONTS, SHARE_ROLE_LABELS, type ReadingFont } from "@/lib/workspace-types";

const FONT_META: Record<ReadingFont, { label: string; family: string; className: string }> = {
  serif: { label: "Newsreader", family: "Serifa editorial", className: "font-serif text-[17px] leading-[1.65]" },
  sans: { label: "Plus Jakarta Sans", family: "Sem serifa", className: "font-sans text-[15px] leading-[1.7]" },
};

const TABS = [
  { id: "aparencia", label: "Aparência & Papel", icon: Palette },
  { id: "conta", label: "Conta & E-mail", icon: Mail },
  { id: "equipa", label: "Equipa & Permissões", icon: Users },
  { id: "sincronizacao", label: "Sincronização & Backups", icon: ArrowLeftRight },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function SettingsClient() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<TabId>("aparencia");

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      if (TABS.some((t) => t.id === hash)) setTab(hash as TabId);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const choose = (next: TabId) => {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 md:px-10">
      <header>
        <p className="eyebrow">{user?.name}</p>
        <h1 className="mt-3 text-4xl font-normal leading-tight tracking-tight">Definições</h1>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif text-lg text-muted">O papel, a tinta e o ritmo do seu atelier.</p>
          <Button size="sm" onClick={() => openProfile()} data-testid="settings-open-profile">
            <UserRound aria-hidden="true" strokeWidth={1.6} />
            Editar perfil
          </Button>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Secções das definições"
        className="mt-8 flex gap-1 overflow-x-auto border-b border-subtle"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`painel-${id}`}
            data-testid={`settings-tab-${id}`}
            onClick={() => choose(id)}
            className={cn(
              "relative -mb-px inline-flex shrink-0 items-center gap-1.5 px-3 pb-2.5 pt-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              tab === id ? "text-primary" : "text-muted hover:text-primary",
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            {label}
            {tab === id && (
              <motion.span
                layoutId="settings-tab"
                className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-accent-primary"
                transition={reduce ? { duration: 0 } : { duration: 0.22, ease: EASE_EDITORIAL }}
              />
            )}
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        role="tabpanel"
        id={`painel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: EASE_EDITORIAL }}
        className="mt-10"
      >
        {tab === "aparencia" && <AppearanceTab />}
        {tab === "conta" && <AccountTab />}
        {tab === "equipa" && <TeamTab />}
        {tab === "sincronizacao" && (
          <section aria-labelledby="set-sync" id="sincronizacao">
            <SectionHeading
              index="01"
              id="set-sync"
              title="Hub de Sincronização"
              description="Calendário em .ics, documentos em Markdown (para um projeto existente ou um novo) e o snapshot completo do atelier para backup."
            />
            <div className="mt-5">
              <SyncHub />
            </div>
          </section>
        )}
      </motion.div>
    </div>
  );
}

/* ==========================================================================
   1. Aparência & Papel
   ========================================================================== */

function AppearanceTab() {
  const { snapshot, run, isPending } = useWorkspace();
  const { theme, themes } = useTheme();
  const { chooseTheme } = useShell();
  const prefs = snapshot.preferences;

  return (
    <>
      <section aria-labelledby="set-theme">
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

      <section aria-labelledby="set-wallpaper" className="mt-14">
        <SectionHeading
          index="02"
          id="set-wallpaper"
          title="Fundo geométrico"
          description="Oito composições abstratas que vestem o fundo do atelier, o cabeçalho do Dashboard e a mesa à volta da folha A4. A escolha fica neste dispositivo."
        />
        <div className="mt-5" data-testid="settings-wallpapers">
          <WallpaperPicker showIntensity showVariant />
        </div>
      </section>

      <section aria-labelledby="set-font" className="mt-14">
        <SectionHeading
          index="03"
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
    </>
  );
}

/* ==========================================================================
   2. Conta & E-mail
   ========================================================================== */

const MODE_COPY: Record<
  AccountEmailState["mail"]["mode"],
  { label: string; tone: "ok" | "dev" | "off"; text: string }
> = {
  provider: {
    label: "Envio ativo",
    tone: "ok",
    text: "Os códigos de confirmação, convites e recuperações saem por email real.",
  },
  "dev-inbox": {
    label: "Caixa de Inspeção",
    tone: "dev",
    text: "Sem chave de API neste ambiente: os emails ficam na Caixa de Inspeção (/dev/caixa) e o código aparece no ecrã.",
  },
  off: {
    label: "Envio desligado",
    tone: "off",
    text: "Produção sem chave de API: nada é enviado e a confirmação por código fica suspensa para ninguém ficar trancado fora.",
  },
};

function AccountTab() {
  const [state, setState] = useState<AccountEmailState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const { notify } = useWorkspace();

  const load = useCallback(async () => {
    const result = await getAccountEmailStateAction();
    if (result.ok) {
      setState(result.data);
      setLoadError(null);
    } else setLoadError(result.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleConfirmation(enabled: boolean) {
    setBusy("confirm");
    const result = await setLoginConfirmationAction(enabled);
    setBusy(null);
    if (!result.ok) return notify(result.error, "error");
    notify(enabled ? "Confirmação por código ativada." : "Confirmação por código desativada.");
    void load();
  }

  async function forgetDevice() {
    setBusy("device");
    const result = await forgetTrustedDeviceAction();
    setBusy(null);
    if (!result.ok) return notify(result.error, "error");
    notify("Este dispositivo deixou de ser de confiança.");
    void load();
  }

  async function sendTest() {
    setBusy("test");
    setTestResult(null);
    const result = await sendTestEmailAction();
    setBusy(null);
    if (!result.ok) return setTestResult({ tone: "error", text: result.error });
    const { delivered, mode, error, to } = result.data;
    setTestResult(
      delivered
        ? { tone: "ok", text: `Enviado para ${to}. Veja a caixa de entrada (e o spam, na primeira vez).` }
        : mode === "dev-inbox"
          ? { tone: "ok", text: "Guardado na Caixa de Inspeção (/dev/caixa): não há chave de API neste ambiente." }
          : {
              tone: "error",
              text: error ? `O fornecedor recusou: ${error}` : "Envio desligado: falta configurar a chave de API.",
            },
    );
  }

  const mode = state ? MODE_COPY[state.mail.mode] : null;

  return (
    <>
      <section aria-labelledby="set-mail">
        <SectionHeading
          index="01"
          id="set-mail"
          title="Envio de email"
          description="Brevo ou Resend, configurado só por variáveis de ambiente (nunca no código)."
        />
        {loadError && <p className="mt-4 text-sm text-danger">{loadError}</p>}
        {!state && !loadError && <SkeletonCard className="mt-5 max-w-xl" />}
        {state && mode && (
          <div
            className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
            data-testid="mail-status"
            data-mode={state.mail.mode}
          >
            <div className="rounded-xl border border-subtle bg-elevated p-5 shadow-paper">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
                  mode.tone === "ok" && "bg-accent-primary/10 text-accent-primary",
                  mode.tone === "dev" && "bg-surface text-primary",
                  mode.tone === "off" && "border border-dashed border-subtle text-muted",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-1.5 rounded-full", mode.tone === "ok" ? "bg-accent-primary" : "bg-muted")}
                />
                {mode.label}
              </span>
              <p className="mt-3 font-serif text-[17px] leading-snug">{mode.text}</p>
              <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted">Fornecedor</dt>
                <dd className="text-primary">
                  {state.mail.provider === "brevo" ? "Brevo" : state.mail.provider === "resend" ? "Resend" : "—"}
                </dd>
                <dt className="text-muted">Remetente</dt>
                <dd className="truncate text-primary">
                  {state.mail.fromAddress ? `${state.mail.fromName} <${state.mail.fromAddress}>` : "—"}
                </dd>
                {state.mail.missing.length > 0 && (
                  <>
                    <dt className="text-muted">Em falta</dt>
                    <dd className="font-mono text-[12px] text-primary">{state.mail.missing.join(" · ")}</dd>
                  </>
                )}
              </dl>
            </div>
            <div className="rounded-xl border border-subtle bg-surface/50 p-5">
              <p className="eyebrow">Email de teste</p>
              <p className="mt-2 text-sm text-muted">
                Envia uma mensagem para <span className="text-primary">{state.email}</span> com o fornecedor
                configurado.
              </p>
              <Button
                className="mt-4"
                variant="primary"
                onClick={sendTest}
                disabled={busy === "test"}
                data-testid="send-test-email"
              >
                {busy === "test" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" strokeWidth={1.6} />
                ) : (
                  <Send aria-hidden="true" strokeWidth={1.6} />
                )}
                Enviar email de teste
              </Button>
              {testResult && (
                <p
                  role="status"
                  data-testid="test-email-result"
                  className={cn("mt-3 text-sm", testResult.tone === "ok" ? "text-primary" : "text-accent-primary")}
                >
                  {testResult.text}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {state && (
        <section aria-labelledby="set-security" className="mt-14">
          <SectionHeading
            index="02"
            id="set-security"
            title="Confirmação de início de sessão"
            description="Um código de 6 algarismos enviado por email antes de entrar num dispositivo novo."
          />
          <ul className="mt-5 divide-y divide-subtle rounded-xl border border-subtle bg-elevated">
            <li className="flex flex-wrap items-center gap-4 px-5 py-4">
              <ShieldCheck aria-hidden="true" className="size-4 text-accent-primary" strokeWidth={1.6} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-primary">Pedir código ao entrar</span>
                <span className="block text-xs text-muted">
                  {state.security.enforced
                    ? "Recomendado. Os dispositivos de confiança dispensam o código durante 7 dias."
                    : "Suspenso neste servidor enquanto o envio de email estiver desligado."}
                </span>
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  role="switch"
                  data-testid="login-confirmation"
                  checked={state.security.loginConfirmation}
                  disabled={busy === "confirm"}
                  onChange={(e) => void toggleConfirmation(e.target.checked)}
                  className="size-4 accent-[rgb(var(--accent-primary-rgb))]"
                />
                {state.security.loginConfirmation ? "Ligado" : "Desligado"}
              </label>
            </li>
            <li className="flex flex-wrap items-center gap-4 px-5 py-4">
              <MonitorSmartphone aria-hidden="true" className="size-4 text-muted" strokeWidth={1.6} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-primary">Este dispositivo</span>
                <span className="block text-xs text-muted">
                  {state.security.trustedDevice
                    ? "De confiança: não pede código até expirar."
                    : "Não é de confiança: o próximo início de sessão pede código."}
                </span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!state.security.trustedDevice || busy === "device"}
                onClick={forgetDevice}
              >
                Esquecer este dispositivo
              </Button>
            </li>
            <li className="flex flex-wrap items-center gap-4 px-5 py-4">
              <Mail aria-hidden="true" className="size-4 text-muted" strokeWidth={1.6} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-primary">{state.email}</span>
                <span className="block text-xs text-muted">
                  {state.security.emailVerified ? "Email confirmado" : "Email por confirmar"}
                </span>
              </span>
              {state.security.emailVerified && (
                <Check aria-label="Confirmado" className="size-4 text-accent-primary" strokeWidth={2} />
              )}
            </li>
          </ul>
        </section>
      )}

      <GoalSection index={state ? "03" : "02"} />
    </>
  );
}

function GoalSection({ index }: { index: string }) {
  const { snapshot, run, isPending } = useWorkspace();
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

  const goalSeconds = prefs.dailyGoalMinutes * 60;
  const progress = Math.min(1, snapshot.effort.todaySeconds / goalSeconds);

  return (
    <section aria-labelledby="set-goal" className="mt-14">
      <SectionHeading
        index={index}
        id="set-goal"
        title="Meta diária de esforço"
        description="Tempo de escrita focada que quer cumprir por dia. Aparece no Dashboard, no calendário e na barra de estado."
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
  );
}

/* ==========================================================================
   3. Equipa & Permissões
   ========================================================================== */

function TeamTab() {
  const { role } = useAuth();
  const { snapshot, run, roleIn, can, isPending } = useWorkspace();
  const { openShare } = useShell();
  const [copied, copy] = useCopy();
  const canManage = can("project:manage");
  const canInvite = can("member:invite");
  const projects = new Map(snapshot.projects.map((p) => [p.id, p]));
  const documents = new Map(snapshot.documents.map((d) => [d.id, d]));
  const restricted = snapshot.projects.map((p) => ({ project: p, role: roleIn(p.id) })).filter((r) => r.role !== role);
  const links = snapshot.shareLinks;

  return (
    <>
      <section aria-labelledby="set-members">
        <SectionHeading
          index="01"
          id="set-members"
          title="Membros do atelier"
          description="Quem trabalha consigo e com que papel. Os papéis por projeto gerem-se no botão Partilhar."
          action={
            canInvite ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openShare({ projectId: null, documentId: null })}
                data-testid="settings-manage-members"
              >
                <Users aria-hidden="true" strokeWidth={1.6} />
                Gerir membros e convites
              </Button>
            ) : undefined
          }
        />
        <ul
          className="mt-5 divide-y divide-subtle rounded-xl border border-subtle bg-elevated"
          data-testid="settings-members"
        >
          {snapshot.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.name} initials={m.initials} src={m.avatar} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-primary">{m.name}</span>
                <span className="block truncate text-xs text-muted">{m.email}</span>
              </span>
              <RoleBadge role={m.role} />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">O seu papel no atelier:</span>
          <RoleBadge role={role} />
        </div>
        {restricted.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-sm">
            {restricted.map(({ project, role: r }) => (
              <li key={project.id} className="flex flex-wrap items-center gap-2 text-muted">
                <InkTag color={project.color}>{project.name}</InkTag>
                dá-lhe o papel de <span className="text-primary">{r ? ROLE_LABELS[r] : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="set-links" className="mt-14">
        <SectionHeading
          index="02"
          id="set-links"
          title="Links partilhados ativos"
          description="Links e convites dos projetos que gere. Revogar corta o acesso de imediato."
        />
        {links.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-subtle px-5 py-6 font-serif text-muted">
            Nenhum link ativo. Use «Partilhar» num documento ou projeto para criar um.
          </p>
        ) : (
          <ul
            className="mt-5 divide-y divide-subtle rounded-xl border border-subtle bg-elevated"
            data-testid="settings-links"
          >
            {links.map((link) => {
              const project = projects.get(link.projectId);
              const doc = link.documentId ? documents.get(link.documentId) : undefined;
              return (
                <li key={link.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Link2 aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={1.6} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-primary">
                      {doc ? doc.title : (project?.name ?? "Projeto")}
                      {link.kind === "invite" && link.email && (
                        <span className="text-muted"> · convite a {link.email}</span>
                      )}
                    </span>
                    <span className="nums block text-xs text-muted">
                      {SHARE_ROLE_LABELS[link.role]}
                      {link.hasPassword && " · com palavra-passe"}
                      {link.expiresAt ? ` · expira ${relativeTime(link.expiresAt)}` : " · sem validade"}
                      {` · ${link.openCount} ${link.openCount === 1 ? "abertura" : "aberturas"}`}
                    </span>
                  </span>
                  {project && <InkTag color={project.color}>{project.name}</InkTag>}
                  {link.url && (
                    <Button size="sm" variant="ghost" onClick={() => void copy(link.id, link.url!)}>
                      {copied === link.id ? (
                        <Check aria-hidden="true" strokeWidth={2} />
                      ) : (
                        <Copy aria-hidden="true" strokeWidth={1.6} />
                      )}
                      {copied === link.id ? "Copiado" : "Copiar"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={isPending}
                    onClick={() => run(() => revokeShareLinkAction(link.id), { success: "Link revogado." })}
                  >
                    Revogar
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="set-roles" className="mt-14">
        <SectionHeading
          index="03"
          id="set-roles"
          title="O que cada papel pode fazer"
          description="A sua coluna está realçada. O servidor aplica as mesmas regras em todas as ações."
        />
        <div className="mt-5 rounded-xl border border-subtle bg-elevated px-4 py-2">
          <PermissionMatrix role={role} />
        </div>
      </section>

      {canManage && (
        <section aria-labelledby="set-examples" className="mt-14">
          <SectionHeading
            index="04"
            id="set-examples"
            title="Dados de demonstração"
            description="Três projetos editoriais de exemplo com documentos, diagramas, notas e uma agenda preenchida."
          />
          <ExampleDataControls hasExamples={snapshot.hasExampleData} busy={isPending} run={run} />
        </section>
      )}
    </>
  );
}

function ExampleDataControls({
  hasExamples,
  busy,
  run,
}: {
  hasExamples: boolean;
  busy: boolean;
  run: ReturnType<typeof useWorkspace>["run"];
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-subtle bg-surface/50 px-5 py-4">
      <Sparkles aria-hidden="true" className="size-4 text-accent-primary" strokeWidth={1.6} />
      <p className="min-w-0 flex-1 text-sm text-muted">
        {hasExamples
          ? "O atelier tem dados de exemplo. Limpá-los não toca no que criou."
          : "Sem dados de exemplo. Pode repô-los para explorar o Vellum."}
      </p>
      {hasExamples &&
        (confirming ? (
          <span className="flex items-center gap-2">
            <span className="text-sm text-primary">Limpar os exemplos?</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              data-testid="confirm-clear-examples"
              onClick={async () => {
                const result = await run(() => clearExampleDataAction(), {
                  success: "Dados de demonstração removidos.",
                });
                if (result.ok) setConfirming(false);
              }}
            >
              <Trash2 aria-hidden="true" strokeWidth={1.6} />
              Limpar
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setConfirming(true)} data-testid="clear-examples">
            <Trash2 aria-hidden="true" strokeWidth={1.6} />
            Limpar dados de demonstração
          </Button>
        ))}
      <Button
        size="sm"
        variant={hasExamples ? "ghost" : "primary"}
        disabled={busy}
        data-testid="restore-examples"
        onClick={() => run(() => restoreExampleDataAction(), { success: "Dados de exemplo restaurados." })}
      >
        <RefreshCcw aria-hidden="true" strokeWidth={1.6} />
        Restaurar dados de exemplo
      </Button>
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
