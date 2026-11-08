/**
 * Vellum — <AuthModal /> · Entrar, Criar conta e Recuperar palavra-passe
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Folha de papelaria (bg-elevated, borda capilar, shadow-sheet) com quatro vistas:
 *  1. Entrar — username/email + palavra-passe, e perfis de demonstração RBAC.
 *  2. Criar conta — nome, username único, email, palavra-passe e tema inicial.
 *  3. Recuperar — pedido de código (passo 1) e nova palavra-passe (passo 2).
 *  4. Confirmar — código de 6 algarismos enviado por email (registo e início de
 *     sessão), «Reenviar código» e «Confiar neste dispositivo por 7 dias».
 * Todo o input é validado no cliente (Zod) e de novo nas Server Actions.
 */
"use client";

import { ArrowLeft, ArrowRight, Check, Inbox, KeyRound, Loader2, MailCheck, RotateCw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import {
  confirmResetAction,
  demoLoginAction,
  loginAction,
  registerAction,
  requestResetAction,
  resendCodeAction,
  verifyCodeAction,
} from "@/app/(auth)/actions";
import { FormNotice, PasswordField, SubmitButton, TextField, linkButton } from "@/components/auth/AuthFields";
import { useTheme } from "@/components/providers/ThemeProvider";
import { openSupport } from "@/components/support/SupportModal";
import { useAuth } from "@/context/AuthContext";
import {
  fieldErrors,
  loginSchema,
  registerSchema,
  resetConfirmSchema,
  resetRequestSchema,
  verifyCodeSchema,
  type FieldErrors,
} from "@/lib/auth-schemas";
import type { SignInOutcome } from "@/lib/auth";
import type { PlatformRole, WorkspaceRole } from "@/lib/rbac";
import type { ThemeId } from "@/lib/themes";
import { digitsOnly, formatOtp } from "@/lib/input-masks";
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

type View = "login" | "register" | "reset" | "verify";
type CodeSent = Extract<SignInOutcome, { status: "code-sent" }>;

interface AuthModalProps {
  demoProfiles: readonly PublicDemoProfile[];
  /** Destino após entrar (validado de novo no servidor). */
  next?: string;
  initialView?: Exclude<View, "verify">;
  /** Username ou email já preenchido (ex.: ligação do email de recuperação). */
  initialIdentifier?: string;
  /** Mostra a ligação para a Caixa de Inspeção (desenvolvimento sem fornecedor de email). */
  devInbox?: boolean;
}

export function AuthModal({
  demoProfiles,
  next,
  initialView = "login",
  initialIdentifier = "",
  devInbox = false,
}: AuthModalProps) {
  const [view, setView] = useState<View>(initialView);
  const [prefill, setPrefill] = useState(initialIdentifier);
  const [pendingCode, setPendingCode] = useState<CodeSent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const awaitCode = (outcome: CodeSent) => {
    setPendingCode(outcome);
    setNotice(null);
    setView("verify");
  };

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
    verify: {
      eyebrow: pendingCode?.purpose === "register" ? "II · Confirmar email" : "I · Confirmar acesso",
      title: pendingCode?.purpose === "register" ? "Confirme o seu e-mail" : "Confirme que é você",
      dek:
        pendingCode?.purpose === "register"
          ? "Falta um passo para abrir o seu atelier."
          : "Enviámos um código de 6 algarismos para o seu email.",
    },
  };

  return (
    <section
      aria-labelledby="auth-title"
      className="w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-subtle bg-elevated shadow-sheet"
    >
      {view !== "reset" && view !== "verify" && (
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
              <p className="mt-1 font-serif text-[15px] text-muted">{header[view].dek}</p>
            </header>

            {view === "login" && (
              <LoginView
                next={next}
                prefill={prefill}
                notice={notice}
                demoProfiles={demoProfiles}
                onForgot={(identifier) => go("reset", { identifier })}
                onCodeSent={awaitCode}
              />
            )}
            {view === "register" && <RegisterView onCodeSent={awaitCode} />}
            {view === "verify" && pendingCode && (
              <VerifyView
                pending={pendingCode}
                next={next}
                devInbox={devInbox}
                onResent={setPendingCode}
                onBack={() => go(pendingCode.purpose === "register" ? "register" : "login")}
              />
            )}
            {view === "reset" && (
              <ResetView
                prefill={prefill}
                onBack={() => go("login")}
                onDone={(identifier) =>
                  go("login", {
                    identifier,
                    notice: "Palavra-passe atualizada. Já pode entrar com a nova palavra-passe.",
                  })
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
        <p className="mt-6 border-t border-subtle pt-4 text-center text-xs text-muted">
          Precisa de ajuda?{" "}
          <button
            type="button"
            onClick={() => openSupport("pedido")}
            className="rounded-sm font-medium text-accent-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            Contactar Suporte
          </button>
          <span aria-hidden="true"> · </span>
          <a href="/termos" className="hover:text-primary">
            Termos
          </a>
          <span aria-hidden="true"> · </span>
          <a href="/privacidade" className="hover:text-primary">
            Privacidade
          </a>
        </p>
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
  onCodeSent: (outcome: CodeSent) => void;
}

function LoginView({ next, prefill, notice, demoProfiles, onForgot, onCodeSent }: LoginViewProps) {
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
      if (result.data.status === "code-sent") onCodeSent(result.data);
      else complete(result.data.user, result.redirectTo);
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
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.6} />
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
                    <Loader2 aria-label="A entrar…" className="size-4 animate-spin text-muted" strokeWidth={1.6} />
                  ) : (
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 text-muted transition-transform duration-150 ease-editorial group-hover:translate-x-0.5 group-hover:text-accent-primary"
                      strokeWidth={1.6}
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

type RegisterFields = {
  name: string;
  username: string;
  email: string;
  password: string;
  theme: string;
  acceptTerms: boolean;
};

function RegisterView({ onCodeSent }: { onCodeSent: (outcome: CodeSent) => void }) {
  const complete = useCompleteSignIn();
  const { theme, themes, setTheme } = useTheme();
  const [values, setValues] = useState({ name: "", username: "", email: "", password: "" });
  const [chosenTheme, setChosenTheme] = useState<ThemeId>(theme);
  const [accepted, setAccepted] = useState(false);
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
    const parsed = registerSchema.safeParse({ ...values, theme: chosenTheme, acceptTerms: accepted });
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
      if (result.data.status === "code-sent") {
        onCodeSent(result.data);
        return;
      }
      setTheme(result.data.user.theme);
      complete(result.data.user, result.redirectTo);
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
                <span
                  data-theme={t.id}
                  aria-hidden="true"
                  className="block overflow-hidden rounded-md border border-subtle"
                >
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

      <div>
        <label className="flex items-start gap-2.5 text-[13px] leading-snug text-primary">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? "accept-terms-error" : undefined}
            className="mt-0.5 size-4 shrink-0 rounded border-subtle accent-[rgb(var(--accent-primary-rgb))]"
            data-testid="accept-terms"
          />
          <span>
            Li e aceito os{" "}
            <a
              href="/termos"
              target="_blank"
              rel="noopener"
              className="text-accent-primary underline underline-offset-2"
            >
              Termos e Condições
            </a>{" "}
            e a{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener"
              className="text-accent-primary underline underline-offset-2"
            >
              Política de Privacidade
            </a>
            .
          </span>
        </label>
        {errors.acceptTerms && (
          <p id="accept-terms-error" role="alert" className="mt-1.5 text-xs text-danger">
            {errors.acceptTerms}
          </p>
        )}
      </div>

      <SubmitButton pending={pending} pendingLabel="A preparar o seu atelier…">
        Criar conta
        <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.6} />
      </SubmitButton>
      <p className="text-center text-[11px] leading-relaxed text-muted">
        Fica como Proprietário do seu próprio workspace. Enviamos um código para confirmar o email.
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
  const [errors, setErrors] = useState<
    FieldErrors<{ identifier: string; code: string; password: string; confirm: string }>
  >({});
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
                Se existir uma conta para <span className="font-medium">«{identifier.trim()}»</span>, enviámos um código
                de 6 algarismos. Expira em 15 minutos.
              </FormNotice>
              {demoCode && <DemoCodeSlip code={demoCode} onUse={() => setCode(demoCode)} />}
              {formError && <FormNotice>{formError}</FormNotice>}
              <TextField
                label="Código de recuperação"
                name="one-time-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={7}
                placeholder="000 000"
                className="nums font-mono tracking-[0.3em]"
                value={formatOtp(code)}
                onChange={(e) => setCode(digitsOnly(e.target.value, 6))}
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
                <KeyRound aria-hidden="true" className="size-4" strokeWidth={1.6} />
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
        <button
          type="button"
          onClick={step === 2 ? () => setStep(1) : onBack}
          className={cn(linkButton, "inline-flex items-center gap-1.5")}
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          {step === 2 ? "Usar outra conta" : "Voltar a iniciar sessão"}
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   Vista 4 · Confirme o seu e-mail (código de 6 algarismos)
   ========================================================================== */

const RESEND_COOLDOWN_S = 30;

interface VerifyViewProps {
  pending: CodeSent;
  next?: string;
  devInbox: boolean;
  onResent: (outcome: CodeSent) => void;
  onBack: () => void;
}

function VerifyView({ pending, next, devInbox, onResent, onBack }: VerifyViewProps) {
  const complete = useCompleteSignIn();
  const { setTheme } = useTheme();
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(pending.purpose === "login");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [pendingSubmit, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function submit(value = code) {
    const parsed = verifyCodeSchema.safeParse({ email: pending.email, code: value, trustDevice: trust });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).code ?? "Indique o código de 6 algarismos.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyCodeAction(parsed.data, next);
      if (!result.ok) {
        setError(result.fieldErrors?.code ?? result.error ?? "Código inválido.");
        setCode("");
        inputRef.current?.focus();
        return;
      }
      setTheme(result.data.theme);
      complete(result.data, result.redirectTo);
    });
  }

  function resend() {
    setError(null);
    startTransition(async () => {
      const result = await resendCodeAction();
      if (!result.ok) {
        setError(result.error ?? "Não foi possível reenviar o código.");
        return;
      }
      if (result.data.status === "code-sent") onResent(result.data);
      setCode("");
      setCooldown(RESEND_COOLDOWN_S);
      setInfo("Enviámos um novo código. O anterior deixou de funcionar.");
    });
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      data-testid="verify-view"
    >
      <div className="flex items-start gap-3 rounded-lg border border-subtle bg-surface/60 px-3 py-3">
        <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-primary" strokeWidth={1.6} />
        <p className="text-sm leading-relaxed text-primary">
          Enviámos um código de 6 algarismos para{" "}
          <span className="font-medium" data-testid="verify-email">
            {pending.maskedEmail}
          </span>
          . Também pode abrir a ligação «Confirmar» do email. Expira em 15 minutos.
        </p>
      </div>
      {pending.deliveryFailed && (
        <FormNotice>
          O serviço de email recusou o envio. Confirme a chave e o remetente nas variáveis de ambiente e tente «Reenviar
          código».
        </FormNotice>
      )}
      {pending.devCode && (
        <DemoCodeSlip
          code={pending.devCode}
          label={devInbox ? "Caixa de inspeção · sem fornecedor de email configurado" : undefined}
          onUse={() => {
            setCode(pending.devCode!);
            submit(pending.devCode!);
          }}
        />
      )}
      {info && !error && <FormNotice tone="info">{info}</FormNotice>}
      {error && !pending.devCode && <FormNotice>{error}</FormNotice>}

      <TextField
        ref={inputRef}
        label="Código de confirmação"
        name="one-time-code"
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={7}
        placeholder="000 000"
        className="nums h-12 text-center font-mono text-xl tracking-[0.35em]"
        value={formatOtp(code)}
        onChange={(e) => {
          const value = digitsOnly(e.target.value, 6);
          setCode(value);
          if (value.length === 6) submit(value);
        }}
        error={pending.devCode ? (error ?? undefined) : undefined}
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm text-primary">
        <input
          type="checkbox"
          checked={trust}
          onChange={(e) => setTrust(e.target.checked)}
          className="size-4 accent-[rgb(var(--accent-primary-rgb))]"
        />
        Confiar neste dispositivo por 7 dias
      </label>

      <SubmitButton pending={pendingSubmit} pendingLabel="A confirmar…">
        {pending.purpose === "register" ? "Confirmar e abrir o atelier" : "Confirmar e entrar"}
        <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.6} />
      </SubmitButton>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle pt-4">
        <button type="button" onClick={onBack} className={cn(linkButton, "inline-flex items-center gap-1.5")}>
          <ArrowLeft aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          Voltar
        </button>
        <div className="flex items-center gap-3">
          {devInbox && (
            <a
              href="/dev/caixa"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(linkButton, "inline-flex items-center gap-1")}
            >
              <Inbox aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
              Caixa de inspeção
            </a>
          )}
          <button
            type="button"
            className={cn(linkButton, "nums inline-flex items-center gap-1")}
            onClick={resend}
            disabled={pendingSubmit || cooldown > 0}
          >
            <RotateCw aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            {cooldown > 0 ? `Reenviar código (${cooldown} s)` : "Reenviar código"}
          </button>
        </div>
      </div>
    </form>
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
            className={cn("nums font-mono text-[11px]", step >= n ? "text-accent-primary" : "text-muted")}
            aria-current={step === n ? "step" : undefined}
          >
            {String(n).padStart(2, "0")}
          </span>
          <span className={cn("text-xs", step === n ? "font-medium text-primary" : "text-muted")}>{label}</span>
          {i === 0 && (
            <span aria-hidden="true" className={cn("h-px flex-1", step === 2 ? "bg-accent-primary/50" : "bg-subtle")} />
          )}
        </li>
      ))}
    </ol>
  );
}

/** Talão do modo de demonstração: o código que seria enviado por email. */
function DemoCodeSlip({ code, onUse, label }: { code: string; onUse: () => void; label?: string }): ReactNode {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-accent-primary/50 bg-accent-primary/[0.04] px-3 py-2.5"
      data-testid="dev-code"
    >
      <div>
        <p className="text-[11px] text-muted">{label ?? "Modo de demonstração · código que seguiria por email"}</p>
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
