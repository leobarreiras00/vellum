/**
 * Vellum — Primitiva <Combobox /> (escrever para filtrar + scroll)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Seletores longos (fontes, projetos, documentos, legendas): campo de filtro
 * no topo com foco automático e lista com scroll que se percorre com rato,
 * roda e setas ao mesmo tempo (ux-forms-psychology §4). Filtro sem acentos.
 */
"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { EASE_EDITORIAL, cn } from "@/lib/utils";
import { normalizeSearch } from "@/lib/workspace-types";

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
  /** Pré-visualização (ex.: a fonte aplicada ao rótulo). */
  style?: CSSProperties;
  icon?: ReactNode;
}

interface ComboboxProps {
  options: readonly ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  /** Rótulo acessível do botão e da lista. */
  label: string;
  /** Texto do botão quando nada corresponde ao valor. */
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
  align?: "start" | "end";
  id?: string;
  disabled?: boolean;
  /** Não rouba o foco do editor ao abrir com o rato. */
  keepEditorFocus?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  label,
  placeholder = "Escolher…",
  searchPlaceholder = "Escrever para filtrar",
  className,
  buttonClassName,
  panelClassName,
  align = "start",
  id,
  disabled,
  keepEditorFocus,
}: ComboboxProps) {
  const reduce = useReducedMotion();
  const listId = useId();
  const searchId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return options;
    return options.filter((o) => normalizeSearch(`${o.label} ${o.hint ?? ""}`).includes(q));
  }, [options, query]);

  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, options, value]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(option: ComboboxOption | undefined) {
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    if (!keepEditorFocus) buttonRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        disabled={disabled}
        onMouseDown={keepEditorFocus ? (e) => e.preventDefault() : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-full items-center gap-1.5 rounded-lg border border-subtle bg-elevated px-2.5 text-left text-sm text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-50",
          buttonClassName,
        )}
      >
        {current?.icon}
        <span className="min-w-0 flex-1 truncate" style={current?.style}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted" strokeWidth={1.6} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, transition: { duration: 0.16 } }}
            transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
            style={{ transformOrigin: align === "start" ? "top left" : "top right" }}
            className={cn(
              "liquid-glass absolute top-full z-50 mt-1.5 w-64 rounded-xl p-1.5",
              align === "start" ? "left-0" : "right-0",
              panelClassName,
            )}
            onKeyDown={onKeyDown}
          >
            <label htmlFor={searchId} className="sr-only">
              Filtrar {label.toLowerCase()}
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
                strokeWidth={1.6}
              />
              <input
                id={searchId}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                role="searchbox"
                aria-controls={listId}
                aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
                className="h-8 w-full rounded-md border border-subtle/80 bg-elevated/70 pl-8 pr-2 text-sm text-primary outline-none placeholder:text-muted/70 focus-visible:border-accent-primary/50"
              />
            </div>
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              className="mt-1.5 max-h-72 overflow-y-auto overscroll-contain"
            >
              {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">Nada corresponde.</li>}
              {filtered.map((option, i) => (
                <li
                  key={option.value || "__none"}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={option.value === value}
                  data-index={i}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-primary",
                    i === active && "bg-surface",
                  )}
                >
                  {option.icon}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" style={option.style}>
                      {option.label}
                    </span>
                    {option.hint && <span className="block truncate text-xs text-muted">{option.hint}</span>}
                  </span>
                  {option.value === value && (
                    <Check aria-hidden="true" className="size-3.5 shrink-0 text-accent-primary" strokeWidth={1.6} />
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
