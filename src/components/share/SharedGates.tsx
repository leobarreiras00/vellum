/**
 * Vellum — Ecrãs de entrada de um link partilhado (palavra-passe e indisponível)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { ArrowRight, KeyRound, Link2Off } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { unlockSharedAction } from "@/app/shared/actions";
import { FormNotice, PasswordField, SubmitButton } from "@/components/auth/AuthFields";
import { AppFooter } from "@/components/layout/AppFooter";
import { VellumMark } from "@/components/layout/VellumMark";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-12 items-center border-b border-subtle px-5">
        <Link href="/" aria-label="Vellum">
          <VellumMark className="text-lg" />
        </Link>
      </header>
      <main className="grid flex-1 place-items-center px-4 py-16">{children}</main>
      <AppFooter variant="full" />
    </div>
  );
}

export function SharedPasswordGate({
  token,
  projectName,
  ownerName,
}: {
  token: string;
  projectName: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Frame>
      <form
        className="w-[min(420px,calc(100vw-2rem))] space-y-4 rounded-xl border border-subtle bg-elevated px-6 py-7 shadow-sheet sm:px-8"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await unlockSharedAction(token, password);
            if (!result.ok) {
              setError(result.error);
              setPassword("");
              return;
            }
            router.refresh();
          });
        }}
      >
        <p className="eyebrow flex items-center gap-1.5">
          <KeyRound aria-hidden="true" className="size-3" strokeWidth={1.5} />
          Link protegido
        </p>
        <h1 className="text-[26px] font-normal leading-tight tracking-tight">{projectName}</h1>
        <p className="font-serif text-[15px] italic text-muted">
          {ownerName} protegeu este link com uma palavra-passe.
        </p>
        {error && <FormNotice>{error}</FormNotice>}
        <PasswordField
          label="Palavra-passe do link"
          name="share-password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <SubmitButton pending={pending} pendingLabel="A abrir…" disabled={!password}>
          Abrir documento
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
        </SubmitButton>
      </form>
    </Frame>
  );
}

const REASONS = {
  "not-found": "Este link não existe ou o documento foi eliminado.",
  revoked: "Quem partilhou este link revogou o acesso.",
  expired: "Este link expirou. Peça um novo a quem o partilhou.",
} as const;

export function SharedUnavailable({ reason }: { reason: keyof typeof REASONS }) {
  return (
    <Frame>
      <section className="w-[min(440px,calc(100vw-2rem))] rounded-xl border border-subtle bg-elevated px-6 py-7 text-center shadow-sheet sm:px-8">
        <Link2Off aria-hidden="true" className="mx-auto size-6 text-accent-primary" strokeWidth={1.5} />
        <h1 className="mt-3 text-[26px] font-normal leading-tight tracking-tight">Link indisponível</h1>
        <p className="mt-2 font-serif text-[15px] italic text-muted" data-testid="shared-unavailable">
          {REASONS[reason]}
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg border border-subtle px-3 text-sm text-primary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          Ir para o Vellum
          <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
        </Link>
      </section>
    </Frame>
  );
}
