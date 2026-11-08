/**
 * Vellum — Menu rápido «/» do Editor Rico
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import type { BlockCommand } from "@/components/editor/block-commands";
import { cn } from "@/lib/utils";

export interface SlashMenuProps {
  items: BlockCommand[];
  command: (item: BlockCommand) => void;
}

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu({ items, command }, ref) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIndex(0), [items]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const item = items[index];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Inserir bloco"
      className="max-h-80 w-72 overflow-y-auto rounded-xl border border-subtle bg-elevated p-1.5 font-sans shadow-sheet"
    >
      <p className="eyebrow px-2 pb-1 pt-1">Inserir bloco</p>
      {items.length === 0 ? (
        <p className="px-2 py-2 text-sm text-muted">Nenhum bloco corresponde.</p>
      ) : (
        items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={i === index}
              data-index={i}
              onMouseEnter={() => setIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                command(item);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-150",
                i === index ? "bg-surface" : "hover:bg-surface/60",
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md border border-subtle bg-canvas text-muted">
                <Icon aria-hidden="true" className="size-4" strokeWidth={1.6} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-primary">{item.label}</span>
                <span className="block truncate text-xs text-muted">{item.hint}</span>
              </span>
            </button>
          );
        })
      )}
    </div>
  );
});
