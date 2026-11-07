/**
 * Vellum — Gestor de Legendas do Calendário (Módulo 4)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Criar, renomear, recolorir e eliminar legendas (permissão legend:manage,
 * só Proprietário/Super Admin). Toda a gente pode filtrar por legenda.
 * As cores são as tintas harmónicas do Vellum (nunca hex livres).
 */
"use client";

import { Check, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { createLegendAction, deleteLegendAction, updateLegendAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input } from "@/components/ui/Field";
import { InkDot, InkPicker } from "@/components/ui/Ink";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn, formatNumber } from "@/lib/utils";
import type { InkColor, LegendView } from "@/lib/workspace-types";

interface LegendManagerProps {
  open: boolean;
  onClose: () => void;
  hidden: ReadonlySet<string>;
  onToggle: (legendId: string) => void;
}

export function LegendManager({ open, onClose, hidden, onToggle }: LegendManagerProps) {
  const { snapshot, run, can, isPending } = useWorkspace();
  const canManage = can("legend:manage");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; color: InkColor }>({ name: "", color: "terracota" });
  const [error, setError] = useState<string | undefined>();

  const counts = new Map<string, number>();
  for (const event of snapshot.events) {
    if (event.legendId) counts.set(event.legendId, (counts.get(event.legendId) ?? 0) + 1);
  }

  function startEdit(legend: LegendView | null) {
    setError(undefined);
    setEditing(legend?.id ?? "new");
    setDraft(legend ? { name: legend.name, color: legend.color } : { name: "", color: "salvia" });
  }

  async function save() {
    const result =
      editing === "new"
        ? await run(() => createLegendAction(draft), { success: `Legenda «${draft.name.trim()}» criada.` })
        : await run(() => updateLegendAction(editing, draft), { success: "Legenda atualizada." });
    if (result.ok) setEditing(null);
    else setError(result.fieldErrors?.name ?? result.error);
  }

  const editor = (
    <div className="grid gap-3 rounded-xl border border-subtle bg-surface/50 p-3">
      <div>
        <Input
          aria-label="Nome da legenda"
          value={draft.name}
          maxLength={40}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Ex.: Revisão de pares"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
        />
        <FieldError>{error}</FieldError>
      </div>
      <InkPicker value={draft.color} onChange={(color) => setDraft((d) => ({ ...d, color }))} label="Cor da legenda" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
          <X aria-hidden="true" strokeWidth={1.5} />
          Cancelar
        </Button>
        <Button variant="primary" size="sm" onClick={() => void save()} disabled={isPending}>
          <Check aria-hidden="true" strokeWidth={1.5} />
          Guardar legenda
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={() => {
        setEditing(null);
        onClose();
      }}
      eyebrow="Calendário"
      title="Legendas"
      description={
        canManage
          ? "Crie, edite e filtre as legendas que dão cor aos eventos."
          : "Filtre os eventos por legenda. Só o Proprietário pode criar ou editar legendas."
      }
    >
      <ul className="divide-y divide-subtle" aria-label="Legendas do calendário">
        {snapshot.legends.map((legend) => {
          const isHidden = hidden.has(legend.id);
          if (editing === legend.id) {
            return (
              <li key={legend.id} className="py-2">
                {editor}
              </li>
            );
          }
          return (
            <li key={legend.id} className="flex items-center gap-3 py-2.5">
              <InkDot color={legend.color} className="size-2.5" />
              <span
                className={cn("min-w-0 flex-1 truncate text-sm", isHidden ? "text-muted line-through" : "text-primary")}
              >
                {legend.name}
              </span>
              <span className="nums font-mono text-[11px] text-muted">{formatNumber(counts.get(legend.id) ?? 0)}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-pressed={!isHidden}
                aria-label={isHidden ? `Mostrar «${legend.name}»` : `Ocultar «${legend.name}»`}
                onClick={() => onToggle(legend.id)}
              >
                {isHidden ? (
                  <EyeOff aria-hidden="true" strokeWidth={1.5} />
                ) : (
                  <Eye aria-hidden="true" strokeWidth={1.5} />
                )}
              </Button>
              {canManage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar «${legend.name}»`}
                    onClick={() => startEdit(legend)}
                  >
                    <Pencil aria-hidden="true" strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar «${legend.name}»`}
                    onClick={() => void run(() => deleteLegendAction(legend.id), { success: "Legenda eliminada." })}
                  >
                    <Trash2 aria-hidden="true" strokeWidth={1.5} />
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {snapshot.legends.length === 0 && (
        <p className="py-4 font-serif italic text-muted">Ainda não há legendas neste workspace.</p>
      )}
      {canManage && (
        <div className="mt-4">
          {editing === "new" ? (
            editor
          ) : (
            <Button variant="secondary" size="sm" onClick={() => startEdit(null)}>
              <Plus aria-hidden="true" strokeWidth={1.5} />
              Nova legenda
            </Button>
          )}
        </div>
      )}
    </Dialog>
  );
}
