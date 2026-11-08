/**
 * Vellum — Caixa de Inspeção de emails (desenvolvimento)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Mostra os últimos emails gerados pelo servidor (confirmação, convites,
 * recuperação), para testar sem fornecedor de email. Indisponível em produção.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFooter } from "@/components/layout/AppFooter";
import { devInboxEnabled, devInboxMessages, mailStatus } from "@/lib/mailer";

export const metadata: Metadata = { title: "Caixa de inspeção" };
export const dynamic = "force-dynamic";

const KIND_LABELS = {
  confirm: "Confirmação de conta",
  login: "Código de início de sessão",
  invite: "Convite",
  reset: "Recuperação",
  test: "Teste",
} as const;

export default function DevInboxPage() {
  if (!devInboxEnabled()) notFound();
  const messages = devInboxMessages();
  const status = mailStatus();
  const time = new Intl.DateTimeFormat("pt-PT", { timeStyle: "medium", timeZone: "Europe/Lisbon" });

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-10 md:px-10">
        <p className="eyebrow">Desenvolvimento</p>
        <h1 className="mt-3 text-4xl font-normal leading-tight tracking-tight">Caixa de inspeção</h1>
        <p className="mt-2 font-serif text-lg italic text-muted">
          {status.mode === "provider"
            ? `Envio real via ${status.provider}; cada email fica também aqui.`
            : "Sem fornecedor de email: os emails ficam aqui em vez de seguirem."}
        </p>
        {messages.length === 0 ? (
          <p className="mt-10 border-t border-subtle pt-8 font-serif text-xl italic text-muted">Ainda não há emails.</p>
        ) : (
          <ol className="mt-8 space-y-8">
            {messages.map((m) => (
              <li key={m.id} className="rounded-xl border border-subtle bg-surface/50 p-4" data-testid="inbox-message">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  <span className="eyebrow">{KIND_LABELS[m.kind]}</span>
                  <span className="text-primary">{m.subject}</span>
                  <span className="text-muted">→ {m.to}</span>
                  {m.code && (
                    <span className="nums ml-auto font-mono text-base tracking-[0.3em] text-accent-primary">
                      {m.code}
                    </span>
                  )}
                  <span className="nums font-mono text-[11px] text-muted">{time.format(new Date(m.createdAt))}</span>
                </div>
                <iframe
                  title={m.subject}
                  srcDoc={m.html}
                  sandbox=""
                  className="mt-3 h-[520px] w-full rounded-lg border border-subtle bg-canvas"
                />
              </li>
            ))}
          </ol>
        )}
      </main>
      <AppFooter variant="full" />
    </div>
  );
}
