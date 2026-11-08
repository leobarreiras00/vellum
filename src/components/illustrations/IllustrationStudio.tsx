/**
 * Vellum — <IllustrationStudio /> · Capas ilustradas (Bloco 5)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Dois caminhos para a capa de um projeto ou documento:
 *  1. Geométricos — os 7 wallpapers premium (src/lib/geometric-wallpapers.ts),
 *     com «Gerar variação» de ângulo/cor. Substituem as ilustrações antigas,
 *     que continuam a ser mostradas nas capas já gravadas.
 *  2. Carregar — imagem própria, comprimida no navegador e validada no servidor.
 */
"use client";

import { Check, Shuffle, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { setCoverAction } from "@/app/(workspace)/actions";
import { IllustrationArt } from "@/components/illustrations/IllustrationArt";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { WallpaperThumb } from "@/components/wallpapers/GeometricBackground";
import { useWorkspace } from "@/context/WorkspaceContext";
import { WALLPAPERS, freshVariant } from "@/lib/geometric-wallpapers";
import { compressImage } from "@/lib/image-tools";
import { COVER_UPLOAD_MAX_DATA_URL, type CoverSpec, type WallpaperCover } from "@/lib/illustrations";
import { cn } from "@/lib/utils";

type Tab = "geometricos" | "carregar";
const TABS: Array<[Tab, string]> = [
  ["geometricos", "Geométricos"],
  ["carregar", "Carregar"],
];

/** Capa por omissão de um projeto/documento sem capa: as ondas terracota. */
export const DEFAULT_COVER: WallpaperCover = { type: "wallpaper", wallpaper: "sequoia-amber", variant: 0 };

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
  const { run } = useWorkspace();
  const [tab, setTab] = useState<Tab>("geometricos");
  const [draft, setDraft] = useState<CoverSpec | null>(current ?? DEFAULT_COVER);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) setDraft(current ?? DEFAULT_COVER);
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
      eyebrow="Estúdio de capas"
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

          {tab === "geometricos" && <GeometricPanel selected={draft} onPick={setDraft} />}
          {tab === "carregar" && <UploadPanel onDraft={setDraft} />}
        </div>
      )}
    </Dialog>
  );
}

function GeometricPanel({ selected, onPick }: { selected: CoverSpec | null; onPick: (spec: CoverSpec) => void }) {
  const current = selected?.type === "wallpaper" ? selected : null;
  return (
    <div className="space-y-3" data-testid="cover-geometric">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Capas geométricas">
        {WALLPAPERS.filter((w) => w.id !== "none").map((w) => {
          const active = current?.wallpaper === w.id;
          return (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onPick({ type: "wallpaper", wallpaper: w.id, variant: 0 })}
                aria-pressed={active}
                data-testid={`cover-wallpaper-${w.id}`}
                className={cn(
                  "block w-full overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:scale-[0.97] active:duration-0",
                  active ? "border-accent-primary/70 shadow-paper" : "border-subtle hover:border-muted/40",
                )}
              >
                <WallpaperThumb id={w.id} variant={active ? current.variant : 0} className="aspect-[16/10]" />
                <span className="block truncate px-2 py-1.5 text-xs text-primary">{w.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {current
            ? `${WALLPAPERS.find((w) => w.id === current.wallpaper)?.blurb ?? ""}${current.variant ? ` Variação ${current.variant}.` : ""}`
            : "Escolha uma composição para a capa."}
        </p>
        <Button
          variant="secondary"
          size="sm"
          disabled={!current}
          onClick={() => current && onPick({ ...current, variant: freshVariant() })}
          data-testid="cover-variant"
        >
          <Shuffle aria-hidden="true" strokeWidth={1.6} />
          Gerar variação
        </Button>
      </div>
    </div>
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
