/**
 * Vellum — Imagem de uma Nota Rápida (colar, arrastar ou escolher)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * ⌘V com uma imagem na área de transferência, arrastar um ficheiro para a
 * nota ou o botão «Imagem». Comprimida no navegador (Canvas, ≤ 1600 px) e
 * validada de novo no servidor (assinatura dos bytes).
 */
"use client";

import { ImagePlus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { compressImage } from "@/lib/image-tools";

/** Lê a primeira imagem de um evento de colar/largar e comprime-a. */
export function useNoteImage(initial: string | null = null) {
  const [image, setImage] = useState<string | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = useCallback(async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return false;
    setError(null);
    setBusy(true);
    try {
      const { src } = await compressImage(file);
      setImage(src);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler a imagem.");
    } finally {
      setBusy(false);
    }
    return true;
  }, []);

  const handlers = {
    onPaste: (event: React.ClipboardEvent) => {
      const file = Array.from(event.clipboardData.files).find((f) => f.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void accept(file);
      }
    },
    onDragOver: (event: React.DragEvent) => {
      if (Array.from(event.dataTransfer.items).some((i) => i.type.startsWith("image/"))) event.preventDefault();
    },
    onDrop: (event: React.DragEvent) => {
      const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void accept(file);
      }
    },
  };

  return { image, setImage, error, busy, accept, handlers };
}

export function NoteImagePreview({
  image,
  busy,
  error,
  onRemove,
  onPick,
}: {
  image: string | null;
  busy: boolean;
  error: string | null;
  onRemove: () => void;
  onPick: (file: File | undefined) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      {image ? (
        <figure className="relative overflow-hidden rounded-lg border border-subtle" data-testid="note-image-preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL local */}
          <img src={image} alt="Imagem da nota" className="block max-h-48 w-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover imagem"
            className="liquid-glass absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md text-primary active:scale-[0.97]"
          >
            <X aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          </button>
        </figure>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-60"
        >
          <ImagePlus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          {busy ? "A comprimir…" : "Imagem (ou cole com ⌘V)"}
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-label="Escolher imagem para a nota"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
