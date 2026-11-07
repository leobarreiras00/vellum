/**
 * Vellum — Campos de formulário de autenticação
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Papelaria de luxo: rótulos sans pequenos, contornos capilares, foco em tinta
 * de acento, erros em PT-PT ligados por aria-describedby.
 */
"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

import { passwordStrength } from "@/lib/auth-schemas";
import { cn } from "@/lib/utils";

const inputBase =
  "h-10 w-full rounded-lg border bg-canvas/60 px-3 text-sm text-primary placeholder:text-muted/70 transition-[border-color,box-shadow,background-color] duration-150 ease-editorial hover:border-primary/25 focus:border-accent-primary focus:bg-elevated focus:outline-none focus:ring-2 focus:ring-accent-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Elemento à direita do rótulo (ex.: ligação «Esqueceu-se?»). */
  labelAside?: ReactNode;
  /** Prefixo dentro do campo (ex.: «@»). */
  prefix?: string;
  trailing?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, labelAside, prefix, trailing, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;
  const hasMessage = Boolean(error || hint);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-xs font-medium text-primary">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-[13px] text-muted"
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className={cn(
            inputBase,
            error ? "border-accent-primary" : "border-subtle",
            prefix && "pl-7",
            trailing && "pr-10",
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={messageId} className="text-xs text-accent-primary">
          {error}
        </p>
      ) : hint ? (
        <div id={messageId} className="text-xs text-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
});

interface PasswordFieldProps extends Omit<TextFieldProps, "type" | "trailing"> {
  showStrength?: boolean;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { showStrength = false, value, hint, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const text = typeof value === "string" ? value : "";

  return (
    <TextField
      ref={ref}
      type={visible ? "text" : "password"}
      value={value}
      spellCheck={false}
      autoCapitalize="none"
      hint={showStrength ? <StrengthMeter password={text} /> : hint}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
          aria-pressed={visible}
          className="grid size-8 place-items-center rounded-md text-muted transition-colors duration-150 ease-editorial hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4" strokeWidth={1.5} />
          ) : (
            <Eye aria-hidden="true" className="size-4" strokeWidth={1.5} />
          )}
        </button>
      }
      {...props}
    />
  );
});

/** Indicador de força: quatro traços de tinta, como marcas numa régua. */
export function StrengthMeter({ password }: { password: string }) {
  const { score, label, hint } = passwordStrength(password);
  return (
    <div className="space-y-1.5 pt-0.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-200 ease-editorial",
              score >= step ? (score <= 1 ? "bg-accent-primary" : score === 2 ? "bg-accent-primary/70" : "bg-primary") : "bg-subtle",
            )}
          />
        ))}
      </div>
      <p className="flex items-baseline justify-between gap-3">
        <span>{hint}</span>
        <span className="shrink-0 font-mono text-[11px] text-muted">
          <span className="sr-only">Força: </span>
          {label}
        </span>
      </p>
    </div>
  );
}

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pending?: boolean;
  pendingLabel?: string;
}

export function SubmitButton({ pending, pendingLabel, children, className, disabled, ...props }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-medium text-canvas shadow-paper transition-[background-color,transform] duration-150 ease-editorial hover:bg-accent-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-elevated active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.5} />}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

export function FormNotice({ tone = "error", children }: { tone?: "error" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-xs leading-relaxed",
        tone === "error"
          ? "border-accent-primary/40 bg-accent-primary/[0.06] text-primary"
          : "border-subtle bg-surface/70 text-primary",
      )}
    >
      {children}
    </div>
  );
}

export const linkButton =
  "rounded-sm text-xs text-muted underline-offset-4 transition-colors duration-150 ease-editorial hover:text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-elevated";
