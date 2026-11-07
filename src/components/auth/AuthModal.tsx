/**
 * Vellum — <AuthModal /> · Entrar, Criar conta e Recuperar palavra-passe
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Folha de papelaria (bg-elevated, borda capilar, shadow-sheet) com três vistas:
 *  1. Entrar — username/email + palavra-passe, e perfis de demonstração RBAC.
 *  2. Criar conta — nome, username único, email, palavra-passe e tema inicial.
 *  3. Recuperar — pedido de código (passo 1) e nova palavra-passe (passo 2).
 * Todo o input é validado no cliente (Zod) e de novo nas Server Actions.
 */
"use client";

import { ArrowLeft, ArrowRight, Check, KeyRound, Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import {
  confirmResetAction,
  demoLoginAction,
  loginAction,
  registerAction,
  requestResetAction,
} from "@/app/(auth)/actions";
import { FormNotice, PasswordField, SubmitButton, TextField, linkButton } from "@/components/auth/AuthFields";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import {
  fieldErrors,
  loginSchema,
  registerSchema,
  resetConfirmSchema,
  resetRequestSchema,
  type FieldErrors,
} from "@/lib/auth-schemas";
import type { PlatformRole, WorkspaceRole } from "@/lib/rbac";
import type { ThemeId } from "@/lib/themes";
import { EASE_EDITORIAL, cn } from "@/lib/utils";

/** Perfil de demonstração tal como chega ao cliente (sem palavra-passe). */
export interface PublicDemoProfile {
  id: string;
  name: string;
  initials: string;
  roleTag: string;
  blurb: string;
  platformRole: PlatformRole;
  workspaceRole: WorkspaceRole;
}

type View = "login" | "register" | "reset";

interface AuthModalProps {
  demoProfiles: readonly PublicDemoProfile[];
  /** Destino após entrar (validado de novo no servidor). */
  next?: string;
  initialView?: View;
}

export function AuthModal({ demoProfiles, next, initialView = "login" }: AuthModalProps) {
  const [view, setView] = useState<View>(initialView);
  const [prefill, setPrefill] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const go = (target: View, options?: { identifier?: string; notice?: string }) => {
    if (options?.identifier !== undefined) setPrefill(options.identifier);
    setNotice(options?.notice ?? null);
    setView(target);
  };

  const header: Record<View, { eyebrow: string; title: string; dek: string }> = {
    login: { eyebrow: "I · Entrar", title: "De volta ao atelier", dek: "Retome a escrita onde a deixou." },
    register: {
      eyebrow: "II · Criar conta",
      title: "Um caderno novo",
      dek: "Uma conta, um workspace seu, o papel que preferir.",
    },
    reset: {
      eyebrow: "III · Recuperar acesso",
      title: "Redefinir palavra-passe",
      dek: "Enviamos um código de uso único, válido durante 15 minutos.",
    },
  };

  return (
    <section
      aria-labelledby="auth-title"
      className="w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-subtle bg-elevated shadow-sheet"
    >
      {view !== "reset" && (
        <div role="tablist" aria-label="Acesso" className="grid grid-cols-2 border-b border-subtle">
          {(["login", "register"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={view === tab}
              onClick={() => go(tab)}
              className={cn(
                "relative h-11 text-sm transition-colors duration-150 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary",
                view === tab ? "font-medium text-primary" : "text-muted hover:bg-surface/60 hover:text-primary",
              )}
            >
              {tab === "login" ? "Iniciar sessão" : "Criar conta"}
              {view === tab && (
                <motion.span
                  layoutId="auth-tab-rule"
                  className="absolute inset-x-6 -bottom-px h-[2px] bg-accent-primary"
                  transition={{ duration: reduced ? 0 : 0.25, ease: EASE_EDITORIAL }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0.12 : 0.22, ease: EASE_EDITORIAL } }}
            exit={{ opacity: 0, y: reduced ? 0 : -4, transition: { duration: 0.14, ease: EASE_EDITORIAL } }}
          >
            <header className="mb-6">
              <p className="eyebrow">{header[view].eyebrow}</p>
              <h2 id="auth-title" className="mt-2 text-[28px] font-normal leading-tight tracking-tight">
                {header[view].title}
              </h2>
              <p className="mt-1 font-serif text-[15px] italic text-muted">{header[view].dek}</p>
            </header>

            {view === "login" && (
              <LoginView
                next={next}
                prefill={prefill}
                notice={notice}
                demoProfiles={demoProfiles}
                onForgot={(identifier) => go("reset", { identifier })}
              />
            )}
            {view === "register" && <RegisterView />}
            {view === "reset" && (
              <ResetView
                prefill={prefill}
                onBack={() => go("login")}
                onDone={(identifier) =>
                  go("login", { identifier, notice: "Palavra-passe atualizada. Já pode entrar com a nova palavra-passe." })
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ==========================================================================
   Pós-autenticação
   ========================================================================== */

function useCompleteSignIn() {
  const router = useRouter();
  const { setUser } = useAuth();
  return (user: Parameters<typeof setUser>[0], redirectTo = "/dashboard") => {
    setUser(user);
    router.replace(redirectTo);
    router.refresh();
  };
}

/* ==========================================================================
   Vista 1 · Iniciar sessão
   ========================================================================== */

interface LoginViewProps {
  next?: string;
  prefill: string;
  notice: string | null;
  demoProfiles: readonly PublicDemoProfile[];
  onForgot: (identifier: string) => void;
}

function LoginView({ next, prefill, notice, demoProfiles, onForgot }: LoginViewProps) {
  const complete = useCompleteSignIn();
  const [identifier, setIdentifier] = useState(prefill);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<{ identifier: string; password: string }>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [demoPending, setDemoPending] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const identifierRef = useRef<HTMLInputElement>(null);

  // Foco inicial só com ponteiro fino (evita abrir o teclado em ecrãs táteis).
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    (prefill ? passwordRef : identifierRef).current?.focus();
  }, [prefill]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await loginAction(parsed.data, next);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? null);
        setPassword("");
        passwordRef.current?.focus();
        return;
      }
      complete(result.data, result.redirectTo);
    });
  }

  function signInAs(profile: PublicDemoProfile) {
    setFormError(null);
    setDemoPending(profile.id);
    startTransition(async () => {
      const result = await demoLoginAction(profile.id, next);
      if (!result.ok) {
        setFormError(result.error ?? "Não foi possível entrar com este perfil.");
        setDemoPending(null);
        return;
      }
      complete(result.data, result.redirectTo);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {notice && <FormNotice tone="info">{notice}</FormNotice>}
        {formError && <FormNotice>{formError}</FormNotice>}

        <TextField
          ref={identifierRef}
          label="Username ou email"
          name="identifier"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="leo ou leo@vellum.local"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={errors.identifier}
        />
        <PasswordField
          ref={passwordRef}
          label="Palavra-passe"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          labelAside={
            <button type="button" className={linkButton} onClick={() => onForgot(identifier)}>
              Esqueceu-se?
            </button>
          }
        />
        <SubmitButton pending={pending && !demoPending} pendingLabel="A entrar…" disabled={pending}>
          Entrar
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
        </SubmitButton>
      </form>

      {demoProfiles.length > 0 && (
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-subtle" />
            <p className="eyebrow">Perfis de demonstração · RBAC</p>
            <span className="h-px flex-1 bg-subtle" />
          </div>
          <ul className="mt-3 divide-y divide-subtle overflow-hidden rounded-lg border border-subtle">
            {demoProfiles.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  onClick={() => signInAs(profile)}
                  disabled={pending}
                  className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 ease-editorial hover:bg-accent-primary/[0.06] focus-visible:bg-accent-primary/[0.06] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-md border border-subtle bg-surface font-serif text-[13px] text-primary"
                  >
                    {profile.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium text-primary">{profile.name}</span>
                      <span className="font-mono text-[11px] text-accent-primary">[{profile.roleTag}]</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{profile.blurb}</span>
                  </span>
                  {demoPending === profile.id ? (
                    <Loader2 aria-label="A entrar…" className="size-4 animate-spin text-muted" strokeWidth={1.5} />
                  ) : (
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 text-muted transition-transform duration-150 ease-editorial group-hover:translate-x-0.5 group-hover:text-accent-primary"
                      strokeWidth={1.5}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Um clique entra com o perfil. Disponível apenas em desenvolvimento.
          </p>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Vista 2 · Criar conta
   ========================================================================== */

type RegisterFields = { name: string; username: string; email: string; password: string; theme: string };

function RegisterView() {
  const complete = useCompleteSignIn();
  const { theme, themes, setTheme } = useTheme();
  const [values, setValues] = useState({ name: "", username: "", email: "", password: "" });
  const [chosenTheme, setChosenTheme] = useState<ThemeId>(theme);
  const [errors, setErrors] = useState<FieldErrors<RegisterFields>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function chooseTheme(id: ThemeId) {
    setChosenTheme(id);
    setTheme(id); // pré-visualização imediata do papel escolhido
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = registerSchema.safeParse({ ...values, theme: chosenTheme });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await registerAction(parsed.data);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? null);
        return;
      }
      setTheme(result.data.theme);
      complete(result.data, result.redirectTo);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <FormNotice>{formError}</FormNotice>}
      <TextField
        label="Nome completo"
        name="name"
        autoComplete="name"
        placeholder="Leonor Matos"
        value={values.name}
        onChange={set("name")}
        error={errors.name}
        autoFocus
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          prefix="@"
          placeholder="leonor"
          value={values.username}
          onChange={set("username")}
          error={errors.username}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="leonor@exemplo.pt"
          value={values.email}
          onChange={set("email")}
          error={errors.email}
        />
      </div>
      <PasswordField
        label="Palavra-passe"
        name="new-password"
        autoComplete="new-password"
        value={values.password}
        onChange={set("password")}
        error={errors.password}
        showStrength
      />

      <fieldset>
        <legend className="text-xs font-medium text-primary">Papel de fundo inicial</legend>
        <div role="radiogroup" aria-label="Tema inicial" className="mt-2 grid grid-cols-5 gap-1.5">
          {themes.map((t) => {
            const selected = t.id === chosenTheme;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t.label}
                title={`${t.label} — ${t.description}`}
                onClick={() => chooseTheme(t.id)}
                className={cn(
                  "group relative overflow-hidden rounded-lg border p-1 transition-[border-color,box-shadow] duration-150 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-elevated",
                  selected ? "border-primary/60 shadow-paper" : "border-subtle hover:border-primary/25",
                )}
              >
                <span data-theme={t.id} aria-hidden="true" className="block overflow-hidden rounded-md border border-subtle">
                  <span className="block h-5 bg-canvas" />
                  <span className="flex h-4 items-center gap-1 bg-surface px-1.5">
                    <span className="size-1.5 rounded-full bg-accent-primary" />
                    <span className="h-px flex-1 bg-primary/40" />
                  </span>
                </span>
                {selected && (
                  <span className="absolute right-1.5 top-1.5 grid size-3.5 place-items-center rounded-sm bg-primary text-canvas">
                    <Check aria-hidden="true" className="size-2.5" strokeWidth={2.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted" aria-live="polite">
          <span className="font-medium text-primary">{themes.find((t) => t.id === chosenTheme)?.label}</span>
          <span aria-hidden="true"> · </span>
          {themes.find((t) => t.id === chosenTheme)?.description}
        </p>
      </fieldset>

      <SubmitButton pending={pending} pendingLabel="A preparar o seu atelier…">
        Criar conta
        <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </SubmitButton>
      <p className="text-center text-[11px] leading-relaxed text-muted">
        Fica como Proprietário do seu próprio workspace.
      </p>
    </form>
  );
}

/* ==========================================================================
   Vista 3 · Recuperar palavra-passe (2 passos)
   ========================================================================== */

interface ResetViewProps {
  prefill: string;
  onBack: () => void;
  onDone: (identifier: string) => void;
}

function ResetView({ prefill, onBack, onDone }: ResetViewProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState(prefill);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors<{ identifier: string; code: string; password: string; confirm: string }>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reduced = useReducedMotion();

  function requestCode(event?: FormEvent) {
    event?.preventDefault();
    const parsed = resetRequestSchema.safeParse({ identifier });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await requestResetAction(parsed.data);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? null);
        return;
      }
      setDemoCode(result.data.demoCode);
      setCode("");
      setStep(2);
    });
  }

  function confirmReset(event: FormEvent) {
    event.preventDefault();
    const parsed = resetConfirmSchema.safeParse({ identifier, code, password, confirm });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await confirmResetAction(parsed.data);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? null);
        return;
      }
      onDone(identifier.trim());
    });
  }

  return (
    <div className="space-y-5">
      <StepRule step={step} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: reduced ? 0 : 8 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE_EDITORIAL } }}
          exit={{ opacity: 0, x: reduced ? 0 : -6, transition: { duration: 0.14 } }}
        >
          {step === 1 ? (
            <form onSubmit={requestCode} noValidate className="space-y-4">
              {formError && <FormNotice>{formError}</FormNotice>}
              <TextField
                label="Username ou email da conta"
                name="identifier"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                error={errors.identifier}
                autoFocus
              />
              <SubmitButton pending={pending} pendingLabel="A enviar…">
                Enviar código de recuperação
              </SubmitButton>
            </form>
          ) : (
            <form onSubmit={confirmReset} noValidate className="space-y-4">
              <FormNotice tone="info">
                Se existir uma conta para <span className="font-medium">«{identifier.trim()}»</span>, enviámos um código de 6
                algarismos. Expira em 15 minutos.
              </FormNotice>
              {demoCode && (
                <DemoCodeSlip code={demoCode} onUse={() => setCode(demoCode)} />
              )}
              {formError && <FormNotice>{formError}</FormNotice>}
              <TextField
                label="Código de recuperação"
                name="one-time-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="nums font-mono tracking-[0.4em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                error={errors.code}
                autoFocus
              />
              <PasswordField
                label="Nova palavra-passe"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                showStrength
              />
              <PasswordField
                label="Confirmar nova palavra-passe"
                name="confirm-password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={errors.confirm}
              />
              <SubmitButton pending={pending} pendingLabel="A guardar…">
                <KeyRound aria-hidden="true" className="size-4" strokeWidth={1.5} />
                Definir nova palavra-passe
              </SubmitButton>
              <div className="text-center">
                <button type="button" className={linkButton} onClick={() => requestCode()} disabled={pending}>
                  Não recebeu? Enviar novo código
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="border-t border-subtle pt-4">
        <button type="button" onClick={step === 2 ? () => setStep(1) : onBack} className={cn(linkButton, "inline-flex items-center gap-1.5")}>
          <ArrowLeft aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
          {step === 2 ? "Usar outra conta" : "Voltar a iniciar sessão"}
        </button>
      </div>
    </div>
  );
}

function StepRule({ step }: { step: 1 | 2 }) {
  return (
    <ol className="flex items-center gap-3" aria-label={`Passo ${step} de 2`}>
      {[
        { n: 1, label: "Pedir código" },
        { n: 2, label: "Nova palavra-passe" },
      ].map(({ n, label }, i) => (
        <li key={n} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              "nums font-mono text-[11px]",
              step >= n ? "text-accent-primary" : "text-muted",
            )}
            aria-current={step === n ? "step" : undefined}
          >
            {String(n).padStart(2, "0")}
          </span>
          <span className={cn("text-xs", step === n ? "font-medium text-primary" : "text-muted")}>{label}</span>
          {i === 0 && <span aria-hidden="true" className={cn("h-px flex-1", step === 2 ? "bg-accent-primary/50" : "bg-subtle")} />}
        </li>
      ))}
    </ol>
  );
}

/** Talão do modo de demonstração: o código que seria enviado por email. */
function DemoCodeSlip({ code, onUse }: { code: string; onUse: () => void }): ReactNode {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-accent-primary/50 bg-accent-primary/[0.04] px-3 py-2.5">
      <div>
        <p className="text-[11px] text-muted">Modo de demonstração · código que seguiria por email</p>
        <p className="nums mt-0.5 font-mono text-base tracking-[0.3em] text-primary">{code}</p>
      </div>
      <button
        type="button"
        onClick={onUse}
        className="h-8 shrink-0 rounded-lg border border-subtle bg-elevated px-3 text-xs text-primary transition-colors duration-150 ease-editorial hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      >
        Usar código
      </button>
    </div>
  );
}
