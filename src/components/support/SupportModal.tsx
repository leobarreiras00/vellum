/**
 * Vellum — Centro de Suporte & Ajuda (<SupportModal />)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Abre-se de qualquer sítio com `openSupport()` (ecrã de entrada, barra
 * lateral, rodapé, barra de estado). Três separadores: perguntas frequentes,
 * atalhos de teclado e pedido de suporte (Brevo/Resend ou cópia do
 * diagnóstico quando o envio não está configurado).
 */
"use client";

import { Check, Copy, LifeBuoy, Send } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useState, useTransition } from "react";

import { sendSupportRequestAction } from "@/app/support-actions";
import { EDITOR_SHORTCUTS } from "@/components/editor/EditorShortcutsDialog";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { SUPPORT_CATEGORIES, SUPPORT_FAQ, type SupportCategory } from "@/lib/support";
import { APP_VERSION, EASE_MOVE, cn } from "@/lib/utils";

const OPEN_EVENT = "vellum:support";
type Tab = "faq" | "atalhos" | "pedido";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "faq", label: "Perguntas frequentes" },
  { id: "atalhos", label: "Atalhos" },
  { id: "pedido", label: "Pedido de suporte" },
];

/** Abre o Centro de Suporte (opcionalmente num separador). */
export function openSupport(tab: Tab = "faq") {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: tab }));
}

/** Montado uma vez no layout raiz. */
export function SupportModalHost() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("faq");
  useEffect(() => {
    const onOpen = (event: Event) => {
      setTab(((event as CustomEvent).detail as Tab) ?? "faq");
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  return <SupportModal open={open} tab={tab} onTab={setTab} onClose={() => setOpen(false)} />;
}

function diagnostics(): string {
  if (typeof window === "undefined") return "";
  return [
    `Vellum v${APP_VERSION}`,
    `Página: ${window.location.pathname}`,
    `Navegador: ${navigator.userAgent}`,
    `Ecrã: ${window.innerWidth}×${window.innerHeight} · ${window.devicePixelRatio}x`,
    `Tema: ${document.documentElement.dataset.theme ?? "?"}`,
    `Ligação: ${navigator.onLine ? "online" : "offline"}`,
    `Data: ${new Date().toISOString()}`,
  ].join("\n");
}

function SupportModal({
  open,
  tab,
  onTab,
  onClose,
}: {
  open: boolean;
  tab: Tab;
  onTab: (tab: Tab) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="Centro de Suporte"
      title="Como podemos ajudar?"
      description="Respostas rápidas, atalhos e um formulário que chega diretamente à equipa do Vellum."
    >
      <div role="tablist" aria-label="Secções do suporte" className="-mt-1 flex gap-1 border-b border-subtle">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`suporte-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`suporte-painel-${t.id}`}
            onClick={() => onTab(t.id)}
            className={cn(
              "relative px-3 pb-2.5 pt-1 text-sm transition-colors duration-150",
              tab === t.id ? "text-primary" : "text-muted hover:text-primary",
            )}
          >
            {t.label}
            {tab === t.id && (
              <motion.span
                layoutId="vellum-support-tab"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-primary"
                transition={reduce ? { duration: 0 } : { duration: 0.24, ease: EASE_MOVE }}
              />
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`suporte-painel-${tab}`} aria-labelledby={`suporte-${tab}`} className="pt-4">
        {tab === "faq" && <Faq onAsk={() => onTab("pedido")} />}
        {tab === "atalhos" && <Shortcuts />}
        {tab === "pedido" && <RequestForm onDone={onClose} />}
      </div>
    </Dialog>
  );
}

function Faq({ onAsk }: { onAsk: () => void }) {
  return (
    <div>
      <div className="divide-y divide-subtle border-y border-subtle">
        {SUPPORT_FAQ.map((item) => (
          <details key={item.q} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-primary">
              {item.q}
              <span aria-hidden="true" className="text-muted transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
        Não encontrou a resposta?
        <Button size="sm" variant="primary" onClick={onAsk}>
          <LifeBuoy aria-hidden="true" strokeWidth={1.6} />
          Contactar Suporte
        </Button>
      </p>
      <p className="mt-3 text-xs text-muted">
        Consulte também os{" "}
        <Link href="/termos" className="text-accent-primary hover:underline">
          Termos e Condições
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="text-accent-primary hover:underline">
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  );
}

function Shortcuts() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {EDITOR_SHORTCUTS.map((section) => (
        <section key={section.group} aria-label={section.group}>
          <p className="eyebrow">{section.group}</p>
          <dl className="mt-2 space-y-1.5">
            {section.items.map(([keys, action]) => (
              <div key={`${keys}-${action}`} className="flex items-start justify-between gap-3 text-sm">
                <dt className="flex shrink-0 gap-1">
                  {keys.split(" · ").map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </dt>
                <dd className="text-right text-muted">{action}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function RequestForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const ids = { cat: useId(), name: useId(), email: useId(), msg: useId() };
  const [category, setCategory] = useState<SupportCategory>(SUPPORT_CATEGORIES[0]);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [result, setResult] = useState<"sent" | "not-configured" | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const diag = diagnostics();
  const fullReport = `Categoria: ${category}\nDe: ${name} <${email}>\n\n${message}\n\n— Diagnóstico —\n${diag}`;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    start(async () => {
      const res = await sendSupportRequestAction({ category, name, email, message, diagnostics: diag });
      if (!res.ok) setError({ field: res.field, text: res.error });
      else setResult(res.delivered ? "sent" : "not-configured");
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(fullReport).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (result === "sent") {
    return (
      <div className="py-6 text-center" role="status" data-testid="support-sent">
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-success/10 text-success [animation:vellum-pulse-ok_240ms_var(--ease-editorial)]">
          <Check aria-hidden="true" className="size-5" strokeWidth={1.6} />
        </span>
        <p className="mt-3 font-serif text-xl">Pedido enviado</p>
        <p className="mt-1 text-sm text-muted">Responderemos para {email}. Obrigado pela paciência.</p>
        <Button className="mt-5" onClick={onDone}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4" data-testid="support-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={ids.name}>Nome</Label>
          <Input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <Label htmlFor={ids.email}>Email para resposta *</Label>
          <Input
            id={ids.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={error?.field === "email"}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor={ids.cat}>Categoria do pedido</Label>
        <Select id={ids.cat} value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)}>
          {SUPPORT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={ids.msg}>Mensagem *</Label>
        <Textarea
          id={ids.msg}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="ex.: Ao exportar para Word, as tabelas perdem o cabeçalho."
          aria-invalid={error?.field === "message"}
          required
        />
        <p className="nums mt-1 text-right text-[11px] text-muted">{message.length}/4000</p>
      </div>
      <details className="rounded-lg border border-subtle bg-surface/60 px-3 py-2 text-xs text-muted">
        <summary className="cursor-pointer">Diagnóstico anexado ao pedido</summary>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{diag}</pre>
      </details>
      <FieldError>{error?.text}</FieldError>
      {result === "not-configured" && (
        <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-primary">
          O envio de emails não está configurado neste servidor. Copie o pedido com o diagnóstico e envie-o para o
          endereço de suporte indicado pelo administrador.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={copy}>
          {copied ? <Check aria-hidden="true" strokeWidth={1.6} /> : <Copy aria-hidden="true" strokeWidth={1.6} />}
          {copied ? "Copiado" : "Copiar diagnóstico"}
        </Button>
        <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
          <Send aria-hidden="true" strokeWidth={1.6} />
          {pending ? "A enviar…" : "Enviar pedido"}
        </Button>
      </div>
    </form>
  );
}
