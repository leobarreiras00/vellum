/**
 * Vellum — Cartão da ligação mágica de confirmação
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { ArrowRight, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { verifyCodeAction } from "@/app/(auth)/actions";
import { FormNotice, SubmitButton } from "@/components/auth/AuthFields";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ConfirmLinkCard({ email, code, next }: { email: string; code: string; next?: string }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [trust, setTrust] = useState(true);
  const [error, setError] = useState<string | null>(code && email ? null : "Esta ligação está incompleta.");
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await verifyCodeAction({ email, code, trustDevice: trust }, next);
      if (!result.ok) {
        setError(result.fieldErrors?.code ?? result.error ?? "Ligação inválida ou expirada.");
        return;
      }
      setTheme(result.data.theme);
      router.replace(result.redirectTo ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="confirm-title"
      className="w-[min(440px,calc(100vw-2rem))] rounded-xl border border-subtle bg-elevated px-6 py-7 shadow-sheet sm:px-8"
    >
      <p className="eyebrow">Confirmação por email</p>
      <h1 id="confirm-title" className="mt-2 text-[28px] font-normal leading-tight tracking-tight">
        Confirmar e entrar
      </h1>
      <p className="mt-1 font-serif text-[15px] text-muted">Um clique e o atelier abre neste navegador.</p>

      <div className="mt-6 space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-subtle bg-surface/60 px-3 py-3 text-sm">
          <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-primary" strokeWidth={1.6} />
          <span className="min-w-0 break-words text-primary">{email || "—"}</span>
        </div>
        {error && <FormNotice>{error}</FormNotice>}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-primary">
          <input
            type="checkbox"
            checked={trust}
            onChange={(e) => setTrust(e.target.checked)}
            className="size-4 accent-[rgb(var(--accent-primary-rgb))]"
          />
          Confiar neste dispositivo por 7 dias
        </label>
        <SubmitButton type="button" pending={pending} pendingLabel="A confirmar…" onClick={confirm} disabled={!code}>
          Confirmar e entrar
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.6} />
        </SubmitButton>
        <p className="text-center text-xs text-muted">
          A ligação não funciona?{" "}
          <Link href="/login" className="text-accent-primary underline-offset-4 hover:underline">
            Voltar a iniciar sessão
          </Link>
        </p>
      </div>
    </section>
  );
}
