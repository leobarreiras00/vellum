/**
 * Vellum — <IllustrationStudio /> · Capas ilustradas (Bloco 5)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Três caminhos para a capa de um projeto ou documento:
 *  1. Gerar — descrição em português + coleção + estilo → ilustração SVG
 *     procedimental (local, sem chaves). Se ILLUSTRATION_API_URL estiver
 *     configurado no servidor, tenta primeiro o serviço externo.
 *  2. Galeria — 12 capas curadas.
 *  3. Carregar — imagem própria, comprimida no navegador e validada no servidor.
 */
"use client";

import { Check, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { generateIllustrationAction, illustrationProviderAction, setCoverAction } from "@/app/(workspace)/actions";
import { IllustrationArt } from "@/components/illustrations/IllustrationArt";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { useWorkspace } from "@/context/WorkspaceContext";
import { compressImage } from "@/lib/image-tools";
import {
  COVER_UPLOAD_MAX_DATA_URL,
  CURATED_COVERS,
  ILLUSTRATION_COLLECTIONS,
  ILLUSTRATION_STYLES,
  freshSeed,
  type CoverSpec,
  type IllustrationCollection,
  type IllustrationStyle,
} from "@/lib/illustrations";
import { cn } from "@/lib/utils";

type Tab = "gerar" | "galeria" | "carregar";
const TABS: Array<[Tab, string]> = [
  ["gerar", "Gerar"],
  ["galeria", "Galeria"],
  ["carregar", "Carregar"],
];

export function IllustrationStudio({
  open,
  onClose,
  kind,
  targetId,
  title,
  current,
}: {
  open: boolean;
  onClose: () => void;
  kind: "project" | "document";
  targetId: string;
  title: string;
  current: CoverSpec | null;
}) {
  const { run, snapshot } = useWorkspace();
  const [tab, setTab] = useState<Tab>("gerar");
  const [draft, setDraft] = useState<CoverSpec | null>(current);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setDraft(current);
  }, [open, current]);

  function save(spec: CoverSpec | null) {
    start(async () => {
      const result = await run(() => setCoverAction({ kind, targetId, spec }), {
        success: spec ? "Capa atualizada." : "Capa removida.",
      });
      if (result.ok) onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Estúdio de ilustração"
      title={`Capa de «${title}»`}
      size="lg"
      footer={
        <>
          {current && (
            <Button variant="ghost" onClick={() => save(null)} disabled={pending} className="mr-auto">
              <Trash2 aria-hidden="true" strokeWidth={1.6} />
              Remover capa
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => draft && save(draft)}
            disabled={!draft || pending}
            data-testid="cover-save"
          >
            <Check aria-hidden="true" strokeWidth={1.6} />
            Usar como capa
          </Button>
        </>
      }
    >
      {open && (
        <div className="space-y-5">
          <div role="tablist" aria-label="Origem da capa" className="flex gap-1 border-b border-subtle">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  tab === id
                    ? "border-accent-primary text-primary"
                    : "border-transparent text-muted hover:text-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-subtle bg-surface" style={{ aspectRatio: "16 / 6" }}>
            {draft ? (
              <IllustrationArt spec={draft} alt="Pré-visualização da capa" />
            ) : (
              <p className="grid size-full place-items-center text-sm text-muted">Sem capa escolhida.</p>
            )}
          </div>

          {tab === "gerar" && (
            <GeneratePanel defaultCollection={snapshot.profile.illustrationTheme} title={title} onDraft={setDraft} />
          )}
          {tab === "galeria" && <GalleryPanel selected={draft} onPick={setDraft} />}
          {tab === "carregar" && <UploadPanel onDraft={setDraft} />}
        </div>
      )}
    </Dialog>
  );
}

function GeneratePanel({
  defaultCollection,
  title,
  onDraft,
}: {
  defaultCollection: IllustrationCollection;
  title: string;
  onDraft: (spec: CoverSpec) => void;
}) {
  const ids = { prompt: useId(), collection: useId() };
  const [prompt, setPrompt] = useState(title === "Sem título" ? "" : title);
  const [collection, setCollection] = useState<IllustrationCollection>(defaultCollection);
  const [style, setStyle] = useState<IllustrationStyle>("gravura");
  const [provider, setProvider] = useState("Gerador local (sem IA externa)");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    void illustrationProviderAction().then((r) => r.ok && setProvider(r.data.label));
  }, []);

  function generate() {
    setError(null);
    setNote(null);
    if (prompt.trim().length < 3) {
      setError("Descreva a ilustração (pelo menos 3 caracteres).");
      return;
    }
    const local: CoverSpec = { type: "generated", collection, style, prompt: prompt.trim(), seed: freshSeed() };
    start(async () => {
      const result = await generateIllustrationAction({ prompt: prompt.trim(), style, collection });
      if (result.ok && result.data.external && "spec" in result.data) {
        onDraft(result.data.spec);
        return;
      }
      if (result.ok && result.data.external && "error" in result.data) setNote(result.data.error);
      onDraft(local);
    });
  }

  return (
    <div className="space-y-4" data-testid="illustration-generate">
      <div>
        <Label htmlFor={ids.prompt}>Descrição em português</Label>
        <Textarea
          id={ids.prompt}
          rows={2}
          maxLength={200}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ex.: ramo de oliveira com folhas, ponte sobre o rio, lua cheia e estrelas"
          aria-invalid={!!error}
        />
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <Label htmlFor={ids.collection}>Coleção</Label>
          <Select
            id={ids.collection}
            value={collection}
            onChange={(e) => setCollection(e.target.value as IllustrationCollection)}
          >
            {ILLUSTRATION_COLLECTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-primary">Estilo</legend>
          <div role="radiogroup" aria-label="Estilo" className="flex flex-wrap gap-1.5">
            {ILLUSTRATION_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={style === s.id}
                onClick={() => setStyle(s.id)}
                className={cn(
                  "h-9 rounded-lg border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:scale-[0.97]",
                  style === s.id
                    ? "border-accent-primary/60 bg-accent-primary/10 text-primary"
                    : "border-subtle text-muted hover:text-primary",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted" data-testid="illustration-provider">
          {provider}
          {note && <span className="block text-warning">{note}</span>}
        </p>
        <Button onClick={generate} disabled={pending} variant="secondary" data-testid="illustration-generate-button">
          {pending ? (
            <RefreshCw aria-hidden="true" className="animate-spin" strokeWidth={1.6} />
          ) : (
            <Sparkles aria-hidden="true" strokeWidth={1.6} />
          )}
          Gerar ilustração
        </Button>
      </div>
    </div>
  );
}

function GalleryPanel({ selected, onPick }: { selected: CoverSpec | null; onPick: (spec: CoverSpec) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-label="Galeria curada">
      {CURATED_COVERS.map((cover) => {
        const active =
          selected?.type === "generated" && selected.seed === cover.spec.seed && selected.prompt === cover.spec.prompt;
        return (
          <li key={cover.id}>
            <button
              type="button"
              onClick={() => onPick(cover.spec)}
              aria-pressed={active}
              className={cn(
                "block w-full overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:scale-[0.97]",
                active ? "border-accent-primary/70 shadow-paper" : "border-subtle hover:border-muted/40",
              )}
            >
              <span className="block aspect-[16/10]">
                <IllustrationArt spec={cover.spec} size={{ width: 320, height: 200 }} />
              </span>
              <span className="block truncate px-2 py-1.5 text-xs text-primary">{cover.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function UploadPanel({ onDraft }: { onDraft: (spec: CoverSpec) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Formato não suportado. Use PNG, JPEG/JPG ou WEBP.");
      return;
    }
    setBusy(true);
    try {
      const { src } = await compressImage(file);
      if (src.length > COVER_UPLOAD_MAX_DATA_URL)
        throw new Error("A imagem é demasiado grande mesmo depois de comprimida.");
      onDraft({ type: "upload", src });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-subtle px-5 py-6 text-center">
      <p className="text-sm text-primary">Use uma imagem sua como capa.</p>
      <p className="mt-1 text-xs text-muted">
        PNG, JPEG ou WEBP. É reduzida para 1600 px no navegador antes de ser guardada.
      </p>
      <Button className="mt-4" onClick={() => ref.current?.click()} disabled={busy}>
        <Upload aria-hidden="true" strokeWidth={1.6} />
        {busy ? "A comprimir…" : "Escolher imagem"}
      </Button>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="Escolher imagem para a capa"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
