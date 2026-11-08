/**
 * Vellum — Inserir ou editar ligação (⌘K com texto selecionado)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import type { Editor } from "@tiptap/react";
import { Link2, Unlink } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { normalizeHref } from "@/components/editor/extensions/VellumLink";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input, Label } from "@/components/ui/Field";

export function LinkDialog({ editor, open, onClose }: { editor: Editor; open: boolean; onClose: () => void }) {
  const id = useId();
  const [href, setHref] = useState("");
  const [error, setError] = useState<string | null>(null);
  const existing = open ? ((editor.getAttributes("link").href as string | undefined) ?? "") : "";

  useEffect(() => {
    if (open) {
      setHref(existing);
      setError(null);
    }
  }, [open, existing]);

  function apply(event?: React.FormEvent) {
    event?.preventDefault();
    const safe = normalizeHref(href);
    if (!safe) {
      setError("Indique um endereço válido (https://…, email ou #secção).");
      return;
    }
    editor.chain().focus().setVellumLink(safe).run();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        editor.commands.focus();
      }}
      size="sm"
      eyebrow="Ligação"
      title={existing ? "Editar ligação" : "Inserir ligação"}
      footer={
        <>
          {existing && (
            <Button
              variant="ghost"
              className="mr-auto"
              onClick={() => {
                editor.chain().focus().unsetVellumLink().run();
                onClose();
              }}
            >
              <Unlink aria-hidden="true" strokeWidth={1.6} />
              Remover ligação
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => apply()} data-testid="link-apply">
            <Link2 aria-hidden="true" strokeWidth={1.6} />
            Aplicar
          </Button>
        </>
      }
    >
      <form onSubmit={apply}>
        <Label htmlFor={id}>Endereço</Label>
        <Input
          id={id}
          value={href}
          autoFocus
          onChange={(e) => setHref(e.target.value)}
          placeholder="https://exemplo.pt"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <FieldError id={`${id}-err`}>{error}</FieldError>
      </form>
    </Dialog>
  );
}
