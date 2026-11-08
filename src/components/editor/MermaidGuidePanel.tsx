/**
 * Vellum — Painel «Como Gerar ou Importar Mermaid»
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * 1. Galeria de 6 templates com 1 clique · 2. Guia de sintaxe PT-PT com
 * exemplos copiáveis · 3. Importação de .mmd/.txt ou código colado ·
 * 4. Assistente de prompt para IA (descrição em português → prompt estruturado).
 */
"use client";

import { Check, ClipboardPaste, Copy, FileUp, Plus, Sparkles } from "lucide-react";
import { useId, useRef, useState } from "react";

import { useCopy } from "@/components/editor/useCopy";
import { Button } from "@/components/ui/Button";
import {
  MERMAID_SYNTAX_GUIDE,
  MERMAID_TEMPLATES,
  buildMermaidPrompt,
  extractMermaidCode,
  type MermaidTemplateId,
} from "@/lib/mermaid-kit";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "templates", label: "Templates" },
  { id: "sintaxe", label: "Guia de sintaxe" },
  { id: "importar", label: "Importar" },
  { id: "ia", label: "Assistente IA" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const MAX_IMPORT_BYTES = 100_000;

interface MermaidGuidePanelProps {
  onApply: (code: string, source: string) => void;
  onInsertSnippet: (snippet: string) => void;
  editable: boolean;
}

export function MermaidGuidePanel({ onApply, onInsertSnippet, editable }: MermaidGuidePanelProps) {
  const [tab, setTab] = useState<TabId>(editable ? "templates" : "sintaxe");
  const baseId = useId();
  const tabs = editable ? TABS : TABS.filter((t) => t.id === "sintaxe" || t.id === "ia");

  return (
    <section aria-label="Como gerar ou importar Mermaid" className="border-t border-subtle bg-canvas/60 font-sans">
      <div role="tablist" aria-label="Secções do guia Mermaid" className="flex gap-1 overflow-x-auto px-3 pt-2.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${baseId}-${t.id}-tab`}
            aria-selected={tab === t.id}
            aria-controls={`${baseId}-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors duration-150",
              tab === t.id
                ? "bg-elevated text-primary shadow-paper ring-1 ring-subtle"
                : "text-muted hover:text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-${tab}`} aria-labelledby={`${baseId}-${tab}-tab`} className="p-3">
        {tab === "templates" && <TemplateGallery onApply={onApply} />}
        {tab === "sintaxe" && <SyntaxGuide onInsertSnippet={editable ? onInsertSnippet : undefined} />}
        {tab === "importar" && <ImportPane onApply={onApply} />}
        {tab === "ia" && <PromptAssistant />}
      </div>
    </section>
  );
}

function TemplateGallery({ onApply }: { onApply: MermaidGuidePanelProps["onApply"] }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted">Um clique substitui o código do diagrama (pode desfazer com ⌘Z).</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MERMAID_TEMPLATES.map((t, i) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onApply(t.code, `Template «${t.label}» aplicado.`)}
              className="group flex h-full w-full flex-col rounded-lg border border-subtle bg-elevated px-3 py-2.5 text-left transition-colors duration-150 hover:border-accent-primary/50 hover:bg-accent-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <span className="flex items-baseline gap-2">
                <span className="nums font-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-serif text-[15px] text-primary">{t.label}</span>
              </span>
              <code className="mt-1 font-mono text-[11px] text-accent-primary">{t.keyword}</code>
              <span className="mt-1 text-xs leading-snug text-muted">{t.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SyntaxGuide({ onInsertSnippet }: { onInsertSnippet?: (snippet: string) => void }) {
  const [copied, copy] = useCopy();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {MERMAID_SYNTAX_GUIDE.map((section, s) => (
        <div key={section.title}>
          <h4 className="flex items-baseline gap-2 font-serif text-base">
            <span className="nums font-mono text-[10px] text-muted">{["I", "II", "III"][s]}</span>
            {section.title}
          </h4>
          <p className="mt-1 text-xs leading-snug text-muted">{section.intro}</p>
          <ul className="mt-2 space-y-1.5">
            {section.entries.map((entry) => {
              const key = `${section.title}:${entry.code}`;
              return (
                <li key={entry.code} className="rounded-lg border border-subtle bg-elevated px-2.5 py-1.5">
                  <div className="flex items-start gap-2">
                    <pre className="ligatures-none min-w-0 flex-1 whitespace-pre-wrap font-mono text-[12px] leading-[1.5] text-primary">
                      {entry.code}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copy(key, entry.code)}
                      aria-label={`Copiar ${entry.code.split("\n")[0]}`}
                      className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-primary"
                    >
                      {copied === key ? (
                        <Check aria-hidden="true" className="size-3.5 text-accent-primary" strokeWidth={1.6} />
                      ) : (
                        <Copy aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
                      )}
                    </button>
                    {onInsertSnippet && (
                      <button
                        type="button"
                        onClick={() => onInsertSnippet(entry.code)}
                        aria-label={`Inserir ${entry.code.split("\n")[0]} no código`}
                        className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-primary"
                      >
                        <Plus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted">{entry.label}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ImportPane({ onApply }: { onApply: MermaidGuidePanelProps["onApply"] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const id = useId();

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(mmd|txt|mermaid)$/i.test(file.name)) {
      setMessage("Escolha um ficheiro .mmd ou .txt.");
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage("O ficheiro é demasiado grande (máximo de 100 KB).");
      return;
    }
    const code = extractMermaidCode(await file.text());
    if (!code) {
      setMessage("O ficheiro está vazio.");
      return;
    }
    onApply(code, `Importado de ${file.name}.`);
    setMessage(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="text-xs leading-snug text-muted">
          Importe um ficheiro <code className="font-mono">.mmd</code> ou <code className="font-mono">.txt</code> do
          computador. O código substitui o atual.
        </p>
        <input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept=".mmd,.txt,.mermaid,text/plain"
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => fileRef.current?.click()}>
          <FileUp aria-hidden="true" strokeWidth={1.6} />
          Importar ficheiro .mmd / .txt
        </Button>
        {message && (
          <p role="alert" className="mt-2 text-xs text-accent-primary">
            {message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${id}-paste`} className="text-xs text-muted">
          Ou cole código externo (aceita a resposta de uma IA com o bloco ```mermaid)
        </label>
        <textarea
          id={`${id}-paste`}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder={"flowchart LR\n  A[Início] --> B[Fim]"}
          className="ligatures-none mt-1 w-full resize-none rounded-lg border border-subtle bg-elevated px-2.5 py-2 font-mono text-[12px] leading-[1.6] text-primary placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        />
        <Button
          size="sm"
          variant="primary"
          className="mt-1.5"
          disabled={!pasted.trim()}
          onClick={() => {
            onApply(extractMermaidCode(pasted), "Código colado aplicado.");
            setPasted("");
          }}
        >
          <ClipboardPaste aria-hidden="true" strokeWidth={1.6} />
          Usar este código
        </Button>
      </div>
    </div>
  );
}

function PromptAssistant() {
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<MermaidTemplateId | "auto">("auto");
  const [copied, copy] = useCopy();
  const id = useId();
  const prompt = buildMermaidPrompt(description, kind);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Sparkles aria-hidden="true" className="size-3.5 text-accent-primary" strokeWidth={1.6} />
          Descreva em português o diagrama; o Vellum prepara um prompt rigoroso para qualquer IA.
        </p>
        <label htmlFor={`${id}-desc`} className="sr-only">
          Descrição do diagrama
        </label>
        <textarea
          id={`${id}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Ex.: o processo de aprovação de uma despesa, desde o pedido do colaborador até ao pagamento, com rejeição pelo gestor."
          className="w-full resize-none rounded-lg border border-subtle bg-elevated px-2.5 py-2 text-sm text-primary placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        />
        <label htmlFor={`${id}-kind`} className="block text-xs text-muted">
          Tipo de diagrama
        </label>
        <select
          id={`${id}-kind`}
          value={kind}
          onChange={(e) => setKind(e.target.value as MermaidTemplateId | "auto")}
          className="h-8 w-full rounded-lg border border-subtle bg-elevated px-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          <option value="auto">Automático (a IA escolhe)</option>
          {MERMAID_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} — {t.keyword}
            </option>
          ))}
        </select>
        <p className="text-[11px] leading-snug text-muted">
          Depois, cole a resposta no separador <strong className="font-medium text-primary">Importar</strong>.
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Prompt pronto a copiar</span>
          <Button size="sm" variant="secondary" onClick={() => copy("prompt", prompt)} disabled={!description.trim()}>
            {copied === "prompt" ? (
              <Check aria-hidden="true" strokeWidth={1.6} />
            ) : (
              <Copy aria-hidden="true" strokeWidth={1.6} />
            )}
            {copied === "prompt" ? "Copiado" : "Copiar prompt"}
          </Button>
        </div>
        <pre
          aria-label="Prompt gerado"
          className="ligatures-none mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-subtle bg-elevated px-3 py-2 font-mono text-[11.5px] leading-[1.55] text-primary"
        >
          {prompt}
        </pre>
      </div>
    </div>
  );
}
