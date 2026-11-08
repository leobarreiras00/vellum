/**
 * Vellum — Barra de formatação do Editor Rico (estilo Microsoft Word)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Fixa no topo do documento, só para quem pode editar (canEditDocument).
 * Fonte e tamanho · B I U S (sublinhado clássico ou colorido) · cor de texto e
 * realce com a paleta curada · alinhamento · títulos · listas, checklists,
 * citação e callouts · tabelas completas · divisória · Inserir Diagrama Mermaid.
 */
"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  CheckSquare,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  StickyNote,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  DOC_FONTS,
  DOC_FONT_LABELS,
  DOC_FONT_SIZES,
  DOC_INKS,
  DOC_INK_LABELS,
  inkVar,
  markVar,
  type DocInk,
} from "@/components/editor/palette";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { CALLOUT_LABELS, CALLOUT_VARIANTS } from "@/lib/document-content";
import { cn } from "@/lib/utils";

interface RichWordToolbarProps {
  editor: Editor;
  className?: string;
}

export function RichWordToolbar({ editor, className }: RichWordToolbarProps) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      underlineColor: (e.getAttributes("underline").color as string | null) ?? null,
      strike: e.isActive("strike"),
      font: (e.getAttributes("textStyle").docFont as string | null) ?? "",
      size: (e.getAttributes("textStyle").docFontSize as string | null) ?? "",
      ink: (e.getAttributes("textStyle").docInk as string | null) ?? null,
      highlight: e.isActive("highlight") ? ((e.getAttributes("highlight").color as string | null) ?? "ambar") : null,
      align: (["left", "center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      callout: e.isActive("callout"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatação do documento"
      data-print="hide"
      className={cn(
        "flex flex-wrap items-center gap-x-0.5 gap-y-1 border-b border-subtle bg-canvas px-3 py-1.5 font-sans text-sm md:px-4",
        className,
      )}
    >
      <Group label="Histórico">
        <ToolButton icon={Undo2} label="Desfazer (⌘Z)" onClick={() => chain().undo().run()} disabled={!s.canUndo} />
        <ToolButton icon={Redo2} label="Refazer (⇧⌘Z)" onClick={() => chain().redo().run()} disabled={!s.canRedo} />
      </Group>

      <Group label="Fonte">
        <label className="sr-only" htmlFor="vellum-font-family">
          Família de fonte
        </label>
        <select
          id="vellum-font-family"
          value={s.font}
          onChange={(e) => {
            const v = e.target.value;
            if (v)
              chain()
                .setDocFont(v as (typeof DOC_FONTS)[number])
                .run();
            else chain().unsetDocFont().run();
          }}
          className="h-7 w-[132px] rounded-md border border-subtle bg-elevated px-1.5 text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          <option value="">Fonte do documento</option>
          {DOC_FONTS.map((f) => (
            <option key={f} value={f}>
              {DOC_FONT_LABELS[f]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="vellum-font-size">
          Tamanho de letra
        </label>
        <select
          id="vellum-font-size"
          value={s.size}
          onChange={(e) => {
            const v = e.target.value;
            if (v) chain().setDocFontSize(v).run();
            else chain().unsetDocFontSize().run();
          }}
          className="nums h-7 w-[62px] rounded-md border border-subtle bg-elevated px-1.5 text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          <option value="">Auto</option>
          {DOC_FONT_SIZES.map((size) => (
            <option key={size} value={`${size}pt`}>
              {size} pt
            </option>
          ))}
        </select>
      </Group>

      <Group label="Estilo do texto">
        <ToolButton icon={Bold} label="Negrito (⌘B)" active={s.bold} onClick={() => chain().toggleBold().run()} />
        <ToolButton icon={Italic} label="Itálico (⌘I)" active={s.italic} onClick={() => chain().toggleItalic().run()} />
        <div className="flex items-center">
          <ToolButton
            icon={UnderlineIcon}
            label="Sublinhado (⌘U)"
            active={s.underline}
            onClick={() => chain().toggleUnderline().run()}
            swatch={s.underlineColor && isInk(s.underlineColor) ? inkVar(s.underlineColor) : undefined}
          />
          <Popover
            label="Estilo de sublinhado"
            role="menu"
            panelClassName="w-60"
            trigger={(props) => (
              <button
                type="button"
                {...props}
                aria-label="Estilos de sublinhado"
                className="grid h-7 w-6 place-items-center rounded-md text-muted hover:bg-surface hover:text-primary"
              >
                <ChevronDown aria-hidden="true" className="size-3" strokeWidth={1.5} />
              </button>
            )}
          >
            {(close) => (
              <>
                <PopoverItem
                  onClick={() => {
                    chain().setUnderline().updateAttributes("underline", { color: null }).run();
                    close();
                  }}
                >
                  <span className="w-5 text-center underline">U</span>
                  Sublinhado clássico
                </PopoverItem>
                <p className="eyebrow px-2.5 pb-1 pt-2">Sublinhado colorido de destaque</p>
                {DOC_INKS.map((ink) => (
                  <PopoverItem
                    key={ink}
                    onClick={() => {
                      chain().setMark("underline", { color: ink }).run();
                      close();
                    }}
                  >
                    <span
                      className="w-5 text-center underline"
                      style={{ textDecorationColor: inkVar(ink), textDecorationThickness: "2px" }}
                    >
                      U
                    </span>
                    {DOC_INK_LABELS[ink]}
                  </PopoverItem>
                ))}
              </>
            )}
          </Popover>
        </div>
        <ToolButton
          icon={Strikethrough}
          label="Riscado"
          active={s.strike}
          onClick={() => chain().toggleStrike().run()}
        />
      </Group>

      <Group label="Cor">
        <SwatchMenu
          label="Cor do texto"
          icon={Baseline}
          current={s.ink && isInk(s.ink) ? s.ink : null}
          kind="ink"
          onPick={(ink) => (ink ? chain().setDocInk(ink).run() : chain().unsetDocInk().run())}
        />
        <SwatchMenu
          label="Realce"
          icon={Highlighter}
          current={s.highlight && isInk(s.highlight) ? s.highlight : null}
          kind="mark"
          onPick={(ink) => (ink ? chain().setHighlight({ color: ink }).run() : chain().unsetHighlight().run())}
        />
      </Group>

      <Group label="Alinhamento">
        <ToolButton
          icon={AlignLeft}
          label="Alinhar à esquerda"
          active={s.align === "left"}
          onClick={() => chain().setTextAlign("left").run()}
        />
        <ToolButton
          icon={AlignCenter}
          label="Centrar"
          active={s.align === "center"}
          onClick={() => chain().setTextAlign("center").run()}
        />
        <ToolButton
          icon={AlignRight}
          label="Alinhar à direita"
          active={s.align === "right"}
          onClick={() => chain().setTextAlign("right").run()}
        />
        <ToolButton
          icon={AlignJustify}
          label="Justificar"
          active={s.align === "justify"}
          onClick={() => chain().setTextAlign("justify").run()}
        />
      </Group>

      <Group label="Títulos">
        <ToolButton
          icon={Heading1}
          label="Título 1"
          active={s.h1}
          onClick={() => chain().toggleHeading({ level: 1 }).run()}
        />
        <ToolButton
          icon={Heading2}
          label="Título 2"
          active={s.h2}
          onClick={() => chain().toggleHeading({ level: 2 }).run()}
        />
        <ToolButton
          icon={Heading3}
          label="Título 3"
          active={s.h3}
          onClick={() => chain().toggleHeading({ level: 3 }).run()}
        />
      </Group>

      <Group label="Blocos">
        <ToolButton
          icon={List}
          label="Lista de pontos"
          active={s.bullet}
          onClick={() => chain().toggleBulletList().run()}
        />
        <ToolButton
          icon={ListOrdered}
          label="Lista numerada"
          active={s.ordered}
          onClick={() => chain().toggleOrderedList().run()}
        />
        <ToolButton
          icon={CheckSquare}
          label="Checklist"
          active={s.task}
          onClick={() => chain().toggleTaskList().run()}
        />
        <ToolButton icon={Quote} label="Citação" active={s.quote} onClick={() => chain().toggleBlockquote().run()} />
        <Popover
          label="Callout editorial"
          role="menu"
          trigger={(props) => (
            <ToolButton icon={StickyNote} label="Callout editorial" active={s.callout} caret {...props} />
          )}
        >
          {(close) => (
            <>
              {CALLOUT_VARIANTS.map((variant) => (
                <PopoverItem
                  key={variant}
                  onClick={() => {
                    if (s.callout) chain().setCalloutVariant(variant).run();
                    else chain().toggleCallout(variant).run();
                    close();
                  }}
                >
                  {CALLOUT_LABELS[variant]}
                </PopoverItem>
              ))}
              {s.callout && (
                <PopoverItem
                  onClick={() => {
                    chain().toggleCallout().run();
                    close();
                  }}
                >
                  Remover callout
                </PopoverItem>
              )}
            </>
          )}
        </Popover>
        <TableMenu editor={editor} inTable={s.table} />
        <ToolButton icon={Minus} label="Linha divisória" onClick={() => chain().setHorizontalRule().run()} />
      </Group>

      <button
        type="button"
        onClick={() => chain().insertMermaid().run()}
        aria-label="Inserir Diagrama Mermaid"
        className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md bg-accent-primary px-2.5 text-xs font-medium text-canvas shadow-paper transition-colors duration-150 hover:bg-accent-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        <Workflow aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
        <span className="hidden 2xl:inline">Inserir</span> Diagrama Mermaid
      </button>
    </div>
  );
}

const isInk = (v: string): v is DocInk => (DOC_INKS as readonly string[]).includes(v);

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-px border-r border-subtle px-1 first:pl-0 last:border-r-0"
    >
      {children}
    </div>
  );
}

interface ToolButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  caret?: boolean;
  swatch?: string;
}

function ToolButton({ icon: Icon, label, active, caret, swatch, className, ...props }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        "relative inline-flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-md px-1 transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:pointer-events-none disabled:opacity-40",
        active ? "bg-accent-primary/10 text-accent-primary" : "text-primary/80 hover:bg-surface hover:text-primary",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
      {caret && <ChevronDown aria-hidden="true" className="size-3 text-muted" strokeWidth={1.5} />}
      {swatch && (
        <span
          aria-hidden="true"
          className="absolute inset-x-1.5 bottom-0.5 h-[2px] rounded-full"
          style={{ background: swatch }}
        />
      )}
    </button>
  );
}

function SwatchMenu({
  label,
  icon,
  current,
  kind,
  onPick,
}: {
  label: string;
  icon: LucideIcon;
  current: DocInk | null;
  kind: "ink" | "mark";
  onPick: (ink: DocInk | null) => void;
}) {
  const color = (ink: DocInk) => (kind === "ink" ? inkVar(ink) : markVar(ink));
  return (
    <Popover
      label={label}
      panelClassName="w-64 p-2.5"
      trigger={(props) => (
        <ToolButton
          icon={icon}
          label={label}
          caret
          swatch={current ? (kind === "ink" ? inkVar(current) : inkVar(current)) : undefined}
          {...props}
        />
      )}
    >
      {(close) => (
        <div>
          <p className="eyebrow mb-2">{label}</p>
          <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-1.5">
            {DOC_INKS.map((ink) => (
              <button
                key={ink}
                type="button"
                role="radio"
                aria-checked={current === ink}
                aria-label={DOC_INK_LABELS[ink]}
                title={DOC_INK_LABELS[ink]}
                onClick={() => {
                  onPick(ink);
                  close();
                }}
                className={cn(
                  "grid size-8 place-items-center rounded-md border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  current === ink ? "border-primary/60" : "border-subtle hover:border-primary/30",
                )}
                style={kind === "mark" ? { background: color(ink) } : undefined}
              >
                {kind === "ink" ? (
                  <span className="font-serif text-base font-medium" style={{ color: color(ink) }}>
                    A
                  </span>
                ) : (
                  <span className="font-serif text-sm text-primary">ab</span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              onPick(null);
              close();
            }}
            className="mt-2 w-full rounded-md px-2 py-1 text-left text-xs text-muted hover:bg-surface hover:text-primary"
          >
            {kind === "ink" ? "Cor automática (tinta do tema)" : "Sem realce"}
          </button>
        </div>
      )}
    </Popover>
  );
}

function TableMenu({ editor, inTable }: { editor: Editor; inTable: boolean }) {
  const [hover, setHover] = useState<[number, number]>([3, 3]);
  const chain = () => editor.chain().focus();
  const actions: Array<{ label: string; run: () => boolean }> = [
    { label: "Inserir linha acima", run: () => chain().addRowBefore().run() },
    { label: "Inserir linha abaixo", run: () => chain().addRowAfter().run() },
    { label: "Eliminar linha", run: () => chain().deleteRow().run() },
    { label: "Inserir coluna à esquerda", run: () => chain().addColumnBefore().run() },
    { label: "Inserir coluna à direita", run: () => chain().addColumnAfter().run() },
    { label: "Eliminar coluna", run: () => chain().deleteColumn().run() },
    { label: "Alternar linha de cabeçalho", run: () => chain().toggleHeaderRow().run() },
    { label: "Unir ou dividir células", run: () => chain().mergeOrSplit().run() },
    { label: "Eliminar tabela", run: () => chain().deleteTable().run() },
  ];

  return (
    <Popover
      label="Tabela"
      panelClassName="w-64"
      trigger={(props) => <ToolButton icon={Table2} label="Tabela" active={inTable} caret {...props} />}
    >
      {(close) => (
        <div>
          <p className="eyebrow px-2.5 pt-1">Inserir tabela</p>
          <div className="px-2.5 py-2" onMouseLeave={() => setHover([3, 3])}>
            <div className="grid w-max grid-cols-6 gap-1" role="grid" aria-label="Escolher dimensões da tabela">
              {Array.from({ length: 36 }, (_, i) => {
                const r = Math.floor(i / 6) + 1;
                const c = (i % 6) + 1;
                const on = r <= hover[0] && c <= hover[1];
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Tabela de ${r} × ${c}`}
                    onMouseEnter={() => setHover([r, c])}
                    onFocus={() => setHover([r, c])}
                    onClick={() => {
                      chain().insertTable({ rows: r, cols: c, withHeaderRow: true }).run();
                      close();
                    }}
                    className={cn(
                      "size-5 rounded-[3px] border transition-colors duration-100",
                      on ? "border-accent-primary/60 bg-accent-primary/15" : "border-subtle bg-canvas",
                    )}
                  />
                );
              })}
            </div>
            <p className="nums mt-1.5 font-mono text-[11px] text-muted">
              {hover[0]} × {hover[1]} · com cabeçalho
            </p>
          </div>
          <div className="border-t border-subtle pt-1" role="menu" aria-label="Editar tabela">
            {actions.map((action) => (
              <PopoverItem
                key={action.label}
                disabled={!inTable}
                onClick={() => {
                  action.run();
                  close();
                }}
                className="text-xs"
              >
                {action.label}
              </PopoverItem>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}
